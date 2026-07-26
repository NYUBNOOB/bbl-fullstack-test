import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  TEST_USER_A,
  TEST_USER_B,
  TEST_USER_C,
  bearerFor,
  bearerWithoutSub,
  BEARER_INVALID,
} from '../src/auth/testing-utils';

/**
 * End-to-end security tests for Collections and Bookmarks API.
 *
 * PHILOSOPHY:
 *   These tests PROVE the security invariant holds by attempting to violate it.
 *   Every adversarial test simulates User A trying to access/delete User B's data.
 *   If any test passes where it should FAIL, the security model is broken.
 *
 * SETUP:
 *   - Uses a real SQLite database (prisma/dev.db) — same as production.
 *   - Seeds two users (Alice, Bob) with disjoint collections/bookmarks.
 *   - Signs JWT tokens for each user to simulate authenticated requests.
 *
 * ADVERSARIAL TEST CASES:
 *   1. User A cannot read User B's collections (GET /collections/:id)
 *   2. User A cannot update User B's collections (PUT /collections/:id)
 *   3. User A cannot delete User B's collections (DELETE /collections/:id)
 *   4. User A cannot file their bookmark into User B's collection (POST /bookmarks)
 *   5. User A cannot read User B's bookmarks (GET /bookmarks/:id)
 *   6. User A cannot update User B's bookmarks (PUT /bookmarks/:id)
 *   7. User A cannot delete User B's bookmarks (DELETE /bookmarks/:id)
 *   8. Malformed tokens are rejected (missing sub, invalid signature)
 */
