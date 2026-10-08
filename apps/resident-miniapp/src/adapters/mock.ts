import { residentMockAdapter } from '../../../../packages/business-common/mock/resident'
import { createSharedMallMockAdapter } from '../../../../packages/business-common/mock/shared-mall'

export const appAdapter = {
  ...residentMockAdapter,
  ...createSharedMallMockAdapter(),
  // P0 runs in one community; the discovery pages do not require a Project selector.
  getResidentCommunity: async () => ({ name: '大光路智慧社区' }),
}
