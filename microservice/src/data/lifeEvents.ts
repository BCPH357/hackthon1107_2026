// 人生事件與步驟，依計畫書「人生事件清單」「事件流程範例」兩節。
// 內容是劇情草稿，尚未逐條對照官方資料，畫面上一律顯示 DATA_NOTICE。

import { EASY_READ } from './easyRead'
import type { IconKey } from './icons'
import type { CategoryDef, EasyStep, EventDef, ProfileKey, ResourceDef, StepDef } from './types'

/** 把易讀版文字依步驟 id 接到步驟上；易讀版寫錯 id 時網頁一載入就報錯（測試會抓到），不會默默失效 */
function withEasy(easy: Record<string, EasyStep>, steps: StepDef[]): StepDef[] {
  for (const id of Object.keys(easy)) {
    if (!steps.some((step) => step.id === id)) throw new Error(`easyRead.ts 有找不到的步驟 id：${id}`)
  }
  return steps.map((step) => ({ ...step, easy: easy[step.id] }))
}

const LTC_HOTLINE: ResourceDef = {
  name: '1966 長照服務專線',
  description: '不確定要從哪裡開始時，可以先打電話詢問長照服務',
  for: ['elder', 'dementia', 'careElder', 'disability'],
  phone: '1966',
}

const LTC_CENTER: ResourceDef = {
  name: '臺北市長期照顧管理中心',
  description: '負責長照需求評估，並安排個案管理員',
  for: ['elder', 'dementia', 'careElder'],
}

const DISTRICT_OFFICE: ResourceDef = {
  name: '區公所社會課',
  description: '受理身心障礙證明等社會福利申請',
}

const HOUSEHOLD_OFFICE: ResourceDef = {
  name: '戶政事務所',
  description: '辦理出生、死亡等戶籍登記',
}

// ── 家人疑似失智 ──────────────────────────────────────────

const dementiaSteps: StepDef[] = withEasy(EASY_READ.dementia, [
  {
    id: 'diagnosis',
    title: '就醫確認',
    summary: '帶家人到神經科或精神科，確認是否失智',
    mode: 'visit',
    what: '記憶變差不一定是失智，也可能是其他可以治療的疾病。先帶家人到醫院的神經內科、精神科或記憶門診，請醫師評估。',
    prepare: ['家人的健保卡', '平常觀察到的狀況，例如忘了什麼、從什麼時候開始', '正在吃的藥物清單'],
    where: { name: '醫院的神經內科、精神科或記憶門診', mapQuery: '臺北市立聯合醫院' },
    resources: [
      {
        name: '失智共同照護中心',
        description: '確診後提供照護諮詢、轉介服務與照顧者課程',
        for: ['dementia', 'cognition', 'careElder'],
      },
      LTC_HOTLINE,
    ],
    services: ['medicalAppointment'],
  },
  {
    id: 'apply-ltc',
    title: '申請長照評估',
    summary: '撥打 1966 長照專線提出申請',
    mode: 'phone',
    what: '打電話到長照專線，說明家人的狀況。專線會轉給所在地的長期照顧管理中心，安排人員評估。',
    prepare: ['家人的姓名、身分證字號與住址', '家人目前的狀況，例如能不能自己吃飯、走路、洗澡', '聯絡人的電話'],
    where: { name: '1966 長照服務專線', phone: '1966' },
    resources: [LTC_HOTLINE, LTC_CENTER],
    services: ['dedicatedLine'],
  },
  {
    id: 'home-assessment',
    title: '到府評估',
    summary: '照顧管理專員到家裡評估需要多少照顧',
    mode: 'home',
    what: '照顧管理專員會和你約時間到家裡，了解家人日常生活需要幫忙的程度。評估結果會決定可以使用的長照服務。',
    prepare: ['評估當天請主要照顧者在場', '家人的健保卡與身分證', '醫院的診斷證明或病歷摘要，有的話一併準備'],
    where: { name: '在家裡，由專員到府評估' },
    resources: [LTC_CENTER],
    services: [],
  },
  {
    id: 'care-plan',
    title: '擬定照顧計畫',
    summary: '和個案管理員討論要用哪些服務',
    mode: 'wait',
    what: '個案管理員會依評估結果，和你一起決定要用哪些服務，例如有人到家裡幫忙、白天到日照中心、接送看醫生。',
    prepare: ['想一想家人最需要幫忙的時段與事情', '家裡可以配合照顧的人力與時間'],
    where: { name: '個案管理員會主動聯繫你' },
    resources: [
      { name: '居家服務', description: '照顧服務員到家裡協助洗澡、備餐等日常照顧', for: ['elder', 'dementia', 'disability'] },
      { name: '日間照顧', description: '白天到日照中心參加活動，晚上回家', for: ['elder', 'dementia'] },
      { name: '交通接送', description: '接送就醫或復健', for: ['elder', 'mobility', 'disability'] },
      { name: '輔具與居家無障礙', description: '購買或租借輔具，改善家裡的環境', for: ['mobility', 'disability', 'elder'] },
    ],
    services: ['locationSearch'],
  },
  {
    id: 'caregiver-care',
    title: '照顧者也要被照顧',
    summary: '安排喘息，參加支持團體',
    mode: 'phone',
    what: '長期照顧很累。政府提供喘息服務，讓照顧者可以休息；也可以參加照顧者支持團體，認識有相同經驗的人。',
    prepare: ['想休息的日期與時段'],
    where: { name: '向個案管理員或家庭照顧者支持據點申請' },
    resources: [
      { name: '喘息服務', description: '短時間由專人代為照顧，讓照顧者休息', for: ['caregiver', 'careElder', 'careDisabled'] },
      { name: '家庭照顧者支持服務據點', description: '提供照顧者諮詢、課程與支持團體', for: ['caregiver'] },
    ],
    services: ['neighborhood'],
  },
])

