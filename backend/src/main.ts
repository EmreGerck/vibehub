import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security headers — helmet first, then explicit fallback middleware
  // in case Railway's edge proxy strips some headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow CDN assets
    contentSecurityPolicy: false, // handled by Next.js frontend
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // Explicit header middleware — ensures headers survive Railway's reverse proxy
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

  // Add extra origins (e.g. Vercel preview URLs, staging domains)
  const extraOrigins = config.get<string>('CORS_EXTRA_ORIGINS', '');
  extraOrigins.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => allowedOrigins.add(o));

  // Always allow localhost for local dev
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://localhost:3001');

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      // Allow all *.vercel.app preview deployments for this project
      if (origin.endsWith('.vercel.app')) return callback(null, true);
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
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`VibeHub API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
