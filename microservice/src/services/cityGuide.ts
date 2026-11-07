type BridgeReply = { id: string; type?: string; choice?: number | null; model?: string | null; voice?: boolean; text?: string | null; error?: string }

function request(
  name: string,
  data: Record<string, unknown>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<BridgeReply | null> {
  const bridge = window.flutterObject
  if (!bridge || location.hostname !== '127.0.0.1' || location.port !== '43862' || signal?.aborted) {
    return Promise.resolve(null)
  }
  const id = crypto.randomUUID()
  return new Promise((resolve) => {
    function finish(value: BridgeReply | null): void {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
      bridge!.removeEventListener('message', onMessage)
      resolve(value)
    }
    function cancel(): void {
      finish(null)
      const cancelName = name === 'llm_ask' ? 'llm_cancel' : name === 'city_voice' ? 'city_voice_cancel' : null
      if (cancelName) bridge!.postMessage(JSON.stringify({ name: cancelName, data: { id } }))
    }
    function onMessage(event: MessageEvent<string>): void {
      try {
        const reply = JSON.parse(event.data) as { name?: string; data?: BridgeReply }
        if (reply.name === name && reply.data?.id === id && reply.data.type !== 'working') finish(reply.data)
      } catch {
        // 其他頁面訊息不屬於這次請求。
      }
    }
    const timer = window.setTimeout(cancel, timeoutMs)
    signal?.addEventListener('abort', cancel, { once: true })
    bridge.addEventListener('message', onMessage)
    bridge.postMessage(JSON.stringify({ name, data: { id, ...data } }))
  })
}

export const cityGuideStatus = () => request('llm_status', {}, 3000)
export const askCityGuide = (question: string, choices: string[], signal: AbortSignal) =>
  request('llm_ask', { question, choices }, 25_000, signal)
export const listenToCityGuide = (signal: AbortSignal) => request('city_voice', {}, 45_000, signal)
