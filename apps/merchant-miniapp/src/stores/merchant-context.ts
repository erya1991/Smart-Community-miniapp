import { readonly, ref } from 'vue'
import type { ApplicationStatus, MerchantCooperationPermissions } from '@/types/merchant-cooperation'

export interface MerchantOperatorApplicationContext {
  id: string
  status: ApplicationStatus
}

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

const currentOperatorApplication = ref<MerchantOperatorApplicationContext | null>(null)
const currentOperator = ref<MerchantOperator | null>(null)
const currentStore = ref<MerchantStore | null>(null)
const currentMerchantStaff = ref<MerchantStaff | null>(null)

export function initializeMerchantContext() {
  if (!currentOperatorApplication.value) currentOperatorApplication.value = { id: 'application-001', status: 'approved' }
  if (!currentOperator.value) currentOperator.value = { id: 'operator-linli', name: '邻里生鲜' }
  if (!currentStore.value) currentStore.value = { id: 'store-daguanglu', name: '大光路店' }
  if (!currentMerchantStaff.value) currentMerchantStaff.value = { id: 'staff-owner', name: '商户负责人', role: '负责人' }
}

export function useMerchantContext() {
  const permissions: MerchantCooperationPermissions = currentMerchantStaff.value?.role === '负责人'
    ? { canView: true, canCreate: true, canEdit: true, canDisable: true, canTransferOwner: true }
    : { canView: true, canCreate: false, canEdit: false, canDisable: false, canTransferOwner: false }
  return {
    currentOperatorApplication: readonly(currentOperatorApplication),
    currentOperator: readonly(currentOperator),
    currentStore: readonly(currentStore),
    currentMerchantStaff: readonly(currentMerchantStaff),
    permissions: readonly(ref(permissions)),
  }
}
