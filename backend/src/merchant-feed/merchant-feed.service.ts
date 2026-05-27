import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Generates a Google Merchant Center XML feed for all LIVE products.
 * Spec: https://support.google.com/merchants/answer/7052112
 *
 * Submitting this feed to Google Merchant Center makes VibeHub products
 * appear in the Google Shopping tab + organic shopping results, which is
 * a major missing channel for Turkish e-commerce.
 *
 * Feed URL: GET /merchant-feed.xml
 * Cached by Cloudflare/CDN for ~1h via Cache-Control.
 */
@Injectable()
export class MerchantFeedService {
  private readonly siteUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.siteUrl = this.config.get<string>('FRONTEND_URL', 'https://vibehub.com.tr');
  }

  async buildFeedXml(): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { status: 'LIVE' },
      take: 2000, // hard cap — Merchant Center accepts 100k+, but keep payload sane
      include: {
        tenant:   { select: { displayName: true, slug: true } },
        category: { select: { name: true, slug: true } },
        variants: { select: { stockQty: true, priceOverride: true }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const items = products
      .map((p) => this.buildItemXml(p as any))
      .filter(Boolean)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>VibeHub — Sanatçı Merch Marketplace</title>
    <link>${this.siteUrl}</link>
    <description>Türkiye'nin en sevilen sanatçılarından resmi koleksiyon ürünleri</description>
${items}
  </channel>
</rss>`;
  }

  private buildItemXml(p: {
    id: string;
    title: string;
    description: string;
    price: any;
    compareAtPrice: any;
    currency: string;
    images: string[];
    tenant: { displayName: string; slug: string };
    category: { name: string; slug: string } | null;
    variants: Array<{ stockQty: number; priceOverride: any }>;
  }): string {
    if (!p.images?.length) return ''; // Merchant Center requires at least one image

    const inStock = p.variants.some((v) => v.stockQty > 0);
    const price = Number(p.variants[0]?.priceOverride ?? p.price).toFixed(2);
    const salePrice = p.compareAtPrice ? Number(p.price).toFixed(2) : null;
    const originalPrice = p.compareAtPrice ? Number(p.compareAtPrice).toFixed(2) : null;

    const url = `${this.siteUrl}/product/${p.id}`;
    const productType = p.category?.name ?? 'Apparel';
    const description = this.escape(p.description.slice(0, 5000));
    const title = this.escape(`${p.title} — ${p.tenant.displayName}`);

    const additionalImages = p.images
      .slice(1, 11) // Merchant Center accepts up to 10 additional
      .map((img) => `      <g:additional_image_link>${this.escape(img)}</g:additional_image_link>`)
      .join('\n');

    return `    <item>
      <g:id>${this.escape(p.id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${url}</g:link>
      <g:image_link>${this.escape(p.images[0])}</g:image_link>
${additionalImages}
      <g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${originalPrice ?? price} ${this.escape(p.currency)}</g:price>${salePrice ? `
      <g:sale_price>${salePrice} ${this.escape(p.currency)}</g:sale_price>` : ''}
      <g:brand>${this.escape(p.tenant.displayName)}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${this.escape(productType)}</g:product_type>
      <g:google_product_category>Apparel &amp; Accessories</g:google_product_category>
      <g:shipping>
        <g:country>TR</g:country>
        <g:service>Standard</g:service>
        <g:price>0.00 ${this.escape(p.currency)}</g:price>
      </g:shipping>
    </item>`;
  }

  private escape(s: string): string {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
