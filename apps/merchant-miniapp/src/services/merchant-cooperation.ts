import { appAdapter } from '@/adapters/mock'
import type { MerchantCooperationService } from '@/types/merchant-cooperation'

// Pages depend on this stable contract. Replace only the adapter when real APIs are available.
export const merchantCooperationService: MerchantCooperationService = appAdapter
