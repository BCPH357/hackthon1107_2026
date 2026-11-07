// 「可以用的資源」每一張卡片的資料來源。只放官方網頁，2026-11-07 逐一打開確認過標題。
// 新增資源時，把對應的官方網頁加在這裡，再放進 ResourceDef.sources。

import { PLACE_SOURCE_HOUSEHOLD, PLACE_SOURCE_TOILETS } from './places'
import type { SourceDef } from './types'

const source = (title: string, url: string): SourceDef => ({ title, url })

export const SOURCES = {
  // ── 開放資料：AR 方向指引的地點 ──
  openDataToilets: { ...PLACE_SOURCE_TOILETS, title: `臺北資料大平台：${PLACE_SOURCE_TOILETS.title}（地點座標）` },
  openDataHousehold: { ...PLACE_SOURCE_HOUSEHOLD, title: `臺北資料大平台：${PLACE_SOURCE_HOUSEHOLD.title}（名稱、地址、電話）` },

  // ── 戶政 ──
  risBirth: source('內政部戶政司：出生登記', 'https://www.ris.gov.tw/documents/html/2/3/1/379.html'),
  risAdoption: source('內政部戶政司：收養登記', 'https://www.ris.gov.tw/documents/html/2/3/1/381.html'),
  risMarriage: source('內政部戶政司：結婚登記', 'https://www.ris.gov.tw/documents/html/2/3/1/383.html'),
  risDivorce: source('內政部戶政司：離婚登記', 'https://www.ris.gov.tw/documents/html/2/3/1/384.html'),
  risDeath: source('內政部戶政司：死亡、死亡宣告登記', 'https://www.ris.gov.tw/documents/html/2/3/1/386.html'),
  householdHomeService: source('臺北市大安區戶政事務所：到府服務說明', 'https://dahr.gov.taipei/cp.aspx?n=2AAD38A3264337A4'),

  // ── 懷孕與育兒 ──
  pregnancyHandbook: source('衛福部國民健康署：孕婦健康手冊', 'https://www.hpa.gov.tw/Pages/List.aspx?nodeid=1142'),
  prenatalCheckup: source('衛福部國民健康署：孕婦產前檢查項目及補助', 'https://www.hpa.gov.tw/Pages/List.aspx?nodeid=194'),
  pregnancyVaccine: source('國民健康署孕產兒關懷網站：孕期疫苗接種', 'https://mammy.hpa.gov.tw/Home/NewsKBContent?id=3555&type=01'),
  maternityLeave: source('勞動部：生育福利站', 'https://www.mol.gov.tw/2623/2632/'),
  parentalLeave: source('勞動部就業平等網：育嬰留職停薪的要件及期間', 'https://eeweb.mol.gov.tw/front/279'),
  parentalLeaveAllowance: source('勞動部勞工保險局：育嬰留職停薪津貼', 'https://www.bli.gov.tw/0020785.html'),
  birthSubsidy: source('臺北市政府民政局（助您好孕）：臺北市生育補助', 'https://born.taipei/cp.aspx?n=4BB21D19B8E70CE0'),
  childcareAllowance: source('臺北市政府社會局：育兒津貼', 'https://dosw.gov.taipei/cp.aspx?n=C189BFAB86EAF184'),
  publicChildcare: source('臺北市政府社會局：公共托育登記報名及抽籤', 'https://dosw.gov.taipei/cp.aspx?n=91E27EEB185E61A5'),

  // ── 失智、長照、出院返家 ──
  dementiaCenters: source('臺北市失智症服務網：失智共同照護中心', 'https://dementia.gov.taipei/Content_List.aspx?n=A7DEE678596F57AE'),
  ltcApply: source('衛福部長照專區：申請長照服務（1966）', 'https://1966.gov.tw/LTC/cp-6533-70777-207.html'),
  ltcCenter: source('臺北市政府衛生局：如何申請長照服務', 'https://health.gov.taipei/News.aspx?n=4244BB51FC46A03C&sms=72730260368A9FA4'),
  homeCare: source('臺北市政府社會局：居家服務', 'https://dosw.gov.taipei/cp.aspx?n=F07637F92E4E85A0'),
  dayCare: source('臺北市政府社會局：日間照顧', 'https://dosw.gov.taipei/cp.aspx?n=3E3C1D86A51BF473'),
  ltcTransport: source('臺北市政府社會局：長期照顧交通接送服務', 'https://dosw.gov.taipei/cp.aspx?n=1847C5A001C1DC3C'),
  ltcAssistive: source('臺北市政府社會局：長期照顧輔具服務', 'https://dosw.gov.taipei/cp.aspx?n=743fc7866a1a3f3c&s=1CAA21C5DECEBE01'),
  respiteCare: source('衛福部長照專區：喘息服務', 'https://1966.gov.tw/LTC/cp-6454-70075-207.html'),
  caregiverSupport: source('臺北市政府社會局：家庭照顧者支持服務據點', 'https://dosw.gov.taipei/cp.aspx?n=70898293C7B4ABE5'),
  dischargePlanning: source(
    '臺北市政府衛生局：出院準備銜接長照服務',
    'https://health.gov.taipei/News_Content.aspx?n=26224E50941C912A&sms=88CB8FF290426B1F&s=6209A147738D85D1',
  ),
  sicknessBenefit: source('勞動部勞工保險局：傷病給付請領資格', 'https://www.bli.gov.tw/0004848.html'),
  occupationalSicknessBenefit: source('勞動部勞工保險局：職業災害保險傷病給付', 'https://www.bli.gov.tw/0106065.html'),
  rehabilitation: source('臺北市立聯合醫院仁愛院區：復健科', 'https://tpech.gov.taipei/mp109151/cp.aspx?n=E2947520B929427A'),
  counseling: source('臺北市社區心理衛生中心：社區心理諮商服務說明', 'https://mental-health.gov.taipei/cp.aspx?n=F99C2A7517953986'),
  cityHospitalBranches: source('臺北市立聯合醫院：院區連結', 'https://tpech.gov.taipei/News_Link.aspx?n=B2928975CE3FC013&sms=E8E7FE0083BF0682'),
  disabilityAssessmentHospitals: source(
    '臺北市政府衛生局：身心障礙鑑定服務與指定醫院',
    'https://health.gov.taipei/News_Content.aspx?n=CE9C4ABECFAC27EB&sms=C862B1BE3EF43D14&s=F77019356A6551CC',
  ),
  disabilityNeedsAssessment: source('臺北市政府社會局：身心障礙者需求評估中心', 'https://dosw.gov.taipei/cp.aspx?n=4B1384BBF5BD55B5'),

  // ── 親人過世 ──
  deathCertificate: source(
    '臺北市政府衛生局：如何申請死亡證明',
    'https://health.gov.taipei/News_Content.aspx?n=AC64F0F68D7CF40E&sms=87415A8B9CE81B16&s=0BE237316960E34A',
  ),
  funeralOffice: source('臺北市殯葬管理處：本處簡介', 'https://mso.gov.taipei/cp.aspx?n=A2C73FE20CB41614'),
  funeralSubsidy: source('臺北市政府社會局：喪葬補助', 'https://dosw.gov.taipei/cp.aspx?n=406F803325F93AD9'),
  deathBenefit: source('勞動部勞工保險局：不幸身故', 'https://www.bli.gov.tw/0100091.html'),
  estateTax: source('財政部臺北國稅局：人生大事—身後篇', 'https://www.ntbt.gov.tw/singlehtml/b661e5a93dea4d94875efee1ad0388b3?cntId=31e065577eaa41719b1a5c68832849e0'),
  inheritanceRegistration: source('臺北市政府地政局：繼承登記如何辦理', 'https://land.gov.taipei/News_Content.aspx?n=687FAB1D8F11B727&s=C2FA10201DAC5E88'),

  // ── 收養、家暴 ──
  judicialAdoption: source('司法院：收養子女一定要經過法院認可嗎', 'https://www.judicial.gov.tw/tw/cp-1303-2672-a6800-1.html'),
  adoptionInfoCenter: source('衛福部社家署：兒童及少年收養資訊中心', 'https://adoptinfo.sfaa.gov.tw/'),
  protectionHotline: source('衛福部保護服務司：113 保護專線介紹', 'https://dep.mohw.gov.tw/DOPS/cp-1183-6499-105.html'),
  domesticViolenceHelp: source('衛福部：發生家庭暴力時有哪些求助管道', 'https://topics.mohw.gov.tw/SS/cp-4530-50098-204.html'),
  specialFamilyEligibility: source(
    '臺北市政府社會局：申請特殊境遇家庭扶助的條件',
    'https://dosw.gov.taipei/News_Content.aspx?n=91F35523B74F69AC&sms=87415A8B9CE81B16&s=F86046FC3A91FCAF',
  ),

  // ── 身心障礙 ──
  disabilityAssessment: source('臺北市政府社會局：申請身心障礙鑑定', 'https://dosw.gov.taipei/cp.aspx?n=26BB4C5F2992FAFB'),
  disabilityValidity: source('臺北市政府社會局：身心障礙證明有效期限', 'https://dosw.gov.taipei/cp.aspx?n=A6691D9F6DCD7B9D'),
  loveCard: source('臺北市政府社會局：愛心及愛心陪伴悠遊卡', 'https://dosw.gov.taipei/cp.aspx?n=98EA840859DF5D7F'),
  parkingPermit: source('臺北市政府社會局：專用停車位識別證申請', 'https://dosw.gov.taipei/cp.aspx?n=411918B6262745BE'),
  assistiveSubsidy: source('臺北市政府社會局：身心障礙者輔具費用補助', 'https://dosw.gov.taipei/cp.aspx?n=49304F9B0793FFEF'),
  assistiveCenters: source('臺北市政府社會局：輔具中心', 'https://dosw.gov.taipei/cp.aspx?n=F00D57EC34399445'),
  paratransitService: source('臺北市公共運輸處：無障礙運輸服務方式', 'https://pto.gov.taipei/cp.aspx?n=DB9231FBEB003A41'),
  accessibleTransportStatus: source('臺北市公共運輸處：無障礙運輸服務現況', 'https://pto.gov.taipei/cp.aspx?n=3B812B093D7FF7E8'),
  paratransitBooking: source('臺北市公共運輸處：小型復康巴士網路訂車', 'https://0809080650.gov.taipei/'),
  signLanguage: source('臺北市政府社會局：聽語障溝通服務方案（手語翻譯、聽打）', 'https://dosw.gov.taipei/cp.aspx?n=A1FBE0253EA9B6E1'),

  // ── 就業 ──
  taiwanJobs: source('勞動部：台灣就業通網站推出線上就業諮詢', 'https://www.mol.gov.tw/1607/1632/1640/78220/post'),
  jobTransportSubsidy: source(
    '臺北市就業服務處：臺北市求職交通補助金',
    'https://eso.gov.taipei/News_Content.aspx?n=72084C8C93FDAB33&sms=375003E91D8BCA66&s=7FC7C850A260F9EF',
  ),
  laborHotline: source('勞動部：1955 勞工諮詢申訴專線', 'https://www.mol.gov.tw/service/32300/32320/'),
  employmentStations: source('臺北市就業服務處：各就業服務站聯絡資訊', 'https://eso.gov.taipei/cp.aspx?n=931FF3F88FFB7EEC'),
  jobRegistration: source(
    '臺北市就業服務處：櫃檯求職登記服務',
    'https://eso.gov.taipei/News_Content.aspx?n=72084C8C93FDAB33&sms=375003E91D8BCA66&s=E046A6DFF916B4BF',
  ),
  vocationalTraining: source(
    '臺北市職能發展學院：職能培育（職前訓練）招生簡章',
    'https://www.tvdi.gov.taipei/News_Content.aspx?n=A0A874C46637EF1F&sms=78D644F2755ACCAA&s=817CC914A319B1B3',
  ),
  indigenousCertificateBonus: source('全國法規資料庫：原住民取得技術士證照獎勵辦法', 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0130018'),
  disabledJobSeeking: source('臺北市勞動力重建運用處：求職服務', 'https://fd.gov.taipei/cp.aspx?n=81CBC201F3747484'),
  shelteredEmployment: source('臺北市勞動力重建運用處：庇護性就業', 'https://fd.gov.taipei/cp.aspx?n=7CE8B94C810A91A0'),
  jobRedesign: source('臺北市勞動力重建運用處：職務再設計', 'https://fd.gov.taipei/cp.aspx?n=44A40C74FF25ED19'),
  unemploymentBenefit: source(
    '臺北市就業服務處：失業給付',
    'https://eso.gov.taipei/News_Content.aspx?n=DF02DE8E0A136367&sms=FACCAE8D1ED808BF&s=551D6E9A030C09AD',
  ),
  unemploymentEligibility: source('勞動部勞工保險局：失業給付請領資格', 'https://www.bli.gov.tw/0015717.html'),
  unemploymentHealthInsurance: source('勞動部：領失業給付的勞工也有健保費補助', 'https://www.mol.gov.tw/1607/1632/1640/20274/post'),

  // ── 社會救助 ──
  welfareHotline: source('衛生福利部：1957 福利諮詢專線', 'https://1957.mohw.gov.tw/'),
  emergencyAid: source('臺北市政府社會局：急難救助', 'https://dosw.gov.taipei/cp.aspx?n=0BF751F1B9F07AA1'),
  indigenousEmergency: source(
    '臺北市政府原住民族事務委員會：急難救助',
    'https://www.ipc.gov.taipei/News_Content.aspx?n=2DBBE88032DC396F&sms=7B2F217BCEC4F055&s=B0DBAE08DEC9EBB9',
  ),
  lowIncomeLiving: source('臺北市政府社會局：低收入戶生活補助', 'https://dosw.gov.taipei/cp.aspx?n=E6D700BD37E78592'),
  lowIncomeCertificate: source('臺北市政府社會局：低收入戶及中低收入戶證明', 'https://dosw.gov.taipei/cp.aspx?n=DCFF009DA428E8C0'),
  lowIncomeHealthInsurance: source('臺北市政府社會局：低收入戶健保費補助', 'https://dosw.gov.taipei/cp.aspx?n=EF289E2A67E2F007'),
  lowIncomeMedical: source('臺北市政府社會局：低收入戶市民醫療補助', 'https://dosw.gov.taipei/cp.aspx?n=D8645B7D5413343D'),
  middleLowIncome: source('臺北市政府社會局：中低收入戶服務', 'https://dosw.gov.taipei/cp.aspx?n=B75CE261826F1C11'),
} satisfies Record<string, SourceDef>