// ── 出院返家照顧 ──────────────────────────────────────────

const dischargeSteps: StepDef[] = withEasy(EASY_READ.discharge, [
  {
    id: 'discharge-planning',
    title: '出院準備',
    summary: '出院前請醫院協助規劃回家後的照顧',
    mode: 'visit',
    what: '住院期間就可以詢問護理站或社工，請醫院的出院準備服務評估回家後需要什麼照顧，必要時直接銜接長照服務。',
    prepare: ['回家後由誰照顧', '家裡的環境，例如有沒有電梯、浴室有沒有扶手', '預計的出院日期'],
    where: { name: '醫院護理站或社工室' },
    resources: [
      { name: '醫院出院準備服務', description: '評估返家照顧需求，並轉介需要的資源', for: ['injured', 'carePatient'] },
      LTC_HOTLINE,
    ],
    services: ['medicalAppointment'],
  },
  {
    id: 'assistive-devices',
    title: '借用輔具',
    summary: '租借輪椅、助行器等',
    mode: 'counter',
    what: '暫時行動不便時，可以向輔具資源中心租借輪椅、助行器、拐杖等，不必全部自己買。',
    prepare: ['身分證', '醫師建議使用的輔具種類，有的話一併帶著'],
    where: { name: '臺北市輔具資源中心', mapQuery: '臺北市 輔具資源中心' },
    resources: [
      { name: '輔具資源中心', description: '輔具租借、評估與維修', for: ['injured', 'mobility', 'elder'] },
      { name: '輔具補助', description: '持有身心障礙證明的人可以申請購買補助', for: ['disability'] },
    ],
    services: ['locationSearch'],
  },
  {
    id: 'return-visit-transport',
    title: '回診交通',
    summary: '安排回診時的交通方式',
    mode: 'phone',
    what: '行動不便時，可以預約無障礙計程車。持有身心障礙證明的人，也可以預約復康巴士。',
    prepare: ['回診日期與醫院地址', '上下車時是否需要坐輪椅'],
    where: { name: '各車隊的預約專線，或撥 1999 詢問', phone: '1999' },
    resources: [
      { name: '無障礙計程車', description: '輪椅可以直接上車的計程車', for: ['mobility', 'injured'] },
      { name: '復康巴士', description: '提供身心障礙者預約接送', for: ['disability'] },
    ],
    services: ['dedicatedLine'],
  },
  {
    id: 'leave-and-benefits',
    title: '請假與給付',
    summary: '向公司請病假，申請保險給付',
    mode: 'online',
    what: '向公司請病假時，記得保留診斷證明。有參加勞保的人，因傷病一段時間無法工作，可以了解是否符合勞保傷病給付。',
    prepare: ['醫院開立的診斷證明書', '住院與請假期間的證明'],
    where: { name: '勞動部勞工保險局' },
    resources: [{ name: '勞保傷病給付', description: '參加勞保的人因傷病不能工作時的給付', for: ['injured'] }],
    services: ['districtOffice'],
  },
  {
    id: 'back-to-life',
    title: '回到日常',
    summary: '持續復健，留意心情調適',
    mode: 'visit',
    what: '按時回診與復健，恢復會更順利。受傷後心情低落也很常見，必要時可以尋求心理諮商。',
    prepare: ['復健時程表', '回診時想問醫師的問題'],
    where: { name: '醫院復健科' },
    resources: [
      { name: '復健門診', description: '依醫師安排做物理或職能治療', for: ['injured', 'mobility'] },
      { name: '心理諮商', description: '心情調適與壓力支持', for: ['injured', 'mental'] },
    ],
    services: ['medicalAppointment'],
  },
])

