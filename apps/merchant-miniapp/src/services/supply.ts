import { appAdapter } from '@/adapters/mock'

export const merchantSupplyService = appAdapter.merchantSupply

export const merchantSupplyDashboard = {
  getWorkbench: async () => {
    const [legacy, qualification, goods] = await Promise.all([
      appAdapter.getMerchantWorkbench(), merchantSupplyService.getQualification(), merchantSupplyService.getGoods(),
    ])
    const todos = legacy.todos.map(todo => ({ ...todo, label: todo.label === '待核销' ? '待自提/核销' : todo.label, value: todo.label === '待审核商品' ? goods.filter(goods => goods.auditStatus === 'TOBEAUDITED').length : todo.value }))
    return { ...legacy, merchant: { ...legacy.merchant, storeName: qualification.storeName }, qualification, todos, todoTotal: todos.reduce((sum, todo) => sum + todo.value, legacy.afterSales.value) }
  },
  getProfile: async () => {
    const [profile, qualification] = await Promise.all([appAdapter.getMerchantProfile(), merchantSupplyService.getQualification()])
    const groups = profile.groups.map(group => ({ ...group, items: group.items.filter(item => item.path !== '/pages/cooperation/status/index').map(item => item.path === '/pages/qualification/status/index' ? { ...item, label: '合作与经营资格', description: '合作协议、经营基础与正式交易条件' } : item) }))
    return { ...profile, groups, supplyQualification: qualification }
  },
}
