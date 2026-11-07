// 就業與經濟：求職、身障者就業、失業、急難救助、申請低收入戶。
// 依臺北市就業服務處、勞動力重建運用處、職能發展學院、勞動部勞工保險局、就業保險法、
// 臺北市政府社會局、衛福部急難紓困方案、臺北市原住民族事務委員會公開資料整理（2026-11-07 查詢）。
// 金額只寫官方標明適用年度的（低收入戶與中低收入戶 115 年度標準）。
// easy 是易讀版文字（AI 起草，待團隊審稿），放在一般版旁邊方便對照。

import { WELFARE_HOTLINE, districtOffice, districtOfficeWhere } from '../common'
import { SOURCES } from '../sources'
import type { ResourceDef, StepDef, WhereDef } from '../types'

const EMPLOYMENT_SERVICE: WhereDef = {
  name: '臺北市就業服務站',
  detail: '萬華、西門、北投、景美、南港東明、內湖、信義等站，週一到週五 9:00 到 17:00',
  phone: '02-2308-5231',
  mapQuery: '臺北市 就業服務站',
}

const REHAB_OFFICE: WhereDef = {
  name: '臺北市勞動力重建運用處',
  detail: '萬華區艋舺大道 101 號 4 至 5 樓，週一到週五 9:00 到 17:00',
  phone: '02-2338-1600',
  mapQuery: '臺北市勞動力重建運用處',
}

const LABOR_HOTLINE: ResourceDef = {
  name: '1955 勞工諮詢申訴專線',
  description: '勞動權益、資遣、薪資的問題都可以問',
  phone: '1955',
  sources: [SOURCES.laborHotline],
}

// ── 求職 ──────────────────────────────────────────

export const jobSeekingSteps: StepDef[] = [
  {
    id: 'online',
    title: '線上找職缺',
    summary: '在台灣就業通建立履歷、應徵',
    mode: 'online',
    what: '在台灣就業通註冊會員、建立履歷，就能線上查詢和應徵職缺，也有線上職涯諮詢。有人冒用台灣就業通的名義詐騙，有疑問先打 0800-777-888 確認。',
    prepare: ['履歷資料：學歷、工作經驗、想找的工作'],
    where: { name: '台灣就業通網站', phone: '0800-777-888' },
    resources: [{ name: '台灣就業通', description: '線上找職缺、建立履歷與線上就業諮詢', sources: [SOURCES.taiwanJobs] }],
    services: [],
    easy: {
      summary: '先上網找工作',
      what: ['上「台灣就業通」網站。', '註冊，寫好你的履歷。', '在網站上找工作、應徵。'],
      prepare: ['你的學歷和工作經驗'],
      where: '台灣就業通網站',
    },
  },
  {
    id: 'register',
    title: '到就業服務站登記',
    summary: '服務人員幫你推介工作，免費',
    mode: 'counter',
    what: '親自到就業服務站辦理求職登記，服務人員會依你的意願、興趣和能力推介工作，服務免費。年滿 15 歲的國民，以及合法居留、有工作權的人都可以登記。',
    prepare: ['身分證，或其他有照片的身分證明'],
    where: EMPLOYMENT_SERVICE,
    resources: [
      {
        name: '臺北市就業服務站',
        description: '櫃檯求職登記，以及各站地址、電話與服務時間',
        sources: [SOURCES.jobRegistration, SOURCES.employmentStations],
      },
    ],
    services: ['counterEmployment'],
    easy: {
      summary: '去就業服務站登記',
      what: ['去就業服務站。', '說你想找工作。', '他們會幫你介紹工作，不用錢。'],
      prepare: ['身分證'],
      where: '就業服務站',
    },
  },
  {
    id: 'counseling',
    title: '就業諮詢',
    summary: '中高齡、身障、原住民可以一對一協助',
    mode: 'counter',
    what: '服務人員評估有需要的，會安排就業諮詢師深入談。中高齡、身障、原住民、低收入戶、獨力負擔家計、長期失業的人，可以有專人一對一協助。',
    prepare: ['身分證', '想做的工作、不能做的工作'],
    where: EMPLOYMENT_SERVICE,
    resources: [
      {
        name: '一對一就業個案管理',
        description: '專人陪你找工作，從評估、推介到上工',
        for: ['elder', 'disability', 'indigenous', 'lowIncome', 'singleParent'],
        sources: [SOURCES.jobRegistration],
      },
    ],
    services: ['counterEmployment'],
    easy: {
      summary: '找專人聊聊適合的工作',
      what: ['跟就業服務站的人聊聊。', '說你想做什麼、不能做什麼。', '年紀大、身障、原住民，可以有專人陪你找。'],
      prepare: ['身分證'],
      where: '就業服務站',
    },
  },
  {
    id: 'training',
    title: '參加職前訓練',
    summary: '職能發展學院免費訓練',
    mode: 'counter',
    what: '可以報名臺北市職能發展學院的職前訓練，學雜費、材料費都由學院負擔，甄試是筆試加口試；也可以請就業服務站評估後開推介單。需要手語翻譯的，報名時先說。原住民考到技術士證，證照生效 1 年內可以申請獎勵金。',
    prepare: ['報名表', '身分證正反面影本', '各職科要求的資格證明'],
    where: { name: '臺北市職能發展學院（士林區士東路 301 號）', phone: '02-2872-1940', mapQuery: '臺北市職能發展學院' },
    resources: [
      { name: '職能培育（職前訓練）', description: '免費職業訓練的職類、資格與報名方式', sources: [SOURCES.vocationalTraining] },
      {
        name: '原住民技術士證照獎勵',
        description: '原住民考到甲、乙、丙級或單一級技術士證，每個等級可以申請一次',
        for: ['indigenous'],
        sources: [SOURCES.indigenousCertificateBonus],
      },
    ],
    services: ['formIndigenousSkill'],
    easy: {
      summary: '去上免費的職業訓練',
      what: ['可以報名免費的職業訓練。', '要先考試，有筆試和面談。', '需要手語翻譯，報名時先說。'],
      prepare: ['報名表', '身分證影本'],
      where: '臺北市職能發展學院',
    },
  },
]

