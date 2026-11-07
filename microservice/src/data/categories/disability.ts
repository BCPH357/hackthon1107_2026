// 身心障礙：證明到期重新鑑定、申請輔具、身障停車證、無障礙交通與復康巴士、手語翻譯與同步聽打。
// 依臺北市政府社會局、公共運輸處、臺北市復康巴士、衛生局、警察局與消防局公開資料整理（2026-11-07 查詢）。
// 金額只寫官方標明適用年度的（愛心卡 115 年 7 月起每月 600 點）；說法不一致的地方，請使用者先打電話確認。
// easy 是易讀版文字（AI 起草，待團隊審稿），放在一般版旁邊方便對照。

import { cityHospital, districtOffice, districtOfficeWhere } from '../common'
import { SOURCES } from '../sources'
import type { ResourceDef, StepDef } from '../types'

const LTC_HOTLINE: ResourceDef = {
  name: '1966 長照服務專線',
  description: '沒有身障證明的失能長者，可以走長照的輔具補助',
  for: ['elder', 'careElder', 'dementia'],
  phone: '1966',
  sources: [SOURCES.ltcApply],
}

const ASSISTIVE_CENTERS: ResourceDef[] = [
  { name: '合宜輔具中心（北投、士林、中山、大同）', description: '中山區玉門街 1 號', phone: '02-7713-7760', sources: [SOURCES.assistiveCenters] },
  { name: '西區輔具中心（中正、萬華、大安、松山）', description: '中山區長安西路 5 巷 2 號 1、2 樓', phone: '02-2523-7902', sources: [SOURCES.assistiveCenters] },
  { name: '南區輔具中心（信義、內湖、南港、文山）', description: '信義區大道路 116 號 3 樓之 2', phone: '02-2720-7364', sources: [SOURCES.assistiveCenters] },
]

const PARATRANSIT_PHONE = '0809-080650'

// ── 證明到期重新鑑定 ──────────────────────────────────────────

