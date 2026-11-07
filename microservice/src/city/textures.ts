import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'

/*
 * Kenney City Kit Commercial 的模型共用一張 512×512 調色盤貼圖。
 * 比對套件附的兩種變化（variation-a／b），只有兩個區塊不同：
 *   牆面：x 192–255、y 256–383（沙色漸層）
 *   招牌與雨棚：x 0–127、y 128–255（藍、紅色塊）
 * 窗戶、屋頂、門都在其他區塊，兩種變化一樣。
 * 所以只重畫這兩塊，就能換牆色與招牌色，窗戶與屋頂維持原色。
 */
const WALL_RECT = { x: 192, y: 256, w: 64, h: 128 }
const ACCENT_RECT = { x: 0, y: 128, w: 128, h: 128 }
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
function recolorRect(image: ImageData, rect: typeof WALL_RECT, color: Rgb): void {
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

/** 以模型原本的貼圖為底，產生換過牆色與招牌色的新貼圖；取樣設定沿用原貼圖 */
export function recolorPalette(source: Texture, wall: string, accent: string): CanvasTexture {
  const image = source.image as CanvasImageSource & { width: number; height: number }
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('無法建立 2D canvas')

  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  recolorRect(pixels, WALL_RECT, hexToRgb(wall))
  recolorRect(pixels, ACCENT_RECT, hexToRgb(accent))
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
