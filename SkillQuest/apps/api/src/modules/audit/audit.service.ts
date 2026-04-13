/**
 * Audit Service — 审计日志记录 + 查询
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** 记录审计日志 */
  async log(data: { userId: string; tenantId: string; action: string; resource?: string; resourceId?: string; details?: Record<string, unknown>; ipAddress?: string; userAgent?: string }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        action: data.action,
        resource: data.resource ?? '',
        resourceId: data.resourceId ?? '',
        details: (data.details ?? {}) as object,
        ipAddress: data.ipAddress ?? '',
        userAgent: data.userAgent ?? '',
      },
    });
  }

  /** 查询审计日志 */
  async query(filters: { tenantId?: string; userId?: string; action?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
    const where: Record<string, unknown> = {};
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Record<string, unknown>).gte = new Date(filters.from);
      if (filters.to) (where.createdAt as Record<string, unknown>).lte = new Date(filters.to);
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }

  /** 导出审计日志 */
  async exportLogs(tenantId: string, from: string, to: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