// ── 身障者就業 ──────────────────────────────────────────

export const disabilityEmploymentSteps: StepDef[] = [
  {
    id: 'eligibility',
    title: '確認資格',
    summary: '有身障證明，15 歲以上',
    mode: 'phone',
    what: '15 歲以上、領有身障證明、設籍或住在臺北市的人優先服務。沒有證明，但醫師診斷視覺功能漸失、精神疾病穩定，或職災失能的人也可以。不確定的先打電話問。',
    prepare: ['身心障礙證明，或醫師診斷證明'],
    where: REHAB_OFFICE,
    resources: [{ name: '身障者求職服務', description: '服務對象與申請方式', for: ['disability'], sources: [SOURCES.disabledJobSeeking] }],
    services: [],
    easy: {
      summary: '先打電話問能不能申請',
      what: ['有身心障礙證明，就可以申請。', '15 歲以上就可以。', '不確定的話，先打電話問。'],
      prepare: ['身心障礙證明'],
      where: '打電話給勞動力重建運用處',
    },
  },
  {
    id: 'apply',
    title: '到櫃檯申請',
    summary: '帶證明到重建處或委託單位',
    mode: 'counter',
    what: '帶身心障礙證明，親自到勞動力重建運用處，或它委託的就業服務單位申請。',
    prepare: ['身心障礙證明', '身分證'],
    where: REHAB_OFFICE,
    resources: [],
    services: [],
    easy: {
      summary: '帶證明去申請',
      what: ['帶身心障礙證明去申請。', '說你想找工作。'],
      prepare: ['身心障礙證明', '身分證'],
      where: '勞動力重建運用處',
    },
  },
  {
    id: 'case-management',
    title: '個管員評估',
    summary: '談談你的能力，訂就業計畫',
    mode: 'wait',
    what: '職業重建個案管理員會和你談，評估你的就業能力，一起訂一份職業重建計畫。需要的話，經你同意後轉介職業輔導評量。',
    prepare: ['想做的工作', '過去的工作或訓練經驗'],
    where: { name: '個案管理員會和你約時間' },
    resources: [],
    services: [],
    easy: {
      summary: '有專人跟你聊工作',
      what: ['會有專人跟你聊。', '了解你能做什麼工作。', '一起訂一個找工作的計畫。'],
      where: '等專人跟你約時間',
    },
  },
  {
    id: 'match',
    title: '配對就業服務',
    summary: '支持性就業或庇護性就業',
    mode: 'self',
    what: '能力已經可以到一般職場的，走支持性就業，有人幫你找工作、陪面試、在職場輔導。需要長期支持的，評估後推介到庇護工場工作。另外也有職前準備、創業諮詢等服務。',
    prepare: [],
    where: { name: '依個管員的建議' },
    resources: [
      {
        name: '支持性就業',
        description: '開發工作、陪同面試、工作訓練、職場輔導',
        for: ['disability'],
        sources: [SOURCES.disabledJobSeeking],
      },
      {
        name: '庇護性就業',
        description: '在庇護工場工作，有長期的支持',
        for: ['disability', 'cognition', 'mental'],
        sources: [SOURCES.shelteredEmployment],
      },
    ],
    services: [],
    easy: {
      summary: '找適合你的工作方式',
      what: ['可以到一般公司上班，有人陪你。', '也可以到庇護工場上班。', '個管員會跟你一起決定。'],
      where: '跟個管員一起決定',
    },
  },
  {
    id: 'job-redesign',
    title: '職務再設計',
    summary: '改善工作環境、提供輔具',
    mode: 'online',
    what: '上班後如果工作環境不方便，可以申請職務再設計，例如改善職場環境、提供就業輔具、調整工作流程，或安排職場視力、人力協助。申請表在重建處網站下載。',
    prepare: ['職務再設計服務申請表'],
    where: { ...REHAB_OFFICE, name: '臺北市勞動力重建運用處身障輔助課' },
    resources: [{ name: '職務再設計', description: '可以申請的項目與申請表', for: ['disability'], sources: [SOURCES.jobRedesign] }],
    services: [],
    easy: {
      summary: '工作環境不方便，可以申請改',
      what: ['上班的地方不方便，可以申請改善。', '例如給你需要的工具。', '或調整工作的方式。'],
      prepare: ['申請表'],
      where: '勞動力重建運用處',
    },
  },
]

