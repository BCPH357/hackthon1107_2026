// 事件與類別的圖示。
// icon_*.svg 直接複製自 TownPass 的 assets/svg（來自城市通 Figma UI Kit），維持與 App 相同的風格；
// custom_*.svg 是 UI Kit 沒有的概念，依同樣的規格自行繪製：24×24、線寬 2、圓角端點、
// 深灰 #434344 搭配主色 #2EB6C7。

import customBriefcase from '../assets/icons/custom_briefcase.svg'
import customCareHeart from '../assets/icons/custom_care_heart.svg'
import customElder from '../assets/icons/custom_elder.svg'
import customLotus from '../assets/icons/custom_lotus.svg'
import customStroller from '../assets/icons/custom_stroller.svg'
import customWheelchair from '../assets/icons/custom_wheelchair.svg'
import icon113 from '../assets/icons/icon_113.svg'
import iconBillCar from '../assets/icons/icon_bill_car.svg'
import iconBillHospital from '../assets/icons/icon_bill_hospital.svg'
import iconBillHousingMaintenance from '../assets/icons/icon_bill_housing_maintenance.svg'
import iconBillPublicHousing from '../assets/icons/icon_bill_public_housing.svg'
import iconCalender from '../assets/icons/icon_calender.svg'
import iconCaseSearch from '../assets/icons/icon_case_search.svg'
import iconCouponTicket from '../assets/icons/icon_coupon_ticket.svg'
import iconCrowdDensity from '../assets/icons/icon_crowd_density.svg'
import iconFamilyCenter from '../assets/icons/icon_family_center.svg'
import iconIdCard from '../assets/icons/icon_id_card.svg'
import iconPerson from '../assets/icons/icon_person.svg'
import iconProtect from '../assets/icons/icon_protect.svg'
import iconTabbarAccount from '../assets/icons/icon_tabbar_account_default.svg'
import iconTabbarCard from '../assets/icons/icon_tabbar_card_default.svg'
import iconTabbarHome from '../assets/icons/icon_tabbar_home_default.svg'
import iconTalk from '../assets/icons/icon_talk.svg'

export const ICONS = {
  briefcase: customBriefcase,
  careHeart: customCareHeart,
  elder: customElder,
  lotus: customLotus,
  stroller: customStroller,
  wheelchair: customWheelchair,
  protectionHotline: icon113,
  parking: iconBillCar,
  hospital: iconBillHospital,
  house: iconBillHousingMaintenance,
  publicHousing: iconBillPublicHousing,
  calendar: iconCalender,
  document: iconCaseSearch,
  wallet: iconCouponTicket,
  group: iconCrowdDensity,
  family: iconFamilyCenter,
  idCard: iconIdCard,
  person: iconPerson,
  shield: iconProtect,
  money: iconTabbarAccount,
  card: iconTabbarCard,
  home: iconTabbarHome,
  talk: iconTalk,
} as const

export type IconKey = keyof typeof ICONS
