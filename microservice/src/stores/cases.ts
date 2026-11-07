// 交棒案件：長輩把一件事裡做不到的步驟交給子女，兩邊的進度透過伺服器同步。
//
// - 一件事一個案件：每個案件有自己的 caseId、存取權杖、金鑰；同一件事再交棒會沿用原本的案件。
// - 第一次見面用藍牙傳「交棒票」（caseId、權杖、金鑰），案件內容放在伺服器。
// - 合併規則：以每一步的更新時間較新者為準；打勾與取消打勾都會同步到另一支手機。
// - 目前上傳明文（format: 'plain'），階段 4 改成 AES-GCM 加密後只上傳密文。

import { computed, reactive, watch } from 'vue'
import type { StepDef } from '../data/types'
import { deleteCase, getCase, putCase, type CaseApiError } from '../services/caseApi'
import { clearMockHandoverTicket, type HandoverTicket } from '../services/townpass'
import { readJson, writeJson } from '../utils/storage'
import { isStepDone, setStepDone } from './progress'

export type CaseRole = 'elder' | 'family'
/** 這一步由誰辦：長輩自己，或交給家人 */
export type StepOwner = 'elder' | 'family'

export interface CaseStep {
  done: boolean
  owner: StepOwner
  /** 毫秒時間戳，合併時比較新舊 */
  updatedAt: number
}

/** 伺服器上同步的案件內容 */
export interface CaseDoc {
  v: 1
  eventId: string
  /** 長輩姓名，遮蔽中間的字，例如「金○森」；子女的清單用來辨認是誰交的 */
  elderName: string | null
  steps: Record<string, CaseStep>
}

/** 上傳到伺服器的格式；階段 4 會加上 { format: 'aes-gcm', iv, cipher } */
interface CasePayload {
  format: 'plain'
  doc: CaseDoc
}

/** 手機上記住的案件：交棒票加上最後一次同步到的內容 */
export interface CaseLink {
  role: CaseRole
  caseId: string
  token: string
  key: string
  eventId: string
  /** 伺服器上的版本號；0 代表還沒上傳成功 */
  version: number
  doc: CaseDoc | null
  /** 子女收到交棒的時間，清單依這個排序 */
  receivedAt: number
}

const CASES_KEY = 'life-events.cases.v1'
const MARKS_KEY = 'life-events.handover-marks.v1'

// 同一支手機可能同時是長輩（交出去）和子女（接收），用「角色:caseId」當 key 才不會互相覆蓋。
// 在電腦瀏覽器用兩個分頁測試兩個角色時，子女分頁要用 ?as=family 打開，否則整份寫回時會蓋掉長輩的案件（見 utils/storage.ts）
export const caseLinks = reactive<Record<string, CaseLink>>(readJson(CASES_KEY, {}))
watch(caseLinks, (value) => writeJson(CASES_KEY, value), { deep: true })

/** 長輩標記「交給家人」但還沒交出去的步驟：eventId → stepId[] */
export const handoverMarks = reactive<Record<string, string[]>>(readJson(MARKS_KEY, {}))
watch(handoverMarks, (value) => writeJson(MARKS_KEY, value), { deep: true })

function linkKey(role: CaseRole, caseId: string): string {
  return `${role}:${caseId}`
}

export function findLink(role: CaseRole, caseId: string): CaseLink | undefined {
  return caseLinks[linkKey(role, caseId)]
}

/** 長輩這件事的案件（一件事只有一個） */
/** 忘掉這筆交棒（本機）：長輩的連同這件事的「交給家人」標記一起清掉 */
export function forgetCase(link: CaseLink): void {
  delete caseLinks[linkKey(link.role, link.caseId)]
  if (link.role === 'elder') delete handoverMarks[link.eventId]
}

/**
 * 清除個人資料時一併刪掉所有交棒紀錄：伺服器上的案件（對方手機下次同步會發現已刪除）與這支手機的兩種角色。
 * 回傳沒能連上伺服器刪除的筆數（本機照樣清掉）。
 */
