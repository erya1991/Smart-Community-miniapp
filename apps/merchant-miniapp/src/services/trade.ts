import { appAdapter } from '@/adapters/mock'
import type { LogisticsShipmentInput } from '../../../../packages/common/types/mall'

/** Merchant trade boundary. Replace only the adapter when Trade/Pay APIs are available. */
export const merchantTradeService = {
  getWorkbench: () => appAdapter.getMerchantWorkbench(),
  getOrders: () => appAdapter.getMerchantOrders(),
  getOrder: (id: string) => appAdapter.getMerchantTradeOrder(id),
  getContext: () => appAdapter.getMerchantContext(),
  getDemoStores: () => appAdapter.getMerchantDemoStores(),
  setStoreDemo: (id: string) => appAdapter.setMerchantContextDemo(id),
  getLogisticsCompanies: () => appAdapter.getLogisticsCompanies(),
  ship: (id: string, input: LogisticsShipmentInput) => appAdapter.shipLogistics(id, input),
  fulfill: (id: string, action: 'finish-preparing' | 'start-delivery' | 'mark-delivered') => appAdapter.merchantFulfill(id, action),
  saveRemark: (id: string, remark: string) => appAdapter.saveMerchantRemark(id, remark),
  lookupVerification: (code: string) => appAdapter.lookupVerification(code),
  confirmVerification: (id: string) => appAdapter.confirmVerification(id),
}
