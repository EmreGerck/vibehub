/**
 * EInvoiceService — e-Arşiv / e-Fatura entegrasyonu
 * ───────────────────────────────────────────────────
 * Türkiye GİB mevzuatı: 2024 itibarıyla internet üzerinden yapılan
 * her satışa e-Arşiv fatura kesilmesi zorunludur.
 *
 * Entegrasyon hedefi: Foriba API (https://foriba.com)
 * Alternatif: Logo iDocs, Mikrogrup e-Fatura
 *
 * Bu servis mock modda çalışır (FORIBA_API_KEY olmadan).
 * Gerçek entegrasyon için:
 *   1. Foriba'ya kayıt ol → API key al
 *   2. .env'e FORIBA_API_KEY + FORIBA_BASE_URL ekle
 *   3. Bu servisteki _callForiba() metodunu aşağıdaki dokümana göre doldur:
 *      https://foriba.com/api-docs
 *
 * Mevcut yapı:
 *   - issueEArchive()   → e-Arşiv belgesi oluştur (B2C, internet satışı)
 *   - issueEInvoice()   → e-Fatura oluştur (B2B, GİB kayıtlı firma)
 *   - getInvoiceStatus()→ belge durumunu sorgula
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as https from 'https';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceBuyer {
  /** TC Kimlik No veya Vergi No */
  identityNumber: string;
  name: string;
  email: string;
  address: string;
  city: string;
  country: string;
  /** Vergi Dairesi (kurumsal alıcılar için) */
  taxOffice?: string;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;          // 0.20 = %20 KDV
  unit?: string;            // 'ADET', 'METRE', etc.
}

export interface IssueInvoiceInput {
  orderId: string;
  buyer: InvoiceBuyer;
  lines: InvoiceLine[];
  currency: string;         // TRY, EUR, USD
  invoiceDate?: Date;
  /** 'EARCHIVE' for B2C internet sales, 'EINVOICE' for B2B GİB-registered */
  type?: 'EARCHIVE' | 'EINVOICE';
  /** Scenario: 'TEMELFATURA' (basic) | 'TICARIFATURA' (commercial) */
  scenario?: 'TEMELFATURA' | 'TICARIFATURA';
}

