import { ref, watch, type Ref } from 'vue'
import { stage2Mall } from '../../services/stage2-mall'
import { stage2Enabled, stage2Owner } from '../../adapters/stage2-http'

export function useStage2HomeSections<T extends { sectionErrors: Record<string, string> }>(data: Ref<T | null>, productLimit?: number) {
  const busy = ref<Record<string, boolean>>({})
  let generation = 0
  if (stage2Enabled) watch(stage2Owner, () => {
    generation++
    busy.value = {}
    if (data.value) {
      const sectionErrors = { ...data.value.sectionErrors }; delete sectionErrors.cart
      data.value = { ...data.value, cartCount: 0, sectionErrors }
    }
  }, { flush: 'sync' })
  const retry = async (section: 'categories' | 'products' | 'cart') => {
    if (busy.value[section] || !data.value) return
    const owner = stage2Owner(), original = data.value, version = generation
    busy.value[section] = true
    try {
      const patch = await stage2Mall.homeSection(section)
      if (owner !== stage2Owner() || data.value !== original) return
      if (patch.products && productLimit) patch.products = patch.products.slice(0, productLimit)
      const sectionErrors = { ...data.value.sectionErrors }; delete sectionErrors[section]
      if ('sectionErrors' in patch) Object.assign(sectionErrors, patch.sectionErrors)
      data.value = { ...data.value, ...patch, sectionErrors }
    } catch (error) {
      if (owner === stage2Owner() && data.value === original) data.value.sectionErrors[section] = error instanceof Error ? error.message : '暂未加载，请重试。'
    } finally { if (version === generation) busy.value[section] = false }
  }
  return { retry, busy }
}
