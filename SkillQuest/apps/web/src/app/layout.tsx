import type { Metadata } from 'next';
import { tenantConfig } from '../lib/tenant-config';
import './globals.css';

const tenant = tenantConfig();

export const metadata: Metadata = {
  title: `${tenant.platformName} — 游戏化技能培训`,
  description: `${tenant.companyName} ${tenant.tagline}`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
