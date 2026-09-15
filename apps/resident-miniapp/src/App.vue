<script setup lang="ts">
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
