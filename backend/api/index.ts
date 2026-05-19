// Catch unhandled rejections so Vercel doesn't kill the function
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../src/app.module');
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    await app.init();
    res.end(JSON.stringify({ ok: true, booted: true }));
    await app.close();
  } catch (err: any) {
    const msg = err?.message?.slice(0, 500) ?? String(err);
    console.error('[Bootstrap Error]', msg);
    res.end(JSON.stringify({ step: 'app-init', error: msg }));
  }
}
