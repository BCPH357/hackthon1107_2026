// 對應 TownPass 的 lib/page/city_service/model/my_service_model.dart。
// 網址為空字串的服務在 App 裡也還沒開放，畫面上會標示「尚未開放」。

export type TownPassServiceId =
  | 'districtOffice'
  | 'reservation'
  | 'locationSearch'
  | 'reportIssue'
  | 'library'
  | 'dedicatedLine'
  | 'medicalAppointment'
  | 'vaccineAppointment'
  | 'neighborhood'
  | 'familyCenter'
  | 'police'
  | 'waterMeter'
  // 直接開到台北通服務裡的某一個櫃檯或表單（網址在 2026-11-07 逐一點開確認過）
  | 'counterHousehold'
  | 'counterDistrictOffice'
  | 'counterEmployment'
  | 'formDisabilityInsurance'
  | 'formDomesticViolence'
  | 'formSpecialFamily'
  | 'formIndigenousEmergency'
  | 'formIndigenousSkill'
  | 'reportTransport'

export interface TownPassService {
  title: string
  description: string
  url?: string
  phone?: string
}

/** 台北通內建服務的網站（申辦服務、臨櫃叫號、有話要說都在這裡） */
const SERVICE_SITE = 'https://taipei-pass-service.vercel.app'

export const TOWNPASS_SERVICES: Record<TownPassServiceId, TownPassService> = {
  districtOffice: {
    title: '申辦服務',
    description: '線上申辦市政府服務',
    url: 'https://taipei-pass-service.vercel.app/',
  },
  reservation: {
    title: '臨櫃叫號',
    description: '查看臨櫃叫號、預約',
    url: 'https://taipei-pass-service.vercel.app/counter-calling/',
  },
  locationSearch: {
    title: '找地點',
    description: '各區日常服務地點',
    url: 'https://taipei-pass-service.vercel.app/surrounding-service/',
  },
  reportIssue: {
    title: '有話要說',
    description: '陳情系統',
    url: 'https://taipei-pass-service.vercel.app/citizen-report/',
  },
  library: {
    title: '圖書借閱',
    description: '市立圖書館借閱服務',
    url: 'https://taipei-pass-service.vercel.app/library-service/',
  },
  dedicatedLine: {
    title: '1999',
    description: '臺北市民當家熱線',
    phone: '1999',
  },
  medicalAppointment: {
    title: '聯醫掛號',
    description: '北市聯合醫院線上掛號',
  },
  vaccineAppointment: {
    title: '疫苗預約',
    description: '預約新冠、流感疫苗',
  },
  neighborhood: {
    title: '里辦服務',
    description: '在地里辦公處服務',
  },
  familyCenter: {
    title: '親子館',
    description: '各區親子館活動報名',
  },
  police: {
    title: '警政服務',
    description: '線上、語音報案',
    // 服務拼貼的「警政報案」卡片開的是 App 內建頁面
    url: 'local://online_police',
  },
  waterMeter: {
    title: '用水服務',
    description: '繳水費、查詢用水',
  },
  counterHousehold: {
    title: '臨櫃叫號：戶政事務所',
    description: '出門前看現在要等幾個人',
    url: `${SERVICE_SITE}/counter-calling/c-2`,
  },
  counterDistrictOffice: {
    title: '臨櫃叫號：區公所',
    description: '出門前看現在要等幾個人',
    url: `${SERVICE_SITE}/counter-calling/c-3`,
  },
  counterEmployment: {
    title: '臨櫃叫號：就業服務站',
    description: '出門前看現在要等幾個人',
    url: `${SERVICE_SITE}/counter-calling/c-5`,
  },
  formDisabilityInsurance: {
    title: '身障者社會保險保費補助方式變更',
    description: '申辦服務：線上填寫申請',
    url: `${SERVICE_SITE}/form/c-5`,
  },
  formDomesticViolence: {
    title: '臺北市家庭暴力被害人補助',
    description: '申辦服務：線上填寫申請',
    url: `${SERVICE_SITE}/form/c-3`,
  },
  formSpecialFamily: {
    title: '特殊境遇家庭扶助（家暴被害人）',
    description: '申辦服務：線上填寫申請',
    url: `${SERVICE_SITE}/form/c-4`,
  },
  formIndigenousEmergency: {
    title: '原住民急難關懷慰問金',
    description: '申辦服務：原住民身分適用',
    url: `${SERVICE_SITE}/form/d-1`,
  },
  formIndigenousSkill: {
    title: '原住民技術士技能檢定獎勵金',
    description: '申辦服務：原住民身分適用',
    url: `${SERVICE_SITE}/form/d-2`,
  },
  reportTransport: {
    title: '有話要說：公車、計程車、復康巴士問題',
    description: '搭車遇到問題時通報',
    url: `${SERVICE_SITE}/citizen-report/form/R-2`,
  },
}

export function isServiceAvailable(service: TownPassService): boolean {
  return Boolean(service.url || service.phone)
}