export async function deleteAllCases(): Promise<number> {
  let failed = 0
  for (const link of Object.values(caseLinks)) {
    if (link.version === 0) continue
    const result = await deleteCase(link.caseId, link.token)
    // 已經不在（notFound）或權杖不對（forbidden）都當作刪掉了
    if (!result.ok && result.kind !== 'notFound' && result.kind !== 'forbidden') failed += 1
  }
  for (const key of Object.keys(caseLinks)) delete caseLinks[key]
  for (const key of Object.keys(handoverMarks)) delete handoverMarks[key]
  clearMockHandoverTicket()
  return failed
}

/** 子女：同步每一筆收到的交棒，對方已經刪除的就從清單拿掉。回傳拿掉的筆數 */
export async function refreshFamilyCases(): Promise<number> {
  let removed = 0
  for (const link of Object.values(caseLinks).filter((item) => item.role === 'family')) {
    const error = await refreshCase(link)
    if (error?.kind === 'notFound') {
      forgetCase(link)
      removed += 1
    }
  }
  return removed
}

export function elderCaseFor(eventId: string): CaseLink | undefined {
  return Object.values(caseLinks).find((link) => link.role === 'elder' && link.eventId === eventId)
}

/** 家人交給我的事，最新收到的排前面 */
export const familyCases = computed(() =>
  Object.values(caseLinks)
    .filter((link) => link.role === 'family')
    .sort((a, b) => b.receivedAt - a.receivedAt),
)

export function ticketOf(link: CaseLink): HandoverTicket {
  return { v: 1, caseId: link.caseId, token: link.token, key: link.key }
}

