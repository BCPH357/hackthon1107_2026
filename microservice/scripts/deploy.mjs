// 部署到 Cloudflare Pages（https://townpass-life-events.pages.dev/）。
//
//   npm run deploy         打包後上傳
//   npm run deploy:login   第一次使用：瀏覽器登入 Cloudflare 並按 Allow
//
// 從系統暫存資料夾執行 wrangler，而不是在專案裡執行：
// Node 24.11 在含中文的 Windows 路徑上遞迴刪除資料夾會讓程序直接結束（見 README「已知問題」），
// 專案放在「碩士」這類資料夾時，wrangler 收尾清暫存檔就會以 127 結束。

import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_NAME = 'townpass-life-events'

const root = fileURLToPath(new URL('..', import.meta.url))
const wrangler = join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const cwd = join(tmpdir(), `${PROJECT_NAME}-deploy`)
mkdirSync(cwd, { recursive: true })

const args =
  process.argv[2] === 'login'
    ? ['login']
    : ['pages', 'deploy', join(root, 'dist'), '--project-name', PROJECT_NAME, '--branch', 'main', '--commit-dirty=true']

const result = spawnSync(process.execPath, [wrangler, ...args], { cwd, stdio: 'inherit' })
process.exit(result.status ?? 1)