// ── 懷孕到生產 ──────────────────────────────────────────

const pregnancySteps: StepDef[] = withEasy(EASY_READ.pregnancy, [
  {
    id: 'confirm',
    title: '確認懷孕',
    summary: '到婦產科確認，領取孕婦健康手冊',
    mode: 'visit',
    what: '到婦產科診所或醫院確認懷孕，醫院會發給孕婦健康手冊。之後每次產檢都要帶著。',
    prepare: ['健保卡', '身分證'],
    where: { name: '婦產科診所或醫院' },
    resources: [{ name: '孕婦健康手冊', description: '記錄產檢與孕期健康資訊', for: ['pregnant'] }],
    services: ['medicalAppointment'],
  },
  {
    id: 'prenatal-checkup',
    title: '定期產檢',
    summary: '依手冊時程做產前檢查',
    mode: 'visit',
    what: '依孕婦健康手冊上的時程定期產檢。政府有補助產前檢查與部分檢驗項目。',
    prepare: ['孕婦健康手冊', '健保卡'],
    where: { name: '婦產科診所或醫院' },
    resources: [{ name: '政府補助的產前檢查', description: '依手冊時程接受補助的產檢項目', for: ['pregnant'] }],
    services: ['medicalAppointment'],
  },
  {
    id: 'vaccine',
    title: '孕期疫苗',
    summary: '依建議接種流感等孕期疫苗',
    mode: 'online',
    what: '孕期接種疫苗可以保護媽媽與寶寶。接種前先和醫師討論適合的時間。',
    prepare: ['孕婦健康手冊', '健保卡'],
    where: { name: '可接種疫苗的醫院或診所' },
    resources: [{ name: '孕婦疫苗接種', description: '流感等孕期建議接種的疫苗', for: ['pregnant'] }],
    services: ['vaccineAppointment'],
  },
  {
    id: 'leave',
    title: '準備生產與請假',
    summary: '安排產假、陪產假',
    mode: 'self',
    what: '和公司討論產假與陪產假的時間，也可以先了解育嬰留職停薪的規定。',
    prepare: ['預產期的證明'],
    where: { name: '向任職的公司申請' },
    resources: [
      { name: '產假與陪產假', description: '依勞動法規請假', for: ['pregnant'] },
      { name: '育嬰留職停薪', description: '孩子滿 3 歲前可以申請', for: ['pregnant', 'childcare'] },
    ],
    services: [],
  },
  {
    id: 'birth-registration',
    title: '出生登記',
    summary: '寶寶出生後到戶政事務所登記',
    mode: 'counter',
    what: '寶寶出生後 60 天內，要到戶政事務所辦理出生登記並取名。',
    prepare: ['醫院開立的出生證明書', '父母的身分證與印章', '戶口名簿'],
    where: {
      name: '戶政事務所',
      mapQuery: '臺北市 戶政事務所',
      districtName: '{district}戶政事務所',
      districtMapQuery: '臺北市{district}戶政事務所',
    },
    resources: [HOUSEHOLD_OFFICE],
    services: ['reservation'],
  },
  {
    id: 'subsidy-childcare',
    title: '補助與托育',
    summary: '申請生育獎勵與育兒津貼，安排托育',
    mode: 'online',
    what: '辦完出生登記後，可以申請生育獎勵與育兒津貼，並開始了解公共托育與親子館。',
    prepare: ['戶口名簿', '申請人的存摺封面'],
    where: { name: '可線上申辦，或到區公所辦理' },
    resources: [
      { name: '生育獎勵金', description: '寶寶出生後可以申請的獎勵', for: ['pregnant', 'childcare'] },
      { name: '育兒津貼', description: '養育幼兒的津貼', for: ['childcare', 'pregnant'] },
      { name: '公共托育', description: '公辦托嬰中心與社區公共托育家園', for: ['childcare'] },
    ],
    services: ['districtOffice', 'familyCenter'],
  },
])