export const recertificationSteps: StepDef[] = [
  {
    id: 'check-date',
    title: '確認到期日',
    summary: '到期前 90 天內就可以申請',
    mode: 'self',
    what: '看身心障礙證明上的有效期限，到期前 90 天內就可以申請重新鑑定，不要等通知才辦。真的來不及，到期前帶理由到區公所申請展延，原則延長 60 天，期間福利照舊。',
    prepare: ['身心障礙證明'],
    where: { name: '先看證明上的有效期限' },
    resources: [districtOffice(SOURCES.disabilityValidity)],
    services: [],
    easy: {
      summary: '先看證明哪一天到期',
      what: ['看你的身心障礙證明，哪一天到期。', '到期前 3 個月，就可以去辦。', '不要等通知才辦。'],
      prepare: ['身心障礙證明'],
      where: '看證明上的日期',
    },
  },
  {
    id: 'apply',
    title: '到區公所申請',
    summary: '勾「屆期重鑑」，領鑑定表',
    mode: 'counter',
    what: '到區公所填申請表，勾選「屆期重鑑」，區公所會給你鑑定表。可以一起勾「併同辦理」，在醫院鑑定時順便做需求評估。',
    prepare: ['原本的身心障礙證明', '身分證正反面影本', '印章（可以改簽名）', '3 個月內的 1 吋半身照片 2 張'],
    where: districtOfficeWhere('依戶籍所在地辦理'),
    resources: [districtOffice(SOURCES.disabilityValidity)],
    services: ['counterDistrictOffice'],
    easy: {
      summary: '去區公所拿鑑定表',
      what: ['去區公所。', '跟櫃台說：「我的證明快到期了，要重新鑑定。」', '櫃台會給你一張「鑑定表」。'],
      prepare: ['舊的身心障礙證明', '身分證影本', '印章', '2 張大頭照'],
    },
  },
  {
    id: 'assessment',
    title: '醫院鑑定',
    summary: '帶鑑定表到指定醫院鑑定',
    mode: 'visit',
    what: '帶鑑定表到臺北市指定的鑑定醫院。全身癱瘓、需要 24 小時呼吸器或長期重度昏迷的人，可以附診斷證明申請到宅鑑定。',
    prepare: ['鑑定表', '健保卡', '過去的病歷或檢查報告'],
    where: { name: '臺北市指定的身心障礙鑑定醫院', mapQuery: '臺北市立聯合醫院', placeType: 'hospital' },
    resources: [
      {
        name: '到宅鑑定',
        description: '外出非常困難的人，可以請醫院到家裡鑑定',
        for: ['mobility', 'disability'],
        sources: [SOURCES.disabilityAssessment],
      },
      cityHospital(SOURCES.disabilityAssessment),
    ],
    services: [],
    easy: {
      summary: '帶鑑定表去醫院檢查',
      what: ['帶著鑑定表去醫院。', '醫生會幫你檢查。', '不能出門的人，可以請醫生到家裡。'],
      prepare: ['鑑定表', '健保卡', '以前看病的資料，有的話'],
      where: '可以做鑑定的醫院',
    },
  },
  {
    id: 'needs-assessment',
    title: '需求評估',
    summary: '社會局會安排，不用另外申請',
    mode: 'wait',
    what: '需求評估不用另外申請，社會局的需求評估中心會安排。停車證等福利能不能申請，都看評估的結果。',
    prepare: ['想一想生活上哪些事需要幫忙'],
    where: { name: '社會局人員會主動聯繫你' },
    resources: [
      { name: '1999 轉社會局身障科', description: '鑑定與福利的問題可以打電話問', phone: '1999', sources: [SOURCES.disabilityValidity] },
    ],
    services: [],
    easy: {
      summary: '等社會局打電話來',
      what: ['社會局的人會打電話給你。', '他會問你需要什麼幫忙。', '照實際情況說就好。'],
      where: '等社會局打電話來',
    },
  },
  {
    id: 'receive',
    title: '領新的證明',
    summary: '收到通知後到區公所領證',
    mode: 'counter',
    what: '醫院完成鑑定後 31 個工作天內，區公所會寄通知。符合資格的，到戶籍地區公所領新的證明。對結果有意見，收到結果隔天起 30 天內可以申請複檢一次。',
    prepare: ['身分證', '印章', '收到的通知'],
    where: districtOfficeWhere(),
    resources: [districtOffice(SOURCES.disabilityValidity)],
    services: ['counterDistrictOffice'],
    easy: {
      summary: '收到通知，去區公所拿證明',
      what: ['你會收到一封通知。', '帶著通知去區公所。', '領新的身心障礙證明。'],
      prepare: ['身分證', '印章', '收到的通知'],
    },
  },
]

// ── 申請輔具 ──────────────────────────────────────────

