import type { NavItem } from '@/types/app'

export const merchantTabItems: NavItem[] = [
  { label: '工作台', path: '/pages/workbench/index', icon: 'dashboard' },
  { label: '经营', path: '/pages/operation/index', icon: 'store' },
  { label: '订单', path: '/pages/order/index', icon: 'order' },
  { label: '我的', path: '/pages/profile/index', icon: 'user' },
]
