<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { initializeMerchantContext, refreshMerchantContext } from './stores/merchant-context'
import { initializeProjectContext } from './stores/project'

onLaunch(() => {
  initializeProjectContext()
  initializeMerchantContext()
})

onShow(() => {
  // Recheck server authority on foregrounding; restoration alone never grants a Store identity.
  void refreshMerchantContext()
})
</script>

<style lang="scss">
@import '../../../packages/theme/global.scss';
</style>
