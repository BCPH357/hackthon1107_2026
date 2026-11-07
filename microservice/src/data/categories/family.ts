// 婚姻與家庭：結婚、離婚、收養、家暴求助。
// 依內政部戶政司、臺北市各區戶政事務所、司法院、衛福部保護服務司、臺北市家庭暴力暨性侵害防治中心公開資料整理（2026-11-07 查詢）。
// 金額沒有標明適用年度的不寫；各機關說法不一致的地方，請使用者先打電話確認。
// easy 是易讀版文字（AI 起草，待團隊審稿），放在一般版旁邊方便對照。

import { cityHospital, householdOffice, householdOfficeWhere } from '../common'
import { SOURCES } from '../sources'
import type { ResourceDef, StepDef } from '../types'

const PROTECTION_HOTLINE: ResourceDef = {
  name: '113 保護專線',
  description: '24 小時、免付費，可以諮詢或通報家暴；聽語障者可以傳簡訊到 113',
  phone: '113',
  sources: [SOURCES.protectionHotline],
}

const PHOTO_SPEC = '2 年內拍的相片 1 張（直 4.5、橫 3.5 公分，白底）'

// ── 結婚 ──────────────────────────────────────────

export const marriageSteps: StepDef[] = [
  {
    id: 'book',
    title: '預約登記日',
    summary: '結婚從登記那天生效，可以先預約',
    mode: 'online',
    what: '結婚從到戶政事務所登記的那一天起生效。可以在內政部戶政司網站預約，或打電話給戶政事務所；網路預約要在 1 到 7 天前完成。想選假日當結婚日，可以在前 3 個上班日先去辦，並指定登記日。',
    prepare: ['自然人憑證，或填寫個人資料驗證'],
    where: { name: '內政部戶政司網路預約，或打電話給戶政事務所' },
    resources: [householdOffice(SOURCES.risMarriage)],
    services: ['counterHousehold'],
    easy: {
      summary: '先選好登記的日子',
      what: ['登記那天，就是結婚的日子。', '可以先上網預約，或打電話給戶政事務所。', '想選假日結婚，可以提早幾天去辦。'],
      where: '上網預約，或打電話給戶政事務所',
    },
  },
  {
    id: 'contract',
    title: '準備結婚書約',
    summary: '寫好書約，請 2 位證人簽名',
    mode: 'self',
    what: '結婚書約要寫明雙方的資料，並請 2 位以上的證人簽名或蓋章。書約可以自己準備，也可以到戶政事務所索取。',
    prepare: ['結婚書約', '2 位證人的簽名或印章'],
    where: { name: '自己準備，戶政事務所也拿得到書約' },
    resources: [],
    services: [],
    easy: {
      summary: '寫書約，找 2 個人簽名',
      what: ['準備一張「結婚書約」。', '寫上你們兩個人的資料。', '找 2 個人當證人，請他們簽名。'],
      prepare: ['結婚書約', '2 個證人的簽名'],
    },
  },
  {
    id: 'register',
    title: '一起去登記',
    summary: '兩個人一起到戶政事務所登記',
    mode: 'counter',
    what: '兩個人一起到戶政事務所辦結婚登記，在國內結婚的，全國任一戶政事務所都可以辦。行動不便、不能親自到場的，委託規定各戶所說法不一，出發前先打電話問。',
    prepare: ['雙方的身分證', '雙方的印章（或簽名）', '戶口名簿', PHOTO_SPEC, '結婚書約'],
    where: householdOfficeWhere('全國任一戶政事務所都可以辦'),
    resources: [householdOffice(SOURCES.risMarriage)],
    services: ['counterHousehold'],
    easy: {
      summary: '兩個人一起去戶政事務所',
      what: ['兩個人一起去戶政事務所。', '哪一個戶政事務所都可以。', '交出書約，辦結婚登記。'],
      prepare: ['兩個人的身分證', '兩個人的印章', '戶口名簿', '1 張大頭照', '結婚書約'],
    },
  },
  {
    id: 'new-id',
    title: '換新的身分證',
    summary: '在同一個戶政事務所換新身分證',
    mode: 'counter',
    what: '登記後身分證上的資料會改變，要在辦登記的同一個戶政事務所換新的身分證。換證可以委託別人，但要換相片就必須本人到場。',
    prepare: ['舊的身分證', '印章', PHOTO_SPEC],
    where: householdOfficeWhere('辦結婚登記的同一個戶政事務所'),
    resources: [
      householdOffice(SOURCES.risMarriage),
      {
        name: '臺北市戶政到府服務',
        description: '身障者、65 歲以上行動不便、重大傷病的人可以申請，戶政人員到家裡辦；能辦哪些事請先打電話問',
        for: ['disability', 'mobility', 'elder', 'majorIllness'],
        sources: [SOURCES.householdHomeService],
      },
    ],
    services: ['counterHousehold'],
    easy: {
      summary: '換一張新的身分證',
      what: ['結婚後，身分證要換新的。', '在同一個戶政事務所換。', '要換新照片的話，要自己去。'],
      prepare: ['舊的身分證', '印章', '1 張大頭照'],
    },
  },
]

