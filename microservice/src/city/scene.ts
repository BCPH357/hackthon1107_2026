import {
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
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import {
  CITY_PLOTS,
  CITY_THEMES,
  NEUTRAL_ACCENT,
  NEUTRAL_WALL,
  PARASOLS,
  PLOT_PITCH,
  PLOT_SIZE,
  SKYLINE,
  TREES,
  modelUrl,
  plotCenter,
  type CityThemeKey,
} from './config'
import { recolorPalette } from './textures'

/*
 * 城市地圖的 3D 場景（Three.js，MIT 授權）。
 * - 固定的正交視角，不讓使用者旋轉縮放：長者不會轉到迷路，也不會和 WebView 的捲動手勢打架
 * - 只在畫面需要變化時才重畫（載入、動畫、尺寸改變），平常不耗電
 * - 文字標籤由外層 Vue 元件用真正的按鈕疊在畫面上，讀屏與鍵盤都能操作；這裡只提供螢幕座標
 */

const YAW = (14 * Math.PI) / 180
/** 俯角低一點，多看到外牆的顏色、少看到深灰的屋頂 */
const ELEVATION = (34 * Math.PI) / 180
const CAMERA_DISTANCE = 40
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

interface Frustum {
  left: number
  right: number
  top: number
  bottom: number
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
  private readonly pickables: Object3D[] = []
  private readonly raycaster = new Raycaster()
  private readonly tweens = new Map<string, Tween>()
  /** 這個場景自己建立的資源，離開頁面時要釋放；模型本身在快取裡共用，不在這裡 */
  private readonly owned: { dispose: () => void }[] = []
  private readonly right = new Vector3()
  private readonly up = new Vector3()
  /** 視角要框住的範圍（相機平面座標） */
  private bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 }
  private size = { width: 1, height: 1 }
  private insetBottom = 0
  private selected: string | null = null
  private frame = 0
  private ready = false
  private disposed = false
  private pointerStart: { x: number; y: number; time: number } | null = null

  constructor(options: CitySceneOptions) {
    this.options = options
    this.renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap

    const direction = new Vector3(
      Math.sin(YAW) * Math.cos(ELEVATION),
      Math.sin(ELEVATION),
      Math.cos(YAW) * Math.cos(ELEVATION),
    )
    this.camera.position.copy(direction.multiplyScalar(CAMERA_DISTANCE))
    this.camera.lookAt(0, 0, 0)
    this.camera.updateMatrixWorld()
    this.right.setFromMatrixColumn(this.camera.matrixWorld, 0)
    this.up.setFromMatrixColumn(this.camera.matrixWorld, 1)

    this.scene.add(this.content)
    this.addLights()

    const canvas = options.canvas
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('webglcontextrestored', this.requestRender)
  }

  /** 下載模型並組出城市；onProgress 回報 0–1 */
  async load(onProgress: (ratio: number) => void): Promise<void> {
    const names = [
      ...new Set([...CITY_PLOTS.map((p) => p.model), ...SKYLINE.map((s) => s.model), ...PARASOLS.map((p) => p.model)]),
    ]
    let loaded = 0
    const entries = await Promise.all(
      names.map(async (name) => {
        const gltf = await loadModel(name)
        loaded += 1
        onProgress(loaded / names.length)
        return [name, gltf] as const
      }),
    )
    if (this.disposed) return

    const models = new Map(entries)
    const source = findTexture(entries[0][1])
    if (!source) throw new Error('找不到模型貼圖')

    this.buildGround()
    this.buildLandmarks(models, source)
    this.buildSkyline(models, source)
    this.buildTrees()
    this.computeBounds()
    this.ready = true
    this.applyView(false)
    if (this.selected) this.applySelection()
    this.playIntro()
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.size = { width, height }
    this.renderer.setSize(width, height, false)
    if (this.ready) this.applyView(false)
  }

  /** 底部抽屜蓋住的高度；選取的大樓會移到抽屜上方的可見區域中間 */
  setInsetBottom(px: number): void {
    if (Math.abs(px - this.insetBottom) < 1) return
    this.insetBottom = px
    if (this.ready && this.selected) this.applyView(true)
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
    this.applyView(true)
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

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    const canvas = this.options.canvas
    canvas.removeEventListener('pointerdown', this.onPointerDown)
    canvas.removeEventListener('pointerup', this.onPointerUp)
    canvas.removeEventListener('pointermove', this.onPointerMove)
    canvas.removeEventListener('webglcontextrestored', this.requestRender)
    for (const resource of this.owned) resource.dispose()
    this.renderer.dispose()
    // WebView 同時能開的 WebGL context 有上限，離開頁面就主動釋放
    this.renderer.forceContextLoss()
  }

  // ── 場景組裝 ─────────────────────────

  private own<T extends { dispose: () => void }>(resource: T): T {
    this.owned.push(resource)
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
    // 人行道地面往前與左右延伸到畫面外，看不到地板的邊；後緣停在天際線後方，上面露出天空
    const GROUND_BACK = -4.6
    const GROUND_FRONT = 20
    const ground = new Mesh(
      this.geometry(new BoxGeometry(40, 0.2, GROUND_FRONT - GROUND_BACK)),
      this.material(GROUND_COLOR),
    )
    ground.position.set(0, -0.12, (GROUND_FRONT + GROUND_BACK) / 2)
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

  private prepareModel(gltf: GLTF, material: Material, scale: number): { model: Object3D; height: number } {
    const model = gltf.scene.clone(true)
    model.scale.setScalar(scale)
    model.traverse((object) => {
      if (object instanceof Mesh) {
        object.material = material
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    const box = new Box3().setFromObject(model)
    return { model, height: box.max.y }
  }

  private buildLandmarks(models: Map<string, GLTF>, source: Texture): void {
    // 同主題的大樓共用貼圖，每個主題只重畫一次
    const themeTextures = new Map<CityThemeKey, { normal: Texture; strong: Texture }>()
    const texturesOf = (key: CityThemeKey) => {
      let textures = themeTextures.get(key)
      if (!textures) {
        const theme = CITY_THEMES[key]
        textures = {
          normal: this.own(recolorPalette(source, theme.wall, theme.accent)),
          strong: this.own(recolorPalette(source, theme.wallStrong, theme.accent)),
        }
        themeTextures.set(key, textures)
      }
      return textures
    }

    for (const plot of CITY_PLOTS) {
      const theme = CITY_THEMES[plot.theme]
      const gltf = models.get(plot.model)
      if (!gltf) continue
      const textures = texturesOf(plot.theme)
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

  private buildSkyline(models: Map<string, GLTF>, source: Texture): void {
    const texture = this.own(recolorPalette(source, NEUTRAL_WALL, NEUTRAL_ACCENT))
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

  private buildTrees(): void {
    const trunkGeometry = this.geometry(new CylinderGeometry(0.035, 0.045, 0.22, 6))
    const canopyGeometry = this.geometry(new IcosahedronGeometry(0.2, 0))
    const trunkMaterial = this.material(TRUNK_COLOR)
    const canopyMaterials = CANOPY_COLORS.map((color) => this.material(color, { roughness: 0.85 }))
    TREES.forEach((tree, index) => {
      const group = new Group()
      const trunk = new Mesh(trunkGeometry, trunkMaterial)
      trunk.position.y = 0.11
      const canopy = new Mesh(canopyGeometry, canopyMaterials[index % canopyMaterials.length])
      canopy.position.y = 0.36
      canopy.rotation.y = index
      trunk.castShadow = canopy.castShadow = true
      group.add(trunk, canopy)
      group.position.set(tree.x, 0, tree.z)
      group.scale.setScalar(tree.scale)
      group.userData.skyline = true
      this.content.add(group)
    })
  }

  // ── 視角 ───────────────────────────

  /** 框住九個街區與主角大樓；外圈的天際線與樹讓它超出畫面邊緣 */
  private computeBounds(): void {
    const half = PLOT_PITCH + PLOT_SIZE / 2 + 0.25
    const points: Vector3[] = []
    for (const x of [-half, half]) {
      for (const z of [-half, ROAD_HALF]) points.push(new Vector3(x, 0, z))
    }
    for (const landmark of this.landmarks.values()) {
      const box = new Box3().setFromObject(landmark.root)
      points.push(new Vector3(box.min.x, box.max.y, box.min.z), new Vector3(box.max.x, box.max.y, box.max.z))
    }
    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    for (const point of points) {
      const x = point.dot(this.right)
      const y = point.dot(this.up)
      bounds.minX = Math.min(bounds.minX, x)
      bounds.maxX = Math.max(bounds.maxX, x)
      bounds.minY = Math.min(bounds.minY, y)
      bounds.maxY = Math.max(bounds.maxY, y)
    }
    this.bounds = bounds
  }

  private targetFrustum(): Frustum {
    const { width: W, height: H } = this.size
    // 上方留給最高那棟的標籤
    const pad = { x: 12, top: 72, bottom: 12 }
    const b = this.bounds
    const worldW = b.maxX - b.minX
    const worldH = b.maxY - b.minY
    const baseScale = Math.min((W - pad.x * 2) / worldW, (H - pad.top - pad.bottom) / worldH)

    const frustumAt = (px: number, py: number, sx: number, sy: number, scale: number): Frustum => ({
      left: px - sx / scale,
      right: px + (W - sx) / scale,
      top: py + sy / scale,
      bottom: py - (H - sy) / scale,
    })

    const landmark = this.selected ? this.landmarks.get(this.selected) : undefined
    if (!landmark) {
      return frustumAt((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, W / 2, pad.top + (H - pad.top - pad.bottom) / 2, baseScale)
    }

    // 選取時拉近，並把大樓移到抽屜上方可見區域的中間；太高的大樓縮小倍率以免標籤超出畫面
    const visibleH = Math.max(120, H - this.insetBottom)
    const projectedHeight = landmark.height * Math.cos(ELEVATION)
    const fitScale = (visibleH - 96) / (projectedHeight + 0.8)
    const scale = Math.max(baseScale, Math.min(baseScale * SELECT_ZOOM, fitScale))
    const focus = new Vector3(landmark.root.position.x, landmark.height * 0.5, landmark.root.position.z)
    // 大樓中心放在可見區域中間；太高的大樓改成讓屋頂與標籤留在畫面內（下半截可以被抽屜蓋住）
    const labelRoom = 64
    const sy = Math.max(visibleH / 2 + 28, labelRoom + (projectedHeight / 2) * scale)
    return frustumAt(focus.dot(this.right), focus.dot(this.up), W / 2, sy, scale)
  }

  private applyView(animate: boolean): void {
    const to = this.targetFrustum()
    const camera = this.camera
    if (!animate || this.options.reducedMotion) {
      Object.assign(camera, to)
      camera.updateProjectionMatrix()
      this.requestRender()
      return
    }
    const from: Frustum = { left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom }
    this.tweens.set('camera', {
      start: performance.now(),
      delay: 0,
      duration: 650,
      ease: easeInOutCubic,
      update: (t) => {
        camera.left = from.left + (to.left - from.left) * t
        camera.right = from.right + (to.right - from.right) * t
        camera.top = from.top + (to.top - from.top) * t
        camera.bottom = from.bottom + (to.bottom - from.bottom) * t
        camera.updateProjectionMatrix()
      },
    })
    this.requestRender()
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

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() }
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    const start = this.pointerStart
    this.pointerStart = null
    if (!start || !this.ready) return
    // 拖曳或長按不算點選，避免捲動時誤觸
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (moved > 10 || performance.now() - start.time > 700) return
    this.options.onPick(this.pick(event.clientX, event.clientY))
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' || !this.ready) return
    this.options.canvas.style.cursor = this.pick(event.clientX, event.clientY) ? 'pointer' : 'default'
  }
}
