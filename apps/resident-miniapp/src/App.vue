<script setup lang="ts">
import { stage2Enabled, stage2Owner } from './adapters/stage2-http'
import { configurePageResourceScope } from '../../../packages/common/composables/usePageResource'
if (stage2Enabled) configurePageResourceScope(stage2Owner)
import { onLaunch } from '@dcloudio/uni-app'
import { initializeResidentContext } from './stores/member'
import { initializeProjectContext } from './stores/project'

onLaunch(() => {
  initializeProjectContext()
  initializeResidentContext()
})
</script>

<style lang="scss">
@import '../../../packages/theme/global.scss';
</style>