// ── 申請身心障礙證明 ──────────────────────────────────────

const disabilitySteps: StepDef[] = withEasy(EASY_READ.disability, [
  {
    id: 'apply',
    title: '到區公所申請',
    summary: '帶證件到戶籍所在地的區公所，領取鑑定表',
    mode: 'counter',
    what: '到戶籍所在地的區公所社會課提出申請，領取身心障礙鑑定表。',
    prepare: ['國民身分證', '近三個月內的一吋半身照片三張', '印章'],
    where: {
      name: '戶籍所在地的區公所',
      detail: '依戶籍所在地辦理',
      mapQuery: '臺北市 區公所',
      districtName: '{district}公所',
      districtMapQuery: '臺北市{district}公所',
    },
    resources: [DISTRICT_OFFICE],
    services: ['reservation', 'locationSearch'],
  },
  {
    id: 'assessment',
    title: '醫院鑑定',
    summary: '帶鑑定表到指定醫院接受鑑定',
    mode: 'visit',
    what: '帶著鑑定表到指定的鑑定醫院，由醫師與專業人員進行鑑定。',
    prepare: ['身心障礙鑑定表', '健保卡', '過去的病歷或檢查報告'],
    where: { name: '指定的身心障礙鑑定醫院', mapQuery: '臺北市立聯合醫院' },
    resources: [{ name: '身心障礙鑑定醫院', description: '由醫師與專業人員進行鑑定', for: ['disability'] }],
    services: ['medicalAppointment'],
  },
  {
    id: 'needs-assessment',
    title: '需求評估',
    summary: '社會局人員評估需要哪些福利與服務',
    mode: 'wait',
    what: '鑑定完成後，社會局會安排需求評估，了解你在生活、工作與交通上需要哪些協助。',
    prepare: ['生活上需要協助的事情', '想申請的福利或服務'],
    where: { name: '社會局人員會主動聯繫你' },
    resources: [
      { name: '臺北市政府社會局', description: '辦理需求評估與身心障礙福利服務' },
      { name: '1957 福利諮詢專線', description: '社會福利的問題都可以打電話問', phone: '1957' },
    ],
    services: [],
  },
  {
    id: 'receive',
    title: '領取證明',
    summary: '收到通知後領取身心障礙證明',
    mode: 'counter',
    what: '收到核發通知後，到區公所領取身心障礙證明。',
    prepare: ['身分證', '印章', '核發通知'],
    where: {
      name: '戶籍所在地的區公所',
      mapQuery: '臺北市 區公所',
      districtName: '{district}公所',
      districtMapQuery: '臺北市{district}公所',
    },
    resources: [DISTRICT_OFFICE],
    services: ['reservation'],
  },
  {
    id: 'benefits',
    title: '申請福利',
    summary: '依需求申請愛心卡、身障停車證、輔具補助',
    mode: 'online',
    what: '拿到證明後，可以依需要申請各項福利。標示「你可能符合」的項目，建議先看。',
    prepare: ['身心障礙證明', '身分證'],
    where: { name: '可線上申辦，或到區公所辦理' },
    resources: [
      { name: '愛心卡', description: '搭乘公車、捷運等大眾運輸的優惠', for: ['disability'] },
      { name: '身心障礙者專用停車位識別證', description: '可以停在身障專用停車位', for: ['mobility'] },
      { name: '輔具補助', description: '購買輔具的費用補助', for: ['disability'] },
      { name: '復康巴士', description: '預約接送就醫、上學或上班', for: ['mobility', 'disability'] },
    ],
    services: ['districtOffice'],
  },
])