// ── 失業 ──────────────────────────────────────────

export const unemploymentSteps: StepDef[] = [
  {
    id: 'certificate',
    title: '拿離職證明',
    summary: '寫明是非自願離職',
    mode: 'self',
    what: '向原本的老闆拿離職證明書，上面要寫明是非自願離職的原因。老闆不開，而且有資遣通報、關廠歇業、老闆失聯或勞資調解紀錄的，可以改向主管機關申請。',
    prepare: ['離職證明書'],
    where: { name: '原本的公司' },
    resources: [LABOR_HOTLINE],
    services: [],
    easy: {
      summary: '跟公司拿離職證明',
      what: ['跟公司拿「離職證明書」。', '上面要寫你不是自己要離職的。', '公司不給，打 1955 問。'],
      prepare: ['離職證明書'],
      where: '原本的公司',
    },
  },
  {
    id: 'register',
    title: '2 年內求職登記',
    summary: '到就業服務站申請失業認定',
    mode: 'counter',
    what: '離職退保後 2 年內，親自到就業服務站辦求職登記、申請失業認定。非自願離職，而且退保前 3 年內就業保險年資滿 1 年，才能領失業給付。',
    prepare: [
      '離職證明書正本和影本',
      '身分證正反面影本（正本驗完歸還）',
      '本人的存摺封面影本',
      '身障者附身心障礙證明',
      '有扶養家人的，附戶口名簿影本',
    ],
    where: EMPLOYMENT_SERVICE,
    resources: [
      {
        name: '就業保險失業給付',
        description: '請領資格、要準備的文件與怎麼領',
        sources: [SOURCES.unemploymentBenefit, SOURCES.unemploymentEligibility],
      },
      {
        name: '臺北市求職交通補助金',
        description: '連續失業 180 天以上等對象，被推介去面試，可以申請交通補助',
        for: ['jobSeeking', 'lowIncome'],
        sources: [SOURCES.jobTransportSubsidy],
      },
    ],
    services: ['counterEmployment'],
    easy: {
      summary: '去就業服務站登記',
      what: ['離職後 2 年內，去就業服務站。', '說你要找工作，也要申請失業給付。'],
      prepare: ['離職證明書', '身分證影本', '存摺封面影本'],
      where: '就業服務站',
    },
  },
  {
    id: 'wait',
    title: '等 14 天認定',
    summary: '沒推介到工作，就完成失業認定',
    mode: 'wait',
    what: '登記後 14 天內沒有推介到工作或職訓，就業服務站會完成失業認定，轉給勞保局發給付，從登記第 15 天算起。收到推介工作的介紹卡，7 天內要繳回回覆卡。',
    prepare: ['收到的介紹卡'],
    where: { name: '等就業服務站通知' },
    resources: [],
    services: [],
    easy: {
      summary: '等 14 天',
      what: ['登記後，等 14 天。', '沒有找到工作，就可以領失業給付。', '他們介紹工作給你，7 天內要回覆。'],
      where: '等就業服務站通知',
    },
  },
  {
    id: 'monthly',
    title: '每月再認定',
    summary: '每個月回就業服務站一次',
    mode: 'counter',
    what: '每個月親自回就業服務站辦失業再認定。給付是平均月投保薪資的 60%，最長 6 個月，45 歲以上或身障者最長 9 個月；有扶養家人的另外加給。',
    prepare: ['身分證正本', '2 次以上的求職紀錄', '上一次的認定收執聯'],
    where: EMPLOYMENT_SERVICE,
    resources: [
      { name: '勞動部勞工保險局', description: '失業給付的發放與查詢', phone: '02-2396-1266', sources: [SOURCES.unemploymentEligibility] },
    ],
    services: ['counterEmployment'],
    easy: {
      summary: '每個月回去一次',
      what: ['每個月回就業服務站一次。', '帶你找工作的紀錄。', '這樣才能繼續領錢。'],
      prepare: ['身分證', '找工作的紀錄', '上次給你的單子'],
      where: '就業服務站',
    },
  },
  {
    id: 'health-insurance',
    title: '接續健保',
    summary: '依附家人，或到區公所加保',
    mode: 'counter',
    what: '離職後要盡快接續健保：先依附家人當眷屬，或從職業工會加保；都沒有的，到戶籍地區公所辦第 6 類加保，也可以用「健保快易通」App。領失業給付期間，健保自付保費由就業保險全額補助。',
    prepare: ['身分證', '戶口名簿'],
    where: districtOfficeWhere('沒有其他加保身分時，到戶籍地區公所辦'),
    resources: [
      {
        name: '失業期間的健保費補助',
        description: '領失業給付期間，健保自付保費由就業保險補助',
        sources: [SOURCES.unemploymentHealthInsurance],
      },
      { name: '戶籍地區公所', description: '沒有其他加保身分時，辦第 6 類健保加保', sources: [SOURCES.openDataToilets] },
    ],
    services: ['counterDistrictOffice'],
    easy: {
      summary: '別忘了健保',
      what: ['離職後，健保要接上。', '可以跟家人一起保。', '沒有的話，去區公所辦。'],
      prepare: ['身分證', '戶口名簿'],
    },
  },
]

