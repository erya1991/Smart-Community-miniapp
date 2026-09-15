import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const shared = (path: string) => fromRoot(`../../packages/${path}`)
const uniVueRuntime = (process.env.UNI_PLATFORM === 'mp-weixin' || process.argv.includes('mp-weixin'))
  ? fromRoot('../../node_modules/@dcloudio/uni-mp-vue/dist-x/vue.runtime.esm.js')
  : fromRoot('../../node_modules/@dcloudio/uni-h5-vue/dist-x/vue.runtime.esm.js')

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: [
      { find: 'vue', replacement: uniVueRuntime },
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
