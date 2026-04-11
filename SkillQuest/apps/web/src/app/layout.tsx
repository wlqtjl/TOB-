import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkillQuest — 游戏化产品技能培训平台',
  description:
    '对标 Data Center 游戏级炫酷效果，将华为/锐捷/SmartX等To-B产品培训变成闯关游戏。',
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