// ── 親人過世 ──────────────────────────────────────────

const bereavementSteps: StepDef[] = withEasy(EASY_READ.bereavement, [
  {
    id: 'death-certificate',
    title: '取得死亡證明',
    summary: '在醫院過世由醫院開立',
    mode: 'visit',
    what: '在醫院過世時，由醫院開立死亡證明書；在其他地方過世時，依規定請醫師或相關單位開立。之後很多手續都會用到，建議多申請幾份。',
    prepare: ['往生者的身分證與健保卡'],
    where: { name: '醫院，或依規定的開立單位' },
    resources: [{ name: '死亡證明書', description: '辦理死亡登記與各項手續都需要' }],
    services: [],
  },
  {
    id: 'death-registration',
    title: '死亡登記',
    summary: '到戶政事務所辦理死亡登記',
    mode: 'counter',
    what: '家屬在 30 天內到戶政事務所辦理死亡登記。',
    prepare: ['死亡證明書', '往生者的身分證', '申請人的身分證與印章'],
    where: {
      name: '戶政事務所',
      mapQuery: '臺北市 戶政事務所',
      districtName: '{district}戶政事務所',
      districtMapQuery: '臺北市{district}戶政事務所',
    },
    resources: [HOUSEHOLD_OFFICE],
    services: ['reservation'],
  },
  {
    id: 'funeral',
    title: '治喪',
    summary: '安排殯葬與禮儀',
    mode: 'self',
    what: '可以委託禮儀業者或自行安排。臺北市殯葬管理處提供殯儀館與火化等服務，經濟有困難的家庭可以了解喪葬補助。',
    prepare: ['死亡證明書'],
    where: { name: '臺北市殯葬管理處', mapQuery: '臺北市立第二殯儀館' },
    resources: [
      { name: '臺北市殯葬管理處', description: '殯儀館、火化與骨灰安置' },
      { name: '喪葬補助', description: '低收入戶等符合資格的家庭可以申請', for: ['lowIncome'] },
    ],
    services: ['locationSearch'],
  },
  {
    id: 'benefits',
    title: '申請給付',
    summary: '申請勞保或國保的喪葬與死亡給付',
    mode: 'online',
    what: '依往生者生前的投保情形，家屬可以申請勞保或國保的喪葬與死亡給付。',
    prepare: ['死亡證明書', '除戶後的戶籍謄本', '申請人的存摺封面'],
    where: { name: '勞動部勞工保險局' },
    resources: [{ name: '勞保、國保死亡給付', description: '依往生者的投保情形申請' }],
    services: ['districtOffice'],
  },
  {
    id: 'inheritance',
    title: '遺產與繼承',
    summary: '查詢財產、申報遺產稅、辦理繼承',
    mode: 'counter',
    what: '先查詢往生者名下的財產與負債，再申報遺產稅並辦理繼承登記。負債比財產多時，可以了解拋棄繼承的期限。',
    prepare: ['死亡證明書', '繼承人的身分證與戶籍謄本'],
    where: { name: '國稅局、地政事務所' },
    resources: [
      { name: '國稅局', description: '遺產稅申報與財產查詢' },
      { name: '地政事務所', description: '不動產的繼承登記' },
    ],
    services: ['dedicatedLine'],
  },
])

// ── 類別與事件 ──────────────────────────────────────────

