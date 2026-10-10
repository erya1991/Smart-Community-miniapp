import { appAdapter } from '@/adapters/mock'
import type { CreateAfterSaleInput, ReturnShipmentInput } from '../../../../packages/common/types/after-sale'

export const residentAfterSaleService = {
  getEligibility: (orderId: string, skuId: string, quantity = 1) => appAdapter.getAfterSaleEligibility(orderId, skuId, quantity),
  create: (input: CreateAfterSaleInput) => appAdapter.createAfterSale(input),
  get: (id: string) => appAdapter.getResidentAfterSale(id),
  getOrderRecords: (orderId: string) => appAdapter.getOrderAfterSales(orderId),
  cancel: (id: string) => appAdapter.cancelAfterSale(id),
  submitReturn: (id: string, input: ReturnShipmentInput) => appAdapter.submitReturnShipment(id, input),
  getReturnCompanies: () => appAdapter.getLogisticsCompanies(),
}
