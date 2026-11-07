import type { WhereDef } from '../data/types'

/** 知道使用者住哪一區時，把「戶籍所在地的區公所」換成「中山區公所」這種具體地點 */
export function resolveWhere(where: WhereDef, district: string | null): WhereDef {
  if (!district || !where.districtName) return where
  return {
    ...where,
    name: where.districtName.replace('{district}', district),
    mapQuery: where.districtMapQuery?.replace('{district}', district) ?? where.mapQuery,
  }
}
