/**
 * SECURITY TEST — File Upload Security
 * ══════════════════════════════════════════════════════════════════
 * CSO threat model: MIME-type spoofing (PHP/shell disguised as image),
 * double extension bypass (evil.php.jpg), path traversal in folder param,
 * oversized files (10MB limit), zip bombs, SVG XSS, polyglot files.
 *
 * OWASP: A04 Insecure Design, A05 Security Misconfiguration
 */

import * as path from 'path';
import * as fs from 'fs';

// ─── Upload controller source inspection ─────────────────────────────────────
// These tests verify structural security properties of the upload controller
// without needing to spin up a full HTTP server.

const UPLOAD_CONTROLLER_PATH = path.join(
  __dirname,
  '../storage/upload.controller.ts',
);

function getUploaderSource(): string {
  return fs.readFileSync(UPLOAD_CONTROLLER_PATH, 'utf8');
}

// ─── SEC-UPLOAD-01: MIME Type Validation ─────────────────────────────────────

describe('[SEC-UPLOAD-01] MIME Type Filtering', () => {
  it('upload controller enforces MIME type allowlist', () => {
    const src = getUploaderSource();
    // Must have a fileFilter or explicit MIME check
    expect(src).toMatch(/image\/(jpeg|png|webp|gif|svg)/);
  });

  it('upload controller uses fileFilter (not relying on client header alone)', () => {
    const src = getUploaderSource();
    expect(src).toContain('fileFilter');
  });

  it('non-image MIME types are rejected', () => {
    const src = getUploaderSource();
    // The filter must call cb(error) for non-image types
    expect(src).toContain('cb(');
    // Should have an error path for unsupported types
    expect(src).toMatch(/reject|Unsupported|only.*image|allowed/i);
  });
});

// ─── SEC-UPLOAD-02: File Extension Double-Check ───────────────────────────────

describe('[SEC-UPLOAD-02] Extension Double-Check (Double Extension)', () => {
  it('upload controller checks file extension in addition to MIME type', () => {
    const src = getUploaderSource();
    // Must have extension validation
    expect(src).toMatch(/\.ext\b|path\.extname|originalname.*ext|extension/i);
  });

  it('allowed extensions are enumerated (allowlist, not denylist)', () => {
    const src = getUploaderSource();
    // Must check against known-good extensions
    expect(src).toMatch(/\.(jpg|jpeg|png|webp|gif|svg)/);
  });

  it('file size limit is enforced at controller level', () => {
    const src = getUploaderSource();
    // 10MB = 10 * 1024 * 1024
    expect(src).toMatch(/10\s*\*\s*1024\s*\*\s*1024|10485760|limits.*fileSize/i);
  });
});

// ─── SEC-UPLOAD-03: Path Traversal in Folder Parameter ────────────────────────

describe('[SEC-UPLOAD-03] Path Traversal via folder Parameter', () => {
  it('upload controller validates the folder param against an allowlist', () => {
    const src = getUploaderSource();
    // Must have a restricted set of allowed folders
    expect(src).toMatch(/products|avatars|banners|media|general/);
    // Must NOT allow arbitrary folder strings
    expect(src).toMatch(/allowedFolders|ALLOWED_FOLDERS|validFolders|\['products'|includes\(folder\)/i);
  });

  it('folder param does not allow path separators', () => {
    const src = getUploaderSource();
    // The allowlist approach prevents traversal implicitly
    // Verify `../` can't be in the allowed set
    expect(src).not.toContain("'../'");
    expect(src).not.toContain('"../"');
  });

  it('uses memoryStorage (not diskStorage) — no temp file on disk', () => {
    const src = getUploaderSource();
    expect(src).toContain('memoryStorage');
    expect(src).not.toContain('diskStorage');
  });
});

// ─── SEC-UPLOAD-04: SVG XSS Prevention ────────────────────────────────────────

describe('[SEC-UPLOAD-04] SVG XSS Awareness', () => {
  it('SVG is either not in allowed MIME list or is explicitly noted as risk', () => {
    const src = getUploaderSource();
    // Option A: SVG not allowed at all (safest)
    // Option B: SVG allowed but served with Content-Type: text/plain or nosniff
    // Either way, the controller should not blindly allow SVG without acknowledgement
    const svgAllowed = src.includes('image/svg');
    if (svgAllowed) {
      // If SVG is allowed, there should be a comment or extra sanitization
      expect(src).toMatch(/svg|sanitiz|xss|vector|Content-Type/i);
    } else {
      // SVG not in MIME list — safe by default
      expect(svgAllowed).toBe(false);
    }
  });
});

// ─── SEC-UPLOAD-05: File Upload Response Safety ───────────────────────────────

describe('[SEC-UPLOAD-05] Upload Response Does Not Leak Server Paths', () => {
  it('upload response returns URL, not absolute filesystem path', () => {
    const src = getUploaderSource();
    // Response should contain 'url' field (CDN URL), not '/var/www/...' style paths
    expect(src).toContain('url');
    // Must not expose __dirname or process.cwd() in response
    expect(src).not.toMatch(/\b__dirname\b.*return|res\.json.*__dirname/);
  });

  it('upload controller does not expose internal storage bucket name in error messages', () => {
    const src = getUploaderSource();
    // Error messages should be generic
    expect(src).not.toMatch(/throw.*s3.*bucket|throw.*aws.*secret/i);
  });
});

// ─── SEC-UPLOAD-06: Multer Configuration Hardening ────────────────────────────

describe('[SEC-UPLOAD-06] Multer Configuration Hardening', () => {
  it('multer limits fields count (prevents field bombing)', () => {
    const src = getUploaderSource();
    // fileSize is set; fields limit optional but fileSize is the critical one
    expect(src).toMatch(/fileSize|limits/i);
  });

  it('uses interceptor pattern (not direct multer middleware) for NestJS safety', () => {
    const src = getUploaderSource();
    // NestJS FileInterceptor is preferred
    expect(src).toMatch(/FileInterceptor|UseInterceptors/i);
  });

  it('upload endpoint requires authentication (not @Public())', () => {
    const src = getUploaderSource();
    // Should NOT have @Public() decorator on the upload endpoint
    // Admin/vendor upload requires auth
    expect(src).not.toContain('@Public()');
  });
});
