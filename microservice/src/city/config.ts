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

/** 醫療大樓的紅十字：TownPass red600 */
export const MEDICAL_RED = '#c2332f'

export interface CityPlot {
  categoryId: string
  theme: CityThemeKey
  /**
   * 模型路徑（不含 .glb）。沒有資料夾的是 City Kit Commercial（public/city/models），
   * suburban/ 是 City Kit Suburban 的住宅
   */
  model: string
  /** 街區位置：col 由左到右 0–2，row 由後到前 0–2 */
  col: number
  row: number
  /** 招牌掛法：facade 掛在正面外牆上方，yard 立在前院（住宅用） */
  sign: 'facade' | 'yard'
  /** 招牌畫紅十字，不畫類別圖示 */
  cross?: boolean
  /** 屋頂加直升機坪 */
  helipad?: boolean
  /** 地塊上的樹，座標相對於地塊中心 */
  trees?: { dx: number; dz: number }[]
}

/*
 * 高樓放後排、矮樓放前排，從前上方看過去不會互相擋住，標籤也能依序排開。
 * 同主題的類別放在一起，形成「街區」：右上是照顧與健康、左側是工作與居住、左前是家庭。
 * 每棟都有自己的特色：家與居住是獨棟住宅、醫療有紅十字與直升機坪、其他掛上類別圖示的招牌。
 * 陣列順序就是讀屏與鍵盤的順序，維持與清單相同的類別順序。
 */
export const CITY_PLOTS: CityPlot[] = [
  { categoryId: 'marriage-family', theme: 'family', model: 'suburban/building-type-c', col: 0, row: 2, sign: 'yard' },
  // building-h 的外牆是固定的深灰磚，換不了色，所以用淺色外牆的 building-b
  { categoryId: 'pregnancy-parenting', theme: 'family', model: 'building-b', col: 1, row: 2, sign: 'facade' },
  { categoryId: 'disability', theme: 'care', model: 'building-g', col: 1, row: 1, sign: 'facade' },
  { categoryId: 'elder-care', theme: 'care', model: 'building-l', col: 2, row: 0, sign: 'facade' },
  {
    categoryId: 'health',
    theme: 'care',
    model: 'building-skyscraper-a',
    col: 1,
    row: 0,
    sign: 'facade',
    cross: true,
    helipad: true,
  },
  { categoryId: 'caregiver', theme: 'care', model: 'building-f', col: 2, row: 1, sign: 'facade' },
  { categoryId: 'work-economy', theme: 'living', model: 'building-skyscraper-b', col: 0, row: 0, sign: 'facade' },
  { categoryId: 'housing', theme: 'living', model: 'suburban/building-type-e', col: 0, row: 1, sign: 'yard' },
  {
    categoryId: 'after-death',
    theme: 'farewell',
    model: 'building-c',
    col: 2,
    row: 2,
    sign: 'facade',
    trees: [
      { dx: -0.82, dz: 0.62 },
      { dx: 0.82, dz: 0.62 },
    ],
  },
]

/**
 * 街上的車輛與路燈（Kenney Car Kit、City Kit Roads），保留原本的顏色。
 * 車輛模型長約 3 單位，縮成 0.2 倍放進 0.6 寬的道路。rotation 0 是車頭朝 +Z（朝鏡頭）。
 */
export const PROPS: { model: string; x: number; z: number; rotation: number; scale: number }[] = [
  // 左右兩側的外環道路從鏡頭看不會被大樓擋住：救護車在照顧與健康街區旁，計程車在辦公大樓旁
  { model: 'cars/ambulance', x: 3.92, z: 0.43, rotation: Math.PI, scale: 0.2 },
  { model: 'cars/taxi', x: -3.92, z: -0.68, rotation: 0, scale: 0.2 },
  { model: 'cars/sedan', x: 0.8, z: 3.92, rotation: -Math.PI / 2, scale: 0.2 },
  // 前方人行道的路燈，燈臂朝向馬路
  { model: 'roads/light-square', x: -2.54, z: 4.34, rotation: 0, scale: 1 },
  { model: 'roads/light-square', x: 0.06, z: 4.34, rotation: 0, scale: 1 },
  { model: 'roads/light-square', x: 2.66, z: 4.34, rotation: 0, scale: 1 },
]