// ── 急難救助 ──────────────────────────────────────────

export const emergencyAidSteps: StepDef[] = [
  {
    id: 'choose',
    title: '看適合哪一種',
    summary: '臺北市急難救助、急難紓困、原住民慰助',
    mode: 'self',
    what: '家裡有人過世無力辦喪事、意外受傷或重病、主要賺錢的人失業或失聯、帳戶被凍結等，設籍臺北市的可以申請臺北市急難救助。中央的急難紓困（以前叫馬上關懷）也幫忙生活陷入困難的家庭。原住民另外有急難關懷慰助金。',
    prepare: ['發生了什麼事、什麼時候發生'],
    where: { name: '不確定的話，先打 1957 問' },
    resources: [WELFARE_HOTLINE, { name: '1999 轉 6962', description: '臺北市急難救助與急難紓困的窗口', phone: '1999', sources: [SOURCES.emergencyAid] }],
    services: [],
    easy: {
      summary: '家裡突然出事，可以申請救助',
      what: ['家人過世、生重病、突然沒工作，都可以申請。', '不知道要申請哪一種，打 1957 問。'],
      where: '先打 1957 問',
    },
  },
  {
    id: 'documents',
    title: '準備文件',
    summary: '依情況準備證明',
    mode: 'self',
    what: '準備申請書和身分證，再依情況附上證明：受傷生病的附診斷證明和醫療收據，辦喪事的附死亡證明和費用單據，失業的附就業服務站開的證明。',
    prepare: ['申請書', '身分證或戶籍資料影本', '依情況：診斷證明、醫療收據、死亡證明、喪葬費用單據、失業證明'],
    where: { name: '自己準備，申請書在區公所拿得到' },
    resources: [],
    services: [],
    easy: {
      summary: '準備證明',
      what: ['帶身分證。', '生病的，帶醫生的證明和收據。', '家人過世的，帶死亡證明。'],
      prepare: ['身分證', '醫生的證明或死亡證明', '收據'],
    },
  },
  {
    id: 'apply',
    title: '3 個月內送件',
    summary: '到戶籍地區公所社會課申請',
    mode: 'counter',
    what: '事情發生後 3 個月內，到戶籍地區公所社會課或社會福利服務中心申請。急難紓困也可以請里長、里幹事、學校、警察或醫院幫忙通報。原住民可以找區公所的原住民服務員申請慰助金。',
    prepare: ['上一步準備的文件'],
    where: districtOfficeWhere('事情發生後 3 個月內申請'),
    resources: [
      districtOffice(SOURCES.emergencyAid),
      {
        name: '原住民急難關懷慰助金',
        description: '設籍並住在臺北市的原住民可以申請',
        for: ['indigenous'],
        sources: [SOURCES.indigenousEmergency],
      },
    ],
    services: ['counterDistrictOffice', 'formIndigenousEmergency'],
    easy: {
      summary: '3 個月內去區公所申請',
      what: ['出事後 3 個月內要申請。', '去區公所的社會課。', '也可以請里長幫忙。'],
      prepare: ['身分證', '證明文件'],
    },
  },
  {
    id: 'visit',
    title: '訪視與核發',
    summary: '社工訪視後發放',
    mode: 'wait',
    what: '急難紓困受理後 24 小時內，會有人到家裡訪視，符合的會盡快發放。臺北市的傷病和生活救助，每 2 個月限申請一次。',
    prepare: ['說明家裡的狀況'],
    where: { name: '等區公所或社工聯繫' },
    resources: [],
    services: [],
    easy: {
      summary: '有人會來家裡了解',
      what: ['會有人到家裡了解狀況。', '照實際情況說就好。', '符合的話，會發救助金。'],
      where: '等社工聯絡',
    },
  },
]

