import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

let app: any;

async function bootstrap() {
  if (app) return app;
  app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('');
  await app.init();
  return app;
}

export default async function handler(req: any, res: any) {
  const server = await bootstrap();
  server.getHttpAdapter().getInstance()(req, res);
}
