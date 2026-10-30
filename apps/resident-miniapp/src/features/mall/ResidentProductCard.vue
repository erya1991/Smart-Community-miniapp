<script setup lang="ts">
import { computed, ref, watch } from 'vue'
// #ifdef H5
import SharedProductCard from '../../../../../packages/ui/components/ProductCard.vue'
// #endif
// #ifndef H5
import MiniProductCard from '@/components/ProductCard.vue'
// #endif
import { stage2Asset } from '../../services/stage2-assets'
import { stage2Owner, stage2Enabled } from '../../adapters/stage2-http'
import type { ProductSummary } from '../../../../../packages/common/types/app'
import type { ResidentMallProductSummary } from '../../../../../packages/common/types/mall'
type Product = ProductSummary | ResidentMallProductSummary
const props = withDefaults(defineProps<{ product: Product; variant?: 'default' | 'home' }>(), { variant: 'default' })
const emit = defineEmits<{ add: [product: Product]; open: [product: Product] }>()
const cardProduct=computed(()=>{const value={...props.product};if(stage2Enabled)delete (value as {salesCount?:number}).salesCount;return value as Product})
const priceKnown=computed(()=>!stage2Enabled||(Number.isFinite(props.product.price)&&props.product.price>0))
const image = ref(''), imageFailed = ref(false)
let sequence = 0
async function load() { const current = ++sequence, owner = stage2Owner(); image.value = ''; imageFailed.value = false; try { const src = await stage2Asset(props.product.image || ''); if (current === sequence && owner === stage2Owner()) image.value = src } catch { if (current === sequence) imageFailed.value = true } }
watch([() => props.product.image, stage2Owner], load, { immediate: true })
</script>
<template><view class="resident-product"><template v-if="priceKnown"><!-- #ifdef H5 --><SharedProductCard :product="{...cardProduct,image}" :variant="variant" :show-sales="!stage2Enabled" @open="emit('open',product)" @add="emit('add',product)"/><!-- #endif --><!-- #ifndef H5 --><MiniProductCard :product="{...cardProduct,image}" :variant="variant" @open="emit('open',product)" @add="emit('add',product)"/><!-- #endif --></template><view v-else class="unverified" @click="emit('open',product)"><image v-if="image" :src="image" mode="aspectFill"/><text>{{product.name}}</text><text>{{'storeName' in product?product.storeName:product.merchantName}}</text><text>价格未核实，请进入详情重新读取</text></view><text v-if="imageFailed" class="image-error" @click.stop="load">图片暂不可用，点此重试</text></view></template>
<style scoped lang="scss">.unverified{padding:12px;min-height:220px;border-radius:16px;background:#fff;font-size:14px;line-height:24px}.unverified text{display:block}.unverified image{width:100%;height:164px}.resident-product{position:relative}.image-error{display:block;min-height:44px;padding:8px;color:$color-text-secondary;font-size:13px;line-height:22px;text-align:center;background:$color-card-bg}</style>
