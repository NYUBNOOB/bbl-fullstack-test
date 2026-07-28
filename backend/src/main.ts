import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Allowed browser origins. An explicit allow-list, never `origin: true` —
 * reflecting an arbitrary Origin back with credentials enabled would let any
 * site a logged-in user visits call this API as them.
 */
function corsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS?.trim();
  if (configured) {
    return configured
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return ['http://localhost:5173'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: corsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // The frontend sends the token in an Authorization header, not a cookie,
    // so credentialed requests are unnecessary — leaving this off keeps the
    // blast radius of a CORS misconfiguration small.
    credentials: false,
    maxAge: 600,
  });

  // Mirrors the pipe the e2e suite installs, so validation behaviour under
  // test matches what actually runs in production.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
