import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/category.dto';
import { UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findFirst({
      where: { OR: [{ slug: dto.slug }, { name: dto.name }] },
    });
    if (exists) {
      throw new ConflictException('A category with this name or slug already exists');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.slug && dto.slug !== category.slug) {
      const conflict = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException('Slug already in use');
    }
    if (dto.name && dto.name !== category.name) {
      const conflict = await this.prisma.category.findUnique({ where: { name: dto.name } });
      if (conflict) throw new ConflictException('Name already in use');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name              !== undefined && { name:              dto.name }),
        ...(dto.nameEn            !== undefined && { nameEn:            dto.nameEn }),
        ...(dto.slug              !== undefined && { slug:              dto.slug }),
        ...(dto.icon              !== undefined && { icon:              dto.icon }),
        ...(dto.sortOrder         !== undefined && { sortOrder:         dto.sortOrder }),
        ...(dto.active            !== undefined && { active:            dto.active }),
        ...(dto.attributeSchema   !== undefined && { attributeSchema:   dto.attributeSchema   as any }),
        ...(dto.sizeChartTemplate !== undefined && { sizeChartTemplate: dto.sizeChartTemplate as any }),
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    // Detach products from this category before deleting
    await this.prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    return this.prisma.category.delete({ where: { id } });
  }
}
