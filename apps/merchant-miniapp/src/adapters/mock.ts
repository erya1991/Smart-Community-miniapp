import { merchantMockAdapter } from '../../../../packages/business-common/mock/merchant'
import { merchantCooperationMockAdapter } from '../../../../packages/business-common/mock/merchant-cooperation'
import { createMallMockAdapter } from '../../../../packages/business-common/mock/mall'
import { createMerchantSupplyMockAdapter } from './supply'

const legacyMall = createMallMockAdapter()

export const appAdapter = {
  ...merchantMockAdapter,
  ...merchantCooperationMockAdapter,
  ...legacyMall,
  merchantSupply: createMerchantSupplyMockAdapter(legacyMall.getMerchantProducts),
}
