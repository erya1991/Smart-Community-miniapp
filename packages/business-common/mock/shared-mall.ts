import { createMallMockAdapter } from './mall'

type Snapshot = ReturnType<ReturnType<typeof createMallMockAdapter>['getMockSnapshot']>
export interface MallDemoStorage { read: () => Snapshot | undefined; write: (snapshot: Snapshot) => void }
const key = 'daguanglu-p0-mall-demo-v1'
/** H5 only: two independent apps on the same origin share a clearly labelled demo snapshot. */
const browserStorage = (): MallDemoStorage | undefined => {
  // #ifdef H5
  if (typeof window !== 'undefined' && window.localStorage) return {
    read: () => { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as Snapshot : undefined },
    write: (snapshot) => window.localStorage.setItem(key, JSON.stringify(snapshot)),
  }
  // #endif
  return undefined
}

export function createSharedMallMockAdapter(storage: MallDemoStorage | undefined = browserStorage()) {
  const adapter = createMallMockAdapter({ fulfillmentDemoSeeds: true })
  if (!storage) return adapter
  let queue: Promise<unknown> = Promise.resolve()
  const direct = new Set(['getMockSnapshot', 'restoreMockSnapshot', 'getMockTradeSnapshot', 'restoreMockTradeSnapshot', 'getDisplayStatus', 'maskMobile'])
  return new Proxy(adapter, { get(target, property, receiver) {
    const method = Reflect.get(target, property, receiver)
    if (typeof method !== 'function' || direct.has(String(property))) return method
    return (...args: unknown[]) => {
      const run = async () => {
        const snapshot = storage.read()
        if (snapshot) target.restoreMockSnapshot(snapshot)
        const result = await Reflect.apply(method, target, args)
        storage.write(target.getMockSnapshot())
        return result
      }
      const locked = () => {
        // #ifdef H5
        if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(key, run)
        // #endif
        return run()
      }
      const result = queue.then(locked, locked)
      queue = result.catch(() => undefined)
      return result
    }
  } })
}
