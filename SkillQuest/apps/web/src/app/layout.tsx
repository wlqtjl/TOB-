import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkillQuest — 游戏化产品技能培训平台',
  description:
    '通用游戏化产品技能培训平台，支持华为/深信服/安超云/锐捷/SmartX等任意厂商课程闯关。',
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
