<script setup lang="ts">
withDefaults(defineProps<{ steps: string[]; current: number; completed?: number }>(), { completed: 0 })
const emit = defineEmits<{ select: [step: number] }>()
</script>

<template>
  <view class="step-progress"><view v-for="(step, index) in steps" :key="step" class="step-progress__item" :class="{ 'step-progress__item--active': index + 1 === current, 'step-progress__item--done': index + 1 <= completed }" @click="emit('select', index + 1)"><view class="step-progress__number">{{ index + 1 }}</view><text>{{ step }}</text></view></view>
</template>

<style scoped lang="scss">
.step-progress { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: $space-4 $space-2; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-card; background: #fff; }
.step-progress__item { position: relative; display: flex; min-width: 0; min-height: 56px; align-items: center; flex-direction: column; gap: $space-1; color: $color-text-disabled; font-size: 12px; text-align: center; }
.step-progress__item:not(:last-child)::after { position: absolute; top: 15px; right: -14%; width: 28%; height: 2px; background: $color-border; content: ''; }
.step-progress__number { display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 50%; background: $color-group-bg; font-size: 14px; font-weight: 700; }
.step-progress__item--active, .step-progress__item--done { color: $color-primary; font-weight: 600; }
.step-progress__item--active .step-progress__number, .step-progress__item--done .step-progress__number { background: $color-primary; color: #fff; }
</style>