// ── 離婚 ──────────────────────────────────────────

export const divorceSteps: StepDef[] = [
  {
    id: 'choose',
    title: '確認離婚方式',
    summary: '兩願離婚，或經過法院離婚',
    mode: 'self',
    what: '雙方同意離婚的「兩願離婚」，到戶政事務所登記後才生效。經過法院判決、調解或和解的離婚，在法院程序完成後，由任一方去戶政事務所登記。有家暴情形的，可以先打 113 諮詢。',
    prepare: ['想清楚孩子由誰照顧、財產怎麼分'],
    where: { name: '兩願離婚到戶政事務所；法院離婚到地方法院家事庭' },
    resources: [PROTECTION_HOTLINE],
    services: [],
    easy: {
      summary: '先決定用哪一種方式離婚',
      what: ['兩個人都同意，就到戶政事務所辦。', '談不攏，可以找法院幫忙。', '有被打或被威脅，先打 113。'],
      where: '戶政事務所，或法院',
    },
  },
  {
    id: 'mutual',
    title: '兩願離婚登記',
    summary: '雙方帶協議書一起到戶政事務所',
    mode: 'counter',
    what: '雙方帶著離婚協議書，一起到戶政事務所登記。協議書要有 2 位以上證人簽名或蓋章。有正當理由不能到場的，經戶所同意可以書面委託別人。',
    prepare: ['離婚協議書（2 位證人簽名）', '雙方的身分證', '戶口名簿', '印章（或簽名）', PHOTO_SPEC],
    where: householdOfficeWhere('全國任一戶政事務所都可以辦'),
    resources: [householdOffice(SOURCES.risDivorce)],
    services: ['counterHousehold'],
    easy: {
      summary: '兩個人一起去戶政事務所',
      what: ['寫好離婚協議書。', '找 2 個人當證人簽名。', '兩個人一起去戶政事務所登記。'],
      prepare: ['離婚協議書', '兩個人的身分證', '戶口名簿', '印章', '1 張大頭照'],
    },
  },
  {
    id: 'court',
    title: '法院離婚登記',
    summary: '法院程序完成後 30 天內去登記',
    mode: 'counter',
    what: '法院判決確定，或調解、和解成立後 30 天內，由任一方到戶政事務所登記。符合條件的人也可以在內政部戶政司網站線上辦。超過期限就只能到戶所辦。',
    prepare: ['判決書和確定證明書，或調解、和解筆錄', '身分證', '戶口名簿', '印章', PHOTO_SPEC],
    where: householdOfficeWhere('全國任一戶政事務所都可以辦'),
    resources: [householdOffice(SOURCES.risDivorce)],
    services: ['counterHousehold'],
    easy: {
      summary: '法院辦完，30 天內去登記',
      what: ['法院的事辦完後，會拿到文件。', '30 天內，帶文件去戶政事務所。', '一個人去就可以。'],
      prepare: ['法院給的文件', '身分證', '戶口名簿', '印章', '1 張大頭照'],
    },
  },
  {
    id: 'children',
    title: '登記孩子由誰照顧',
    summary: '有未成年孩子，要登記由誰照顧',
    mode: 'counter',
    what: '有未成年的孩子，要登記孩子的權利義務由誰行使負擔，也就是由誰照顧。可以在哪一個戶所辦，各機關說法不同，出發前先打電話確認。',
    prepare: ['協議書或法院文件（寫明由誰照顧孩子）', '照顧的人和孩子的戶口名簿', '照顧的人的身分證和印章'],
    where: householdOfficeWhere('出發前先打電話確認可以在哪一個戶所辦'),
    resources: [householdOffice(SOURCES.risDivorce)],
    services: ['counterHousehold'],
    easy: {
      summary: '登記孩子跟誰住',
      what: ['有未成年的孩子，要登記誰來照顧。', '先打電話問，要去哪一個戶政事務所。'],
      prepare: ['寫好誰照顧孩子的文件', '戶口名簿', '身分證', '印章'],
    },
  },
  {
    id: 'new-id',
    title: '換證與回復本姓',
    summary: '冠配偶姓的人要回復本姓、換新身分證',
    mode: 'counter',
    what: '原本冠配偶姓的人，離婚後要回復本姓。身分證上的資料改變後，在辦登記的戶政事務所換新的身分證。',
    prepare: ['舊的身分證', '印章', PHOTO_SPEC],
    where: householdOfficeWhere('辦離婚登記的同一個戶政事務所'),
    resources: [householdOffice(SOURCES.risDivorce)],
    services: ['counterHousehold'],
    easy: {
      summary: '換一張新的身分證',
      what: ['名字冠對方姓的，要改回來。', '在同一個戶政事務所換新的身分證。'],
      prepare: ['舊的身分證', '印章', '1 張大頭照'],
    },
  },
]

