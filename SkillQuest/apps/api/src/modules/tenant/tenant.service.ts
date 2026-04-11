/**
 * Tenant Service — 租户 CRUD
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; domain?: string; plan?: 'FREE' | 'PRO' | 'ENTERPRISE' }) {
    const existing = await this.prisma.tenant.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new ConflictException('租户名已存在');
    }
    return this.prisma.tenant.create({
      data: {
        name: data.name,
        domain: data.domain ?? '',
        plan: data.plan ?? 'FREE',
      },
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      include: { _count: { select: { users: true, courses: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { _count: { select: { users: true, courses: true } } },
    });
    if (!tenant) throw new NotFoundException('租户不存在');
    return tenant;
  }

  async update(id: string, data: { name?: string; domain?: string; plan?: 'FREE' | 'PRO' | 'ENTERPRISE'; maxUsers?: number }) {
    await this.findById(id);
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.tenant.delete({ where: { id } });
  }
}