export const assistiveDeviceSteps: StepDef[] = [
  {
    id: 'do-not-buy',
    title: '先不要買',
    summary: '要先核定才能買，先買的沒有補助',
    mode: 'self',
    what: '輔具補助要先核定才能購買，已經先買的拿不到補助。沒有身障證明的 65 歲以上失能長者、55 歲以上失能原住民、50 歲以上失智者，可以打 1966 走長照的輔具補助。',
    prepare: ['身心障礙證明，或長照的評估結果'],
    where: { name: '先確認要走身障或長照的補助' },
    resources: [
      { name: '身心障礙者輔具費用補助', description: '要先核定才能購買，以及申請資格', for: ['disability'], sources: [SOURCES.assistiveSubsidy] },
      LTC_HOTLINE,
    ],
    services: [],
    easy: {
      summary: '先不要自己買',
      what: ['輔具要先申請，再去買。', '自己先買的，拿不到補助。', '老人家沒有身障證明，可以打 1966 問。'],
      where: '先打電話問',
    },
  },
  {
    id: 'evaluate',
    title: '診斷與評估',
    summary: '拿診斷證明，到輔具中心評估',
    mode: 'visit',
    what: '先拿 3 個月內的診斷證明。需要評估的輔具，向你那一區的輔具資源中心預約評估，也可以請鑑定醫院的治療師開評估報告。外出不方便的，可以申請到家裡評估。',
    prepare: ['3 個月內的診斷證明', '身心障礙證明'],
    where: {
      name: '臺北市輔具資源中心',
      detail: '依你住的區分成合宜、西區、南區三個中心，電話在下方資源',
    },
    resources: ASSISTIVE_CENTERS,
    services: [],
    easy: {
      summary: '先讓專人評估',
      what: ['先請醫生開診斷證明。', '打電話給輔具中心，約時間評估。', '不方便出門，可以請他們到家裡。'],
      prepare: ['診斷證明', '身心障礙證明'],
      where: '輔具中心',
    },
  },
  {
    id: 'apply',
    title: '申請核定',
    summary: '送件後等社會局核定',
    mode: 'online',
    what: '向輔具資源中心申請，或用臺北市輔具補助線上通，社會局會寄核定公文。每人每 2 年最多申請 4 項。',
    prepare: ['申請書', '身分證正本', '診斷證明正本', '評估報告書正本'],
    where: { name: '輔具資源中心，或臺北市輔具補助線上通' },
    resources: [
      {
        name: '輔具補助線上通',
        description: '線上申請、查詢進度，問題可打 1999 轉 1549',
        phone: '1999',
        sources: [SOURCES.assistiveSubsidy],
      },
    ],
    services: [],
    easy: {
      summary: '送出申請，等通知',
      what: ['把資料交給輔具中心。', '也可以上網申請。', '等社會局寄通知來。'],
      prepare: ['申請書', '身分證', '診斷證明', '評估報告'],
      where: '輔具中心，或上網',
    },
  },
  {
    id: 'buy',
    title: '購買輔具',
    summary: '核定後 6 個月內買',
    mode: 'self',
    what: '從核定公文的日期起 6 個月內購買。透過線上通向特約廠商買，廠商會先代墊補助款，你只要付自付額。',
    prepare: ['核定公文或核可編號'],
    where: { name: '輔具特約廠商' },
    resources: [],
    services: [],
    easy: {
      summary: '收到通知後，6 個月內去買',
      what: ['收到通知後，6 個月內去買。', '找有合作的店家，只要付自己的部分。'],
      prepare: ['核定通知'],
      where: '有合作的輔具店家',
    },
  },
  {
    id: 'claim',
    title: '核銷請款',
    summary: '自己先付全額的，買完送件請款',
    mode: 'counter',
    what: '沒有透過特約廠商代墊、自己先付全額的，買完後把文件送回輔具資源中心請款。',
    prepare: ['核銷請款書', '核定公文影本', '郵局或銀行存摺影本', '購買收據正本', '領據和印章', '保固書影本'],
    where: { name: '臺北市輔具資源中心' },
    resources: ASSISTIVE_CENTERS,
    services: [],
    easy: {
      summary: '自己先付錢的，送收據請款',
      what: ['自己先付全部的錢，要請款。', '把收據和資料送到輔具中心。'],
      prepare: ['收據', '存摺影本', '核定通知影本', '印章'],
      where: '輔具中心',
    },
  },
]

// ── 身障停車證 ──────────────────────────────────────────