// ── 收養 ──────────────────────────────────────────

export const adoptionSteps: StepDef[] = [
  {
    id: 'matching',
    title: '找收出養媒合',
    summary: '收養未成年的孩子，要先經過媒合',
    mode: 'self',
    what: '收養未成年的孩子，要先委託合法的收出養媒合服務者，接受訪視和評估。收養配偶的孩子、一定範圍內的親戚，或收養成年人，不需要媒合。收養人原則上要比被收養人大 20 歲以上。',
    prepare: ['想收養的原因與家庭狀況'],
    where: { name: '收出養媒合服務者（名單在衛福部社家署網站）' },
    resources: [
      {
        name: '衛福部社家署兒少收養資訊中心',
        description: '查詢合法的收出養媒合服務者，以及收養的相關規定',
        sources: [SOURCES.adoptionInfoCenter],
      },
    ],
    services: [],
    easy: {
      summary: '先找合法的收養媒合單位',
      what: ['收養小孩，要先找合法的媒合單位。', '他們會來家裡看，了解你的狀況。', '收養配偶的小孩，不用這一步。'],
      where: '合法的收養媒合單位',
    },
  },
  {
    id: 'petition',
    title: '向法院聲請認可',
    summary: '收養一定要經過法院認可',
    mode: 'counter',
    what: '收養一定要經過法院認可。由收養人和被收養人一起，向住所地的地方法院家事庭遞聲請狀。',
    prepare: [
      '家事聲請狀',
      '收養人、被收養人和生父母的戶籍謄本',
      '收養同意書或契約書',
      '收養人的健康、職業、財力證明（至少 2 種）',
      '警察刑事紀錄證明',
      '媒合評估報告（不需要媒合的免附）',
    ],
    where: { name: '收養人或被收養人住所地的地方法院家事庭' },
    resources: [
      {
        name: '法院認可收養',
        description: '收養一定要經過法院認可，以及聲請要準備的文件',
        sources: [SOURCES.judicialAdoption],
      },
    ],
    services: [],
    easy: {
      summary: '請法院同意收養',
      what: ['收養一定要法院同意。', '寫一份聲請狀，交給法院。', '法院會看你們準備的資料。'],
      prepare: ['聲請狀', '戶籍謄本', '收養同意書', '健康、工作、財產的證明'],
      where: '地方法院',
    },
  },
  {
    id: 'hearing',
    title: '訪視與出庭',
    summary: '法院可能請社工訪視，雙方要出庭',
    mode: 'counter',
    what: '法院可能請社工訪視，或要求先試養、上親職課程。收養人和出養人都要出庭，7 歲以上的孩子也要到庭。',
    prepare: ['開庭通知書', '身分證'],
    where: { name: '地方法院家事庭' },
    resources: [],
    services: [],
    easy: {
      summary: '社工來看，然後去法院',
      what: ['社工可能會來家裡看看。', '法院開庭時，你們要一起去。', '7 歲以上的小孩也要去。'],
      prepare: ['開庭通知', '身分證'],
      where: '地方法院',
    },
  },
  {
    id: 'final',
    title: '取得確定證明',
    summary: '裁定確定後，向法院拿確定證明書',
    mode: 'wait',
    what: '收到法院裁定後 10 天內，沒有人提出抗告，裁定就確定。這時向原法院聲請裁定確定證明書。',
    prepare: ['法院的裁定書'],
    where: { name: '原本的地方法院' },
    resources: [],
    services: [],
    easy: {
      summary: '等 10 天，再拿證明',
      what: ['法院同意後，要等 10 天。', '沒有人反對，就確定了。', '再跟法院拿一張「確定證明書」。'],
      where: '原本的法院',
    },
  },
  {
    id: 'register',
    title: '戶政收養登記',
    summary: '確定後 30 天內到戶政事務所登記',
    mode: 'counter',
    what: '裁定確定後 30 天內，到戶政事務所辦收養登記。夫妻共同收養的，要先書面約定孩子從養父姓、養母姓或維持原姓。',
    prepare: ['裁定書和確定證明書', '身分證和印章', '收養人與被收養人的戶口名簿', PHOTO_SPEC, '從姓約定書（夫妻共同收養時）'],
    where: householdOfficeWhere('全國任一戶政事務所都可以辦'),
    resources: [householdOffice(SOURCES.risAdoption)],
    services: ['counterHousehold'],
    easy: {
      summary: '30 天內去戶政事務所登記',
      what: ['拿到證明後，30 天內去戶政事務所。', '辦收養登記。', '夫妻一起收養的，先決定小孩姓什麼。'],
      prepare: ['法院的文件', '身分證', '印章', '戶口名簿', '1 張大頭照'],
    },
  },
]

