import { stage2Enabled } from '../adapters/stage2-http'
import { appAdapter } from '@/adapters/mock'
import type { CreateAfterSaleInput, ReturnShipmentInput } from '../../../../packages/common/types/after-sale'

const legacy = {
  getEligibility: (orderId: string, skuId: string, quantity = 1) => appAdapter.getAfterSaleEligibility(orderId, skuId, quantity),
  create: (input: CreateAfterSaleInput) => appAdapter.createAfterSale(input),
  get: (id: string) => appAdapter.getResidentAfterSale(id),
  getOrderRecords: (orderId: string) => appAdapter.getOrderAfterSales(orderId),
  cancel: (id: string) => appAdapter.cancelAfterSale(id),
  submitReturn: (id: string, input: ReturnShipmentInput) => appAdapter.submitReturnShipment(id, input),
  getReturnCompanies: () => appAdapter.getLogisticsCompanies(),
}

const unavailable = async (): Promise<never> => { throw new Error('本期未开放售后，请保留交易编号并联系负责人。') }
export const residentAfterSaleService = stage2Enabled ? { getEligibility: unavailable, create: unavailable, get: unavailable, getOrderRecords: unavailable, cancel: unavailable, submitReturn: unavailable, getReturnCompanies: unavailable } : legacy