export interface InvoiceResult {
  success: boolean;
  invoiceId?: string;       // Foriba internal ID
  invoiceNumber?: string;   // GİB invoice number (e.g. VHB2024000000001)
  pdfUrl?: string;          // URL to download the PDF
  errorMessage?: string;
  mock?: boolean;           // true when running in mock mode (no API key)
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EInvoiceService {
  private readonly logger = new Logger(EInvoiceService.name);

  private readonly apiKey:   string;
  private readonly baseUrl:  string;
  private readonly gbNr:     string;  // GİB VKN (Vergi Kimlik Numarası) of the platform
  private readonly isMock:   boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey  = config.get('FORIBA_API_KEY', '');
    this.baseUrl = config.get('FORIBA_BASE_URL', 'https://api.foriba.com/v2');
    this.gbNr    = config.get('PLATFORM_TAX_ID', '');      // VibeHub's own VKN
    this.isMock  = !this.apiKey;

    if (this.isMock) {
      this.logger.warn('[EInvoice] FORIBA_API_KEY not set — running in MOCK mode. No real invoices will be issued.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Issue an e-Arşiv invoice (internet retail — B2C).
   * Must be called after payment confirmation (order status = CONFIRMED).
   */
  async issueEArchive(input: IssueInvoiceInput): Promise<InvoiceResult> {
    return this._issue({ ...input, type: 'EARCHIVE' });
  }

  /**
   * Issue an e-Fatura (B2B — buyer must be GİB-registered).
   */
  async issueEInvoice(input: IssueInvoiceInput): Promise<InvoiceResult> {
    return this._issue({ ...input, type: 'EINVOICE' });
  }

  /**
   * Query the current status of an invoice by its Foriba invoice ID.
   */
  async getInvoiceStatus(invoiceId: string): Promise<{
    status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'UNKNOWN';
    detail?: string;
  }> {
    if (this.isMock) {
      return { status: 'ACCEPTED', detail: 'mock mode' };
    }

    try {
      const resp = await this._callForiba('GET', `/invoices/${invoiceId}/status`, null);
      return {
        status:  resp.status ?? 'UNKNOWN',
        detail:  resp.statusDescription,
      };
    } catch (err) {
      this.logger.error(`[EInvoice] getInvoiceStatus failed: ${err.message}`);
      return { status: 'UNKNOWN', detail: err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────────

  private async _issue(input: IssueInvoiceInput & { type: 'EARCHIVE' | 'EINVOICE' }): Promise<InvoiceResult> {
    this.logger.log(`[EInvoice] Issuing ${input.type} | order=${input.orderId} buyer=${input.buyer.identityNumber}`);

    if (this.isMock) {
      const mockNumber = `VHB${new Date().getFullYear()}${String(Date.now()).slice(-9)}`;
      this.logger.log(`[EInvoice] MOCK invoice issued | number=${mockNumber}`);
      return {
        success:       true,
        invoiceId:     `mock-${uuidv4()}`,
        invoiceNumber: mockNumber,
        pdfUrl:        `https://mock.foriba.com/invoices/${mockNumber}.pdf`,
        mock:          true,
      };
    }

    try {
      const invoiceDate = (input.invoiceDate ?? new Date()).toISOString().slice(0, 10);
      const scenario    = input.scenario ?? 'TEMELFATURA';

      // Build Foriba-compatible request payload
      // Reference: https://foriba.com/api-docs/create-invoice
      const payload = {
        invoiceType:    input.type,
        scenario,
        invoiceDate,
        currency:       input.currency,
        referenceId:    input.orderId,
        seller: {
          taxId:        this.gbNr,
          name:         this.config.get('PLATFORM_NAME', 'VibeHub'),
          address:      this.config.get('PLATFORM_ADDRESS', 'Istanbul, Turkey'),
          email:        this.config.get('PLATFORM_EMAIL', 'fatura@vibehub.io'),
        },
        buyer: {
          taxId:        input.buyer.identityNumber,
          name:         input.buyer.name,
          email:        input.buyer.email,
          address:      input.buyer.address,
          city:         input.buyer.city,
          country:      input.buyer.country,
          taxOffice:    input.buyer.taxOffice ?? '',
        },
        lines: input.lines.map((l, i) => ({
          lineNumber:   i + 1,
          description:  l.description,
          quantity:     l.quantity,
          unitCode:     l.unit ?? 'ADET',
          unitPrice:    l.unitPrice,
          vatRate:      l.vatRate,
          lineTotal:    +(l.unitPrice * l.quantity).toFixed(2),
          vatAmount:    +(l.unitPrice * l.quantity * l.vatRate).toFixed(2),
        })),
      };

      const result = await this._callForiba('POST', '/invoices', payload);

      this.logger.log(
        `[EInvoice] ${input.type} issued | orderId=${input.orderId} invoiceNumber=${result.invoiceNumber}`,
      );

      return {
        success:       true,
        invoiceId:     result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        pdfUrl:        result.pdfUrl,
      };
    } catch (err) {
      this.logger.error(`[EInvoice] Failed to issue ${input.type} for order ${input.orderId}: ${err.message}`);
      return { success: false, errorMessage: err.message };
    }
  }

  /**
   * Make an authenticated HTTP call to the Foriba API.
   * Uses native https module to avoid adding another dependency.
   */
  private _callForiba(method: 'GET' | 'POST', path: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url   = new URL(`${this.baseUrl}${path}`);
      const data  = body ? JSON.stringify(body) : null;

      const options = {
        hostname: url.hostname,
        port:     443,
        path:     url.pathname + url.search,
        method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Client-App':  'VibeHub/1.0',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Foriba API error ${res.statusCode}: ${parsed?.message ?? raw}`));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error(`Foriba API returned non-JSON: ${raw.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }
}
