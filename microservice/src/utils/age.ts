/** 由「1988/12/12」或「1988-12-12」格式的生日算出足歲 */
export function ageFromBirthday(birthday: string | undefined, today: Date = new Date()): number | null {
  if (!birthday) return null
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(birthday.trim())
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  let age = today.getFullYear() - year
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)
  if (beforeBirthday) age -= 1
  return age >= 0 && age <= 130 ? age : null
}
