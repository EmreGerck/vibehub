import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SEO automation service.
 *
 * Two responsibilities:
 * 1. **Revalidate Next.js cached pages** (sitemap, product/store pages) when
 *    backend mutates content. Backend hits the frontend's /api/revalidate
 *    endpoint with a shared secret.
 *
 * 2. **Ping Google IndexNow** so search engines know about new/changed URLs
 *    immediately instead of waiting for the next crawl.
 *
 * All operations are fire-and-forget: SEO failures must never block the
 * underlying business action (product publish, etc.).
 *
 * Env vars:
 *   FRONTEND_REVALIDATE_URL — full URL to Next.js revalidate endpoint
 *                             (default: https://vibehub.com.tr/api/revalidate)
 *   FRONTEND_REVALIDATE_SECRET — shared secret matching frontend env
 *   INDEXNOW_KEY — IndexNow API key (32-char hex string)
 */
@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly revalidateUrl: string;
  private readonly revalidateSecret: string;
  private readonly indexNowKey: string;
  private readonly siteHost: string;

  constructor(private readonly config: ConfigService) {
    this.revalidateUrl =
      this.config.get('FRONTEND_REVALIDATE_URL') || 'https://vibehub.com.tr/api/revalidate';
    this.revalidateSecret = this.config.get('FRONTEND_REVALIDATE_SECRET') || '';
    this.indexNowKey = this.config.get('INDEXNOW_KEY') || '';
    this.siteHost = (this.config.get('FRONTEND_URL') || 'https://vibehub.com.tr').replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  /**
   * Revalidate sitemap + a single page path on the frontend.
   * Fire-and-forget; logs and swallows errors.
   *
   * @example
   *   seoService.revalidate('/product/abc123')
   *   seoService.revalidate(`/store/${slug}`)
   */
  async revalidate(...paths: string[]): Promise<void> {
    if (!this.revalidateSecret) {
      // Dev / missing config — skip silently
      return;
    }
    // Always include sitemap so search engines pick up the new/removed URL set
    const allPaths = Array.from(new Set([...paths, '/sitemap.xml']));
    try {
      const url = new URL(this.revalidateUrl);
      url.searchParams.set('secret', this.revalidateSecret);
      // Send multiple paths via comma-separated list (frontend parses)
      url.searchParams.set('paths', allPaths.join(','));
      await fetch(url.toString(), { method: 'POST' });
      this.logger.log(`[SEO] Revalidated ${allPaths.length} paths: ${allPaths.join(', ')}`);
    } catch (err: any) {
      this.logger.warn(`[SEO] Revalidate failed: ${err?.message ?? err}`);
    }
  }

  /**
   * Submit URL(s) to Google IndexNow so they're crawled within hours
   * instead of days. Free tier: ~10k URLs/day.
   * Docs: https://www.indexnow.org/documentation
   */
  async indexNow(...paths: string[]): Promise<void> {
    if (!this.indexNowKey) {
      return; // not configured — skip silently
    }
    const urlList = paths.map((p) => `https://${this.siteHost}${p.startsWith('/') ? p : '/' + p}`);
    try {
      await fetch('https://api.indexnow.org/IndexNow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: this.siteHost,
          key: this.indexNowKey,
          keyLocation: `https://${this.siteHost}/${this.indexNowKey}.txt`,
          urlList,
        }),
      });
      this.logger.log(`[SEO] IndexNow submitted ${urlList.length} URLs`);
    } catch (err: any) {
      this.logger.warn(`[SEO] IndexNow ping failed: ${err?.message ?? err}`);
    }
  }

  /**
   * Convenience: when a product changes (publish/unpublish/update), revalidate
   * its detail page + the sitemap + ping IndexNow.
   */
  async productChanged(productId: string, tenantSlug?: string): Promise<void> {
    const paths = [`/product/${productId}`, '/shop'];
    if (tenantSlug) paths.push(`/store/${tenantSlug}`);
    // Two parallel side-effects
    void this.revalidate(...paths);
    void this.indexNow(...paths);
  }

  async storeChanged(slug: string): Promise<void> {
    const paths = [`/store/${slug}`, '/'];
    void this.revalidate(...paths);
    void this.indexNow(...paths);
  }

  async categoryChanged(slug: string): Promise<void> {
    const paths = [`/shop/${slug}`, '/shop'];
    void this.revalidate(...paths);
    void this.indexNow(...paths);
  }
}
