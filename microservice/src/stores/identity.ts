import { computed, reactive, watch } from 'vue'
import {
  CARE_OPTIONS,
  DISABILITY_LEVEL_OPTIONS,
  EMPLOYMENT_OPTIONS,
  FAMILY_OPTIONS,
  FOR_WHOM_OPTIONS,
  FUNCTION_OPTIONS,
  GENDER_OPTIONS,
  HEALTH_OPTIONS,
  NATIONALITY_OPTIONS,
  OTHER_OPTIONS,
  OUTSIDE_TAIPEI,
  OUTSIDE_TAIPEI_LABEL,
  labelOf,
  labelsOf,
  type CareTag,
  type DisabilityCard,
  type DisabilityLevel,
  type Employment,
  type FamilyTag,
  type ForWhom,
  type FunctionTag,
  type Gender,
  type HealthTag,
  type Nationality,
  type OtherTag,
  type YesNo,
} from '../data/identityOptions'
import type { ProfileKey } from '../data/types'
import { readJson, writeJson } from '../utils/storage'

const STORAGE_KEY = 'life-events.identity.v1'

export interface Identity {
  forWhom: ForWhom | null
  /** 基本資料來源：台北通帳號帶入、家人用藍牙傳來，或使用者自己填 */
  basicSource: 'account' | 'bluetooth' | 'manual' | null
  basicConfirmed: boolean
  age: number | null
  taipeiResident: YesNo | null
  /** 行政區名稱，或 OUTSIDE_TAIPEI */
  district: string | null
  indigenous: YesNo | null
  functions: FunctionTag[]
  disabilityCard: DisabilityCard | null
  disabilityLevel: DisabilityLevel | null
  health: HealthTag[]
  care: CareTag[]
  family: FamilyTag[]
  nationality: Nationality | null
  employment: Employment | null
  gender: Gender | null
  others: OtherTag[]
  /** 走完確認頁才算完成 */
  completed: boolean
}

function emptyIdentity(): Identity {
  return {
    forWhom: null,
    basicSource: null,
    basicConfirmed: false,
    age: null,
    taipeiResident: null,
    district: null,
    indigenous: null,
    functions: [],
    disabilityCard: null,
    disabilityLevel: null,
    health: [],
    care: [],
    family: [],
    nationality: null,
    employment: null,
    gender: null,
    others: [],
    completed: false,
  }
}

// 身分含健康與身障資料，只存在這支手機的 localStorage，不送到任何伺服器
export const identity = reactive<Identity>({ ...emptyIdentity(), ...readJson<Partial<Identity>>(STORAGE_KEY, {}) })
watch(identity, (value) => writeJson(STORAGE_KEY, value), { deep: true })

export function resetIdentity(): void {
  Object.assign(identity, emptyIdentity())
}

/** 換了「幫誰辦」時，前一個人的資料不能沿用 */
export function setForWhom(forWhom: ForWhom): void {
  if (identity.forWhom === forWhom) return
  Object.assign(identity, emptyIdentity(), { forWhom })
}

export const hasIdentity = computed(() => identity.completed)

/** 行政區名稱；不知道或不住在臺北市時為 null */
export const taipeiDistrict = computed(() =>
  identity.district && identity.district !== OUTSIDE_TAIPEI ? identity.district : null,
)

export function computeProfiles(i: Identity): Set<ProfileKey> {
  const profiles = new Set<ProfileKey>()
  const add = (...keys: ProfileKey[]) => keys.forEach((key) => profiles.add(key))

  // 長照對象：65 歲以上，原住民 55 歲以上
  if (i.age !== null && (i.age >= 65 || (i.indigenous === 'yes' && i.age >= 55))) add('elder')
  if (i.disabilityCard === 'yes' || i.functions.length > 0) add('disability')
  add(...i.functions)

  if (i.health.includes('pregnant')) add('pregnant')
  if (i.health.includes('injury')) add('injured')
  if (i.health.includes('majorIllness')) add('injured', 'majorIllness')
  if (i.health.includes('dementia')) add('dementia')

  add(...i.care)
  if (i.care.some((tag) => tag !== 'childcare')) add('caregiver')

  // 幫家人辦時，操作的人本身就是照顧者
  if (i.forWhom === 'family') {
    if (profiles.has('elder') || profiles.has('dementia')) add('caregiver', 'careElder')
    if (i.disabilityCard === 'yes') add('caregiver', 'careDisabled')
    if (profiles.has('injured')) add('caregiver', 'carePatient')
  }

  add(...i.family)
  if (i.employment === 'jobSeeking') add('jobSeeking')
  if (i.taipeiResident === 'yes') add('taipeiResident')
  if (i.indigenous === 'yes') add('indigenous')
  if (i.others.includes('veteran')) add('veteran')
  return profiles
}

export const profiles = computed(() => computeProfiles(identity))

export interface IdentitySummary {
  forWhom: string | null
  basic: string[]
  health: string[]
  life: string[]
}

export function describeIdentity(i: Identity): IdentitySummary {
  const basic: string[] = []
  if (i.age !== null) basic.push(`${i.age} 歲`)
  if (i.taipeiResident === 'yes') basic.push('設籍臺北')
  if (i.taipeiResident === 'no') basic.push('未設籍臺北')
  if (i.district === OUTSIDE_TAIPEI) basic.push(OUTSIDE_TAIPEI_LABEL)
  else if (i.district) basic.push(i.district)
  if (i.indigenous === 'yes') basic.push('原住民')

  const health = labelsOf(FUNCTION_OPTIONS, i.functions)
  if (i.disabilityCard === 'yes') {
    const level = labelOf(DISABILITY_LEVEL_OPTIONS, i.disabilityLevel)
    health.push(level ? `身心障礙證明・${level}` : '持有身心障礙證明')
  }
  health.push(...labelsOf(HEALTH_OPTIONS, i.health))

  const life = [
    ...(i.forWhom === 'self' ? labelsOf(CARE_OPTIONS, i.care) : []),
    ...labelsOf(FAMILY_OPTIONS, i.family),
  ]
  const nationality = labelOf(NATIONALITY_OPTIONS, i.nationality)
  if (nationality) life.push(nationality)
  const employment = labelOf(EMPLOYMENT_OPTIONS, i.employment)
  if (employment) life.push(employment)
  if (i.gender && i.gender !== 'undisclosed') life.push(labelOf(GENDER_OPTIONS, i.gender) ?? '')
  life.push(...labelsOf(OTHER_OPTIONS, i.others))

  return { forWhom: labelOf(FOR_WHOM_OPTIONS, i.forWhom), basic, health, life: life.filter(Boolean) }
}

export const identitySummary = computed(() => describeIdentity(identity))

/** 一行摘要用的全部標籤 */
export const identityTags = computed(() => {
  const { forWhom, basic, health, life } = identitySummary.value
  return [...(forWhom ? [forWhom] : []), ...basic, ...health, ...life]
})