export const parkingPermitSteps: StepDef[] = [
  {
    id: 'check',
    title: '確認資格',
    summary: '需求評估要認定「行動不便」',
    mode: 'self',
    what: '只有身障證明還不夠，需求評估要認定「行動不便」，結果寫在鑑定公文或福利核定通知上。申請人限 1 人，可以是本人、配偶或一等親，或同戶籍的親屬。車種限自用小客車等，機車、公司車和租賃車不行。',
    prepare: ['鑑定公文或福利核定通知'],
    where: { name: '先看核定通知上有沒有「行動不便」' },
    resources: [{ name: '專用停車位識別證', description: '申請資格、文件與使用規定', for: ['mobility'], sources: [SOURCES.parkingPermit] }],
    services: [],
    easy: {
      summary: '先看你能不能申請',
      what: ['看你的通知上，有沒有寫「行動不便」。', '有寫，才能申請停車證。', '機車不能申請。'],
      prepare: ['鑑定的通知'],
      where: '看通知上寫的字',
    },
  },
  {
    id: 'documents',
    title: '準備文件',
    summary: '證明、駕照、行照影本',
    mode: 'self',
    what: '準備申請表和證件影本。車子或駕照是親屬名下的，要另外附全戶戶口名簿影本；換證要繳回舊證。',
    prepare: ['申請表', '身心障礙證明正反面影本', '駕照影本', '行照影本', '親屬名下的車：全戶戶口名簿影本'],
    where: { name: '自己準備' },
    resources: [],
    services: [],
    easy: {
      summary: '準備證件影本',
      what: ['準備申請表。', '影印證明、駕照、行照。'],
      prepare: ['申請表', '身心障礙證明影本', '駕照影本', '行照影本'],
      where: '自己準備',
    },
  },
  {
    id: 'submit',
    title: '送出申請',
    summary: '線上、臨櫃或郵寄',
    mode: 'online',
    what: '可以用台北服務通線上申請，也可以到市府聯合服務中心的社會局櫃檯，臨櫃大約 1 小時辦好，或郵寄。線上和郵寄大約 8 天。',
    prepare: ['上一步準備的文件'],
    where: { name: '台北服務通，或市政府聯合服務中心社會局 39 號櫃檯（市府路 1 號 1 樓）', mapQuery: '臺北市政府' },
    resources: [{ name: '社會局身障停車證諮詢', description: '1999 轉 1358、1617', phone: '1999', sources: [SOURCES.parkingPermit] }],
    services: [],
    easy: {
      summary: '上網或去市政府申請',
      what: ['可以上網申請。', '也可以去市政府 1 樓的社會局櫃台。', '去櫃台，大約 1 小時就好。'],
      where: '上網，或市政府 1 樓',
    },
  },
  {
    id: 'use',
    title: '使用與更新',
    summary: '本人在車上才能用，不能借人',
    mode: 'self',
    what: '停車證只能用在登記的那台車，而且要本人在車上才能用，不能借給別人，違規的 3 年內不能再申請。效期跟著身障證明，永久效期的是 5 年；到期前 1 個月內重新申請，換車要繳回舊證再申請。',
    prepare: ['停車證'],
    where: { name: '放在登記的車上使用' },
    resources: [],
    services: [],
    easy: {
      summary: '要本人在車上才能用',
      what: ['只能放在登記的那台車。', '你本人要在車上，才能停身障車位。', '不能借給別人用。'],
      where: '登記的那台車',
    },
  },
]

// ── 無障礙交通與復康巴士 ──────────────────────────────────────────

