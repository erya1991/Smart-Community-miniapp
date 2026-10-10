import { appAdapter } from '@/adapters/mock'
/** Demo-only platform simulator. Not an ordinary merchant operation or a payment API. */
export const platformRefundDemoService = {
  process: (id: string, outcome: 'processing' | 'success' | 'failure') => appAdapter.processPlatformRefundDemo(id, outcome),
}
