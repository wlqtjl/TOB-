/**
 * Tenant Configuration — White-Label B2B Customization
 *
 * This is the single configuration point for the deploying company.
 * When a vendor (e.g. SmartX, Sangfor, etc.) deploys this platform,
 * they customize this file (or provide ENV vars) to brand the platform
 * as their own.
 *
 * In production, this config is loaded from:
 * 1. Environment variables (NEXT_PUBLIC_TENANT_*)
 * 2. API endpoint (GET /api/tenant/config)
 * 3. This file as fallback defaults
 */

export interface TenantConfig {
  /** Company/brand name displayed in the platform */
  companyName: string;
  /** Platform name — can be customized or use default */
  platformName: string;
  /** Short tagline shown on the homepage */
  tagline: string;
  /** Company logo URL (optional — falls back to emoji icon) */
  logoUrl: string;
  /** Emoji icon fallback when no logo */
  icon: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Copyright text */
  copyright: string;
  /** Support email */
  supportEmail: string;
  /** Default course category filter */
  defaultCategory: string;
  /** Custom welcome message */
  welcomeMessage: string;
  /** Admin console title */
  adminTitle: string;
}

/**
 * Read tenant config from environment variables with sensible defaults.
 *
 * Deploying companies override these via .env.local or deployment env:
 *
 *   NEXT_PUBLIC_TENANT_COMPANY=SmartX
 *   NEXT_PUBLIC_TENANT_PLATFORM=SmartX 培训学院
 *   NEXT_PUBLIC_TENANT_TAGLINE=超融合技术认证培训平台
 *   NEXT_PUBLIC_TENANT_LOGO_URL=/branding/smartx-logo.svg
 *   NEXT_PUBLIC_TENANT_ICON=🔷
 *   NEXT_PUBLIC_TENANT_PRIMARY_COLOR=#2563eb
 *   NEXT_PUBLIC_TENANT_COPYRIGHT=© 2026 SmartX Inc.
 *   NEXT_PUBLIC_TENANT_SUPPORT_EMAIL=training@smartx.com
 */
export function getTenantConfig(): TenantConfig {
  return {
    companyName:    process.env.NEXT_PUBLIC_TENANT_COMPANY        ?? 'SmartX',
    platformName:   process.env.NEXT_PUBLIC_TENANT_PLATFORM       ?? 'SmartX 培训学院',
    tagline:        process.env.NEXT_PUBLIC_TENANT_TAGLINE        ?? '超融合技术认证培训平台',
    logoUrl:        process.env.NEXT_PUBLIC_TENANT_LOGO_URL       ?? '',
    icon:           process.env.NEXT_PUBLIC_TENANT_ICON           ?? '🔷',
    primaryColor:   process.env.NEXT_PUBLIC_TENANT_PRIMARY_COLOR  ?? '#2563eb',
    copyright:      process.env.NEXT_PUBLIC_TENANT_COPYRIGHT      ?? '© 2026 SmartX Inc. All rights reserved.',
    supportEmail:   process.env.NEXT_PUBLIC_TENANT_SUPPORT_EMAIL  ?? 'training@smartx.com',
    defaultCategory: process.env.NEXT_PUBLIC_TENANT_CATEGORY      ?? 'virtualization',
    welcomeMessage: process.env.NEXT_PUBLIC_TENANT_WELCOME        ?? '欢迎使用 SmartX 超融合技术培训平台',
    adminTitle:     process.env.NEXT_PUBLIC_TENANT_ADMIN_TITLE    ?? '课程管理后台',
  };
}

/** Singleton — cached on first call */
let _cached: TenantConfig | null = null;
export function tenantConfig(): TenantConfig {
  if (!_cached) _cached = getTenantConfig();
  return _cached;
}
