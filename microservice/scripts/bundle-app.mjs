import { execFileSync } from 'node:child_process'
import { mkdirSync, renameSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const assets = new URL('../../assets/life_events/', import.meta.url)
const target = fileURLToPath(new URL('site.zip', assets))
const temporary = fileURLToPath(new URL('site.next.zip', assets))

mkdirSync(assets, { recursive: true })
try {
  rmSync(temporary, { force: true })
  execFileSync('zip', ['-q', '-r', temporary, '.'], { cwd: dist })
  renameSync(temporary, target)
} finally {
  rmSync(temporary, { force: true })
}
