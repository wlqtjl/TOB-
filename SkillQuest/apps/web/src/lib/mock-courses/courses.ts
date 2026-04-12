/**
 * Course catalog — single-tenant B2B deployment
 *
 * In production, courses are created by the deploying company (via document
 * import or manual creation). The vendor field is the deploying company.
 *
 * For demo purposes, this shows SmartX as the example tenant with multiple
 * product training courses under one company.
 */

export interface CourseInfo {
  id: string;
  title: string;
  vendor: string;
  category: 'network' | 'virtualization' | 'storage' | 'security' | 'cloud';
  description: string;
  icon: string;
  levelCount: number;
  passedCount: number;
  totalStars: number;
  earnedStars: number;
  xp: number;
  userLevel: number;
}

export const COURSES: CourseInfo[] = [
  {
    id: 'smartx-halo',
    title: 'SMTX OS 超融合部署',
    vendor: 'SmartX',
    category: 'virtualization',
    description: 'SMTX OS 超融合集群：ZBS分布式存储、ELF虚拟化、CloudTower管理',
    icon: '🔷',
    levelCount: 8,
    passedCount: 4,
    totalStars: 24,
    earnedStars: 11,
    xp: 1680,
    userLevel: 6,
  },
  {
    id: 'smartx-migration',
    title: 'VMware 迁移实战',
    vendor: 'SmartX',
    category: 'virtualization',
    description: '从 VMware 迁移到 SMTX OS：V2V工具、兼容性评估、迁移步骤',
    icon: '🔄',
    levelCount: 6,
    passedCount: 2,
    totalStars: 18,
    earnedStars: 5,
    xp: 920,
    userLevel: 4,
  },
  {
    id: 'smartx-zbs',
    title: 'ZBS 分布式存储原理',
    vendor: 'SmartX',
    category: 'storage',
    description: 'ZBS 架构深度解析：数据分布、副本策略、故障恢复、性能优化',
    icon: '💾',
    levelCount: 8,
    passedCount: 3,
    totalStars: 24,
    earnedStars: 8,
    xp: 1250,
    userLevel: 5,
  },
  {
    id: 'smartx-cloudtower',
    title: 'CloudTower 运维管理',
    vendor: 'SmartX',
    category: 'cloud',
    description: 'CloudTower 多集群管理：监控告警、资源调度、自动化运维、API集成',
    icon: '🏗️',
    levelCount: 6,
    passedCount: 1,
    totalStars: 18,
    earnedStars: 3,
    xp: 650,
    userLevel: 3,
  },
];

export function getCourse(courseId: string): CourseInfo | undefined {
  return COURSES.find((c) => c.id === courseId);
}

export function getCourseIds(): string[] {
  return COURSES.map((c) => c.id);
}

export function getDefaultCourseId(): string {
  return COURSES[0].id;
}
