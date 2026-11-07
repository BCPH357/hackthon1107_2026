/*
 * 城市地圖的配色與街區配置。
 * 類別依主題分成四色，顏色全部取自 TownPass 的 tp_colors.dart；
 * 每棟大樓底下一定有文字標籤，顏色只是輔助，不是唯一的辨識方式。
 */

export type CityThemeKey = 'family' | 'care' | 'living' | 'farewell'

export interface CityTheme {
  key: CityThemeKey
  title: string
  /** 牆面（平常） */
  wall: string
  /** 牆面（選取時） */
  wallStrong: string
  /** 招牌、雨棚、圖例圓點與進度條 */
  accent: string
  /** 大樓腳下的地塊 */
  plot: string
  /** 標籤與抽屜的淺底 */
  soft: string
  /** 淺底上的文字，對比至少 4.5:1 */
  ink: string
}

export const CITY_THEMES: Record<CityThemeKey, CityTheme> = {
  family: {
    key: 'family',
    title: '家庭',
    wall: '#f4b992', // orange300
    wallStrong: '#f1a26d', // orange400
    accent: '#fd853a', // orange500
    plot: '#fbe7d9', // orange100
    soft: '#fdf3ec', // orange50
    ink: '#ae501f', // orange700
  },
  care: {
    key: 'care',
    title: '照顧與健康',
    wall: '#93d4df', // primary300
    wallStrong: '#71c5d5', // primary400
    accent: '#468d9b', // primary600
    plot: '#dbf1f5', // primary100
    soft: '#edf8fa', // primary50
    ink: '#356c77', // primary700
  },
  living: {
    key: 'living',
    title: '工作與居住',
    wall: '#f4d69e', // secondary300
    wallStrong: '#f0c87c', // secondary400
    accent: '#e7a43c', // secondary600
    plot: '#fcf2df', // secondary100
    soft: '#fdf8ed', // secondary50
    ink: '#74521b', // secondary800
  },
  farewell: {
    key: 'farewell',
    title: '身後事',
    wall: '#cad1d5', // grayscale200
    wallStrong: '#adb8be', // grayscale300
    accent: '#738995', // grayscale500
    plot: '#e3e7e9', // grayscale100
    soft: '#f1f3f4', // grayscale50
    ink: '#475259', // grayscale700
  },
}

/** 背景天際線用的中性色：淺灰牆、灰招牌，讓九棟主角跳出來 */
export const NEUTRAL_WALL = '#f1f3f4' // grayscale50
export const NEUTRAL_ACCENT = '#adb8be' // grayscale300

export interface CityPlot {
  categoryId: string
  theme: CityThemeKey
  /** public/city/models 底下的檔名（不含 .glb） */
  model: string
  /** 街區位置：col 由左到右 0–2，row 由後到前 0–2 */
  col: number
  row: number
}

/*
 * 高樓放後排、矮樓放前排，從前上方看過去不會互相擋住，標籤也能依序排開。
 * 同主題的類別放在一起，形成「街區」：右上是照顧與健康、左側是工作與居住、左前是家庭。
 * 陣列順序就是讀屏與鍵盤的順序，維持與清單相同的類別順序。
 */
export const CITY_PLOTS: CityPlot[] = [
  { categoryId: 'marriage-family', theme: 'family', model: 'building-a', col: 0, row: 2 },
  // building-h 的外牆是固定的深灰磚，換不了色，所以用淺色外牆的 building-b
  { categoryId: 'pregnancy-parenting', theme: 'family', model: 'building-b', col: 1, row: 2 },
  { categoryId: 'disability', theme: 'care', model: 'building-g', col: 1, row: 1 },
  { categoryId: 'elder-care', theme: 'care', model: 'building-l', col: 2, row: 0 },
  { categoryId: 'health', theme: 'care', model: 'building-skyscraper-a', col: 1, row: 0 },
  { categoryId: 'caregiver', theme: 'care', model: 'building-f', col: 2, row: 1 },
  { categoryId: 'work-economy', theme: 'living', model: 'building-skyscraper-b', col: 0, row: 0 },
  { categoryId: 'housing', theme: 'living', model: 'building-i', col: 0, row: 1 },
  { categoryId: 'after-death', theme: 'farewell', model: 'building-c', col: 2, row: 2 },
]

/** 街區間距：地塊 1.6 加道路 0.5 */
export const PLOT_SIZE = 1.6
export const PLOT_PITCH = 2.1

export function plotCenter(plot: Pick<CityPlot, 'col' | 'row'>): { x: number; z: number } {
  return { x: (plot.col - 1) * PLOT_PITCH, z: (plot.row - 1) * PLOT_PITCH }
}

/** 外圈的背景天際線：後方與兩側的細長大樓 */
export const SKYLINE: { model: string; x: number; z: number }[] = [
  { model: 'low-detail-building-b', x: -3.9, z: -3.9 },
  { model: 'low-detail-building-g', x: -2.8, z: -3.95 },
  { model: 'low-detail-building-wide-a', x: -1.55, z: -3.95 },
  { model: 'low-detail-building-a', x: -0.35, z: -3.9 },
  { model: 'low-detail-building-l', x: 0.55, z: -3.95 },
  { model: 'low-detail-building-d', x: 1.6, z: -3.9 },
  { model: 'low-detail-building-b', x: 2.75, z: -3.95 },
  { model: 'low-detail-building-g', x: 3.9, z: -3.9 },
  { model: 'low-detail-building-d', x: -3.95, z: -2.6 },
  { model: 'low-detail-building-l', x: -3.9, z: -1.35 },
  { model: 'low-detail-building-a', x: 3.95, z: -2.6 },
  { model: 'low-detail-building-l', x: 3.9, z: -1.35 },
]

/** 前方人行道的陽傘，增加生活感 */
export const PARASOLS: { model: string; x: number; z: number }[] = [
  { model: 'detail-parasol-a', x: -3.0, z: 3.95 },
  { model: 'detail-parasol-b', x: -0.4, z: 3.95 },
  { model: 'detail-parasol-a', x: 1.75, z: 3.95 },
]

/** 樹的位置：前方人行道與兩側 */
export const TREES: { x: number; z: number; scale: number }[] = [
  { x: -3.9, z: 3.9, scale: 1 },
  { x: -2.2, z: 3.95, scale: 0.85 },
  { x: -1.3, z: 3.9, scale: 1.1 },
  { x: 0.6, z: 3.95, scale: 0.9 },
  { x: 2.7, z: 3.9, scale: 1 },
  { x: 3.9, z: 3.95, scale: 0.85 },
  { x: -3.95, z: 0.1, scale: 0.9 },
  { x: -3.9, z: 1.6, scale: 1.05 },
  { x: 3.95, z: 0.1, scale: 1 },
  { x: 3.9, z: 1.6, scale: 0.9 },
]

export function modelUrl(name: string): string {
  return `${import.meta.env.BASE_URL}city/models/${name}.glb`
}

export function plotOf(categoryId: string): CityPlot | undefined {
  return CITY_PLOTS.find((plot) => plot.categoryId === categoryId)
}

export function themeOf(categoryId: string): CityTheme {
  return CITY_THEMES[plotOf(categoryId)?.theme ?? 'farewell']
}
