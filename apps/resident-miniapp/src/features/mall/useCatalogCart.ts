import { ref, watch } from 'vue'
import { stage2Enabled, stage2Owner } from '@/adapters/stage2-http'
import { residentMallService } from '@/services/mall'
import { openSubPage } from '@/utils/navigation'
import type { ProductSummary } from '../../../../../packages/common/types/app'
import type { ResidentMallProductSummary } from '../../../../../packages/common/types/mall'

export function useCatalogCart(onAdded?: () => Promise<void> | void) {
  const addingProductId = ref('')
  const actionMessage = ref('')
  let sequence = 0
  if (stage2Enabled) watch(stage2Owner, () => { sequence++; addingProductId.value = ''; actionMessage.value = '' }, { flush: 'sync' })

  const addCart = async (product: ProductSummary | ResidentMallProductSummary) => {
    if (addingProductId.value) return
    const version = ++sequence, owner = stage2Enabled ? stage2Owner() : ''
    const current = () => version === sequence && (!stage2Enabled || owner === stage2Owner())
    addingProductId.value = product.id
    actionMessage.value = ''
    try {
      const detail = await residentMallService.getDetail(product.id)
      if (!current()) return
      if (detail.skus.length > 1) {
        openSubPage(`/pages/mall/detail/index?id=${encodeURIComponent(product.id)}`)
        return
      }
      await residentMallService.addCart(product.id, detail.currentSkuId, Math.round(product.price * 100))
      if (!current()) return
      uni.showToast({ title: '已加入购物车', icon: 'success' })
      await onAdded?.()
    } catch (error) {
      if (!current()) return
      actionMessage.value = error instanceof Error ? error.message : '加入购物车失败，请稍后重试。'
      uni.showToast({ title: actionMessage.value, icon: 'none' })
    } finally {
      if (current()) addingProductId.value = ''
    }
  }

  return { addingProductId, actionMessage, addCart }
}
