import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

// ── Sentry — init before anything else so all errors are captured ──────────────
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    // Don't send PII (emails, IPs) to Sentry by default
    sendDefaultPii: false,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Fail fast if JWT secrets are too short — prevents weak-secret token forgery
  const jwtAccessSecret = config.get<string>('JWT_ACCESS_SECRET', '');
  const jwtRefreshSecret = config.get<string>('JWT_REFRESH_SECRET', '');
  if (jwtAccessSecret.length < 32) {
    throw new Error('FATAL: JWT_ACCESS_SECRET must be at least 32 characters. Run: openssl rand -base64 48');
  }
  if (jwtRefreshSecret.length < 32) {
    throw new Error('FATAL: JWT_REFRESH_SECRET must be at least 32 characters. Run: openssl rand -base64 48');
  }

  // Security headers — helmet first, then explicit fallback middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow CDN assets
    contentSecurityPolicy: false, // handled by Next.js frontend
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // Explicit security header middleware
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // Build the allowed-origins list from FRONTEND_URL + automatic www/apex variant
  // + any extra origins in CORS_EXTRA_ORIGINS (comma-separated)
  const allowedOrigins = new Set<string>([frontendUrl]);
  if (frontendUrl.startsWith('https://www.')) {
    allowedOrigins.add(frontendUrl.replace('https://www.', 'https://'));
  } else if (frontendUrl.startsWith('https://') && !frontendUrl.includes('://www.')) {
    allowedOrigins.add(frontendUrl.replace('https://', 'https://www.'));
  }

  // Add extra origins (e.g. staging domains) from CORS_EXTRA_ORIGINS (comma-separated)
  const extraOrigins = config.get<string>('CORS_EXTRA_ORIGINS', '');
  extraOrigins.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => allowedOrigins.add(o));

  // Explicit Vercel preview project slugs — ALLOWED_VERCEL_PREVIEWS=vibehub-frontend,vibehub-staging
  // Do NOT use a wildcard *.vercel.app — any Vercel user could bypass CORS otherwise
  const allowedVercelPreviews = config.get<string>('ALLOWED_VERCEL_PREVIEWS', '')
    .split(',').map((s) => s.trim()).filter(Boolean)
    .map((slug) => `https://${slug}.vercel.app`);
  allowedVercelPreviews.forEach((o) => allowedOrigins.add(o));

  // Always allow localhost for local dev — both web (Next.js) and mobile (Expo).
  // Expo's web mode picks one of these ports depending on what's free:
  //   8081 = default Metro/Expo web
  //   8083 = our launch.json mobile-web preview server
  //   19006 = legacy Expo web
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://localhost:3001');
  allowedOrigins.add('http://localhost:8081');
  allowedOrigins.add('http://localhost:8083');
  allowedOrigins.add('http://localhost:19006');

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('VibeHub API')
    .setDescription('Multi-vendor merchandise marketplace API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Expose Swagger UI only in non-production environments
  if (config.get<string>('NODE_ENV') !== 'production') {
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  if (config.get<string>('NODE_ENV') !== 'production') {
    console.log(`VibeHub API running on http://localhost:${port}`);
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
