import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ApiResponse } from '../common/response.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Categories')
@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ── Public routes ────────────────────────────────────────────────────────────

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get all active categories (public)' })
  async findAll() {
    const data = await this.categoryService.findAllActive();
    return ApiResponse.ok(data, 'Categories retrieved');
  }

  @Public()
  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get category by slug (public)' })
  async findOne(@Param('slug') slug: string) {
    const data = await this.categoryService.findBySlug(slug);
    return ApiResponse.ok(data, 'Category retrieved');
  }

  // ── Admin routes ─────────────────────────────────────────────────────────────

  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Get('admin/categories')
  @ApiOperation({ summary: 'Get all categories including inactive (admin)' })
  async adminFindAll() {
    const data = await this.categoryService.findAll();
    return ApiResponse.ok(data, 'All categories retrieved');
  }

  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Post('admin/categories')
  @ApiOperation({ summary: 'Create a category (admin)' })
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.categoryService.create(dto);
    return ApiResponse.ok(data, 'Category created');
  }

  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Patch('admin/categories/:id')
  @ApiOperation({ summary: 'Update a category (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const data = await this.categoryService.update(id, dto);
    return ApiResponse.ok(data, 'Category updated');
  }

  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Delete('admin/categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category (admin)' })
  async remove(@Param('id') id: string) {
    const data = await this.categoryService.remove(id);
    return ApiResponse.ok(data, 'Category deleted');
  }
}
