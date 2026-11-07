// 身分選項，依計畫書「身分選項」一節

export const DISTRICTS = [
  '中正區',
  '大同區',
  '中山區',
  '松山區',
  '大安區',
  '萬華區',
  '信義區',
  '士林區',
  '北投區',
  '內湖區',
  '南港區',
  '文山區',
] as const

export const OUTSIDE_TAIPEI = 'outside'
export const OUTSIDE_TAIPEI_LABEL = '不住在臺北市'

export const FOR_WHOM_OPTIONS = [
  { value: 'self', label: '幫自己辦' },
  { value: 'family', label: '幫家人辦' },
] as const

export const YES_NO_OPTIONS = [
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' },
] as const

export const FUNCTION_OPTIONS = [
  { value: 'vision', label: '看不清楚' },
  { value: 'hearing', label: '聽不清楚' },
  { value: 'mobility', label: '行動不便' },
  { value: 'cognition', label: '理解或記憶有困難' },
  { value: 'mental', label: '情緒或精神困擾' },
] as const

export const DISABILITY_CARD_OPTIONS = [
  { value: 'yes', label: '有證明' },
  { value: 'no', label: '沒有' },
] as const

export const DISABILITY_LEVEL_OPTIONS = [
  { value: 'mild', label: '輕度' },
  { value: 'moderate', label: '中度' },
  { value: 'severe', label: '重度' },
  { value: 'profound', label: '極重度' },
] as const

export const HEALTH_OPTIONS = [
  { value: 'pregnant', label: '懷孕或產後' },
  { value: 'injury', label: '暫時性傷病', hint: '例如骨折、手術後' },
  { value: 'majorIllness', label: '重大傷病或罕見疾病' },
  { value: 'dementia', label: '失智' },
] as const

export const CARE_OPTIONS = [
  { value: 'careElder', label: '照顧長者' },
  { value: 'careDisabled', label: '照顧身障者' },
  { value: 'carePatient', label: '照顧病人' },
  { value: 'childcare', label: '育有幼兒' },
] as const

export const FAMILY_OPTIONS = [
  { value: 'lowIncome', label: '低收入或中低收入' },
  { value: 'livingAlone', label: '獨居' },
  { value: 'singleParent', label: '單親' },
  { value: 'specialFamily', label: '特殊境遇家庭' },
] as const

export const NATIONALITY_OPTIONS = [
  { value: 'citizen', label: '本國籍' },
  { value: 'newResident', label: '新住民配偶' },
  { value: 'migrantWorker', label: '外籍移工' },
  { value: 'foreigner', label: '外籍人士或留學生' },
] as const

export const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: '在職' },
  { value: 'jobSeeking', label: '求職中' },
  { value: 'retired', label: '退休' },
  { value: 'student', label: '學生' },
] as const

export const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'undisclosed', label: '不透露' },
] as const

export const OTHER_OPTIONS = [{ value: 'veteran', label: '榮民或榮眷' }] as const

type ValueOf<T extends readonly { value: string }[]> = T[number]['value']

export type ForWhom = ValueOf<typeof FOR_WHOM_OPTIONS>
export type YesNo = ValueOf<typeof YES_NO_OPTIONS>
export type FunctionTag = ValueOf<typeof FUNCTION_OPTIONS>
export type DisabilityCard = ValueOf<typeof DISABILITY_CARD_OPTIONS>
export type DisabilityLevel = ValueOf<typeof DISABILITY_LEVEL_OPTIONS>
export type HealthTag = ValueOf<typeof HEALTH_OPTIONS>
export type CareTag = ValueOf<typeof CARE_OPTIONS>
export type FamilyTag = ValueOf<typeof FAMILY_OPTIONS>
export type Nationality = ValueOf<typeof NATIONALITY_OPTIONS>
export type Employment = ValueOf<typeof EMPLOYMENT_OPTIONS>
export type Gender = ValueOf<typeof GENDER_OPTIONS>
export type OtherTag = ValueOf<typeof OTHER_OPTIONS>

export function labelOf<T extends string>(options: readonly { value: T; label: string }[], value: T | null): string | null {
  if (value === null) return null
  return options.find((option) => option.value === value)?.label ?? null
}

export function labelsOf<T extends string>(options: readonly { value: T; label: string }[], values: readonly T[]): string[] {
  return options.filter((option) => values.includes(option.value)).map((option) => option.label)
}
