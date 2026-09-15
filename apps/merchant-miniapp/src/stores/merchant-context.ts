import { readonly, ref } from 'vue'

export interface MerchantOperator {
  id: string
  name: string
}

export interface MerchantStore {
  id: string
  name: string
}

export interface MerchantStaff {
  id: string
  name: string
  role: string
}

const currentOperator = ref<MerchantOperator | null>(null)
const currentStore = ref<MerchantStore | null>(null)
const currentMerchantStaff = ref<MerchantStaff | null>(null)

export function initializeMerchantContext() {
  if (!currentOperator.value) currentOperator.value = { id: 'operator-linli', name: '邻里生鲜' }
  if (!currentStore.value) currentStore.value = { id: 'store-daguanglu', name: '大光路店' }
  if (!currentMerchantStaff.value) currentMerchantStaff.value = { id: 'staff-owner', name: '商户负责人', role: '负责人' }
}

export function useMerchantContext() {
  return {
    currentOperator: readonly(currentOperator),
    currentStore: readonly(currentStore),
    currentMerchantStaff: readonly(currentMerchantStaff),
  }
}
