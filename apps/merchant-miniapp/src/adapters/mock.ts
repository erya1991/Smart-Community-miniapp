import { merchantMockAdapter } from '../../../../packages/business-common/mock/merchant'
import { merchantCooperationMockAdapter } from '../../../../packages/business-common/mock/merchant-cooperation'
import { createSharedMallMockAdapter } from '../../../../packages/business-common/mock/shared-mall'
import { createMerchantSupplyMockAdapter } from './supply'

const legacyMall = createSharedMallMockAdapter()

export const appAdapter = {
  ...merchantMockAdapter,
  ...merchantCooperationMockAdapter,
  ...legacyMall,
  merchantSupply: createMerchantSupplyMockAdapter(legacyMall.getMerchantProducts),
}
