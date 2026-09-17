<template>
  <view class="bottom-action"><view class="bottom-action__inner"><slot /></view></view>
</template>

<style scoped lang="scss">
.bottom-action { position: fixed; z-index: 20; right: 0; bottom: 0; left: 0; padding: $space-3 $page-gutter calc(env(safe-area-inset-bottom) + #{$space-3}); border-top: 1px solid rgba(225, 228, 230, 0.8); background: rgba(255, 255, 255, 0.96); }
.bottom-action__inner { display: flex; width: 100%; max-width: 358px; margin: 0 auto; gap: $space-3; }
.bottom-action__inner :deep(.app-button) { flex: 1; }
</style>
