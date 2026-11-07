import { findEvent } from '../data/lifeEvents'

export const GUIDE_STATIONS = [
  { categoryId: 'health', title: '傷病與醫療', eventId: 'discharge-home' },
  { categoryId: 'elder-care', title: '高齡與長照', eventId: 'long-term-care' },
  { categoryId: 'disability', title: '身心障礙', eventId: 'disability-certificate' },
] as const

export const GUIDE_QUESTION = '爸爸中風快出院了，我要申請什麼？'

const aliases: Record<string, string[]> = {
  'discharge-planning': ['護理站', '社工', '出院準備', '返家照顧'],
  'assistive-devices': ['輪椅', '助行器', '拐杖', '輔具', '借輪椅'],
  'return-visit-transport': ['回診', '接送', '復康巴士', '計程車', '交通'],
  'leave-and-benefits': ['請假', '給付'],
  'back-to-life': ['回到日常', '復健'],
  'apply-ltc': ['長照', '1966', '照顧服務'],
  'home-assessment': ['到府', '到家評估'],
  'care-plan': ['照顧計畫', '居家服務', '日照'],
  'caregiver-care': ['好累', '喘息', '照顧者', '撐不住', '休息'],
  apply: ['身心障礙證明', '身障證明', '身障手冊', '區公所'],
  assessment: ['鑑定', '醫院評估'],
  'needs-assessment': ['需求評估'],
  receive: ['領取證明'],
  benefits: ['愛心卡', '停車證', '身障福利'],
}

export type GuideChoice = {
  station: number | null
  stepId?: string
  label: string
  text: string
}

export const ROUTE_CHOICE: GuideChoice = {
  station: null,
  label: '中風出院後的三站導覽',
  text: '可以先安排出院返家照顧，再了解長照評估，最後查看身心障礙證明的申請流程。我帶你一站一站看。',
}

const NONE: GuideChoice = {
  station: null,
  label: '',
  text: '我目前可以帶你了解中風出院後的三站流程。你可以換個問法，或撥打 1999 請專人協助。',
}

const ASSESSMENT: GuideChoice = {
  ...NONE,
  text: '我無法判斷病情、障礙程度或補助資格。請向醫療人員或承辦機關確認。',
}

export function guideChoices(question: string, preset: boolean): { options: GuideChoice[]; fallback: GuideChoice } {
  if (preset) {
    return { options: [ROUTE_CHOICE, ...guideChoices('輪椅 長照 身障證明', false).options.slice(0, 3)], fallback: ROUTE_CHOICE }
  }
  if (/算不算|算重度|是否重度|幾級|能不能領|一定符合|會好嗎|要不要吃藥|醫療診斷/.test(question)) {
    return { options: [], fallback: ASSESSMENT }
  }
  const matches = GUIDE_STATIONS.flatMap((station, index) =>
    (findEvent(station.eventId)?.steps ?? []).map((step) => {
      const words = [step.title, ...(aliases[step.id] ?? [])]
      return {
        score: words.reduce((score, word) => score + (question.includes(word) ? word.length : 0), 0),
        choice: {
          station: index,
          stepId: step.id,
          label: `${station.title}・${step.title}：${step.summary}`,
          text: `${step.what}${step.where.phone ? `聯絡電話 ${step.where.phone}。` : ''}`,
        } satisfies GuideChoice,
      }
    }),
  ).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score)

  const options: GuideChoice[] = matches.slice(0, 4).map(({ choice }) => choice)
  if (options.length === 0 && /中風|出院|返家/.test(question)) options.push(ROUTE_CHOICE)
  return { options, fallback: options[0] ?? NONE }
}

export const NO_GUIDE_MATCH = NONE
