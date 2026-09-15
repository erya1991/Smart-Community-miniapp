<script setup lang="ts">
import PageState from './PageState.vue'
import type { PageStatus } from '../../common/types/app'

withDefaults(defineProps<{
  status?: PageStatus
  stateMessage?: string
}>(), {
  status: 'ready',
  stateMessage: '',
})

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <view class="app-page">
    <slot name="navbar" />
    <view v-if="status === 'ready'" class="app-page__content">
      <slot />
    </view>
    <PageState v-else :status="status" :message="stateMessage" @retry="emit('retry')" />
    <slot name="tabbar" />
  </view>
</template>

<style scoped lang="scss">
.app-page {
  width: 100%;
  max-width: 390px;
  min-height: 100vh;
  margin: 0 auto;
  background: $color-page-bg;
}
</style>
