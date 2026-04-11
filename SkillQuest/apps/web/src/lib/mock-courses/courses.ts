/**
 * Course catalog — multi-vendor
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
    id: 'huawei-hcia-datacom',
    title: '华为 HCIA-Datacom',
    vendor: '华为',
    category: 'network',
    description: '数通基础认证：VLAN、路由协议、VRP命令行',
    icon: '🌐',
    levelCount: 8,
    passedCount: 3,
    totalStars: 24,
    earnedStars: 8,
    xp: 1250,
    userLevel: 5,
  },
  {
    id: 'sangfor-hci',
    title: '深信服超融合 HCI',
    vendor: '深信服',
    category: 'virtualization',
    description: '超融合部署：aSAN存储、虚拟机调度、高可用、备份恢复',
    icon: '🏗️',
    levelCount: 8,
    passedCount: 2,
    totalStars: 24,
    earnedStars: 5,
    xp: 980,
    userLevel: 4,
  },
  {
    id: 'anchao-cloud',
    title: '安超云 OS',
    vendor: '安超',
    category: 'cloud',
    description: '私有云部署：云主机管理、存储策略、网络虚拟化、监控运维',
    icon: '☁️',
    levelCount: 8,
    passedCount: 1,
    totalStars: 24,
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
