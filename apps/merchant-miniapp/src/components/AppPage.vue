<script setup lang="ts">
import MerchantAppPage from './MerchantAppPage.vue'
import type { PageStatus } from '@/types/app'

withDefaults(defineProps<{
  status?: PageStatus
  stateMessage?: string
  secondary?: boolean
  withBottomAction?: boolean
}>(), {
  status: 'ready',
  stateMessage: '',
  secondary: false,
  withBottomAction: false,
})

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <MerchantAppPage :status="status" :state-message="stateMessage" :secondary="secondary" :with-bottom-action="withBottomAction" @retry="emit('retry')">
    <template #navbar><slot name="navbar" /></template>
    <slot />
    <template #tabbar><slot name="tabbar" /></template>
  </MerchantAppPage>
</template>
