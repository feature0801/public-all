/**
 * 공통코드 스토어 (zustand)
 *
 * - 그룹 단위로 캐시 (TTL 30분), sessionStorage 에 persist → 새로고침해도 재조회 안 함
 * - 같은 tick 에 여러 컴포넌트가 요청한 그룹은 API 1회로 묶어서 조회 (batch)
 * - 이미 조회 중인 그룹은 중복 요청하지 않음 (in-flight dedupe)
 * - React 밖(유틸, 그리드 formatter 등)에서는 getCodeName / getCodes 사용
 */
import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'
import { commonCodeApi } from '@/api/commonCodeApi'
import type { CommonCode, CommonCodeMap } from '@/shared/types/commonCode'

/** 캐시 유지 시간 */
const CACHE_TTL_MS = 30 * 60 * 1000

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error'

interface CommonCodeState {
  /* ---------- state ---------- */
  /** groupCode → 코드 목록 */
  codes: CommonCodeMap
  /** groupCode → 조회 시각 (TTL 판단용) */
  loadedAt: Record<string, number>
  /** groupCode → 조회 상태 */
  status: Record<string, LoadStatus>
  /** 마지막 에러 메시지 */
  error: string | null

  /* ---------- actions ---------- */
  /** 그룹 코드 조회. 캐시가 유효하면 API 를 호출하지 않는다. force=true 면 무조건 재조회 */
  loadCodes: (groupCodes: string[], options?: { force?: boolean }) => Promise<void>
  /** 캐시 초기화 (전체 또는 특정 그룹) */
  clear: (groupCodes?: string[]) => void
}

/* ------------------------------------------------------------------ */
/* 요청 묶기 / 중복 제거 (state 가 아니므로 스토어 밖 모듈 변수로 관리)       */
/* ------------------------------------------------------------------ */

/** 조회 중인 그룹 → 해당 요청 Promise */
const inflight = new Map<string, Promise<void>>()
/** 이번 tick 에 모인 그룹 */
const batchQueue = new Set<string>()
let batchPromise: Promise<void> | null = null

const isFresh = (loadedAt: number | undefined) => !!loadedAt && Date.now() - loadedAt < CACHE_TTL_MS

export const useCommonCodeStore = create<CommonCodeState>()(
  devtools(
    persist(
      (set, get) => {
        /** 실제 API 호출 + state 반영 */
        const fetchGroups = async (groups: string[]) => {
          try {
            const result = await commonCodeApi.getCodes(groups)
            const now = Date.now()
            set(
              (s) => ({
                codes: { ...s.codes, ...result },
                loadedAt: { ...s.loadedAt, ...Object.fromEntries(groups.map((g) => [g, now])) },
                status: { ...s.status, ...Object.fromEntries(groups.map((g) => [g, 'success' as const])) },
                error: null,
              }),
              false,
              'commonCode/loadCodes/success',
            )
          } catch (e) {
            set(
              (s) => ({
                status: { ...s.status, ...Object.fromEntries(groups.map((g) => [g, 'error' as const])) },
                error: e instanceof Error ? e.message : String(e),
              }),
              false,
              'commonCode/loadCodes/error',
            )
          }
        }

        /** 같은 tick 의 요청을 모아서 한 번에 조회 */
        const enqueue = (groups: string[]): Promise<void> => {
          groups.forEach((g) => batchQueue.add(g))
          if (!batchPromise) {
            batchPromise = Promise.resolve().then(() => {
              const targets = [...batchQueue]
              batchQueue.clear()
              batchPromise = null
              return fetchGroups(targets)
            })
          }
          return batchPromise
        }

        return {
          codes: {},
          loadedAt: {},
          status: {},
          error: null,

          loadCodes: (groupCodes, options = {}) => {
            const { loadedAt } = get()
            const waits: Promise<void>[] = []
            const targets: string[] = []

            new Set(groupCodes).forEach((g) => {
              const running = inflight.get(g)
              if (running) waits.push(running)
              else if (options.force || !isFresh(loadedAt[g])) targets.push(g)
            })

            if (targets.length > 0) {
              set(
                (s) => ({ status: { ...s.status, ...Object.fromEntries(targets.map((g) => [g, 'loading' as const])) } }),
                false,
                'commonCode/loadCodes/start',
              )
              const p = enqueue(targets).finally(() => targets.forEach((g) => inflight.delete(g)))
              targets.forEach((g) => inflight.set(g, p))
              waits.push(p)
            }

            return Promise.all(waits).then(() => undefined)
          },

          clear: (groupCodes) => {
            if (!groupCodes) {
              set({ codes: {}, loadedAt: {}, status: {}, error: null }, false, 'commonCode/clear')
              return
            }
            set(
              (s) => {
                const omit = <V>(obj: Record<string, V>) =>
                  Object.fromEntries(Object.entries(obj).filter(([k]) => !groupCodes.includes(k)))
                return { codes: omit(s.codes), loadedAt: omit(s.loadedAt), status: omit(s.status) }
              },
              false,
              'commonCode/clear',
            )
          },
        }
      },
      {
        name: 'common-code',
        storage: createJSONStorage(() => sessionStorage),
        // 조회 상태(status/error)는 저장하지 않음
        partialize: (s) => ({ codes: s.codes, loadedAt: s.loadedAt }),
        version: 1,
      },
    ),
    { name: 'commonCode', enabled: import.meta.env.DEV },
  ),
)

/* ------------------------------------------------------------------ */
/* React 밖에서 사용하는 헬퍼                                            */
/* ------------------------------------------------------------------ */

/** 캐시된 코드 목록 (조회 전이면 빈 배열) */
export function getCodes(groupCode: string): CommonCode[] {
  return useCommonCodeStore.getState().codes[groupCode] ?? []
}

/** 코드 → 표시명. 없으면 fallback (기본: 코드 값 그대로) */
export function getCodeName(groupCode: string, code: string | null | undefined, fallback?: string): string {
  if (code == null || code === '') return fallback ?? ''
  return getCodes(groupCode).find((c) => c.code === code)?.name ?? fallback ?? code
}

/** 앱 시작 시 자주 쓰는 그룹을 미리 조회할 때 사용 (예: main.tsx, 로그인 직후) */
export function preloadCommonCodes(groupCodes: string[]): Promise<void> {
  return useCommonCodeStore.getState().loadCodes(groupCodes)
}
