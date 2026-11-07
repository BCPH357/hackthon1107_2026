import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'

/*
 * Kenney 的城市套件共用同一種 512×512 調色盤貼圖排法，每兩欄 32px 是一條由亮到暗的漸層。
 * 比對 City Kit Commercial 附的兩種變化（variation-a／b）與 City Kit Suburban 的貼圖，可換色的區塊是：
 *   牆面：x 192–255、y 256–383（商業大樓是沙色，住宅是白色）
 *   商業大樓的招牌與雨棚：x 0–127、y 128–255
 *   住宅的屋頂：x 0–63、y 128–255（原本是綠色）
 * 窗戶、門、深灰屋頂在其他區塊，維持原色。
 */
export interface PaletteRect {
  x: number
  y: number
  w: number
  h: number
}

export const PALETTE = {
  wall: { x: 192, y: 256, w: 64, h: 128 },
  commercialAccent: { x: 0, y: 128, w: 128, h: 128 },
  suburbanRoof: { x: 0, y: 128, w: 64, h: 128 },
} satisfies Record<string, PaletteRect>

/** 調色盤每一格的寬度：同一格是一條由亮到暗的漸層 */
const CELL_W = 32

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function luminance(data: Uint8ClampedArray, i: number): number {
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
}

/** 把區塊重畫成指定顏色：保留原本每個像素相對於同一格最亮處的明暗，漸層與立體感不會消失 */
function recolorRect(image: ImageData, rect: PaletteRect, color: Rgb): void {
  const { data, width } = image
  for (let cellX = rect.x; cellX < rect.x + rect.w; cellX += CELL_W) {
    let maxLum = 1
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = cellX; x < cellX + CELL_W; x++) {
        maxLum = Math.max(maxLum, luminance(data, (y * width + x) * 4))
      }
    }
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = cellX; x < cellX + CELL_W; x++) {
        const i = (y * width + x) * 4
        // 最暗不低於 0.6，避免淺色主題的陰影面變得髒髒的
        const shade = Math.max(0.6, luminance(data, i) / maxLum)
        data[i] = color[0] * shade
        data[i + 1] = color[1] * shade
        data[i + 2] = color[2] * shade
      }
    }
  }
}

/** 以模型原本的貼圖為底，把指定區塊換成新顏色，產生新貼圖；取樣設定沿用原貼圖 */
export function recolorPalette(source: Texture, regions: { rect: PaletteRect; color: string }[]): CanvasTexture {
  const image = source.image as CanvasImageSource & { width: number; height: number }
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('無法建立 2D canvas')

  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  for (const region of regions) recolorRect(pixels, region.rect, hexToRgb(region.color))
  context.putImageData(pixels, 0, 0)

  const texture = new CanvasTexture(canvas)
  // glTF 的貼圖不翻轉 Y，必須和原貼圖一致，否則顏色會對到錯的位置
  texture.flipY = false
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = source.wrapS
  texture.wrapT = source.wrapT
  texture.magFilter = source.magFilter
  texture.minFilter = source.minFilter
  texture.generateMipmaps = source.generateMipmaps
  texture.needsUpdate = true
  return texture
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`圖示載入失敗：${url}`))
    image.src = url
  })
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number): void {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + size, y, x + size, y + size, radius)
  context.arcTo(x + size, y + size, x, y + size, radius)
  context.arcTo(x, y + size, x, y, radius)
  context.arcTo(x, y, x + size, y, radius)
  context.closePath()
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

const SIGN_SIZE = 256

/**
 * 大樓招牌：白底圓角方牌、主題色外框，中間是和介面相同的 TownPass 類別圖示。
 * 圖示是同源的 SVG，畫進 canvas 不會被汙染，可以當 WebGL 貼圖。
 */
export async function createIconSign(iconUrl: string, accent: string): Promise<CanvasTexture> {
  const icon = await loadImage(iconUrl)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIGN_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('無法建立 2D canvas')

  context.fillStyle = accent
  roundedRect(context, 0, 0, SIGN_SIZE, 44)
  context.fill()
  context.fillStyle = '#ffffff'
  roundedRect(context, 18, 18, SIGN_SIZE - 36, 30)
  context.fill()
  const iconSize = SIGN_SIZE * 0.6
  context.drawImage(icon, (SIGN_SIZE - iconSize) / 2, (SIGN_SIZE - iconSize) / 2, iconSize, iconSize)
  return toTexture(canvas)
}

/** 醫療大樓的紅十字招牌：白底、TownPass red600 十字 */
export function createCrossSign(red: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIGN_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('無法建立 2D canvas')

  context.fillStyle = red
  roundedRect(context, 0, 0, SIGN_SIZE, 44)
  context.fill()
  context.fillStyle = '#ffffff'
  roundedRect(context, 18, 18, SIGN_SIZE - 36, 30)
  context.fill()
  const arm = SIGN_SIZE * 0.2
  const length = SIGN_SIZE * 0.6
  const offset = (SIGN_SIZE - length) / 2
  context.fillStyle = red
  context.fillRect(offset, (SIGN_SIZE - arm) / 2, length, arm)
  context.fillRect((SIGN_SIZE - arm) / 2, offset, arm, length)
  return toTexture(canvas)
}

/** 屋頂直升機坪：白色圓盤、紅十字，從斜上方看也認得出是醫院 */
export function createHelipad(red: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIGN_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('無法建立 2D canvas')

  const center = SIGN_SIZE / 2
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(center, center, center - 4, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = red
  context.lineWidth = 12
  context.beginPath()
  context.arc(center, center, center - 18, 0, Math.PI * 2)
  context.stroke()
  const arm = SIGN_SIZE * 0.17
  const length = SIGN_SIZE * 0.52
  context.fillStyle = red
  context.fillRect(center - length / 2, center - arm / 2, length, arm)
  context.fillRect(center - arm / 2, center - length / 2, arm, length)
  return toTexture(canvas)
}
