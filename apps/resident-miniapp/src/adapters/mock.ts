import { residentMockAdapter } from '../../../../packages/business-common/mock/resident'
import { createMallMockAdapter } from '../../../../packages/business-common/mock/mall'

export const appAdapter = {
  ...residentMockAdapter,
  ...createMallMockAdapter(),
  // P0 runs in one community; the discovery pages do not require a Project selector.
  getResidentCommunity: async () => ({ name: '大光路智慧社区' }),
}