/** 街區間距：地塊 2.0 加道路 0.6，大樓之間留寬一點，看得清楚哪一棟是哪一棟 */
export const PLOT_SIZE = 2.0
export const PLOT_PITCH = 2.6

export function plotCenter(plot: Pick<CityPlot, 'col' | 'row'>): { x: number; z: number } {
  return { x: (plot.col - 1) * PLOT_PITCH, z: (plot.row - 1) * PLOT_PITCH }
}

/** 外圈的背景天際線：後方與兩側的細長大樓 */
export const SKYLINE: { model: string; x: number; z: number }[] = [
  { model: 'low-detail-building-b', x: -4.6, z: -4.6 },
  { model: 'low-detail-building-g', x: -3.47, z: -4.65 },
  { model: 'low-detail-building-wide-a', x: -1.92, z: -4.65 },
  { model: 'low-detail-building-a', x: -0.43, z: -4.6 },
  { model: 'low-detail-building-l', x: 0.68, z: -4.65 },
  { model: 'low-detail-building-d', x: 1.98, z: -4.6 },
  { model: 'low-detail-building-b', x: 3.4, z: -4.65 },
  { model: 'low-detail-building-g', x: 4.6, z: -4.6 },
  { model: 'low-detail-building-d', x: -4.65, z: -3.22 },
  { model: 'low-detail-building-l', x: -4.6, z: -1.67 },
  { model: 'low-detail-building-a', x: 4.65, z: -3.22 },
  { model: 'low-detail-building-l', x: 4.6, z: -1.67 },
]

/** 前方人行道的陽傘，增加生活感 */
export const PARASOLS: { model: string; x: number; z: number }[] = [
  { model: 'detail-parasol-a', x: -3.7, z: 4.65 },
  { model: 'detail-parasol-b', x: -0.5, z: 4.65 },
  { model: 'detail-parasol-a', x: 2.17, z: 4.65 },
]

/** 樹的位置：前方人行道與兩側 */
export const TREES: { x: number; z: number; scale: number }[] = [
  { x: -4.6, z: 4.6, scale: 1 },
  { x: -2.72, z: 4.65, scale: 0.85 },
  { x: -1.61, z: 4.6, scale: 1.1 },
  { x: 0.74, z: 4.65, scale: 0.9 },
  { x: 3.34, z: 4.6, scale: 1 },
  { x: 4.6, z: 4.65, scale: 0.85 },
  { x: -4.65, z: 0.12, scale: 0.9 },
  { x: -4.6, z: 1.98, scale: 1.05 },
  { x: 4.65, z: 0.12, scale: 1 },
  { x: 4.6, z: 1.98, scale: 0.9 },
]

/** 模型所屬的套件：決定貼圖裡哪些區塊要換色 */
export type ModelKit = 'commercial' | 'suburban' | 'other'

export function kitOf(model: string): ModelKit {
  if (!model.includes('/')) return 'commercial'
  return model.startsWith('suburban/') ? 'suburban' : 'other'
}

/** 沒有資料夾的模型在 city/models；其他套件各有自己的資料夾與 Textures/colormap.png */
export function modelUrl(name: string): string {
  const path = name.includes('/') ? name : `models/${name}`
  return `${import.meta.env.BASE_URL}city/${path}.glb`
}

export function plotOf(categoryId: string): CityPlot | undefined {
  return CITY_PLOTS.find((plot) => plot.categoryId === categoryId)
}

export function themeOf(categoryId: string): CityTheme {
  return CITY_THEMES[plotOf(categoryId)?.theme ?? 'farewell']
}
