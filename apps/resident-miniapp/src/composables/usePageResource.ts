import { ref, shallowRef } from 'vue'
import type { PageStatus } from '../types/app'

export function usePageResource<T>(loader: () => Promise<T>) {
  const status = ref<PageStatus>('loading')
  const data = shallowRef<T | null>(null)
  const errorMessage = ref('')

  const load = async () => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      const result = await loader()
      data.value = result
      status.value = Array.isArray(result) && result.length === 0 ? 'empty' : 'ready'
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载失败，请稍后重试'
      status.value = 'error'
    }
  }

  return { status, data, errorMessage, load }
}
