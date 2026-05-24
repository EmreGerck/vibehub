/**
 * KargoService — Turkish shipping carrier integration
 * ────────────────────────────────────────────────────
 * Supports Aras Kargo and Yurtiçi Kargo via their REST APIs.
 * Falls back to mock mode when carrier API keys are not configured —
 * so development and CI work without real credentials.
 *
 * Env vars:
 *   ARAS_KARGO_API_KEY   — Aras Kargo REST API key
 *   ARAS_KARGO_CUSTOMER_CODE — Aras Kargo customer/sender code
 *   YURTICI_KARGO_USER   — Yurtiçi username
 *   YURTICI_KARGO_PASS   — Yurtiçi password
 *   YURTICI_KARGO_MERCHANT_CODE — Yurtiçi merchant code
 *   DEFAULT_CARRIER      — 'aras' | 'yurtici' (default: 'aras')
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as https from 'https';

export interface ShipmentCreateParams {
  orderId:          string;
  tenantId:         string;
  receiverName:     string;
  receiverPhone:    string;
  receiverAddress:  string;
  receiverCity:     string;
  receiverDistrict: string;
  receiverZip?:     string;
  weight:           number;   // kg
  desi?:            number;   // volumetric weight (cm³/3000)
  description:      string;   // parcel contents
  carrier?:         'aras' | 'yurtici';
}

export interface ShipmentResult {
  success:       boolean;
  trackingNumber: string;
  carrier:       string;
  barcode?:      string;
  labelUrl?:     string;     // PDF label download URL
  estimatedDays?: number;
  mock?:         boolean;
  errorMessage?: string;
}

export interface TrackingResult {
  trackingNumber: string;
  carrier:        string;
  status:         string;
  events:         Array<{ date: string; location: string; description: string }>;
  estimatedDelivery?: string;
  mock?:          boolean;
}

@Injectable()
export class KargoService {
  private readonly logger = new Logger(KargoService.name);

  private readonly arasApiKey:       string;
  private readonly arasCustomerCode: string;
  private readonly yurticiUser:      string;
  private readonly yurticiPass:      string;
  private readonly yurticiMerchant:  string;
  private readonly defaultCarrier:   'aras' | 'yurtici';

  constructor(
    private readonly config:  ConfigService,
    private readonly prisma:  PrismaService,
    private readonly mail:    MailService,
  ) {
    this.arasApiKey       = this.config.get('ARAS_KARGO_API_KEY', '');
    this.arasCustomerCode = this.config.get('ARAS_KARGO_CUSTOMER_CODE', '');
    this.yurticiUser      = this.config.get('YURTICI_KARGO_USER', '');
    this.yurticiPass      = this.config.get('YURTICI_KARGO_PASS', '');
    this.yurticiMerchant  = this.config.get('YURTICI_KARGO_MERCHANT_CODE', '');
    this.defaultCarrier   = (this.config.get('DEFAULT_CARRIER', 'aras') as 'aras' | 'yurtici');
  }

  /** Create a new shipment and persist a Shipment record in the database. */
  async createShipment(params: ShipmentCreateParams): Promise<ShipmentResult> {
    const carrier = params.carrier ?? this.defaultCarrier;

    let result: ShipmentResult;

    if (carrier === 'yurtici' && this.yurticiUser && this.yurticiPass) {
      result = await this._yurticiCreate(params);
    } else if (carrier === 'aras' && this.arasApiKey) {
      result = await this._arasCreate(params);
    } else {
      this.logger.warn(`[Kargo] No API credentials for carrier "${carrier}" — using mock`);
      result = this._mockCreate(params, carrier);
    }

    if (result.success) {
      // Persist to DB
      await this.prisma.shipment.create({
        data: {
          tenantId:      params.tenantId,
          orderId:       params.orderId,
          carrier:       result.carrier,
          trackingNumber: result.trackingNumber,
          status:        'CREATED',
          estimatedDelivery: result.estimatedDays
            ? new Date(Date.now() + result.estimatedDays * 86_400_000)
            : null,
        },
      });

      // Update order status to SHIPPED
      await this.prisma.order.update({
        where: { id: params.orderId },
        data:  { status: 'SHIPPED' as any },
      });

      this.logger.log(
        `[Kargo] Shipment created — order=${params.orderId} carrier=${result.carrier} tracking=${result.trackingNumber}`,
      );
    }

    return result;
  }

  /** Track a shipment by tracking number. */
  async trackShipment(trackingNumber: string, carrier: string): Promise<TrackingResult> {
    if (carrier === 'yurtici' && this.yurticiUser) {
      return this._yurticiTrack(trackingNumber);
    }
    if (carrier === 'aras' && this.arasApiKey) {
      return this._arasTrack(trackingNumber);
    }
    return this._mockTrack(trackingNumber, carrier);
  }

  /** Get all shipments for an order. */
  async getOrderShipments(orderId: string) {
    return this.prisma.shipment.findMany({ where: { orderId } });
  }

  /** Get all shipments for a tenant. */
  async getTenantShipments(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({ where: { tenantId }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.shipment.count({ where: { tenantId } }),
    ]);
    return { items, total, page, limit };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Aras Kargo
  // Docs: https://developer.araskargo.com.tr/
  // ─────────────────────────────────────────────────────────────────────────────

  private async _arasCreate(params: ShipmentCreateParams): Promise<ShipmentResult> {
    try {
      const body = JSON.stringify({
        UserName:        this.arasApiKey,
        Password:        '',
        TeslimTipi:      1,          // door delivery
        Alici:           params.receiverName,
        AliciAdres:      params.receiverAddress,
        AliciIl:         params.receiverCity,
        AliciIlce:       params.receiverDistrict,
        AliciTelefon:    params.receiverPhone,
        BelgeNo:         params.orderId.slice(0, 20),
        Kg:              params.weight,
        Desi:            params.desi ?? 0,
        Aciklama:        params.description.slice(0, 100),
        GondericiKodu:   this.arasCustomerCode,
      });

      const response = await this._httpPost(
        'customerservices.araskargo.com.tr',
        '/CustomerIntegration/CustomerIntegrationService.svc/rest/CreateShipment',
        body,
        { Authorization: `Basic ${Buffer.from(`${this.arasApiKey}:`).toString('base64')}` },
      );

      if (response.Success) {
        return {
          success:        true,
          trackingNumber: String(response.TakipKodu ?? response.CargoKey),
          carrier:        'aras',
          estimatedDays:  3,
        };
      }
      return {
        success:       false,
        trackingNumber: '',
        carrier:       'aras',
        errorMessage:  response.Message ?? 'Aras API error',
      };
    } catch (err) {
      this.logger.error(`[Kargo] Aras create error: ${err.message}`);
      return { success: false, trackingNumber: '', carrier: 'aras', errorMessage: err.message };
    }
  }

  private async _arasTrack(trackingNumber: string): Promise<TrackingResult> {
    try {
      const response = await this._httpPost(
        'customerservices.araskargo.com.tr',
        '/CustomerIntegration/CustomerIntegrationService.svc/rest/GetShipmentInfo',
        JSON.stringify({ UserName: this.arasApiKey, TakipKodu: trackingNumber }),
        { Authorization: `Basic ${Buffer.from(`${this.arasApiKey}:`).toString('base64')}` },
      );

      const events = (response.ShipmentMoves ?? []).map((m: any) => ({
        date:        m.Date,
        location:    m.Location ?? '',
        description: m.ShipmentMoveDescription ?? '',
      }));

      return {
        trackingNumber,
        carrier: 'aras',
        status:  response.StatusDescription ?? 'Unknown',
        events,
      };
    } catch (err) {
      return this._mockTrack(trackingNumber, 'aras');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Yurtiçi Kargo
  // Docs: https://www.yurticikargo.com/tr/kurumsal-cozumler/api-entegrasyonu
  // ─────────────────────────────────────────────────────────────────────────────

  private async _yurticiCreate(params: ShipmentCreateParams): Promise<ShipmentResult> {
    try {
      const body = JSON.stringify({
        userLanguage: 'TR',
        merchantCode: this.yurticiMerchant,
        password:     this.yurticiPass,
        shipment: {
          invoiceKey:    params.orderId.slice(0, 20),
          invoiceDate:   new Date().toISOString().slice(0, 10),
          receiverName:  params.receiverName,
          receiverPhone: params.receiverPhone,
          receiverAddress: params.receiverAddress,
          cityName:      params.receiverCity,
          townName:      params.receiverDistrict,
          weight:        params.weight,
          desi:          params.desi ?? 0,
          pieceCount:    1,
          description:   params.description.slice(0, 50),
          productType:   1,  // 1=regular, 2=document
        },
      });

      const response = await this._httpPost(
        'ws.yurticikargo.com',
        '/ShipmentService/CreateShipment',
        body,
        { 'X-API-KEY': this.yurticiUser },
      );

      if (response.isSuccess) {
        return {
          success:        true,
          trackingNumber: String(response.cargoKey),
          carrier:        'yurtici',
          estimatedDays:  2,
        };
      }
      return {
        success:       false,
        trackingNumber: '',
        carrier:       'yurtici',
        errorMessage:  response.message ?? 'Yurtiçi API error',
      };
    } catch (err) {
      this.logger.error(`[Kargo] Yurtiçi create error: ${err.message}`);
      return { success: false, trackingNumber: '', carrier: 'yurtici', errorMessage: err.message };
    }
  }

  private async _yurticiTrack(trackingNumber: string): Promise<TrackingResult> {
    try {
      const response = await this._httpPost(
        'ws.yurticikargo.com',
        '/ShipmentService/QueryShipment',
        JSON.stringify({ cargoKey: trackingNumber, merchantCode: this.yurticiMerchant }),
        { 'X-API-KEY': this.yurticiUser },
      );

      const events = (response.shipmentMoves ?? []).map((m: any) => ({
        date:        m.date,
        location:    m.location ?? '',
        description: m.description ?? '',
      }));

      return {
        trackingNumber,
        carrier: 'yurtici',
        status:  response.statusDescription ?? 'Unknown',
        events,
      };
    } catch {
      return this._mockTrack(trackingNumber, 'yurtici');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private _httpPost(host: string, path: string, body: string, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        { host, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers } },
        (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error(`Invalid JSON: ${data.slice(0, 100)}`)); }
          });
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private _mockCreate(params: ShipmentCreateParams, carrier: string): ShipmentResult {
    const trackingNumber = `MOCK-${carrier.toUpperCase()}-${Date.now()}`;
    this.logger.warn(`[Kargo] Mock shipment created — tracking=${trackingNumber}`);
    return {
      success:        true,
      trackingNumber,
      carrier,
      estimatedDays:  3,
      labelUrl:       `https://mock-kargo.vibehub.dev/label/${trackingNumber}.pdf`,
      mock:           true,
    };
  }

  private _mockTrack(trackingNumber: string, carrier: string): TrackingResult {
    return {
      trackingNumber,
      carrier,
      status: 'In Transit (mock)',
      events: [
        { date: new Date().toISOString(), location: 'İstanbul Hub', description: 'Kargo teslimat merkezinde' },
        { date: new Date(Date.now() - 3600000).toISOString(), location: 'Sending Branch', description: 'Gönderici şubeden teslim alındı' },
      ],
      estimatedDelivery: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
      mock: true,
    };
  }
}
