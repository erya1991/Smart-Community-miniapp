import { merchantMockAdapter } from '../../../../packages/business-common/mock/merchant'
import { merchantCooperationMockAdapter } from '../../../../packages/business-common/mock/merchant-cooperation'

export const appAdapter = {
  ...merchantMockAdapter,
  ...merchantCooperationMockAdapter,
}
