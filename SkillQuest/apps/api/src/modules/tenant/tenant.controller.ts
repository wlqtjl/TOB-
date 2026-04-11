/**
 * Tenant Controller — 租户管理 API
 */

import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenants: TenantService) {}

  @Post()
  create(@Body() body: { name: string; domain?: string; plan?: 'FREE' | 'PRO' | 'ENTERPRISE' }) {
    return this.tenants.create(body);
  }

  @Get()
  findAll() {
    return this.tenants.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tenants.findById(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; domain?: string; plan?: 'FREE' | 'PRO' | 'ENTERPRISE'; maxUsers?: number },
  ) {
    return this.tenants.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenants.remove(id);
  }
}
