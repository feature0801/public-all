/**
 * 더미 API 공통 유틸
 * - 네트워크 지연 흉내 (delay)
 * - 응답을 복사해서 반환 (실제 네트워크처럼 원본 데이터가 오염되지 않도록)
 * - 호출 로그 구독 (샘플 화면에서 "실제로 API 가 몇 번 호출됐는지" 확인용)
 * - 다음 요청 실패시키기 (에러 처리 테스트용)
 */
import { ApiError } from '@/shared/api'

export interface MockApiLog {
  id: number
  api: string
  params: unknown
  ok: boolean
  ms: number
  at: Date
}

type Listener = (log: MockApiLog) => void

const listeners = new Set<Listener>()
let seq = 0

export const mockConfig = {
  /** 응답 지연(ms) */
  delay: 600,
  /** true 이면 다음 1회 요청을 실패시킴 */
  failNext: false,
}

/** mock API 호출 로그 구독. 반환값은 구독 해제 함수 */
export function onMockApiCall(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * mock 응답 생성
 * @example
 * return mockResponse('GET /common-codes', { groups }, () => pick(groups))
 */
export async function mockResponse<T>(api: string, params: unknown, producer: () => T): Promise<T> {
  const started = Date.now()
  await sleep(mockConfig.delay)

  const fail = mockConfig.failNext
  mockConfig.failNext = false

  const emit = (ok: boolean) => {
    const log: MockApiLog = { id: ++seq, api, params, ok, ms: Date.now() - started, at: new Date() }
    listeners.forEach((l) => l(log))
  }

  if (fail) {
    emit(false)
    throw new ApiError(500, `[mock] ${api} 요청 실패 (테스트용)`)
  }
  try {
    const result = structuredClone(producer())
    emit(true)
    return result
  } catch (e) {
    // producer 안에서 throw new ApiError(400, ...) 로 서버 검증 오류를 흉내낼 수 있음
    emit(false)
    throw e
  }
}
