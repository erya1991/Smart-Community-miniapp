import { appAdapter } from '@/adapters/mock'

/** Merchant trade boundary. Replace only the adapter when Trade/Pay APIs are available. */
export const merchantTradeService = {
  getWorkbench: () => appAdapter.getMerchantWorkbench(),
  getOrders: () => appAdapter.getMerchantOrders(),
  getOrder: (id: string) => appAdapter.getTradeOrder(id),
  fulfill: (id: string, action: 'finish-preparing' | 'start-delivery' | 'mark-delivered') => appAdapter.merchantFulfill(id, action),
  saveRemark: (id: string, remark: string) => appAdapter.saveMerchantRemark(id, remark),
  lookupVerification: (code: string) => appAdapter.lookupVerification(code),
  confirmVerification: (id: string) => appAdapter.confirmVerification(id),
}
