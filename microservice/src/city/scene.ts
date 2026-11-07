import {
  AnimationMixer,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type AnimationClip,
  type Material,
  type Texture,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { ICONS } from '../data/icons'
import { CATEGORIES } from '../data/lifeEvents'
import {
  CITY_PLOTS,
  CITY_THEMES,
  MEDICAL_RED,
  NEUTRAL_ACCENT,
  NEUTRAL_WALL,
  PARASOLS,
  PLOT_PITCH,
  PLOT_SIZE,
  PROPS,
  SKYLINE,
  TREES,
  kitOf,
  modelUrl,
  plotCenter,
  type CityPlot,
  type CityThemeKey,
  type ModelKit,
} from './config'
import { PALETTE, createCrossSign, createHelipad, createIconSign, recolorPalette } from './textures'

/*
 * 城市地圖的 3D 場景（Three.js，MIT 授權）。
 * - 正交鏡頭，俯角固定；單指拖曳平移、兩指捏合縮放與轉動旋轉、滑鼠滾輪縮放、右鍵拖曳旋轉。
 *   縮放與旋轉都以手指底下的位置為中心。外層另有按鈕可縮放、旋轉、回到原本視角，不會雙指操作的人也能用
 * - 只在畫面需要變化時才重畫（載入、動畫、手勢、尺寸改變），平常不耗電
 * - 文字標籤由外層 Vue 元件用真正的按鈕疊在畫面上，讀屏與鍵盤都能操作；這裡只提供螢幕座標
 */

/** 預設方位角：略偏右前方，看得到大樓正面與右側 */
const DEFAULT_YAW = (14 * Math.PI) / 180
/** 俯角低一點，多看到外牆的顏色、少看到深灰的屋頂 */
const ELEVATION = (34 * Math.PI) / 180
const SIN_E = Math.sin(ELEVATION)
const COS_E = Math.cos(ELEVATION)
const CAMERA_DISTANCE = 40
/** 縮放範圍：相對於剛好放進整座城市的倍率 */
const MIN_ZOOM = 0.55
const MAX_ZOOM = 4
/** 鏡頭中心能移動的範圍，城市不會被拖到畫面外找不回來 */
const PAN_LIMIT = 5
/** 單指移動超過這個距離才算拖曳，否則當作點選 */
const DRAG_THRESHOLD = 8
/** 城市底座的邊長：旋轉到任何角度都看得到完整的城市 */
const BASE_SIZE = 11
/** 主角大樓的縮放：讓大樓佔滿地塊 */
const LANDMARK_SCALE = 1.15
/** 選取時拉近的倍率 */
const SELECT_ZOOM = 1.35
/** 選取時大樓浮起的高度 */
const LIFT = 0.14
/** 有大樓被選取時，其他大樓變暗的比例 */
const DIM = 0.24
/** 標籤錨點在屋頂上方的距離 */
const LABEL_GAP = 0.12
/** 外牆招牌的邊長（世界座標） */
const SIGN_SIZE = 0.48
/** 前院招牌的邊長與高度 */
const YARD_SIGN_SIZE = 0.34
const YARD_SIGN_HEIGHT = 0.5
const SIGN_EDGE_COLOR = '#ffffff'
const POST_COLOR = '#738995' // grayscale500

const GROUND_COLOR = '#e3e7e9' // grayscale100：人行道
const ROAD_COLOR = '#5e6d76' // grayscale600：柏油路
const ROAD_LINE_COLOR = '#f1f3f4' // grayscale50：標線
const CURB_COLOR = '#ffffff'
const TRUNK_COLOR = '#738995' // grayscale500
const CANOPY_COLORS = ['#93d4df', '#71c5d5', '#5ab4c5'] // primary300–500

/** 道路範圍：九個地塊加外圈道路 */
const ROAD_HALF = PLOT_PITCH + PLOT_SIZE / 2 + 0.65

type Ease = (t: number) => number
const easeOutCubic: Ease = (t) => 1 - (1 - t) ** 3
const easeInOutCubic: Ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutBack: Ease = (t) => {
  const c1 = 1.4
  return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

interface Tween {
  start: number
  delay: number
  duration: number
  ease: Ease
  update: (t: number) => void
}

interface Landmark {
  categoryId: string
  theme: CityThemeKey
  /** 地塊中心；選取時整棟（含模型）往上浮 */
  root: Group
  /** 進場動畫縮放的對象 */
  model: Object3D
  material: MeshStandardMaterial
  /** 平常的牆色與選取時加深的牆色 */
  textures: { normal: Texture; strong: Texture }
  plotTop: MeshStandardMaterial
  /** 完整長出來時（含 LANDMARK_SCALE）的屋頂高度 */
  height: number
  lift: number
  dim: number
  highlight: number
}

/** 鏡頭狀態：看向地面上的 (tx, tz)，這一點出現在畫面水平中央、離上緣 sy 的位置 */
interface ViewState {
  tx: number
  tz: number
  yaw: number
  /** 每個世界單位幾個 px */
  scale: number
  sy: number
}

/** 某個方位角下，相機平面的右方與上方 */
function axesAt(yaw: number): { right: Vector3; up: Vector3 } {
  return {
    right: new Vector3(Math.cos(yaw), 0, -Math.sin(yaw)),
    up: new Vector3(-SIN_E * Math.sin(yaw), COS_E, -SIN_E * Math.cos(yaw)),
  }
}

/** 相機平面座標 (px, py) 在地面上對應的點：鏡頭看向這一點時，(px, py) 就在畫面中心 */
function groundFromPlane(px: number, py: number, yaw: number): { tx: number; tz: number } {
  const toward = -py / SIN_E
  return {
    tx: px * Math.cos(yaw) + toward * Math.sin(yaw),
    tz: -px * Math.sin(yaw) + toward * Math.cos(yaw),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 角度差轉成 -π 到 π，旋轉時走最短的方向 */
function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

export interface CitySceneOptions {
  canvas: HTMLCanvasElement
  reducedMotion: boolean
  /** 點到大樓或地塊時回傳類別 id，點到空白處回傳 null */
  onPick: (categoryId: string | null) => void
  /** 每畫一次就呼叫，外層據此更新標籤位置 */
  onFrame: () => void
}

// 模型在多次進出頁面之間共用，不重複下載與解析
const loader = new GLTFLoader()
const modelCache = new Map<string, Promise<GLTF>>()

function loadModel(name: string): Promise<GLTF> {
  let promise = modelCache.get(name)
  if (!promise) {
    promise = loader.loadAsync(modelUrl(name))
    // 失敗的不要留在快取，下次進來可以重試
    promise.catch(() => modelCache.delete(name))
    modelCache.set(name, promise)
  }
  return promise
}

function findTexture(gltf: GLTF): Texture | null {
  let texture: Texture | null = null
  gltf.scene.traverse((object) => {
    if (!texture && object instanceof Mesh) {
      texture = (object.material as MeshStandardMaterial).map
    }
  })
  return texture
}

export class CityScene {
  /** 新版 Three.js 需要 WebGL 2（iOS 15 起、現代 Android WebView 都支援） */
  static isSupported(): boolean {
    try {
      return Boolean(document.createElement('canvas').getContext('webgl2'))
    } catch {
      return false
    }
  }

  private readonly options: CitySceneOptions
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  private readonly content = new Group()
  private readonly landmarks = new Map<string, Landmark>()
  private readonly plotTops = new Map<string, MeshStandardMaterial>()
  private readonly paletteCache = new Map<string, { normal: Texture; strong: Texture }>()
  private readonly pickables: Object3D[] = []
  private readonly raycaster = new Raycaster()
  private readonly tweens = new Map<string, Tween>()
  private guide: Group | null = null
  private guideMixer: AnimationMixer | null = null
  private guideClips: AnimationClip[] = []
  private finishWalk: (() => void) | null = null
  private lastGuideFrame = 0
  /** 這個場景自己建立的資源，離開頁面時要釋放；模型本身在快取裡共用，不在這裡 */
  private readonly owned: { dispose: () => void }[] = []
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0)
  /** 預設視角要框住的點：九個街區與主角大樓 */
  private fitPoints: Vector3[] = []
  private view: ViewState = { tx: 0, tz: 0, yaw: DEFAULT_YAW, scale: 50, sy: 0 }
  /** 剛好放進整座城市的視角 */
  private home: ViewState = { ...this.view }
  /** 選取大樓前的視角，關抽屜時回到這裡 */
  private saved: ViewState | null = null
  /** 使用者動過視角後，畫面尺寸改變時不再自動回到預設視角 */
  private userMoved = false
  private readonly pointers = new Map<number, { x: number; y: number }>()
  private gesture: { startX: number; startY: number; time: number; dragging: boolean; multi: boolean; rotate: boolean } | null =
    null
  private size = { width: 1, height: 1 }
  private insetBottom = 0
  private selected: string | null = null
  private frame = 0
  private ready = false
  private disposed = false

  constructor(options: CitySceneOptions) {
    this.options = options
    this.renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap

    this.scene.add(this.content)
    this.addLights()

    const canvas = options.canvas
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
    canvas.addEventListener('contextmenu', this.onContextMenu)
    canvas.addEventListener('webglcontextrestored', this.requestRender)
  }

  /** 下載模型並組出城市；onProgress 回報 0–1 */
  async load(onProgress: (ratio: number) => void): Promise<void> {
    const names = [
      ...new Set([
        ...CITY_PLOTS.map((p) => p.model),
        ...SKYLINE.map((s) => s.model),
        ...PARASOLS.map((p) => p.model),
        ...PROPS.map((p) => p.model),
      ]),
    ]
    let loaded = 0
    const [entries, signs] = await Promise.all([
      Promise.all(
        names.map(async (name) => {
          const gltf = await loadModel(name)
          loaded += 1
          onProgress(loaded / names.length)
          return [name, gltf] as const
        }),
      ),
      this.loadSignTextures(),
    ])
    if (this.disposed) return

    const models = new Map(entries)
    // 天際線用商業大樓套件的貼圖重畫成中性色
    const commercial = models.get(SKYLINE[0].model)
    const source = commercial && findTexture(commercial)
    if (!source) throw new Error('找不到模型貼圖')

    this.buildGround()
    this.buildLandmarks(models, signs)
    this.buildSkyline(models, source)
    this.buildTrees()
    this.buildProps(models)
    this.computeFitPoints()
    this.updateHome()
    this.view = { ...this.home }
    this.applyCamera()
    this.ready = true
    if (this.selected) this.applySelection()
    this.playIntro()
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.size = { width, height }
    this.renderer.setSize(width, height, false)
    if (!this.ready) return
    this.updateHome()
    const landmark = this.selected ? this.landmarks.get(this.selected) : undefined
    if (landmark) this.view = this.selectionView(landmark)
    else if (!this.userMoved) this.view = { ...this.home }
    this.clampView()
    this.applyCamera()
    this.requestRender()
  }

  /** 底部抽屜蓋住的高度；選取的大樓會移到抽屜上方的可見區域中間 */
  setInsetBottom(px: number): void {
    if (Math.abs(px - this.insetBottom) < 1) return
    this.insetBottom = px
    const landmark = this.ready && this.selected ? this.landmarks.get(this.selected) : undefined
    if (landmark) this.animateTo(this.selectionView(landmark))
  }

  /** 以目前畫面中心為準放大或縮小（給按鈕用） */
  zoomBy(factor: number): void {
    if (!this.ready) return
    this.userMoved = true
    this.animateTo({ ...this.view, scale: this.clampScale(this.view.scale * factor) }, 320)
  }

  /** 以目前畫面中心為軸旋轉，正值是順時針（給按鈕用） */
  rotateBy(radians: number): void {
    if (!this.ready) return
    this.userMoved = true
    this.animateTo({ ...this.view, yaw: this.view.yaw + radians }, 450)
  }

  /** 回到原本的視角；有選取大樓時，回到正面看這棟大樓 */
  resetView(): void {
    if (!this.ready) return
    this.userMoved = false
    const landmark = this.selected ? this.landmarks.get(this.selected) : undefined
    if (landmark) {
      this.saved = { ...this.home }
      this.animateTo(this.selectionView(landmark, DEFAULT_YAW, false))
    } else {
      this.animateTo({ ...this.home })
    }
  }

  /** 載入完成前呼叫也可以：會記住，等城市蓋好再套用 */
  select(categoryId: string | null): void {
    if (categoryId === this.selected) return
    this.selected = categoryId
    if (this.ready) this.applySelection()
  }

  private applySelection(): void {
    const categoryId = this.selected
    for (const landmark of this.landmarks.values()) {
      const isSelected = landmark.categoryId === categoryId
      const theme = CITY_THEMES[landmark.theme]
      landmark.material.map = isSelected ? landmark.textures.strong : landmark.textures.normal
      this.tweenValue(`lift:${landmark.categoryId}`, landmark.lift, isSelected ? 1 : 0, 450, easeOutBack, (v) => {
        landmark.lift = v
        landmark.root.position.y = v * LIFT
      })
      this.tweenValue(`dim:${landmark.categoryId}`, landmark.dim, categoryId && !isSelected ? 1 : 0, 350, easeOutCubic, (v) => {
        landmark.dim = v
        landmark.material.color.setScalar(1 - DIM * v)
      })
      const plotFrom = new Color(theme.plot)
      const plotTo = new Color(theme.accent)
      this.tweenValue(`plot:${landmark.categoryId}`, landmark.highlight, isSelected ? 1 : 0, 350, easeOutCubic, (v) => {
        landmark.highlight = v
        landmark.plotTop.color.copy(plotFrom).lerp(plotTo, v * 0.55)
      })
    }

    // 選取時拉近到這棟大樓（保留使用者轉好的方向）；關抽屜時回到選取前的視角
    const landmark = categoryId ? this.landmarks.get(categoryId) : undefined
    if (landmark) {
      this.saved ??= { ...this.view }
      this.animateTo(this.selectionView(landmark))
    } else {
      const back = this.saved ?? this.home
      this.saved = null
      this.animateTo({ ...back })
    }
  }

  /** 類別標籤錨點（屋頂上方）的螢幕座標，單位 px，原點在畫布左上 */
  screenPosition(categoryId: string, out = new Vector2()): Vector2 | null {
    const landmark = this.landmarks.get(categoryId)
    if (!landmark) return null
    // 進場動畫時大樓還在長高，標籤跟著屋頂一起上升
    const grown = landmark.model.scale.y / LANDMARK_SCALE
    const point = new Vector3(
      landmark.root.position.x,
      landmark.height * grown + landmark.root.position.y + LABEL_GAP,
      landmark.root.position.z,
    ).project(this.camera)
    return out.set(((point.x + 1) / 2) * this.size.width, ((1 - point.y) / 2) * this.size.height)
  }

  async addGuide(): Promise<void> {
    const gltf = await loadModel('characters/guide')
    if (this.disposed || this.guide) return
    const figure = cloneSkeleton(gltf.scene)
    const bounds = new Box3().setFromObject(figure)
    const scale = 0.7 / Math.max(0.01, bounds.max.y - bounds.min.y)
    figure.scale.setScalar(scale)
    figure.position.y = -bounds.min.y * scale
    const guide = new Group()
    guide.position.set(0, 0.025, ROAD_HALF - 0.32)
    guide.add(figure)
    this.content.add(guide)
    this.guide = guide
    this.guideMixer = new AnimationMixer(figure)
    this.guideClips = gltf.animations
    this.guidePose('idle')
    this.requestRender()
  }

  guideScreenPosition(): Vector2 | null {
    const guide = this.guide
    if (!guide) return null
    const point = guide.localToWorld(new Vector3(0, 0.83, 0)).project(this.camera)
    return new Vector2(((point.x + 1) / 2) * this.size.width, ((1 - point.y) / 2) * this.size.height)
  }

  private guidePose(name: string): void {
    const clip = this.guideClips.find((item) => item.name === name)
    this.guideMixer?.stopAllAction()
    if (clip) this.guideMixer?.clipAction(clip).reset().play()
    this.guideMixer?.update(0)
  }

  walkGuideTo(categoryId: string): Promise<void> {
    const guide = this.guide
    const plot = CITY_PLOTS.find((item) => item.categoryId === categoryId)
    if (!guide || !plot || this.disposed) return Promise.resolve()
    this.finishWalk?.()
    const streets = [-(ROAD_HALF - 0.32), -PLOT_PITCH / 2, PLOT_PITCH / 2, ROAD_HALF - 0.32]
    const { x } = plotCenter(plot)
    const target = new Vector3(x, guide.position.y, streets[plot.row + 1])
    if (this.options.reducedMotion || guide.position.distanceTo(target) < 0.01) {
      guide.position.copy(target)
      this.requestRender()
      return Promise.resolve()
    }
    const start = guide.position.clone()
    const turnX = streets.reduce((best, street) =>
      Math.abs(street - start.x) + Math.abs(street - target.x) <
      Math.abs(best - start.x) + Math.abs(best - target.x) ? street : best,
    )
    const path = Math.abs(start.z - target.z) < 0.001
      ? [start, target]
      : [start, new Vector3(turnX, start.y, start.z), new Vector3(turnX, target.y, target.z), target]
    const segments = path.slice(1).map((to, i) => ({ from: path[i], to, length: to.distanceTo(path[i]) }))
      .filter((segment) => segment.length > 0.001)
    const distance = segments.reduce((total, segment) => total + segment.length, 0)
    const cameraStart = { ...this.view }
    this.tweens.delete('camera')
    this.guidePose('walk')
    this.lastGuideFrame = performance.now()

    return new Promise((resolve) => {
      this.finishWalk = () => {
        this.tweens.delete('guide-walk')
        this.finishWalk = null
        this.guidePose('idle')
        resolve()
      }
      this.tweens.set('guide-walk', {
        start: performance.now(),
        delay: 0,
        duration: Math.max(650, Math.min(2700, distance * 460)),
        ease: (t) => t,
        update: (t) => {
          let remaining = t * distance
          for (const segment of segments) {
            if (remaining <= segment.length + 0.001) {
              guide.position.lerpVectors(segment.from, segment.to, Math.min(1, remaining / segment.length))
              guide.rotation.y = Math.atan2(segment.to.x - segment.from.x, segment.to.z - segment.from.z)
              break
            }
            remaining -= segment.length
          }
          const follow = Math.min(1, t * 3)
          this.view = {
            ...cameraStart,
            tx: cameraStart.tx + (guide.position.x - cameraStart.tx) * follow,
            tz: cameraStart.tz + (guide.position.z - cameraStart.tz) * follow,
          }
          this.applyCamera()
          if (t === 1) this.finishWalk?.()
        },
      })
      this.requestRender()
    })
  }

  dispose(): void {
    this.disposed = true
    this.finishWalk?.()
    this.guideMixer?.stopAllAction()
    cancelAnimationFrame(this.frame)
    const canvas = this.options.canvas
    canvas.removeEventListener('pointerdown', this.onPointerDown)
    canvas.removeEventListener('pointermove', this.onPointerMove)
    canvas.removeEventListener('pointerup', this.onPointerUp)
    canvas.removeEventListener('pointercancel', this.onPointerUp)
    canvas.removeEventListener('wheel', this.onWheel)
    canvas.removeEventListener('contextmenu', this.onContextMenu)
    canvas.removeEventListener('webglcontextrestored', this.requestRender)
    for (const resource of this.owned) resource.dispose()
    this.renderer.dispose()
    // WebView 同時能開的 WebGL context 有上限，離開頁面就主動釋放
    this.renderer.forceContextLoss()
  }

  // ── 場景組裝 ─────────────────────────

  private own<T extends { dispose: () => void }>(resource: T): T {
    // 載入途中就離開頁面時，之後才建好的資源直接釋放
    if (this.disposed) resource.dispose()
    else this.owned.push(resource)
    return resource
  }

  private material(color: string, options: { roughness?: number } = {}): MeshStandardMaterial {
    return this.own(new MeshStandardMaterial({ color, roughness: options.roughness ?? 0.95, metalness: 0 }))
  }

  private geometry<T extends BufferGeometry>(geometry: T): T {
    return this.own(geometry)
  }

  private addLights(): void {
    this.scene.add(new HemisphereLight(0xffffff, 0xcad1d5, 1.75))

    // 太陽偏前方：朝向鏡頭的外牆亮一點，主題色看得清楚；影子落在大樓後方偏右
    const sun = new DirectionalLight(0xffffff, 2.1)
    sun.position.set(-5, 10, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -7
    sun.shadow.camera.right = 7
    sun.shadow.camera.top = 7
    sun.shadow.camera.bottom = -7
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 40
    sun.shadow.bias = -0.0006
    sun.shadow.normalBias = 0.02
    this.scene.add(sun, sun.target)
  }

  private buildGround(): void {
    // 圓角方塊的城市底座，像一座城市模型：旋轉到任何角度都完整，底座外面露出天空
    const BASE_DEPTH = 0.6
    const ground = new Mesh(
      this.geometry(new RoundedBoxGeometry(BASE_SIZE, BASE_DEPTH, BASE_SIZE, 4, 0.35)),
      this.material(GROUND_COLOR),
    )
    // 頂面在 y = -0.02，略低於道路，避免兩個面重疊閃爍
    ground.position.y = -0.02 - BASE_DEPTH / 2
    ground.receiveShadow = true

    const road = new Mesh(this.geometry(new BoxGeometry(ROAD_HALF * 2, 0.02, ROAD_HALF * 2)), this.material(ROAD_COLOR))
    road.position.y = -0.01
    road.receiveShadow = true
    this.content.add(ground, road)

    this.buildRoadLines()

    const curbGeometry = this.geometry(new BoxGeometry(PLOT_SIZE, 0.06, PLOT_SIZE))
    const topGeometry = this.geometry(new BoxGeometry(PLOT_SIZE - 0.16, 0.065, PLOT_SIZE - 0.16))
    const curbMaterial = this.material(CURB_COLOR)
    for (const plot of CITY_PLOTS) {
      const { x, z } = plotCenter(plot)
      const curb = new Mesh(curbGeometry, curbMaterial)
      curb.position.set(x, 0.03, z)
      curb.receiveShadow = true

      const topMaterial = this.material(CITY_THEMES[plot.theme].plot)
      this.plotTops.set(plot.categoryId, topMaterial)
      const top = new Mesh(topGeometry, topMaterial)
      top.position.set(x, 0.0325, z)
      top.receiveShadow = true
      // 點地塊也算點到這棟大樓
      top.userData.categoryId = plot.categoryId
      curb.userData.categoryId = plot.categoryId
      this.pickables.push(top, curb)
      this.content.add(curb, top)
    }
  }

  /** 道路中線的虛線，用 InstancedMesh 一次畫完；在路口留空 */
  private buildRoadLines(): void {
    const centers = [-PLOT_PITCH / 2, PLOT_PITCH / 2, -(ROAD_HALF - 0.32), ROAD_HALF - 0.32]
    const dashes: { x: number; z: number; alongX: boolean }[] = []
    const step = 0.42
    for (const c of centers) {
      for (let t = -ROAD_HALF + 0.3; t <= ROAD_HALF - 0.3; t += step) {
        const nearCrossing = centers.some((other) => Math.abs(t - other) < 0.32)
        if (nearCrossing) continue
        dashes.push({ x: t, z: c, alongX: true }, { x: c, z: t, alongX: false })
      }
    }
    const lines = new InstancedMesh(
      this.geometry(new BoxGeometry(0.2, 0.012, 0.045)),
      this.material(ROAD_LINE_COLOR),
      dashes.length,
    )
    const matrix = new Matrix4()
    const rotation = new Matrix4().makeRotationY(Math.PI / 2)
    dashes.forEach((dash, i) => {
      matrix.makeTranslation(dash.x, 0.006, dash.z)
      if (!dash.alongX) matrix.multiply(rotation)
      lines.setMatrixAt(i, matrix)
    })
    lines.receiveShadow = true
    this.content.add(lines)
  }

  /** material 為 null 時保留模型原本的材質（車輛、路燈） */
  private prepareModel(gltf: GLTF, material: Material | null, scale: number): { model: Object3D; height: number } {
    const model = gltf.scene.clone(true)
    model.scale.setScalar(scale)
    model.traverse((object) => {
      if (object instanceof Mesh) {
        if (material) object.material = material
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    const box = new Box3().setFromObject(model)
    return { model, height: box.max.y }
  }

  /** 每個類別的招牌貼圖：醫療是紅十字，其他是和介面相同的類別圖示；圖示載入失敗就不掛招牌 */
  private async loadSignTextures(): Promise<Map<string, Texture>> {
    const signs = new Map<string, Texture>()
    await Promise.all(
      CITY_PLOTS.map(async (plot) => {
        try {
          if (plot.cross) {
            signs.set(plot.categoryId, this.own(createCrossSign(MEDICAL_RED)))
            return
          }
          const category = CATEGORIES.find((c) => c.id === plot.categoryId)
          if (!category) return
          const texture = await createIconSign(ICONS[category.icon], CITY_THEMES[plot.theme].accent)
          signs.set(plot.categoryId, this.own(texture))
        } catch {
          // 招牌只是裝飾，載入失敗不影響地圖
        }
      }),
    )
    return signs
  }

  /**
   * 依套件與主題重畫貼圖，同一組只畫一次。
   * 商業大樓換牆面與招牌色；住宅牆面用淺一階的顏色，主題色留給屋頂，看起來才像一般住家。
   */
  private paletteTextures(kit: ModelKit, themeKey: CityThemeKey, source: Texture): { normal: Texture; strong: Texture } {
    const key = `${kit}:${themeKey}`
    let textures = this.paletteCache.get(key)
    if (!textures) {
      const theme = CITY_THEMES[themeKey]
      const accentRect = kit === 'suburban' ? PALETTE.suburbanRoof : PALETTE.commercialAccent
      const regions = (wall: string) => [
        { rect: PALETTE.wall, color: wall },
        { rect: accentRect, color: theme.accent },
      ]
      const [normalWall, strongWall] = kit === 'suburban' ? [theme.plot, theme.wall] : [theme.wall, theme.wallStrong]
      textures = {
        normal: this.own(recolorPalette(source, regions(normalWall))),
        strong: this.own(recolorPalette(source, regions(strongWall))),
      }
      this.paletteCache.set(key, textures)
    }
    return textures
  }

  private buildLandmarks(models: Map<string, GLTF>, signs: Map<string, Texture>): void {
    for (const plot of CITY_PLOTS) {
      const theme = CITY_THEMES[plot.theme]
      const gltf = models.get(plot.model)
      const source = gltf && findTexture(gltf)
      if (!gltf || !source) continue
      const textures = this.paletteTextures(kitOf(plot.model), plot.theme, source)
      // 每棟大樓自己一份材質：選取時要個別調亮暗與換貼圖
      const material = this.own(new MeshStandardMaterial({ map: textures.normal, roughness: 1, metalness: 0 }))
      const { model, height } = this.prepareModel(gltf, material, LANDMARK_SCALE)
      const root = new Group()
      const { x, z } = plotCenter(plot)
      root.position.set(x, 0, z)
      root.userData.categoryId = plot.categoryId
      root.add(model)
      this.content.add(root)
      this.pickables.push(root)

      // 招牌與直升機坪掛在模型底下：進場時跟著大樓長高，選取時跟著浮起
      const localBox = new Box3().setFromObject(gltf.scene)
      const sign = signs.get(plot.categoryId)
      if (sign) this.addSign(plot, root, model, localBox, sign)
      if (plot.helipad) this.addHelipad(model, localBox)
      plot.trees?.forEach((tree, index) => this.content.add(this.makeTree(x + tree.dx, z + tree.dz, 0.8, index)))

      this.landmarks.set(plot.categoryId, {
        categoryId: plot.categoryId,
        theme: plot.theme,
        root,
        model,
        material,
        textures,
        plotTop: this.plotTops.get(plot.categoryId) ?? this.material(theme.plot),
        height,
        lift: 0,
        dim: 0,
        highlight: 0,
      })
    }
  }

  private signFace(texture: Texture): Material[] {
    const edge = this.material(SIGN_EDGE_COLOR)
    const face = this.own(new MeshStandardMaterial({ map: texture, roughness: 0.7, metalness: 0 }))
    // BoxGeometry 的面順序：+x、-x、+y、-y、+z（正面，朝鏡頭）、-z
    return [edge, edge, edge, edge, face, edge]
  }

  private addSign(plot: CityPlot, root: Group, model: Object3D, localBox: Box3, texture: Texture): void {
    const materials = this.signFace(texture)
    if (plot.sign === 'facade') {
      // 掛在正面外牆上方；模型有縮放，尺寸換算回模型座標
      const size = SIGN_SIZE / LANDMARK_SCALE
      const sign = new Mesh(this.geometry(new BoxGeometry(size, size, 0.03 / LANDMARK_SCALE)), materials)
      // 靠近屋頂：前排大樓的標籤浮在較低的位置，掛高一點才不會被擋住
      sign.position.set(0, localBox.max.y - 0.29, localBox.max.z + 0.016)
      sign.castShadow = true
      model.add(sign)
      return
    }
    // 住宅：前院立一支招牌
    const group = new Group()
    const post = new Mesh(this.geometry(new CylinderGeometry(0.022, 0.022, YARD_SIGN_HEIGHT, 8)), this.material(POST_COLOR))
    post.position.y = YARD_SIGN_HEIGHT / 2
    const board = new Mesh(this.geometry(new BoxGeometry(YARD_SIGN_SIZE, YARD_SIGN_SIZE, 0.03)), materials)
    board.position.y = YARD_SIGN_HEIGHT + YARD_SIGN_SIZE / 2 - 0.04
    post.castShadow = board.castShadow = true
    group.add(post, board)
    group.position.set(0.5, 0, PLOT_SIZE / 2 - 0.1)
    root.add(group)
  }

  /** 醫院屋頂的直升機坪：白色圓盤加紅十字 */
  private addHelipad(model: Object3D, localBox: Box3): void {
    const width = Math.min(localBox.max.x - localBox.min.x, localBox.max.z - localBox.min.z)
    const radius = width * 0.36
    const top = this.own(new MeshStandardMaterial({ map: this.own(createHelipad(MEDICAL_RED)), roughness: 0.8 }))
    const side = this.material(SIGN_EDGE_COLOR)
    // CylinderGeometry 的材質順序：側面、頂面、底面
    const pad = new Mesh(this.geometry(new CylinderGeometry(radius, radius, 0.03, 40)), [side, top, side])
    pad.position.set((localBox.min.x + localBox.max.x) / 2, localBox.max.y + 0.015, (localBox.min.z + localBox.max.z) / 2)
    pad.receiveShadow = true
    model.add(pad)
  }

  /** 街上的車輛與路燈，保留 Kenney 原本的材質 */
  private buildProps(models: Map<string, GLTF>): void {
    for (const prop of PROPS) {
      const gltf = models.get(prop.model)
      if (!gltf) continue
      const { model } = this.prepareModel(gltf, null, prop.scale)
      model.position.set(prop.x, 0, prop.z)
      model.rotation.y = prop.rotation
      this.content.add(model)
    }
  }

  private buildSkyline(models: Map<string, GLTF>, source: Texture): void {
    const texture = this.own(
      recolorPalette(source, [
        { rect: PALETTE.wall, color: NEUTRAL_WALL },
        { rect: PALETTE.commercialAccent, color: NEUTRAL_ACCENT },
      ]),
    )
    const material = this.own(new MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }))
    const place = (items: { model: string; x: number; z: number }[], scale: number) => {
      items.forEach((item, index) => {
        const gltf = models.get(item.model)
        if (!gltf) return
        const { model } = this.prepareModel(gltf, material, scale)
        model.position.set(item.x, 0, item.z)
        // 同一個模型重複出現時轉個方向，看起來比較不像複製貼上
        model.rotation.y = (index % 4) * (Math.PI / 2)
        model.userData.skyline = true
        this.content.add(model)
      })
    }
    place(SKYLINE, 1)
    place(PARASOLS, 1.1)
  }

  private treeParts?: {
    trunk: BufferGeometry
    canopy: BufferGeometry
    trunkMaterial: Material
    canopyMaterials: Material[]
  }

  private makeTree(x: number, z: number, scale: number, variant: number): Group {
    this.treeParts ??= {
      trunk: this.geometry(new CylinderGeometry(0.035, 0.045, 0.22, 6)),
      canopy: this.geometry(new IcosahedronGeometry(0.2, 0)),
      trunkMaterial: this.material(TRUNK_COLOR),
      canopyMaterials: CANOPY_COLORS.map((color) => this.material(color, { roughness: 0.85 })),
    }
    const parts = this.treeParts
    const group = new Group()
    const trunk = new Mesh(parts.trunk, parts.trunkMaterial)
    trunk.position.y = 0.11
    const canopy = new Mesh(parts.canopy, parts.canopyMaterials[variant % parts.canopyMaterials.length])
    canopy.position.y = 0.36
    canopy.rotation.y = variant
    trunk.castShadow = canopy.castShadow = true
    group.add(trunk, canopy)
    group.position.set(x, 0, z)
    group.scale.setScalar(scale)
    return group
  }

  private buildTrees(): void {
    TREES.forEach((tree, index) => this.content.add(this.makeTree(tree.x, tree.z, tree.scale, index)))
  }

  // ── 視角 ───────────────────────────

  /** 預設視角要框住的點：九個街區與主角大樓（完整長高時）；外圈的天際線與樹可以超出畫面 */
  private computeFitPoints(): void {
    const half = PLOT_PITCH + PLOT_SIZE / 2 + 0.25
    const points: Vector3[] = []
    for (const x of [-half, half]) {
      for (const z of [-half, ROAD_HALF]) points.push(new Vector3(x, 0, z))
    }
    for (const landmark of this.landmarks.values()) {
      const box = new Box3().setFromObject(landmark.root)
      points.push(new Vector3(box.min.x, box.max.y, box.min.z), new Vector3(box.max.x, box.max.y, box.max.z))
    }
    this.fitPoints = points
  }

  /** 剛好放進整座城市的視角；上方留空間給最高那棟的標籤，下方留給視角按鈕列 */
  private updateHome(): void {
    const { width: W, height: H } = this.size
    const pad = { x: 12, top: 72, bottom: 68 }
    const { right, up } = axesAt(DEFAULT_YAW)
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const point of this.fitPoints) {
      const x = point.dot(right)
      const y = point.dot(up)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    const scale = Math.min((W - pad.x * 2) / (maxX - minX), (H - pad.top - pad.bottom) / (maxY - minY))
    const { tx, tz } = groundFromPlane((minX + maxX) / 2, (minY + maxY) / 2, DEFAULT_YAW)
    this.home = { tx, tz, yaw: DEFAULT_YAW, scale, sy: pad.top + (H - pad.top - pad.bottom) / 2 }
  }

  /**
   * 選取一棟大樓時的視角：拉近，並把大樓移到抽屜上方可見區域的中間；太高的大樓縮小倍率，讓屋頂與標籤留在畫面內。
   * 預設保留使用者轉好的方向；使用者已經拉得更近時也不拉遠。
   */
  private selectionView(landmark: Landmark, yaw = this.view.yaw, keepZoom = true): ViewState {
    const H = this.size.height
    const base = this.home.scale
    const visibleH = Math.max(120, H - this.insetBottom)
    const projectedHeight = landmark.height * COS_E
    const fitScale = (visibleH - 96) / (projectedHeight + 0.8)
    const autoScale = Math.max(base, Math.min(base * SELECT_ZOOM, fitScale))
    const scale = this.clampScale(keepZoom ? Math.max(autoScale, this.view.scale) : autoScale)

    const { right, up } = axesAt(yaw)
    const focus = new Vector3(landmark.root.position.x, landmark.height * 0.5, landmark.root.position.z)
    const { tx, tz } = groundFromPlane(focus.dot(right), focus.dot(up), yaw)
    const labelRoom = 64
    const sy = Math.max(visibleH / 2 + 28, labelRoom + (projectedHeight / 2) * scale)
    return { tx, tz, yaw, scale, sy }
  }

  private clampScale(scale: number): number {
    return clamp(scale, this.home.scale * MIN_ZOOM, this.home.scale * MAX_ZOOM)
  }

  private clampView(): void {
    this.view.scale = this.clampScale(this.view.scale)
    this.view.tx = clamp(this.view.tx, -PAN_LIMIT, PAN_LIMIT)
    this.view.tz = clamp(this.view.tz, -PAN_LIMIT, PAN_LIMIT)
  }

  /** 依目前的 view 擺好鏡頭：位置繞著目標點、依方位角與俯角，正交投影的範圍由縮放與 sy 決定 */
  private applyCamera(): void {
    const { tx, tz, yaw, scale, sy } = this.view
    const { width: W, height: H } = this.size
    const camera = this.camera
    camera.position.set(
      tx + Math.sin(yaw) * COS_E * CAMERA_DISTANCE,
      SIN_E * CAMERA_DISTANCE,
      tz + Math.cos(yaw) * COS_E * CAMERA_DISTANCE,
    )
    camera.lookAt(tx, 0, tz)
    camera.left = -W / 2 / scale
    camera.right = W / 2 / scale
    camera.top = sy / scale
    camera.bottom = -(H - sy) / scale
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }

  /** 鏡頭平順移到新視角；旋轉走最短的方向，縮放用等比內插 */
  private animateTo(to: ViewState, duration = 650): void {
    if (this.options.reducedMotion) {
      this.view = { ...to }
      this.applyCamera()
      this.requestRender()
      return
    }
    const from = { ...this.view }
    const turn = wrapAngle(to.yaw - from.yaw)
    this.tweens.set('camera', {
      start: performance.now(),
      delay: 0,
      duration,
      ease: easeInOutCubic,
      update: (t) => {
        this.view = {
          tx: from.tx + (to.tx - from.tx) * t,
          tz: from.tz + (to.tz - from.tz) * t,
          yaw: from.yaw + turn * t,
          scale: from.scale * (to.scale / from.scale) ** t,
          sy: from.sy + (to.sy - from.sy) * t,
        }
        this.applyCamera()
      },
    })
    this.requestRender()
  }

  /** 畫布上的點（px）對應到地面上的哪裡 */
  private screenToGround(x: number, y: number): Vector3 | null {
    const ndc = new Vector2((x / this.size.width) * 2 - 1, -(y / this.size.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    return this.raycaster.ray.intersectPlane(this.groundPlane, new Vector3())
  }

  /** 以畫面上一點為中心縮放與旋轉：手指底下的地面位置維持不動 */
  private transformAround(x: number, y: number, scaleFactor: number, yawDelta: number): void {
    const before = this.screenToGround(x, y)
    this.view.scale = this.clampScale(this.view.scale * scaleFactor)
    this.view.yaw += yawDelta
    this.applyCamera()
    const after = this.screenToGround(x, y)
    if (before && after) {
      this.view.tx += before.x - after.x
      this.view.tz += before.z - after.z
    }
    this.clampView()
    this.applyCamera()
  }

  /** 把畫面上 from 位置的地面拖到 to 位置 */
  private panBy(fromX: number, fromY: number, toX: number, toY: number): void {
    const from = this.screenToGround(fromX, fromY)
    const to = this.screenToGround(toX, toY)
    if (from && to) {
      this.view.tx += from.x - to.x
      this.view.tz += from.z - to.z
    }
    this.clampView()
    this.applyCamera()
  }

  /** 大樓由地面長出來，前排先、後排後；減少動態效果時直接顯示完整畫面 */
  private playIntro(): void {
    if (this.options.reducedMotion) {
      this.requestRender()
      return
    }
    for (const plot of CITY_PLOTS) {
      const landmark = this.landmarks.get(plot.categoryId)
      if (!landmark) continue
      landmark.model.scale.y = 0.001
      const delay = (2 - plot.row) * 140 + plot.col * 60
      this.tweens.set(`intro:${plot.categoryId}`, {
        start: performance.now(),
        delay,
        duration: 700,
        ease: easeOutBack,
        update: (t) => {
          landmark.model.scale.y = Math.max(0.001, t) * LANDMARK_SCALE
        },
      })
    }
    this.requestRender()
  }

  private tweenValue(key: string, from: number, to: number, duration: number, ease: Ease, update: (v: number) => void): void {
    if (this.options.reducedMotion || from === to) {
      update(to)
      this.requestRender()
      return
    }
    this.tweens.set(key, {
      start: performance.now(),
      delay: 0,
      duration,
      ease,
      update: (t) => update(from + (to - from) * t),
    })
    this.requestRender()
  }

  // ── 繪製 ───────────────────────────

  private readonly requestRender = (): void => {
    if (this.frame || this.disposed) return
    this.frame = requestAnimationFrame(this.tick)
  }

  private readonly tick = (): void => {
    this.frame = 0
    // 動畫的起點用 performance.now() 記錄，這裡也用同一個時鐘；
    // requestAnimationFrame 給的時間戳在部分環境的基準不同，混用會讓動畫停在第一格
    const now = performance.now()
    if (this.finishWalk) {
      this.guideMixer?.update(Math.min((now - this.lastGuideFrame) / 1000, 0.05))
      this.lastGuideFrame = now
    }
    for (const [key, tween] of this.tweens) {
      const elapsed = now - tween.start - tween.delay
      if (elapsed < 0) continue
      const t = Math.min(1, elapsed / tween.duration)
      tween.update(tween.ease(t))
      if (t >= 1) this.tweens.delete(key)
    }
    this.renderer.render(this.scene, this.camera)
    this.options.onFrame()
    if (this.tweens.size) this.requestRender()
  }

  // ── 點選 ───────────────────────────

  private pick(clientX: number, clientY: number): string | null {
    const rect = this.options.canvas.getBoundingClientRect()
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    for (const hit of this.raycaster.intersectObjects(this.pickables, true)) {
      let object: Object3D | null = hit.object
      while (object) {
        if (typeof object.userData.categoryId === 'string') return object.userData.categoryId
        object = object.parent
      }
    }
    return null
  }

  // ── 手勢 ───────────────────────────
  // 單指拖曳平移；兩指捏合縮放、轉動旋轉、一起移動平移；滑鼠右鍵或按住 Shift 拖曳旋轉；滾輪縮放。
  // 沒有拖曳、只用一指、按得不久才算點選大樓。

  private localPoint(event: MouseEvent): { x: number; y: number } {
    const rect = this.options.canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.ready) return
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) return
    // 手指移出畫布也繼續追蹤；輔助工具送來的模擬事件不能 capture，失敗也照常處理手勢
    try {
      this.options.canvas.setPointerCapture(event.pointerId)
    } catch {
      // 忽略
    }
    const point = this.localPoint(event)
    this.pointers.set(event.pointerId, point)
    // 使用者接手時，停掉正在進行的鏡頭動畫
    this.tweens.delete('camera')
    if (this.pointers.size === 1) {
      this.gesture = {
        startX: point.x,
        startY: point.y,
        time: performance.now(),
        dragging: false,
        multi: false,
        rotate: event.button === 2 || event.shiftKey,
      }
    } else if (this.gesture) {
      this.gesture.multi = true
    }
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const previous = this.pointers.get(event.pointerId)
    if (!previous) {
      // 滑鼠沒按著移動：指到大樓時顯示手指游標
      if (event.pointerType === 'mouse' && this.ready) {
        this.options.canvas.style.cursor = this.pick(event.clientX, event.clientY) ? 'pointer' : 'grab'
      }
      return
    }
    const gesture = this.gesture
    const current = this.localPoint(event)
    if (!gesture) return

    if (this.pointers.size === 1) {
      if (!gesture.dragging) {
        if (Math.hypot(current.x - gesture.startX, current.y - gesture.startY) < DRAG_THRESHOLD) return
        gesture.dragging = true
        this.options.canvas.style.cursor = 'grabbing'
      }
      if (gesture.rotate) this.transformAround(this.size.width / 2, this.view.sy, 1, (current.x - previous.x) * 0.01)
      else this.panBy(previous.x, previous.y, current.x, current.y)
      this.pointers.set(event.pointerId, current)
    } else {
      const ids = [...this.pointers.keys()].slice(0, 2)
      if (!ids.includes(event.pointerId)) {
        this.pointers.set(event.pointerId, current)
        return
      }
      const [a0, b0] = ids.map((id) => this.pointers.get(id)!)
      this.pointers.set(event.pointerId, current)
      const [a1, b1] = ids.map((id) => this.pointers.get(id)!)
      const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }
      const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }
      const distance0 = Math.max(1, Math.hypot(b0.x - a0.x, b0.y - a0.y))
      const distance1 = Math.hypot(b1.x - a1.x, b1.y - a1.y)
      const turn = wrapAngle(Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x))
      gesture.dragging = true
      // 手指順時針轉，城市也順時針轉
      this.transformAround(mid0.x, mid0.y, distance1 / distance0, turn)
      this.panBy(mid0.x, mid0.y, mid1.x, mid1.y)
    }
    this.userMoved = true
    this.requestRender()
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) return
    this.pointers.delete(event.pointerId)
    const canvas = this.options.canvas
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    // 還有其他手指在畫面上：繼續手勢
    if (this.pointers.size > 0) return
    const gesture = this.gesture
    this.gesture = null
    if (event.pointerType === 'mouse') canvas.style.cursor = 'grab'
    if (!gesture || event.type === 'pointercancel') return
    if (!gesture.dragging && !gesture.multi && performance.now() - gesture.time < 700) {
      this.options.onPick(this.pick(event.clientX, event.clientY))
    }
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.ready) return
    event.preventDefault()
    this.tweens.delete('camera')
    const { x, y } = this.localPoint(event)
    this.transformAround(x, y, Math.exp(-event.deltaY * 0.0015), 0)
    this.userMoved = true
    this.requestRender()
  }

  /** 右鍵拖曳用來旋轉，不要跳出選單 */
  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault()
  }
}
