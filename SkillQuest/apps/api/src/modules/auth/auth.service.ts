/**
 * Auth Service — JWT + bcrypt
 */

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma.service';

const JWT_SECRET = process.env.JWT_SECRET ?? 'skillquest-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(data: {
    email: string;
    password: string;
    displayName: string;
    tenantId: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('邮箱已注册');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        displayName: data.displayName,
        tenantId: data.tenantId,
      },
    });

    return {
      user: this.sanitizeUser(user),
      token: this.signToken(user),
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    return {
      user: this.sanitizeUser(user),
      token: this.signToken(user),
    };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        tenant: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new UnauthorizedException('用户不存在');
    return this.sanitizeUser(user);
  }

  private signToken(user: { id: string; email: string; role: string; tenantId: string }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { password: _, ...safe } = user;
    return safe;
  }
}