function randomBase64Url(bytes: number): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes))
  let binary = ''
  values.forEach((value) => (binary += String.fromCharCode(value)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 「金大森」→「金○森」、「王明」→「王○」 */
export function maskName(name: string | undefined | null): string | null {
  const chars = [...(name ?? '').trim()]
  if (chars.length === 0) return null
  if (chars.length === 1) return chars[0]
  if (chars.length === 2) return `${chars[0]}○`
  return `${chars[0]}${'○'.repeat(chars.length - 2)}${chars[chars.length - 1]}`
}

// ---------------- 長輩：標記要交給家人的步驟 ----------------

export function isMarked(eventId: string, stepId: string): boolean {
  return handoverMarks[eventId]?.includes(stepId) ?? false
}

export function toggleMark(eventId: string, stepId: string): void {
  const current = handoverMarks[eventId] ?? []
  handoverMarks[eventId] = current.includes(stepId) ? current.filter((id) => id !== stepId) : [...current, stepId]
}

/** 已經交給家人（伺服器上 owner 是 family）的步驟 */
export function isHandedOver(eventId: string, stepId: string): boolean {
  return elderCaseFor(eventId)?.doc?.steps[stepId]?.owner === 'family'
}

/** 標記和已交出去的不一樣（新增或取消了交棒的步驟），要再交棒一次才會生效 */
export function hasPendingHandover(eventId: string, steps: readonly StepDef[]): boolean {
  const doc = elderCaseFor(eventId)?.doc
  return steps.some((step) => isMarked(eventId, step.id) !== (doc?.steps[step.id]?.owner === 'family'))
}

// ---------------- 合併 ----------------

function mergeStep(a: CaseStep | undefined, b: CaseStep | undefined): CaseStep | undefined {
  if (!a) return b
  if (!b) return a
  // 以最後一次修改為準（打勾或取消都算）
  return b.updatedAt > a.updatedAt ? b : a
}

/** 合併兩份案件內容；兩邊各自改過的步驟都保留 */
export function mergeDocs(a: CaseDoc, b: CaseDoc): CaseDoc {
  const steps: Record<string, CaseStep> = {}
  for (const id of new Set([...Object.keys(a.steps), ...Object.keys(b.steps)])) {
    const merged = mergeStep(a.steps[id], b.steps[id])
    if (merged) steps[id] = merged
  }
  return { v: 1, eventId: a.eventId, elderName: a.elderName ?? b.elderName, steps }
}

function docFromPayload(data: unknown): CaseDoc | null {
  const payload = data as Partial<CasePayload> | null
  if (payload?.format !== 'plain' || payload.doc?.v !== 1) return null
  return payload.doc
}

function toPayload(doc: CaseDoc): CasePayload {
  return { format: 'plain', doc }
}

// ---------------- 與伺服器同步 ----------------

export type SyncError = CaseApiError | { kind: 'invalid' }

/** 下載伺服器上的最新版並和手上的合併 */
export async function refreshCase(link: CaseLink): Promise<SyncError | null> {
  const result = await getCase<unknown>(link.caseId, link.token)
  if (!result.ok) return result
  const serverDoc = docFromPayload(result.value.data)
  if (!serverDoc) return { kind: 'invalid' }
  link.doc = link.doc ? mergeDocs(serverDoc, link.doc) : serverDoc
  link.version = result.value.version
  return null
}

/** 上傳；版本衝突時下載最新版、合併、再上傳，最多試 3 次 */
async function pushDoc(link: CaseLink, doc: CaseDoc): Promise<SyncError | null> {
  let candidate = doc
  let baseVersion = link.version
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await putCase(link.caseId, link.token, baseVersion, toPayload(candidate))
    if (result.ok) {
      link.version = result.value.version
      link.doc = candidate
      return null
    }
    if (result.kind !== 'conflict') return result
    const latest = await getCase<unknown>(link.caseId, link.token)
    if (!latest.ok) return latest
    const serverDoc = docFromPayload(latest.value.data)
    if (!serverDoc) return { kind: 'invalid' }
    candidate = mergeDocs(candidate, serverDoc)
    baseVersion = latest.value.version
  }
  return { kind: 'conflict', version: baseVersion }
}

// ---------------- 長輩：建立／更新案件 ----------------

/** 依本機進度與交棒標記組出案件內容；沒變的步驟沿用原本的更新時間 */
function buildElderDoc(eventId: string, steps: readonly StepDef[], previous: CaseDoc | null, elderName: string | null): CaseDoc {
  const now = Date.now()
  const docSteps: Record<string, CaseStep> = {}
  for (const step of steps) {
    const prev = previous?.steps[step.id]
    // 長輩手機上的打勾已經先和伺服器同步過（applyDoneToProgress），和上次不同就是長輩剛改的
    const done = isStepDone(eventId, step.id)
    const owner: StepOwner = isMarked(eventId, step.id) ? 'family' : 'elder'
    docSteps[step.id] = prev && prev.done === done && prev.owner === owner ? prev : { done, owner, updatedAt: now }
  }
  return { v: 1, eventId, elderName: elderName ?? previous?.elderName ?? null, steps: docSteps }
}

/** 伺服器上的進度同步回長輩自己的打勾：家人打勾或取消都跟著改 */
export function applyDoneToProgress(link: CaseLink): void {
  for (const [stepId, step] of Object.entries(link.doc?.steps ?? {})) {
    if (step.done !== isStepDone(link.eventId, stepId)) setStepDone(link.eventId, stepId, step.done)
  }
}

/**
 * 交棒：建立或更新這件事的案件並上傳。同一件事再交棒會沿用原本的 caseId、權杖、金鑰。
 * 回傳案件與錯誤（null 代表上傳成功）。
 */
export async function handOver(
  eventId: string,
  steps: readonly StepDef[],
  elderName: string | null,
): Promise<{ link: CaseLink; error: SyncError | null }> {
  let link = elderCaseFor(eventId)
  if (link && link.version > 0) {
    // 先拿到家人最新的進度並同步到這支手機，免得蓋掉；家人已經刪除這筆交棒的話，重新建一筆
    const error = await refreshCase(link)
    if (error?.kind === 'notFound') {
      forgetCase(link)
      link = undefined
    } else if (error) {
      return { link, error }
    } else {
      applyDoneToProgress(link)
    }
  }
  if (!link) {
    const caseId = randomBase64Url(16)
    caseLinks[linkKey('elder', caseId)] = {
      role: 'elder',
      caseId,
      token: randomBase64Url(32),
      key: randomBase64Url(32),
      eventId,
      version: 0,
      doc: null,
      receivedAt: Date.now(),
    }
    // 取回 reactive 版本，之後的修改才會存進 localStorage
    link = caseLinks[linkKey('elder', caseId)]
  }
  const error = await pushDoc(link, buildElderDoc(eventId, steps, link.doc, elderName))
  return { link, error }
}

/** 長輩重新打開這件事時，取回家人的最新進度 */
export async function refreshElderCase(eventId: string): Promise<SyncError | null> {
  const link = elderCaseFor(eventId)
  if (!link || link.version === 0) return null
  const error = await refreshCase(link)
  // 家人已經刪除這筆交棒：這支手機的交棒紀錄與標記也一起清掉
  if (error?.kind === 'notFound') forgetCase(link)
  // 只同步打勾；交棒標記不跟著伺服器改，長輩還沒交出去的標記才不會被蓋掉
  if (!error) applyDoneToProgress(link)
  return error
}

/** 長輩在已交棒的事件上打勾，同步給家人 */
export async function pushElderProgress(eventId: string, steps: readonly StepDef[]): Promise<SyncError | null> {
  const link = elderCaseFor(eventId)
  if (!link || link.version === 0 || !link.doc) return null
  // 交棒標記要再交棒一次才生效，這裡只同步打勾：沿用伺服器上的 owner
  const doc = buildElderDoc(eventId, steps, link.doc, null)
  for (const [stepId, step] of Object.entries(doc.steps)) {
    const owner = link.doc.steps[stepId]?.owner
    if (owner && owner !== step.owner) doc.steps[stepId] = link.doc.steps[stepId]
  }
  const error = await pushDoc(link, doc)
  // 家人已經刪除這筆交棒：這支手機的交棒紀錄與標記也一起清掉
  if (error?.kind === 'notFound') forgetCase(link)
  return error
}

// ---------------- 子女：接收交棒 ----------------

/** 收到交棒票：記住案件並下載內容。下載失敗時不留下這筆案件 */
export async function acceptTicket(ticket: HandoverTicket): Promise<{ link: CaseLink | null; error: SyncError | null }> {
  const key = linkKey('family', ticket.caseId)
  const existing = caseLinks[key]
  const draft: CaseLink = {
    role: 'family',
    caseId: ticket.caseId,
    token: ticket.token,
    key: ticket.key,
    eventId: existing?.eventId ?? '',
    version: existing?.version ?? 0,
    doc: existing?.doc ?? null,
    receivedAt: Date.now(),
  }
  const error = await refreshCase(draft)
  if (error || !draft.doc) return { link: null, error: error ?? { kind: 'invalid' } }
  draft.eventId = draft.doc.eventId
  caseLinks[key] = draft
  return { link: caseLinks[key], error: null }
}

/** 子女把交給自己的一步標成已辦好，或取消打勾 */
export async function setFamilyStepDone(link: CaseLink, stepId: string, done: boolean): Promise<SyncError | null> {
  if (!link.doc) return { kind: 'invalid' }
  const prev = link.doc.steps[stepId]
  if (!prev || prev.done === done) return null
  const doc: CaseDoc = {
    ...link.doc,
    steps: { ...link.doc.steps, [stepId]: { ...prev, done, updatedAt: Date.now() } },
  }
  // 先更新畫面，上傳失敗再提示；下次同步時會合併上去
  link.doc = doc
  return pushDoc(link, doc)
}

/** 錯誤訊息，給畫面顯示 */
export function syncErrorMessage(error: SyncError): string {
  switch (error.kind) {
    case 'network':
      return '連不上伺服器，請確認網路後再試一次。'
    case 'notFound':
      return '這筆交棒已經刪除了（對方清除了資料，或伺服器重新啟動過），這支手機上的紀錄也一併拿掉'
    case 'forbidden':
      return '交棒資料不正確，請長輩再交棒一次。'
    case 'conflict':
      return '家人剛好也在更新，請再試一次。'
    case 'invalid':
      return '收到的資料格式不正確，請長輩再交棒一次。'
    default:
      return '伺服器發生問題，請稍後再試。'
  }
}
