import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Static files only. Same origin lets two independent H5 apps share the Mock snapshot.
const root = fileURLToPath(new URL('../', import.meta.url))
if (process.argv.includes('--build')) {
  for (const app of ['resident', 'merchant']) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', `build:${app}:h5`], { cwd: root, env: { ...process.env, UNI_H5_BASE: `/${app}/` }, stdio: 'inherit', shell: process.platform === 'win32' })
      child.on('error', reject)
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${app} H5 build failed: ${code}`)))
    })
  }
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
const port = Number(process.env.P0_DEMO_PORT || 5180)
createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return }
    const url = new URL(request.url || '/', 'http://localhost')
    if (url.pathname === '/') {
      response.writeHead(200, { 'Content-Type': types['.html'] })
      response.end('<!doctype html><meta charset="utf-8"><title>P0 商城 Mock 演示</title><h1>P0 商城 Mock 演示</h1><p>同一浏览器的两个独立应用共享本地演示订单，不连接真实接口。</p><p><a href="/resident/">住户端</a></p><p><a href="/merchant/">商户端</a></p>'); return
    }
    const match = /^\/(resident|merchant)\/(.*)$/.exec(decodeURIComponent(url.pathname))
    if (!match) { response.writeHead(404); response.end(); return }
    const directory = path.resolve(root, `apps/${match[1]}-miniapp/dist/build/h5`)
    let filename = path.resolve(directory, match[2] || 'index.html')
    if (filename !== directory && !filename.startsWith(directory + path.sep)) { response.writeHead(403); response.end(); return }
    try { if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html') }
    catch { if (path.extname(filename)) throw new Error('File not found'); filename = path.join(directory, 'index.html') }
    const data = await readFile(filename)
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(request.method === 'HEAD' ? undefined : data)
  } catch { response.writeHead(404); response.end('未找到预览文件，请先执行 node scripts/run-p0-mall-demo.mjs --build') }
}).listen(port, '127.0.0.1', () => console.log(`P0 Mock preview: http://127.0.0.1:${port}/ (resident/ + merchant/)`))