export const accessibleTransportSteps: StepDef[] = [
  {
    id: 'register',
    title: '確認資格並建檔',
    summary: '持臺北市身障證明，第一次訂車時建檔',
    mode: 'phone',
    what: '設籍並住在臺北市、持臺北市身障證明的人可以搭復康巴士。第一次訂車時告訴客服證明號碼和電話，並傳真證明正反面建檔；也可以在訂車網站用證明編號申請帳號，或用台北通登入。',
    prepare: ['身心障礙證明', '聯絡電話'],
    where: { name: '臺北市復康巴士預約專線', phone: PARATRANSIT_PHONE },
    resources: [
      {
        name: '小型復康巴士',
        description: '搭乘資格、訂車方式與車資',
        for: ['mobility', 'disability'],
        sources: [SOURCES.paratransitService, SOURCES.paratransitBooking],
      },
    ],
    services: [],
    easy: {
      summary: '第一次先打電話登記',
      what: ['打電話給復康巴士。', '說你的身心障礙證明號碼。', '把證明傳真過去，就登記好了。'],
      prepare: ['身心障礙證明', '你的電話號碼'],
      where: '打電話給復康巴士',
    },
  },
  {
    id: 'book',
    title: '預約搭車',
    summary: '依等級在 3 到 5 天前預約',
    mode: 'phone',
    what: '每天 8:00 到 17:00 受理預約，依障別等級在 3 到 5 天前預約。每人每天來回各 2 趟，可以帶 1 位陪同者。車資是計程車費率的 1/3。聽語障者可以傳真到 02-2999-3994 訂車。',
    prepare: ['要去的地址和時間', '身心障礙證明號碼'],
    where: { name: '電話預約，或復康巴士訂車網站', phone: PARATRANSIT_PHONE },
    resources: [
      {
        name: '通用計程車',
        description: '可以載輪椅的計程車，市話撥 0800-055850、手機撥 55850 後按 3',
        for: ['mobility'],
        phone: '0800-055850',
        sources: [SOURCES.accessibleTransportStatus],
      },
    ],
    services: [],
    easy: {
      summary: '提早幾天打電話訂車',
      what: ['要坐車，提早 3 到 5 天打電話訂。', '說好要去哪裡、幾點。', '車錢是計程車的三分之一。'],
      prepare: ['要去的地址', '時間'],
      where: '打電話給復康巴士',
    },
  },
  {
    id: 'cancel',
    title: '不搭要提早取消',
    summary: '當天取消或沒到會扣點',
    mode: 'self',
    what: '不搭了要在乘車日前取消。當天取消、用車前 30 分鐘內取消或沒出現都會扣點；半年累計 12 點會降等或停權。司機到了超過 10 分鐘沒出現，就算爽約。',
    prepare: [],
    where: { name: '打電話取消', phone: PARATRANSIT_PHONE },
    resources: [],
    services: [],
    easy: {
      summary: '不坐了，要早點說',
      what: ['不坐了，前一天就要打電話說。', '當天才說，或沒出現，會被扣點。', '扣太多點，會暫時不能坐。'],
      where: '打電話給復康巴士',
    },
  },
  {
    id: 'love-card',
    title: '申請愛心卡',
    summary: '每月有點數，可以搭公車、捷運',
    mode: 'counter',
    what: '持身障證明可以申請愛心卡，115 年 7 月起每月 600 點，1 點抵 1 元，可以搭公車、捷運、臺鐵、復康巴士、YouBike 等。任一區公所都能辦，也可以用台北服務通線上申請。需要陪同的，可以一起勾選愛心陪伴卡。',
    prepare: ['身分證正本', '身心障礙證明正本', '2 吋彩色照片 1 張'],
    where: districtOfficeWhere('任一區公所都可以辦'),
    resources: [districtOffice(SOURCES.loveCard)],
    services: ['counterDistrictOffice'],
    easy: {
      summary: '申請坐車有優惠的愛心卡',
      what: ['去區公所申請愛心卡。', '每個月有點數，可以坐公車和捷運。', '要人陪的，可以多申請一張陪伴卡。'],
      prepare: ['身分證', '身心障礙證明', '1 張 2 吋照片'],
    },
  },
  {
    id: 'report',
    title: '遇到問題反映',
    summary: '用「有話要說」通報，或打客服',
    mode: 'online',
    what: '搭公車、計程車或復康巴士遇到問題，可以用台北通的「有話要說」通報，也可以打復康巴士客服或 1999。',
    prepare: ['發生的時間、地點、車號'],
    where: { name: '台北通「有話要說」，或復康巴士客服', phone: PARATRANSIT_PHONE },
    resources: [{ name: '臺北市公共運輸處', description: '復康巴士的申訴', phone: '02-2723-3016', sources: [SOURCES.paratransitService] }],
    services: ['reportTransport'],
    easy: {
      summary: '坐車有問題，可以反映',
      what: ['坐車遇到問題，可以跟政府說。', '用台北通的「有話要說」。', '或打 1999。'],
      prepare: ['時間', '地點', '車號'],
      where: '台北通的「有話要說」',
    },
  },
]

