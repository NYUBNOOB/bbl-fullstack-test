import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hardcoded user "sub" values — mirrors what Auth0 `sub` will look like.
const USER_A_ID = 'auth0|user_a';
const USER_B_ID = 'auth0|user_b';

async function main() {
  console.log('🌱  Seeding database...');

  // 1. Users -----------------------------------------------------------------
  const userA = await prisma.user.upsert({
    where: { id: USER_A_ID },
    update: {},
    create: {
      id: USER_A_ID,
      email: 'alice@example.com',
      displayName: 'Alice (User A)',
    },
  });
  const userB = await prisma.user.upsert({
    where: { id: USER_B_ID },
    update: {},
    create: {
      id: USER_B_ID,
      email: 'bob@example.com',
      displayName: 'Bob (User B)',
    },
  });
  console.log('   ✓ Users:', userA.displayName, '&', userB.displayName);

  // 2. Collections — each strictly attached to its owner --------------------
  const aliceReading = await prisma.collection.create({
    data: {
      ownerId: userA.id,
      name: 'Alice — Reading List',
      description: 'Articles Alice wants to read.',
    },
  });
  const aliceProjects = await prisma.collection.create({
    data: {
      ownerId: userA.id,
      name: 'Alice — Project References',
    },
  });
  const bobCooking = await prisma.collection.create({
    data: {
      ownerId: userB.id,
      name: 'Bob — Recipes',
      description: "Stuff Bob wants to cook when there's time.",
    },
  });
  console.log(
    '   ✓ Collections: 2 for Alice, 1 for Bob (invariant: owner-scoped).',
  );

  // 3. Bookmarks — the compound FK guarantees collectionId (if set) must
  //    point to a collection with the SAME ownerId.
  await prisma.bookmark.createMany({
    data: [
      // Alice's — filed (collectionId set) AND un-filed (collectionId=null)
      {
        ownerId: userA.id,
        collectionId: aliceReading.id,
        title: 'The React Docs you always meant to read',
        url: 'https://react.dev/',
        notes: 'Concurrent features.',
      },
      {
        ownerId: userA.id,
        collectionId: aliceReading.id,
        title: 'Prisma — relation guide',
        url: 'https://www.prisma.io/docs/orm/prisma-schema/data-model/relations',
      },
      {
        ownerId: userA.id,
        collectionId: aliceProjects.id,
        title: 'NestJS module docs',
        url: 'https://docs.nestjs.com/modules',
      },
      {
        ownerId: userA.id,
        collectionId: null, // intentionally un-filed
        title: 'A random blog post (un-filed)',
        url: 'https://example.com/unfiled-alice',
      },

      // Bob's — completely disjoint from Alice's data
      {
        ownerId: userB.id,
        collectionId: bobCooking.id,
        title: 'Salsa verde recipe',
        url: 'https://example.com/salsa-verde',
      },
      {
        ownerId: userB.id,
        collectionId: null,
        title: 'Quick weeknight pasta',
        url: 'https://example.com/pasta-bob',
        notes: 'Un-filed bookmark — still owned by Bob.',
      },
    ],
  });
  console.log('   ✓ Bookmarks: 4 for Alice, 2 for Bob.');

  // 4. Summary sanity-check --------------------------------------------------
  const summary = await Promise.all([
    prisma.user.count(),
    prisma.collection.count(),
    prisma.bookmark.count(),
  ]);
  console.log(
    `   → totals: users=${summary[0]} collections=${summary[1]} bookmarks=${summary[2]}`,
  );
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
