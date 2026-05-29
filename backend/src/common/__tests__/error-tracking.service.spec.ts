/**
 * Locks down sanitiser behaviour: substring-match on sensitive keys so
 * variants like `ownerPassword`, `confirmPassword`, `newPasswordHash` are
 * redacted — the original exact-match Set missed `ownerPassword` on
 * /vendors/apply and leaked the plaintext password into UserErrorLog.
 */

import { ErrorTrackingService } from '../error-tracking.service';

// Re-create the sanitise behaviour by routing through the service. We mock
// Prisma's userErrorLog.create to capture the payloadSnapshot the service
// would have written, then assert on it.

describe('ErrorTrackingService.capture — sanitiser', () => {
  let captured: any;
  const prismaStub: any = {
    userErrorLog: {
      create: jest.fn((args: any) => {
        captured = args.data.payloadSnapshot;
        return Promise.resolve({});
      }),
    },
  };
  const svc = new ErrorTrackingService(prismaStub);

  beforeEach(() => {
    captured = null;
    prismaStub.userErrorLog.create.mockClear();
  });

  function basePayload(body: Record<string, unknown>) {
    return {
      errorCode: 'VH-9000',
      traceId: 't',
      route: '/x',
      method: 'POST',
      statusCode: 400,
      payloadSnapshot: { body, query: {}, params: {} },
    };
  }

  it('redacts the canonical `password` key', async () => {
    svc.capture(basePayload({ password: 'hunter2' }));
    await new Promise(setImmediate); // let the fire-and-forget settle
    expect(captured.body.password).toBe('[redacted]');
  });

  it('redacts `ownerPassword` — the leak this test exists to prevent', async () => {
    svc.capture(basePayload({ ownerPassword: 'plaintextLeak123' }));
    await new Promise(setImmediate);
    expect(captured.body.ownerPassword).toBe('[redacted]');
    expect(captured.body.ownerPassword).not.toContain('plaintext');
  });

  it('redacts `confirmPassword` and `newPasswordHash` variants', async () => {
    svc.capture(basePayload({ confirmPassword: 'x', newPasswordHash: 'y' }));
    await new Promise(setImmediate);
    expect(captured.body.confirmPassword).toBe('[redacted]');
    expect(captured.body.newPasswordHash).toBe('[redacted]');
  });

  it('redacts token/secret variants (accessToken, refreshToken, clientSecret, apiKey)', async () => {
    svc.capture(basePayload({
      accessToken: 'a',
      refreshToken: 'b',
      clientSecret: 'c',
      apiKey: 'd',
      api_key: 'e',
      authorization: 'Bearer xyz',
    }));
    await new Promise(setImmediate);
    expect(captured.body.accessToken).toBe('[redacted]');
    expect(captured.body.refreshToken).toBe('[redacted]');
    expect(captured.body.clientSecret).toBe('[redacted]');
    expect(captured.body.apiKey).toBe('[redacted]');
    expect(captured.body.api_key).toBe('[redacted]');
    expect(captured.body.authorization).toBe('[redacted]');
  });

  it('preserves benign keys that resemble sensitive ones (errorCode, discountCode)', async () => {
    svc.capture(basePayload({ errorCode: 'VH-1001', discountCode: 'SUMMER10' }));
    await new Promise(setImmediate);
    // `code` is in the exact-set, so these short-suffixed forms are kept.
    expect(captured.body.errorCode).toBe('VH-1001');
    expect(captured.body.discountCode).toBe('SUMMER10');
  });

  it('redacts bare `code` and `otp` (exact-match list)', async () => {
    svc.capture(basePayload({ code: '123456', otp: '999999' }));
    await new Promise(setImmediate);
    expect(captured.body.code).toBe('[redacted]');
    expect(captured.body.otp).toBe('[redacted]');
  });

  it('is case-insensitive', async () => {
    svc.capture(basePayload({ Password: 'a', OWNERPASSWORD: 'b', AccessToken: 'c' }));
    await new Promise(setImmediate);
    expect(captured.body.Password).toBe('[redacted]');
    expect(captured.body.OWNERPASSWORD).toBe('[redacted]');
    expect(captured.body.AccessToken).toBe('[redacted]');
  });
});
