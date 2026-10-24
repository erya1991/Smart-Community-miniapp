// Stage 0 exposes identity pages only. A Store identity is not a Stage 1–5 business grant.
export const MERCHANT_PROFILE_PATH = '/pages/profile/index'
export const MERCHANT_WORKBENCH_PATH = '/pages/workbench/index'

export function merchantPagePath(value: unknown): string {
  if (typeof value !== 'string') return ''
  const path = value.split(/[?#]/, 1)[0]
  if (!path || !/^\/?pages\/[a-z0-9/-]+$/i.test(path)) return ''
  return path.startsWith('/') ? path : `/${path}`
}

export function merchantIdentityPage(value: unknown): boolean {
  const path = merchantPagePath(value)
  return path === MERCHANT_PROFILE_PATH || path === MERCHANT_WORKBENCH_PATH
}

type OwnPageInstance = {
  parent?: OwnPageInstance | null
  root?: OwnPageInstance
  $pageInstance?: OwnPageInstance
  renderer?: string
  proxy?: OwnPageProxy | null
  ctx?: OwnPageProxy
}
type OwnPageProxy = {
  $mpType?: string
  route?: unknown
  $scope?: { route?: unknown; $page?: { fullPath?: unknown } }
  $page?: { route?: unknown; path?: unknown; fullPath?: unknown }
  $basePage?: { route?: unknown; path?: unknown; fullPath?: unknown }
}

/** Resolve only this component's own page tree. Never consult the global foreground page stack. */
export function merchantOwnPagePath(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  try {
    const instance = value as OwnPageInstance
    const seen = new Set<OwnPageInstance>()
    const candidates: OwnPageInstance[] = []
    let cursor: OwnPageInstance | null | undefined = instance
    while (cursor && !seen.has(cursor) && seen.size < 64) {
      seen.add(cursor)
      candidates.push(cursor)
      cursor = cursor.parent
    }
    // Uni H5 exposes a page owner, while Mini Program component trees have the owning page root.
    for (const linked of [instance.$pageInstance, instance.root]) {
      if (linked && !seen.has(linked)) candidates.push(linked)
    }
    for (const candidate of candidates) {
      const proxy = candidate.proxy || candidate.ctx
      if (!proxy || (proxy.$mpType !== 'page' && candidate.ctx?.$mpType !== 'page' && candidate.renderer !== 'page')) continue
      const page = proxy.$page || proxy.$basePage
      // A confirmed but not yet initialized own page stays restricted; don't borrow another page's route.
      return merchantPagePath(proxy.$scope?.route || proxy.$scope?.$page?.fullPath || proxy.route || page?.route || page?.fullPath || page?.path)
    }
  } catch { /* Missing, malformed or uninitialized own metadata must fail closed. */ }
  return ''
}

export function merchantTabPath(value: unknown): string {
  const path = merchantPagePath(value)
  return [MERCHANT_WORKBENCH_PATH, '/pages/operation/index', '/pages/order/index', MERCHANT_PROFILE_PATH].includes(path)
    ? path : MERCHANT_PROFILE_PATH
}

export function merchantRestrictedTitle(value: unknown): string {
  switch (merchantPagePath(value)) {
    case '/pages/operation/index': return '经营'
    case '/pages/order/index': return '订单'
    case '/pages/onboarding/application/index': return '申请开店'
    default: return '商户服务'
  }
}
