import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

let app: any;
let initError: Error | null = null;

async function bootstrap() {
  if (initError) throw initError;
  if (app) return app;

  try {
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  } catch (err) {
    initError = err as Error;
    throw err;
  }

  return app;
}

export default async function handler(req: any, res: any) {
  try {
    const server = await bootstrap();
    server.getHttpAdapter().getInstance()(req, res);
  } catch (err: any) {
    console.error('[Vercel] Bootstrap failed:', err?.message ?? err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Bootstrap failed', message: err?.message }));
  }
}
