import { appAdapter } from '@/adapters/mock'
export const merchantAfterSaleService = {
  getList: () => appAdapter.getMerchantAfterSales(),
  get: (id: string) => appAdapter.getMerchantAfterSale(id),
  getOrderRecords: (orderId: string) => appAdapter.getMerchantOrderAfterSales(orderId),
  approve: (id: string) => appAdapter.approveAfterSale(id),
  reject: (id: string, reason: string) => appAdapter.rejectAfterSale(id, reason),
  confirmReturn: (id: string) => appAdapter.confirmReturnReceived(id),
}
