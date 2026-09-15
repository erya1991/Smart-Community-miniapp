import { readonly, ref } from 'vue'

export interface ResidentMember {
  id: string
  name: string
  mobile: string
}

const currentMember = ref<ResidentMember | null>(null)

export function initializeResidentContext() {
  if (!currentMember.value) {
    currentMember.value = { id: 'member-wang', name: '王阿姨', mobile: '138****5821' }
  }
}

export function useResidentContext() {
  return { currentMember: readonly(currentMember) }
}
