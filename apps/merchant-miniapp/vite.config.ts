import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import {stage45MpComponents} from '../../scripts/stage45-mp-components'
import {stage3MpComponents} from '../../scripts/stage3-mp-components'

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const shared = (path: string) => fromRoot(`../../packages/${path}`)
const isMiniProgram = process.env.UNI_PLATFORM === 'mp-weixin' || process.argv.includes('mp-weixin')
const uniVueRuntime = fromRoot('../../node_modules/@dcloudio/uni-mp-vue/dist-x/vue.runtime.esm.js')

export default defineConfig({
  plugins: [stage45MpComponents(fromRoot('.'),fromRoot('../../packages'),isMiniProgram),stage3MpComponents(fromRoot('.'),fromRoot('../../packages'),isMiniProgram),uni()],
  resolve: {
    alias: [
      ...(isMiniProgram?[{find:'@shared/ui/components/stage45',replacement:fromRoot('./src/__stage45_shared')}]:[]),
      ...(isMiniProgram?[{find:'@shared/ui/components/stage3',replacement:fromRoot('./src/__stage3_shared')}]:[]),
      { find: '@/components/AppPage.vue', replacement: fromRoot('./src/components/AppPage.vue') },
      ...(isMiniProgram ? [{ find: 'vue', replacement: uniVueRuntime }] : []),
      { find: '@/components', replacement: shared('ui/components') },
      { find: '@/composables', replacement: shared('common/composables') },
      { find: '@/utils', replacement: shared('common/utils') },
      { find: '@/types', replacement: shared('common/types') },
      { find: '@shared', replacement: fromRoot('../../packages') },
      { find: '@', replacement: fromRoot('./src') },
    ],
  },
  server: { port: 5174 },
})