describe('Security E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  let aliceCollectionId: string;
  let bobCollectionId: string;
  let aliceBookmarkId: string;
  let bobBookmarkId: string;

  beforeAll(async () => {
    // 1. Boot the app with the real AppModule (includes Prisma + Auth)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // 2. Sign tokens for each test user
    tokenA = bearerFor(jwtService, TEST_USER_A).replace('Bearer ', '');
    tokenB = bearerFor(jwtService, TEST_USER_B).replace('Bearer ', '');
    tokenC = bearerFor(jwtService, TEST_USER_C).replace('Bearer ', '');

    // 3. Seed test data: ensure users exist and create collections/bookmarks
    await prisma.user.upsert({
      where: { id: TEST_USER_A.sub },
      update: {},
      create: { id: TEST_USER_A.sub, email: TEST_USER_A.email },
    });
    await prisma.user.upsert({
      where: { id: TEST_USER_B.sub },
      update: {},
      create: { id: TEST_USER_B.sub, email: TEST_USER_B.email },
    });
    await prisma.user.upsert({
      where: { id: TEST_USER_C.sub },
      update: {},
      create: { id: TEST_USER_C.sub, email: TEST_USER_C.email },
    });

    // Clean up any prior test data (idempotency)
    await prisma.bookmark.deleteMany({
      where: { ownerId: { in: [TEST_USER_A.sub, TEST_USER_B.sub] } },
    });
    await prisma.collection.deleteMany({
      where: { ownerId: { in: [TEST_USER_A.sub, TEST_USER_B.sub] } },
    });

    // Alice's collection
    const aliceCol = await prisma.collection.create({
      data: {
        ownerId: TEST_USER_A.sub,
        name: 'Alice Reading List',
        description: 'Private to Alice',
      },
    });
    aliceCollectionId = aliceCol.id;

    // Bob's collection
    const bobCol = await prisma.collection.create({
      data: {
        ownerId: TEST_USER_B.sub,
        name: 'Bob Recipes',
        description: 'Private to Bob',
      },
    });
    bobCollectionId = bobCol.id;

    // Alice's bookmark
    const aliceBm = await prisma.bookmark.create({
      data: {
        ownerId: TEST_USER_A.sub,
        collectionId: aliceCollectionId,
        title: 'Alice Bookmark',
        url: 'https://alice.example.com',
        notes: 'Private to Alice',
      },
    });
    aliceBookmarkId = aliceBm.id;

    // Bob's bookmark
    const bobBm = await prisma.bookmark.create({
      data: {
        ownerId: TEST_USER_B.sub,
        collectionId: bobCollectionId,
        title: 'Bob Bookmark',
        url: 'https://bob.example.com',
        notes: 'Private to Bob',
      },
    });
    bobBookmarkId = bobBm.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.bookmark.deleteMany({
      where: { ownerId: { in: [TEST_USER_A.sub, TEST_USER_B.sub] } },
    });
    await prisma.collection.deleteMany({
      where: { ownerId: { in: [TEST_USER_A.sub, TEST_USER_B.sub] } },
    });
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION & TOKEN VALIDATION
  // ════════════════════════════════════════════════════════════════════════

  describe('Authentication & Token Validation', () => {
    it('should reject requests without Authorization header', async () => {
      const res = await request(app.getHttpServer()).get('/collections').send();
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/missing/i);
    });

    it('should reject malformed Bearer tokens (invalid signature)', async () => {
      const res = await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', BEARER_INVALID)
        .send();
      expect(res.status).toBe(401);
    });

    it('should reject tokens without a "sub" claim', async () => {
      const badToken = bearerWithoutSub(jwtService);
      const res = await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', badToken)
        .send();
      expect(res.status).toBe(401);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // COLLECTIONS — HAPPY PATH
  // ════════════════════════════════════════════════════════════════════════

  describe('Collections — Happy Path', () => {
    it('GET /collections should return only the authenticated user\'s collections', async () => {
      const res = await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1); // Alice has 1 collection
      expect(res.body[0].ownerId).toBe(TEST_USER_A.sub);
      expect(res.body.every((c: any) => c.ownerId === TEST_USER_A.sub)).toBe(true);
    });

    it('GET /collections/:id should return the user\'s own collection', async () => {
      const res = await request(app.getHttpServer())
        .get(`/collections/${aliceCollectionId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(aliceCollectionId);
      expect(res.body.ownerId).toBe(TEST_USER_A.sub);
    });

    it('POST /collections should create a collection owned by the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/collections')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Alice New Collection', description: 'Created via API' });

      expect(res.status).toBe(201);
      expect(res.body.ownerId).toBe(TEST_USER_A.sub);
      expect(res.body.name).toBe('Alice New Collection');

      // Cleanup
      await prisma.collection.delete({ where: { id: res.body.id } });
    });

    it('PUT /collections/:id should update the user\'s own collection', async () => {
      const res = await request(app.getHttpServer())
        .put(`/collections/${aliceCollectionId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Alice Updated List' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Alice Updated List');

      // Restore
      await prisma.collection.update({
        where: { id: aliceCollectionId },
        data: { name: 'Alice Reading List' },
      });
    });

    it('DELETE /collections/:id should delete the user\'s own collection', async () => {
      // Create a throwaway collection
      const temp = await prisma.collection.create({
        data: { ownerId: TEST_USER_A.sub, name: 'Temp to Delete' },
      });

      const res = await request(app.getHttpServer())
        .delete(`/collections/${temp.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(204);

      // Verify it's gone
      const check = await prisma.collection.findUnique({ where: { id: temp.id } });
      expect(check).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // COLLECTIONS — ADVERSARIAL SECURITY TESTS
  // ════════════════════════════════════════════════════════════════════════

  describe('Collections — Adversarial Security Tests', () => {
    it('🛡️ User A should NOT be able to read User B\'s collection by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/collections/${bobCollectionId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      // MUST be 404 (not 403) — we never leak that the record exists
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('🛡️ User A should NOT be able to update User B\'s collection', async () => {
      const res = await request(app.getHttpServer())
        .put(`/collections/${bobCollectionId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Hacked by Alice' });

      expect(res.status).toBe(404); // same as "not found" — no info leak
    });

    it('🛡️ User A should NOT be able to delete User B\'s collection', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/collections/${bobCollectionId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(404);

      // Verify Bob's collection still exists
      const check = await prisma.collection.findUnique({
        where: { id: bobCollectionId },
      });
      expect(check).not.toBeNull();
      expect(check!.ownerId).toBe(TEST_USER_B.sub);
    });

    it('🛡️ User A should NOT be able to list User B\'s collections', async () => {
      const res = await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      // Alice should see ONLY her own collections, never Bob's
      expect(res.body.every((c: any) => c.ownerId === TEST_USER_A.sub)).toBe(true);
      expect(res.body.some((c: any) => c.id === bobCollectionId)).toBe(false);
    });

    it('🛡️ User C (third user) should NOT be able to read Alice or Bob\'s collections', async () => {
      const resA = await request(app.getHttpServer())
        .get(`/collections/${aliceCollectionId}`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send();

      const resB = await request(app.getHttpServer())
        .get(`/collections/${bobCollectionId}`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send();

      expect(resA.status).toBe(404);
      expect(resB.status).toBe(404);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // BOOKMARKS — HAPPY PATH
  // ════════════════════════════════════════════════════════════════════════

  describe('Bookmarks — Happy Path', () => {
    it('GET /bookmarks should return only the authenticated user\'s bookmarks', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1); // Alice has 1 bookmark
      expect(res.body[0].ownerId).toBe(TEST_USER_A.sub);
      expect(res.body.every((b: any) => b.ownerId === TEST_USER_A.sub)).toBe(true);
    });

    it('GET /bookmarks/:id should return the user\'s own bookmark', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookmarks/${aliceBookmarkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(aliceBookmarkId);
      expect(res.body.ownerId).toBe(TEST_USER_A.sub);
    });

    it('POST /bookmarks should create a bookmark owned by the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Alice New Bookmark',
          url: 'https://new.alice.example.com',
          notes: 'Created via API',
          collectionId: aliceCollectionId,
        });

      expect(res.status).toBe(201);
      expect(res.body.ownerId).toBe(TEST_USER_A.sub);
      expect(res.body.collectionId).toBe(aliceCollectionId);

      // Cleanup
      await prisma.bookmark.delete({ where: { id: res.body.id } });
    });

    it('POST /bookmarks should allow unfiled bookmarks (no collectionId)', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Alice Unfiled Bookmark',
          url: 'https://unfiled.alice.example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.ownerId).toBe(TEST_USER_A.sub);
      expect(res.body.collectionId).toBeNull();

      // Cleanup
      await prisma.bookmark.delete({ where: { id: res.body.id } });
    });

    it('PUT /bookmarks/:id should update the user\'s own bookmark', async () => {
      const res = await request(app.getHttpServer())
        .put(`/bookmarks/${aliceBookmarkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Alice Updated Bookmark' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Alice Updated Bookmark');

      // Restore
      await prisma.bookmark.update({
        where: { id: aliceBookmarkId },
        data: { title: 'Alice Bookmark' },
      });
    });

    it('PUT /bookmarks/:id should allow re-filing to a different owned collection', async () => {
      // Create a second collection for Alice
      const aliceCol2 = await prisma.collection.create({
        data: { ownerId: TEST_USER_A.sub, name: 'Alice Second Collection' },
      });

      const res = await request(app.getHttpServer())
        .put(`/bookmarks/${aliceBookmarkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ collectionId: aliceCol2.id });

      expect(res.status).toBe(200);
      expect(res.body.collectionId).toBe(aliceCol2.id);

      // Restore
      await prisma.bookmark.update({
        where: { id: aliceBookmarkId },
        data: { collectionId: aliceCollectionId },
      });
      await prisma.collection.delete({ where: { id: aliceCol2.id } });
    });

    it('PUT /bookmarks/:id should allow un-filing (setting collectionId to null)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/bookmarks/${aliceBookmarkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ collectionId: null });

      expect(res.status).toBe(200);
      expect(res.body.collectionId).toBeNull();

      // Restore
      await prisma.bookmark.update({
        where: { id: aliceBookmarkId },
        data: { collectionId: aliceCollectionId },
      });
    });

    it('DELETE /bookmarks/:id should delete the user\'s own bookmark', async () => {
      const temp = await prisma.bookmark.create({
        data: {
          ownerId: TEST_USER_A.sub,
          title: 'Temp to Delete',
          url: 'https://temp.alice.example.com',
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/bookmarks/${temp.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(204);

      // Verify it's gone
      const check = await prisma.bookmark.findUnique({ where: { id: temp.id } });
      expect(check).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // BOOKMARKS — ADVERSARIAL SECURITY TESTS
  // ════════════════════════════════════════════════════════════════════════

  describe('Bookmarks — Adversarial Security Tests', () => {
    it('🛡️ User A should NOT be able to read User B\'s bookmark by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookmarks/${bobBookmarkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(404);
    });

    it('🛡️ User A should NOT be able to update User B\'s bookmark', async () => {
      const res = await request(app.getHttpServer())
        .put(`/bookmarks/${bobBookmarkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Hacked by Alice' });

      expect(res.status).toBe(404);
    });

    it('🛡️ User A should NOT be able to delete User B\'s bookmark', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/bookmarks/${bobBookmarkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(404);

      // Verify Bob's bookmark still exists
      const check = await prisma.bookmark.findUnique({
        where: { id: bobBookmarkId },
      });
      expect(check).not.toBeNull();
      expect(check!.ownerId).toBe(TEST_USER_B.sub);
    });

    it('🛡️ User A should NOT be able to list User B\'s bookmarks', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.every((b: any) => b.ownerId === TEST_USER_A.sub)).toBe(true);
      expect(res.body.some((b: any) => b.id === bobBookmarkId)).toBe(false);
    });

    it('🛡️ User A should NOT be able to file their bookmark into User B\'s collection', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Alice Trying to File in Bob\'s Collection',
          url: 'https://alice.example.com',
          collectionId: bobCollectionId, // ← cross-owner violation attempt
        });

      // MUST be 400 (Bad Request) — we reject the cross-owner link
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot link/i);
    });

    it('🛡️ User A should NOT be able to re-file their bookmark into User B\'s collection via PUT', async () => {
      const res = await request(app.getHttpServer())
        .put(`/bookmarks/${aliceBookmarkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ collectionId: bobCollectionId }); // ← cross-owner violation attempt

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot link/i);
    });

    it('🛡️ User A should NOT be able to update a non-existent collection (no info leak)', async () => {
      const fakeCollectionId = 'non-existent-collection-id';
      const res = await request(app.getHttpServer())
        .post('/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Alice Trying Non-Existent Collection',
          url: 'https://alice.example.com',
          collectionId: fakeCollectionId,
        });

      // MUST be 400 — we don't distinguish "not found" from "not yours"
      expect(res.status).toBe(400);
    });

    it('🛡️ User C (third user) should NOT be able to read Alice or Bob\'s bookmarks', async () => {
      const resA = await request(app.getHttpServer())
        .get(`/bookmarks/${aliceBookmarkId}`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send();

      const resB = await request(app.getHttpServer())
        .get(`/bookmarks/${bobBookmarkId}`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send();

      expect(resA.status).toBe(404);
      expect(resB.status).toBe(404);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // DTO VALIDATION
  // ════════════════════════════════════════════════════════════════════════

  describe('DTO Validation', () => {
    it('should reject bookmarks with invalid URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Invalid URL Test',
          url: 'not-a-valid-url',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('url must be a URL address');
    });

    it('should reject collections with empty name', async () => {
      const res = await request(app.getHttpServer())
        .post('/collections')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('should reject bookmarks with missing title', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ url: 'https://valid.example.com' });

      expect(res.status).toBe(400);
    });
  });
});