const pending = (id: string, title: string, recommendFor: ProfileKey[] = [], icon?: IconKey): EventDef => ({
  id,
  title,
  recommendFor,
  icon,
})

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'marriage-family',
    title: '婚姻與家庭',
    icon: 'family',
    events: [
      pending('marriage', '結婚'),
      pending('divorce', '離婚', [], 'document'),
      pending('adoption', '收養'),
      pending('domestic-violence', '家暴求助', [], 'protectionHotline'),
    ],
  },
  {
    id: 'pregnancy-parenting',
    title: '懷孕與育兒',
    icon: 'stroller',
    events: [
      {
        id: 'pregnancy',
        title: '懷孕到生產',
        summary: '從產檢、孕期疫苗到出生登記與補助',
        intro: '從確認懷孕到寶寶出生，一次看清楚接下來要辦的事。',
        recommendFor: ['pregnant'],
        steps: pregnancySteps,
      },
      pending('birth-allowance', '出生登記與育兒津貼', ['pregnant', 'childcare'], 'money'),
      pending('childcare', '托育與親子活動', ['childcare'], 'family'),
      pending('early-intervention', '發展遲緩與早期療育', ['childcare']),
    ],
  },
  {
    id: 'disability',
    title: '身心障礙',
    icon: 'wheelchair',
    events: [
      {
        id: 'disability-certificate',
        title: '申請身心障礙證明',
        summary: '從區公所申請、醫院鑑定到申請福利',
        intro: '從區公所申請到領到證明，再到申請需要的福利。',
        recommendFor: ['disability', 'careDisabled'],
        icon: 'idCard',
        steps: disabilitySteps,
      },
      pending('recertification', '證明到期重新鑑定', ['disability'], 'calendar'),
      pending('assistive-devices', '申請輔具', ['mobility', 'disability', 'injured']),
      pending('parking-permit', '身障停車證', ['mobility'], 'parking'),
      pending('accessible-transport', '無障礙交通與復康巴士', ['mobility', 'disability']),
      pending('sign-language', '手語翻譯與同步聽打', ['hearing'], 'talk'),
    ],
  },
  {
    id: 'elder-care',
    title: '高齡與長照',
    icon: 'elder',
    events: [
      {
        id: 'dementia',
        title: '家人疑似失智',
        summary: '從就醫確認到申請長照與喘息',
        intro: '從就醫確認到申請長照，照顧家人，也照顧自己。',
        recommendFor: ['dementia', 'cognition'],
        steps: dementiaSteps,
      },
      {
        id: 'long-term-care',
        title: '申請長照服務',
        summary: '從撥打 1966 到開始使用服務',
        intro: '打一通電話開始，評估後就能使用居家、日照、接送等服務。',
        recommendFor: ['elder', 'careElder', 'dementia'],
        icon: 'careHeart',
        steps: dementiaSteps.slice(1),
      },
      pending('foreign-caregiver', '申請外籍看護', ['careElder', 'careDisabled'], 'person'),
      pending('senior-card', '申請敬老卡', ['elder'], 'card'),
      pending('living-alone-safety', '獨居長者安全', ['livingAlone'], 'shield'),
    ],
  },
  {
    id: 'health',
    title: '傷病與醫療',
    icon: 'hospital',
    events: [
      pending('emergency-care', '突發傷病就醫', ['injured']),
      {
        id: 'discharge-home',
        title: '出院返家照顧',
        summary: '輔具、回診交通、請假與給付',
        intro: '從醫院回到家，先把照顧、輔具與交通安排好。',
        recommendFor: ['injured', 'carePatient'],
        icon: 'home',
        steps: dischargeSteps,
      },
      pending('catastrophic-illness', '申請重大傷病', ['majorIllness'], 'idCard'),
      pending('mental-health', '心理健康支持', ['mental', 'caregiver'], 'talk'),
    ],
  },
  {
    id: 'caregiver',
    title: '照顧者支持',
    icon: 'careHeart',
    events: [
      pending('respite', '喘息服務', ['caregiver']),
      pending('care-and-work', '照顧與工作兼顧', ['caregiver'], 'calendar'),
      pending('care-skills', '照顧技巧與支持團體', ['caregiver'], 'group'),
    ],
  },
  {
    id: 'work-economy',
    title: '就業與經濟',
    icon: 'briefcase',
    events: [
      pending('job-seeking', '求職', ['jobSeeking']),
      pending('disability-employment', '身障者就業', ['disability']),
      pending('unemployment', '失業', ['jobSeeking']),
      pending('emergency-aid', '急難救助', ['lowIncome'], 'wallet'),
      pending('low-income', '申請低收入戶', ['lowIncome'], 'money'),
    ],
  },
  {
    id: 'housing',
    title: '居住',
    icon: 'house',
    events: [
      pending('moving', '搬家與遷入戶籍', [], 'home'),
      pending('rent-subsidy', '租屋補貼', ['lowIncome'], 'wallet'),
      pending('social-housing', '申請社會住宅', ['lowIncome'], 'publicHousing'),
      pending('home-accessibility', '住家無障礙改善', ['mobility', 'elder']),
    ],
  },
  {
    id: 'after-death',
    title: '身後事',
    icon: 'lotus',
    events: [
      {
        id: 'bereavement',
        title: '親人過世',
        summary: '從死亡證明、死亡登記到繼承',
        intro: '在最難過的時候，照著清單一步一步來。',
        recommendFor: [],
        steps: bereavementSteps,
      },
      pending('inheritance', '遺產繼承', [], 'document'),
    ],
  },
]

