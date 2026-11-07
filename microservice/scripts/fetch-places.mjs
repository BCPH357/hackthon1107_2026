// 從臺北資料大平台抓「去哪裡辦」AR 方向指引用的地點，輸出 src/data/places.json。
//
//   node scripts/fetch-places.mjs
//
// 資料來源（皆為臺北資料大平台 data.taipei，政府資料開放授權條款）：
// 1. 臺北市公廁點位資訊：區公所、戶政事務所、聯醫院區的名稱、地址與經緯度（WGS84）。
//    公廁以「建物」登記，所以座標就是該機關所在建物的位置。
// 2. 臺北市各區戶政事務所等候人數：12 區戶政事務所的正式名稱、地址與電話。
//    戶政事務所沒有自己的公廁紀錄時，改用同一棟建物（地址相同、不看樓層）的座標。
// 找不到座標的地點不會猜，寫進 missing，畫面上會說明並改用地址搜尋。

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const API = 'https://data.taipei/api/v1/dataset'
const SOURCES = {
  toilets: {
    title: '臺北市公廁點位資訊',
    url: 'https://data.taipei/dataset/detail?id=ca205b54-a06f-4d84-894c-d6ab5079ce79',
    rid: '9e0e6ad4-b9f9-4810-8551-0cffd1b915b3',
  },
  household: {
    title: '臺北市各區戶政事務所等候人數',
    url: 'https://data.taipei/dataset/detail?id=3b9856c9-d26b-4089-95ad-bc4c5908461e',
    rid: 'b69e905a-0436-4151-aad8-dfc94054defc',
  },
}

const DISTRICTS = ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區']

async function fetchAll(rid) {
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${API}/${rid}?scope=resourceAquire&limit=1000&offset=${offset}`)
    if (!res.ok) throw new Error(`data.taipei ${rid} 回應 ${res.status}`)
    const { result } = await res.json()
    rows.push(...result.results)
    if (rows.length >= result.count || result.results.length === 0) return rows
  }
}

const clean = (text) => String(text ?? '').replace(/[\s　]+/g, '')

// 「八德路4段692號4樓」與「八德路四段692號7樓」視為同一棟：數字統一、只取到「號」
const CHINESE_DIGITS = { 一: '1', 二: '2', 三: '3', 四: '4', 五: '5', 六: '6', 七: '7', 八: '8', 九: '9' }
function buildingKey(address) {
  const normalized = clean(address)
    .replace(/^臺北市/, '')
    .replace(/([一二三四五六七八九])段/g, (_m, d) => `${CHINESE_DIGITS[d]}段`)
  const match = /^(.*?\d+(?:之\d+)?號)/.exec(normalized)
  return match ? match[1] : normalized
}

const inTaipei = (lat, lng) => lat > 24.95 && lat < 25.22 && lng > 121.45 && lng < 121.67

function point(row) {
  const lat = Number(row['緯度'])
  const lng = Number(row['經度'])
  return inTaipei(lat, lng) ? { lat, lng } : null
}

const toilets = await fetchAll(SOURCES.toilets.rid)
const households = await fetchAll(SOURCES.household.rid)

const places = []
const missing = []

// ── 區公所 ──
for (const district of DISTRICTS) {
  const row = toilets.find((r) => [`${district}公所`, `臺北市${district}公所`].includes(clean(r['公廁名稱'])))
  const coords = row && point(row)
  if (!coords) {
    missing.push({ type: 'districtOffice', district, name: `${district}公所`, reason: '開放資料中沒有這個區公所的座標' })
    continue
  }
  places.push({
    id: `district-office-${district}`,
    type: 'districtOffice',
    name: `${district}公所`,
    district,
    address: clean(row['公廁地址']),
    ...coords,
    source: 'toilets',
  })
}

// ── 戶政事務所：名稱、地址、電話用戶政資料，座標用公廁資料 ──
for (const office of households) {
  const name = clean(office['戶所名稱']).replace(/^臺北市/, '')
  const district = DISTRICTS.find((d) => name.startsWith(d))
  const address = clean(office['地址'])
  const own = toilets.find((r) => clean(r['公廁名稱']).startsWith(name) && clean(r['公廁名稱']).includes('所本部'))
    ?? toilets.find((r) => clean(r['公廁名稱']) === name)
  const sameBuilding = toilets.find((r) => r['行政區'] === district && buildingKey(r['公廁地址']) === buildingKey(address))
  const row = own ?? sameBuilding
  const coords = row && point(row)
  if (!coords) {
    missing.push({ type: 'household', district, name, address, reason: '開放資料中沒有這棟建物的座標' })
    continue
  }
  places.push({
    id: `household-${district}`,
    type: 'household',
    name,
    district,
    address,
    phone: clean(office['電話']),
    ...coords,
    source: own ? 'toilets+household' : 'toilets(同棟建物)+household',
  })
}

// ── 聯醫院區（不含門診部、中醫院區與昆明院區：失智就醫、身障鑑定要去西醫院區；同址只留一筆）──
const seen = new Set()
for (const row of toilets) {
  const raw = clean(row['公廁名稱'])
  if (!/^(臺北市立)?聯合醫院.+院區/.test(raw) || /門診部|中醫|昆明/.test(raw)) continue
  const coords = point(row)
  const key = buildingKey(row['公廁地址'])
  if (!coords || seen.has(key)) continue
  seen.add(key)
  const name = raw.replace(/^(臺北市立)?聯合醫院/, '臺北市立聯合醫院').replace(/\((.+)\)$/, '（$1）')
  places.push({
    id: `hospital-${places.length}`,
    type: 'hospital',
    name,
    district: row['行政區'],
    address: clean(row['公廁地址']),
    ...coords,
    source: 'toilets',
  })
}

const output = {
  fetchedAt: new Date().toISOString().slice(0, 10),
  license: '政府資料開放授權條款－第1版',
  sources: Object.fromEntries(Object.entries(SOURCES).map(([key, { title, url }]) => [key, { title, url }])),
  places,
  missing,
}

const target = fileURLToPath(new URL('../src/data/places.json', import.meta.url))
writeFileSync(target, JSON.stringify(output, null, 2) + '\n')
const count = (type) => places.filter((p) => p.type === type).length
console.log(`區公所 ${count('districtOffice')}、戶政事務所 ${count('household')}、聯醫院區 ${count('hospital')}；缺座標 ${missing.length} 處：`)
for (const m of missing) console.log(`  - ${m.name}：${m.reason}`)
