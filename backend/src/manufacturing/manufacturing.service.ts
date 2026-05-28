import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateManufacturingUnitDto,
  UpdateManufacturingUnitDto,
} from './dto/manufacturing.dto';

/**
 * Shared catalogue of manufacturing unit costs. Owned by GOD_USER — the
 * cost figure is internal/sensitive and PLATFORM_ADMIN can read but not
 * write. Linked from Product.manufacturingUnitId for VIBEHUB_MANAGED items;
 * read at order time by the line-split helper to compute lane-1 payouts.
 *
 * Soft-delete via `active = false` is preferred over hard delete so any
 * already-linked products keep showing a sensible label in the admin UI,
 * even though the snapshot on the OrderItem is what actually drives money.
 */
@Injectable()
export class ManufacturingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(includeInactive = false) {
    return this.prisma.manufacturingUnit.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.manufacturingUnit.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!unit) throw new NotFoundException('Üretim birimi bulunamadı');
    return unit;
  }

  async create(dto: CreateManufacturingUnitDto, actorId: string) {
    const conflict = await this.prisma.manufacturingUnit.findFirst({
      where: { name: dto.name },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(`"${dto.name}" adında bir üretim birimi zaten var`);
    }

    const unit = await this.prisma.manufacturingUnit.create({
      data: {
        name:        dto.name,
        unitCostTRY: dto.unitCostTRY,
        notes:       dto.notes ?? null,
        active:      dto.active ?? true,
      },
    });

    await this.audit.log({
      actorId,
      action: 'MANUFACTURING_UNIT_CREATED',
      targetType: 'ManufacturingUnit',
      targetId: unit.id,
      metadata: { name: unit.name, unitCostTRY: Number(unit.unitCostTRY) },
    });

    return unit;
  }

  async update(id: string, dto: UpdateManufacturingUnitDto, actorId: string) {
    const existing = await this.prisma.manufacturingUnit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Üretim birimi bulunamadı');

    if (dto.name && dto.name !== existing.name) {
      const conflict = await this.prisma.manufacturingUnit.findFirst({
        where: { name: dto.name, id: { not: id } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(`"${dto.name}" adında başka bir üretim birimi zaten var`);
      }
    }

    const updated = await this.prisma.manufacturingUnit.update({
      where: { id },
      data: {
        ...(dto.name        !== undefined && { name:        dto.name }),
        ...(dto.unitCostTRY !== undefined && { unitCostTRY: dto.unitCostTRY }),
        ...(dto.notes       !== undefined && { notes:       dto.notes }),
        ...(dto.active      !== undefined && { active:      dto.active }),
      },
    });

    await this.audit.log({
      actorId,
      action: 'MANUFACTURING_UNIT_UPDATED',
      targetType: 'ManufacturingUnit',
      targetId: id,
      metadata: {
        before: { name: existing.name, unitCostTRY: Number(existing.unitCostTRY), active: existing.active },
        after:  { name: updated.name,  unitCostTRY: Number(updated.unitCostTRY),  active: updated.active  },
      },
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.manufacturingUnit.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new NotFoundException('Üretim birimi bulunamadı');

    // Hard delete only when no product still references it. Otherwise force
    // soft-delete (active=false) so the FK chain stays intact for any
    // historical product the unit was attached to.
    if (existing._count.products > 0) {
      throw new BadRequestException(
        `Bu üretim birimi ${existing._count.products} ürüne bağlı. Önce ürünleri başka bir birime taşı ya da bağlantılarını kaldır — alternatif olarak "Pasif" yaparak arşivleyebilirsin.`,
      );
    }

    await this.prisma.manufacturingUnit.delete({ where: { id } });

    await this.audit.log({
      actorId,
      action: 'MANUFACTURING_UNIT_DELETED',
      targetType: 'ManufacturingUnit',
      targetId: id,
      metadata: { name: existing.name, unitCostTRY: Number(existing.unitCostTRY) },
    });

    return { deleted: true };
  }
}