// ── 申請低收入戶 ──────────────────────────────────────────

export const lowIncomeSteps: StepDef[] = [
  {
    id: 'check',
    title: '看符不符合',
    summary: '看家裡收入和財產',
    mode: 'self',
    what: '要設籍並住在臺北市，最近一年在國內住超過 183 天。115 年度低收入戶標準是全家平均每人每月收入不超過 20,744 元，中低收入戶是 29,635 元，動產和不動產也有上限。「全家」包括配偶、父母子女等。',
    prepare: ['全家人的收入和財產大概多少'],
    where: { name: '不確定的話，先打 1999 轉 1609 問' },
    resources: [WELFARE_HOTLINE, { name: '臺北市社會局社會救助科', description: '1999 轉 1609 到 1613', phone: '1999', sources: [SOURCES.lowIncomeLiving] }],
    services: [],
    easy: {
      summary: '先看家裡的錢夠不夠用',
      what: ['算算全家每個月賺多少錢。', '錢太少，就可以申請。', '不確定的話，打 1999 問。'],
      where: '先打 1999 問',
    },
  },
  {
    id: 'documents',
    title: '準備文件',
    summary: '申請表、戶口名簿、存摺',
    mode: 'self',
    what: '準備申請表和證件，再依情況附上薪資、離職、失業給付、診斷或身障證明。別人代辦的，要附代辦人的身分證明影本。',
    prepare: [
      '申請表',
      '身分證正本（看完歸還）',
      '新式戶口名簿影本',
      '租約影本，或借住證明',
      '台北富邦銀行或郵局存摺封面影本',
      '依情況：薪資、離職、失業給付、診斷或身障證明',
    ],
    where: { name: '自己準備，申請表在區公所拿得到' },
    resources: [],
    services: [],
    easy: {
      summary: '準備證件',
      what: ['準備申請表。', '帶身分證和戶口名簿影本。', '帶存摺封面影本。'],
      prepare: ['申請表', '身分證', '戶口名簿影本', '存摺封面影本', '租屋的合約影本'],
    },
  },
  {
    id: 'apply',
    title: '到區公所申請',
    summary: '戶籍地區公所社會課',
    mode: 'counter',
    what: '帶文件到戶籍所在地的區公所社會課申請。',
    prepare: ['上一步準備的文件'],
    where: districtOfficeWhere(),
    resources: [districtOffice(SOURCES.lowIncomeLiving)],
    services: ['counterDistrictOffice'],
    easy: {
      summary: '去區公所申請',
      what: ['去身分證背面地址那一區的區公所。', '找社會課。', '說你要申請低收入戶。'],
      prepare: ['準備好的文件'],
    },
  },
  {
    id: 'review',
    title: '等待審核',
    summary: '會派人調查，通過後從申請那個月算',
    mode: 'wait',
    what: '受理後會派人調查家裡的狀況。審核通過後，從受理申請的那個月開始算。',
    prepare: ['說明家裡的狀況'],
    where: { name: '等區公所通知' },
    resources: [],
    services: [],
    easy: {
      summary: '等通知',
      what: ['會有人來了解你家的狀況。', '通過的話，從申請那個月開始算。'],
      where: '等區公所通知',
    },
  },
  {
    id: 'after',
    title: '領證與每年調查',
    summary: '可以下載電子證明，狀況變了要報告',
    mode: 'online',
    what: '通過後可以到區公所申請紙本證明，或成為台北通金質會員下載電子證明。家裡有人結婚、出生、過世、就學或就業，1 個月內要告訴區公所，每年也會定期調查。',
    prepare: [],
    where: { name: '台北通，或區公所' },
    resources: [
      {
        name: '低收入戶及中低收入戶證明',
        description: '紙本證明與台北通電子證明怎麼申請',
        for: ['lowIncome'],
        sources: [SOURCES.lowIncomeCertificate],
      },
      { name: '健保費全額補助', description: '低收入戶的健保費全額補助', for: ['lowIncome'], sources: [SOURCES.lowIncomeHealthInsurance] },
      {
        name: '市民醫療補助',
        description: '低收入戶就醫的自付費用補助，就診或出院 6 個月內申請',
        for: ['lowIncome'],
        sources: [SOURCES.lowIncomeMedical],
      },
      {
        name: '中低收入戶學雜費減免',
        description: '高中以上學雜費減免 60%',
        for: ['lowIncome', 'childcare'],
        sources: [SOURCES.middleLowIncome],
      },
    ],
    services: [],
    easy: {
      summary: '家裡有變化，要告訴區公所',
      what: ['通過後，可以在台北通拿電子證明。', '家裡有人結婚、生小孩、過世，要告訴區公所。', '每年會再檢查一次。'],
      where: '台北通，或區公所',
    },
  },
]