// ── 手語翻譯與同步聽打 ──────────────────────────────────────────

export const signLanguageSteps: StepDef[] = [
  {
    id: 'eligibility',
    title: '確認可以申請',
    summary: '聽語障者，看醫生、上法院都能用',
    mode: 'self',
    what: '持身障證明的聽語障者可以申請，不是設籍臺北也可以；機關、醫院、學校要和聽語障者溝通時也能申請。看醫生、司法或警察訊問、上學、開會、社會參與都適用。服務由社會局委託中華民國聽障人協會提供。',
    prepare: ['身心障礙證明'],
    where: { name: '臺北市手語翻譯及同步聽打服務' },
    resources: [{ name: '聽語障溝通服務方案', description: '手語翻譯與同步聽打的申請資格與方式', for: ['hearing'], sources: [SOURCES.signLanguage] }],
    services: [],
    easy: {
      summary: '看醫生、上法院，都可以請手語翻譯',
      what: ['聽不到或不能說話的人，可以申請。', '看醫生、去警察局、上課都可以用。', '有手語翻譯，也有打字的聽打。'],
      prepare: ['身心障礙證明'],
      where: '臺北市的手語翻譯服務',
    },
  },
  {
    id: 'apply',
    title: '提出申請',
    summary: '線上、簡訊、LINE、傳真都可以',
    mode: 'online',
    what: '可以用線上系統申請，也可以傳簡訊或 LINE 到 0963-047-723、免付費傳真到 0800-365-624，或寄 Email。受理時間是週一到週五 8:00 到 20:00。',
    prepare: ['要用的日期、時間、地點', '是手語翻譯還是同步聽打'],
    where: { name: '線上申請系統、簡訊或 LINE（0963-047-723）、免付費傳真（0800-365-624）' },
    resources: [
      {
        name: '聽人可以撥打的免付費電話',
        description: '家人或機關可以幫忙打電話申請',
        phone: '0800-365-224',
        sources: [SOURCES.signLanguage],
      },
    ],
    services: [],
    easy: {
      summary: '傳簡訊或 LINE 申請',
      what: ['傳簡訊或 LINE 到 0963-047-723。', '說哪一天、幾點、在哪裡要用。', '說要手語，還是要打字。'],
      prepare: ['日期', '時間', '地點'],
      where: '簡訊或 LINE',
    },
  },
  {
    id: 'advance',
    title: '至少 3 天前申請',
    summary: '緊急情況不受限',
    mode: 'self',
    what: '要在服務開始 3 天前申請，緊急情況不受限。手語翻譯 24 小時都有，同步聽打原則上是 8:00 到 22:00；晚上 10 點到隔天 7 點的緊急狀況也可以申請。',
    prepare: [],
    where: { name: '提早申請' },
    resources: [],
    services: [],
    easy: {
      summary: '提早 3 天申請',
      what: ['至少提早 3 天申請。', '很急的話，可以馬上申請。'],
      where: '提早申請',
    },
  },
  {
    id: 'emergency',
    title: '緊急時報案',
    summary: '用簡訊報案，或 110 視訊報案',
    mode: 'online',
    what: '要叫救護車或消防車，傳簡訊到臺北市消防局 0911-511-902；要報警，傳簡訊到臺北市警察局 0911-510-914，或用「110 視訊報案」App。1999 也有手語視訊和文字服務。',
    prepare: ['先把簡訊報案號碼存在手機裡'],
    where: { name: '傳簡訊，或用 110 視訊報案 App' },
    resources: [],
    services: [],
    easy: {
      summary: '緊急時，傳簡訊報案',
      what: ['要叫救護車，傳簡訊到 0911-511-902。', '要報警，傳簡訊到 0911-510-914。', '先把號碼存在手機裡。'],
      where: '傳簡訊',
    },
  },
]