export const ALL_EVENTS: EventDef[] = CATEGORIES.flatMap((category) => category.events)

/** 有完整內容的事件，沒有推薦時當作「常見的事」 */
export const FEATURED_EVENTS: EventDef[] = ALL_EVENTS.filter((event) => event.steps?.length)

export function findEvent(eventId: string): EventDef | undefined {
  return ALL_EVENTS.find((event) => event.id === eventId)
}

export function categoryOf(eventId: string): CategoryDef | undefined {
  return CATEGORIES.find((category) => category.events.some((event) => event.id === eventId))
}

/** 事件的圖示，沒有指定時沿用所屬類別的圖示 */
export function iconOf(event: EventDef): IconKey {
  return event.icon ?? categoryOf(event.id)?.icon ?? 'document'
}

// 使用者親自勾選的具體處境（懷孕、記憶困難、照顧家人…）比推導出的大分類更能代表需求
const PROFILE_WEIGHTS: Partial<Record<ProfileKey, number>> = {
  disability: 1,
  taipeiResident: 1,
  indigenous: 1,
  veteran: 1,
  elder: 2,
  careElder: 2,
  careDisabled: 2,
  carePatient: 2,
}
const SPECIFIC_WEIGHT = 3

function scoreOf(event: EventDef, profiles: ReadonlySet<ProfileKey>): number {
  const weights = event.recommendFor.filter((key) => profiles.has(key)).map((key) => PROFILE_WEIGHTS[key] ?? SPECIFIC_WEIGHT)
  if (!weights.length) return 0
  // 先比最具體的那一項，再比符合幾項
  return Math.max(...weights) * 10 + weights.length
}

/**
 * 依身分特徵推薦事件：有內容的排前面，再依分數排序。
 * 建置中的事件每個類別最多兩件，避免同一類塞滿推薦。
 */
export function recommendEvents(profiles: ReadonlySet<ProfileKey>, limit = 6, pendingPerCategory = 2): EventDef[] {
  const ranked = ALL_EVENTS.map((event) => ({ event, score: scoreOf(event, profiles), ready: Boolean(event.steps?.length) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => Number(b.ready) - Number(a.ready) || b.score - a.score)

  const picked: EventDef[] = []
  const pendingCount = new Map<string, number>()
  for (const { event, ready } of ranked) {
    if (picked.length >= limit) break
    if (!ready) {
      const categoryId = categoryOf(event.id)?.id ?? ''
      const count = pendingCount.get(categoryId) ?? 0
      if (count >= pendingPerCategory) continue
      pendingCount.set(categoryId, count + 1)
    }
    picked.push(event)
  }
  return picked
}
