// 清空 dist。
// Node 24.11 在 Windows 上，路徑含中文時 fs.rmSync({ recursive: true }) 會讓整個程序直接崩潰、沒有錯誤訊息
// （專案放在「碩士」這類中文資料夾就會遇到）。Vite 的 emptyOutDir 用的正是它，
// 所以 vite.config.ts 關掉 emptyOutDir，改由這支腳本逐檔刪除。

import { existsSync, lstatSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

function removeTree(dir) {
  for (const name of readdirSync(dir)) {
    const target = join(dir, name)
    if (lstatSync(target).isDirectory()) {
      removeTree(target)
      rmdirSync(target)
    } else {
      unlinkSync(target)
    }
  }
}

const dist = fileURLToPath(new URL('../dist', import.meta.url))
if (existsSync(dist)) {
  removeTree(dist)
  rmdirSync(dist)
}
