// 朗讀這一頁：依畫面順序收集看得到的文字，切成一段一段交給 speech.ts 念。
// 按鈕、隱藏文字、示範資料標籤這類不是內容的東西不念；底部抽屜（例如城市地圖的嚮導）開著時念抽屜。

/** 不念的元素：操作元件、讀屏專用或隱藏的文字、浮動按鈕與版本號 */
const SKIP = [
  'button',
  'select',
  'input',
  'textarea',
  'svg',
  'script',
  'style',
  '[hidden]',
  '[aria-hidden="true"]',
  '.visually-hidden',
  '.badge--draft',
  '.page__tools',
  '.display-btn',
  '.page__version',
  '.preview-bar',
  '.city-link',
  '.read-page',
].join(',')

export interface PageChunk {
  /** 念到這一段時要框起來的元素 */
  el: HTMLElement
  text: string
}

/** 要念的範圍：底部抽屜開著就念抽屜，否則念頁面主要內容 */
export function readingRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('section.sheet[role="dialog"]') ?? document.querySelector<HTMLElement>('main')
}

function isBlock(el: Element): boolean {
  const display = getComputedStyle(el).display
  return !display.startsWith('inline') && display !== 'contents'
}

/** 畫面上看得到（收起來的 details、display: none、visibility: hidden 都不算） */
function isVisible(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false
  return getComputedStyle(el).visibility !== 'hidden'
}

/** 兩段英數字之間補空白，中文直接接起來 */
function join(a: string, b: string): string {
  if (!a) return b
  return /[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(b) ? `${a} ${b}` : a + b
}

/** 以區塊為單位收集文字：同一個區塊裡的行內文字接成一段，順序照畫面 */
export function collectChunks(root: HTMLElement): PageChunk[] {
  const chunks: PageChunk[] = []
  const byBlock = new Map<HTMLElement, PageChunk>()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    const parent = node.parentElement
    if (!text || !parent || parent.closest(SKIP) || !isVisible(parent)) continue
    let block: HTMLElement = parent
    while (block !== root && !isBlock(block) && block.parentElement) block = block.parentElement
    let chunk = byBlock.get(block)
    if (!chunk) {
      chunk = { el: block, text: '' }
      byBlock.set(block, chunk)
      chunks.push(chunk)
    }
    chunk.text = join(chunk.text, text)
  }
  return chunks
}
