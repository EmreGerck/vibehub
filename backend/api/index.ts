import type { NestExpressApplication } from '@nestjs/platform-express';

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

let app: NestExpressApplication | null = null;

async function bootstrap(): Promise<NestExpressApplication> {
  if (app) return app;

  const { NestFactory } = await import('@nestjs/core');
  const { AppModuleServerless } = await import('../src/app.module.serverless');
  const { ValidationPipe } = await import('@nestjs/common');
  const cookieParser = (await import('cookie-parser')).default;

  const instance = await NestFactory.create<NestExpressApplication>(
    AppModuleServerless,
    { logger: ['error', 'warn'] },
  );

  instance.use(cookieParser());
  instance.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  instance.enableCors({
    origin: [
      'https://vibehub.com.tr',
      'https://www.vibehub.com.tr',
      /https:\/\/.*\.vercel\.app$/,
    ],
    credentials: true,
  });

  await instance.init();
  app = instance;
  return app;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const server = await bootstrap();
    server.getHttpAdapter().getInstance()(req, res);
  } catch (err: any) {
    const msg = err?.message?.slice(0, 500) ?? String(err);
    console.error('[Bootstrap Error]', msg);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Bootstrap failed', message: msg }));
  }
}
