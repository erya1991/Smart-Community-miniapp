<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { initializeMerchantContext } from './stores/merchant-context'
import { initializeProjectContext } from './stores/project'

onLaunch(() => {
  initializeProjectContext()
  initializeMerchantContext()
})
</script>

<style lang="scss">
@import '../../../packages/theme/global.scss';
</style>