// ── 家暴求助（隱私事件，見 EventDef.sensitive） ──────────────────────

export const domesticViolenceSteps: StepDef[] = [
  {
    id: 'safety',
    title: '先保護自己',
    summary: '有危險打 110，想找人談打 113',
    mode: 'phone',
    what: '有立即的危險，馬上打 110。想找人談、問可以怎麼做，或要通報，打 113 保護專線，24 小時、免付費，手機和公共電話都能打。聽語障者可以傳簡訊到 113，也有英、越、印尼、泰、日語通譯。',
    prepare: ['可以的話，先到安全的地方再打電話'],
    where: { name: '打電話就可以', phone: '113' },
    resources: [
      { name: '110 報案', description: '有立即危險時撥打', phone: '110', sources: [SOURCES.domesticViolenceHelp] },
      PROTECTION_HOTLINE,
      { name: '男性關懷專線', description: '給男性的諮詢專線', phone: '0800-013-999', sources: [SOURCES.domesticViolenceHelp] },
    ],
    services: ['police'],
    easy: {
      summary: '有危險，馬上打 110',
      what: ['有危險，馬上打 110。', '想找人說話，打 113。', '113 每天 24 小時都有人接。', '不方便說話，可以傳簡訊到 113。'],
      where: '打電話就可以',
    },
  },
  {
    id: 'injury',
    title: '就醫驗傷',
    summary: '到醫院驗傷，留下證據',
    mode: 'visit',
    what: '盡快到醫院或診所驗傷，請醫生開驗傷診斷書，醫院不能無故拒絕。也可以拍下傷口、錄音，記下證人。之後聲請保護令或提告都用得到；要提傷害告訴，要在 6 個月內。',
    prepare: ['健保卡', '受傷的照片或錄音（有的話）'],
    where: { name: '醫院急診或診所', mapQuery: '臺北市立聯合醫院', placeType: 'hospital' },
    resources: [
      { name: '就醫驗傷', description: '驗傷診斷書與保留證據的方法', sources: [SOURCES.domesticViolenceHelp] },
      cityHospital(),
    ],
    services: [],
    easy: {
      summary: '去醫院檢查傷口',
      what: ['去醫院檢查傷口。', '請醫生開「驗傷診斷書」。', '可以把傷口拍下來。', '這些以後都用得到。'],
      prepare: ['健保卡', '傷口的照片，有的話'],
      where: '醫院的急診',
    },
  },
  {
    id: 'protection-order',
    title: '聲請保護令',
    summary: '向法院聲請，警察也可以幫你聲請',
    mode: 'counter',
    what: '情況緊急時到派出所報案，警察可以幫你聲請緊急保護令，法院 4 小時內核發，夜間和假日也可以。一般情況可以自己向法院聲請暫時或通常保護令，不用繳裁判費。派出所的家防官可以幫忙填表。',
    prepare: ['保護令聲請狀', '雙方的戶籍謄本', '驗傷診斷書、照片、錄音等證據', '證人的聯絡方式'],
    where: { name: '地方法院（你或對方住的地方，或事情發生的地方），或附近的派出所' },
    resources: [{ name: '保護令', description: '緊急、暫時、通常保護令怎麼聲請', sources: [SOURCES.domesticViolenceHelp] }],
    services: ['police'],
    easy: {
      summary: '請法院下保護令',
      what: ['保護令可以叫對方不能靠近你。', '很急的話，去派出所，警察會幫你申請。', '也可以自己去法院申請，不用錢。'],
      prepare: ['驗傷診斷書', '照片或錄音', '身分證'],
      where: '派出所，或法院',
    },
  },
  {
    id: 'center',
    title: '找家防中心幫忙',
    summary: '庇護、法律諮詢、陪同出庭',
    mode: 'phone',
    what: '臺北市家庭暴力暨性侵害防治中心 24 小時提供緊急救援和庇護，也幫忙擬定安全計畫、法律諮詢、陪同出庭和經濟扶助。可以先把重要的東西放在安全的地方，或交給信任的人保管。',
    prepare: ['身分證、健保卡、存摺、印章', '一些現金和平常吃的藥', '驗傷診斷書'],
    where: { name: '臺北市家庭暴力暨性侵害防治中心（中正區延平南路 123 號）', phone: '02-2361-5295' },
    resources: [],
    services: [],
    easy: {
      summary: '找家防中心幫忙',
      what: ['家防中心可以幫你找地方住。', '也可以陪你去法院。', '重要的東西，先交給信任的人保管。'],
      prepare: ['身分證', '健保卡', '存摺', '印章', '一些錢和藥'],
      where: '打電話給家防中心',
    },
  },
  {
    id: 'subsidy',
    title: '申請補助',
    summary: '醫療、住宿、房租、律師費補助',
    mode: 'online',
    what: '臺北市有家暴被害人補助，項目包括驗傷醫療、心理復健、安置住宿、房租和生活費、律師費，由家防中心審核。醫療費要在就診後 3 個月內申請。經濟有困難的，也可以申請特殊境遇家庭扶助。',
    prepare: ['身分證', '醫療或房租的收據', '驗傷診斷書'],
    where: { name: '臺北市家庭暴力暨性侵害防治中心審核' },
    resources: [
      {
        name: '特殊境遇家庭扶助',
        description: '家暴被害人經濟有困難時，可以申請緊急生活扶助、子女生活津貼等',
        for: ['singleParent', 'specialFamily', 'lowIncome'],
        sources: [SOURCES.specialFamilyEligibility],
      },
    ],
    services: ['formDomesticViolence', 'formSpecialFamily'],
    easy: {
      summary: '申請看病、住宿的補助',
      what: ['看病、找地方住，都可以申請補助。', '看病的錢，3 個月內要申請。', '錢不夠用，也可以申請其他扶助。'],
      prepare: ['身分證', '收據', '驗傷診斷書'],
      where: '家防中心',
    },
  },
]
