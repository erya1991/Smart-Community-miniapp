import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'

// Execute the actual uni mp-weixin page render, whose slot expressions may be
// evaluated eagerly unlike a Web/SSR slot. Build the resident package first.
const file = process.env.RESIDENT_HOME_RENDER
assert.ok(file, 'Set RESIDENT_HOME_RENDER to the built pages/home/index.js')
const code = fs.readFileSync(file, 'utf8')
function page(initial, status = 'loading') {
  const data = { value: initial }, state = { value: status }
  const props = []
  const vendor = {
    defineComponent: x => x, _export_sfc: x => x,
    ref: value => ({ value }), unref: x => x && typeof x === 'object' && 'value' in x ? x.value : x,
    onLoad() {}, onShow() {},
    e: (...parts) => Object.assign({}, ...parts),
    p: x => { props.push(x); return x }, t: String,
    o: x => x, f: (items, fn) => items.map(fn),
  }
  const modules = {
    '../../common/vendor.js': vendor,
    '../../common/assets.js': { _imports_0: 'local-hero' },
    '../../composables/usePageResource.js': { usePageResource: () => ({ data, status: state, errorMessage: { value: '' }, load() {}, refresh() {} }) },
    '../../services/mall.js': { residentMallService: { getCommunityHome() {} } },
    '../../features/mall/useCatalogCart.js': { useCatalogCart: () => ({ actionMessage: { value: '' }, addCart() {} }) },
    '../../utils/navigation.js': { openPage() {}, openSubPage() {} },
    '../../config/navigation.js': { residentTabItems: ['home', 'profile'] },
  }
  let component
  vm.runInNewContext(code, { require: name => { assert.ok(name in modules, 'Unexpected page dependency'); return modules[name] }, wx: { createPage: x => { component = x } } })
  const render = component.setup({})
  return { data, state, props, render: () => { props.length = 0; return render({}, {}) } }
}
const home = { communityName: 'Synthetic community', entries: [], services: [], products: [] }
test('initial null data renders the loading shell and tabbar without dereferencing data', () => {
  const p = page(null); p.render()
  assert.ok(p.props.some(x => x.status === 'loading'))
  assert.ok(p.props.some(x => x['active-path'] === '/pages/home/index'))
  assert.equal(p.props.some(x => x.name === 'location'), false)
})
test('failed initial load with null data preserves the error shell', () => {
  const p = page(null, 'error'); p.render()
  assert.ok(p.props.some(x => x.status === 'error'))
})
test('ready data renders the existing home content', () => {
  const p = page(home, 'ready'), output = p.render()
  assert.ok(Object.values(output).includes(home.communityName))
  assert.ok(p.props.some(x => x.name === 'location'))
})
test('successful load after null and later refresh both render safely', () => {
  const p = page(null); p.render(); p.data.value = home; p.state.value = 'ready'; p.render()
  p.data.value = { ...home, communityName: 'Updated community' }
  assert.ok(Object.values(p.render()).includes('Updated community'))
})
test('returning to an empty resource never removes navigation or throws', () => {
  const p = page(home, 'ready'); p.render(); p.data.value = null; p.state.value = 'error'; p.render()
  assert.ok(p.props.some(x => x['active-path'] === '/pages/home/index'))
})
