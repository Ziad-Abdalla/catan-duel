// Headless-Chrome + CDP screenshot helper for visual verification.
// Usage:
//   node scripts/shot.mjs out.png [--url=http://localhost:5174/] [--w=1440] [--h=900]
//                                 [--motion] [--wait=600] [--eval='<js>'] [--full]
// --motion  : emulate prefers-reduced-motion: no-preference (so animations run)
// --eval    : JS evaluated in the page (e.g. drive window.__game) BEFORE the wait
// --wait    : ms to wait after eval before capturing (default 700)
// --full    : capture full page instead of viewport
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const args = process.argv.slice(2)
const out = args[0]
const opt = (k, d) => {
  const a = args.find((x) => x.startsWith(`--${k}=`))
  return a ? a.slice(k.length + 3) : d
}
const flag = (k) => args.includes(`--${k}`)
const url = opt('url', 'http://localhost:5174/')
const W = +opt('w', 1440)
const H = +opt('h', 900)
const wait = +opt('wait', 700)
const evalJs = opt('eval', '')
const full = flag('full')
const motion = flag('motion')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const udd = mkdtempSync(join(tmpdir(), 'cdp-'))
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=0`,
  `--user-data-dir=${udd}`,
  `--window-size=${W},${H}`,
  'about:blank',
])
chrome.on('error', (e) => { console.error('chrome spawn failed', e); process.exit(1) })

async function getPort() {
  const f = join(udd, 'DevToolsActivePort')
  for (let i = 0; i < 100; i++) {
    if (existsSync(f)) {
      const t = readFileSync(f, 'utf8').split('\n')
      if (t[0]) return t[0].trim()
    }
    await sleep(100)
  }
  throw new Error('no DevToolsActivePort')
}

let nextId = 1
function send(ws, method, params) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id === id) { ws.removeEventListener('message', onMsg); m.error ? reject(new Error(m.error.message)) : resolve(m.result) }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

try {
  const port = await getPort()
  const targets = await (await fetch(`http://localhost:${port}/json`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))

  await send(ws, 'Page.enable')
  await send(ws, 'Runtime.enable')
  await send(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  if (motion) await send(ws, 'Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })

  await send(ws, 'Page.navigate', { url })
  await send(ws, 'Page.loadEventFired').catch(() => {})
  await sleep(900) // let React mount + fonts/art settle

  if (evalJs) {
    const r = await send(ws, 'Runtime.evaluate', { expression: evalJs, awaitPromise: true, returnByValue: true })
    if (r?.exceptionDetails) console.log('EVAL-THREW:', r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    else if (r?.result?.value !== undefined) console.log('EVAL:', r.result.value)
  }
  await sleep(wait)

  let clip
  const sel = opt('sel', '')
  if (sel) {
    const r = await send(ws, 'Runtime.evaluate', {
      returnByValue: true,
      expression: `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;var b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};})()`,
    })
    const b = r?.result?.value
    if (b) clip = { x: b.x, y: b.y, width: b.w, height: b.h, scale: 1 }
  }

  const { data } = await send(ws, 'Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: full,
    ...(clip ? { clip } : {}),
  })
  writeFileSync(out, Buffer.from(data, 'base64'))
  console.log('wrote', out)
  ws.close()
} catch (e) {
  console.error('ERR', e.message)
  process.exitCode = 1
} finally {
  chrome.kill()
}
