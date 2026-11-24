import { useCallback, useEffect, useMemo } from 'react'
import type { CommonCode } from './commonCode'
import { useCommonCodeStore } from './commonCodeStore'

const EMPTY: CommonCode[] = []

interface UseCommonCodesOptions {
  /** 사용 안 함(useYn='N') 코드도 포함. 기본 false */
  includeUnused?: boolean
}

/**
 * 컴포넌트에서 공통코드를 사용하는 훅.
 * 마운트 시 자동 조회(캐시 있으면 생략)하고, 해당 그룹이 바뀔 때만 리렌더링된다.
 *
 * @example
 * const { codes, loading } = useCommonCodes(CODE_GROUP.USER_STATUS)
 */
export function useCommonCodes(groupCode: string, options: UseCommonCodesOptions = {}) {
  // selector 로 필요한 값만 구독 → 다른 그룹이 바뀌어도 리렌더링되지 않음
  const all = useCommonCodeStore((s) => s.codes[groupCode] ?? EMPTY)
  const status = useCommonCodeStore((s) => s.status[groupCode] ?? 'idle')
  const loadCodes = useCommonCodeStore((s) => s.loadCodes)

  useEffect(() => {
    // 빈 그룹('')이면 조회하지 않음 — 공통코드/고정옵션 겸용 컴포넌트에서 사용
    if (groupCode) void loadCodes([groupCode])
  }, [groupCode, loadCodes])

  const codes = useMemo(
    () => (options.includeUnused ? all : all.filter((c) => c.useYn === 'Y')),
    [all, options.includeUnused],
  )

  /** 코드 → 표시명 */
  const getName = useCallback(
    (code: string | null | undefined, fallback?: string) =>
      code == null || code === '' ? (fallback ?? '') : (all.find((c) => c.code === code)?.name ?? fallback ?? code),
    [all],
  )

  return { codes, loading: status === 'loading', error: status === 'error', status, getName }
}

/**
 * 화면 진입 시 여러 그룹을 한 번에 미리 조회 (선택).
 * 하위 컴포넌트들이 각자 useCommonCodes 를 써도 자동으로 묶이므로 필수는 아니다.
 */
export function usePrefetchCommonCodes(groupCodes: string[]) {
  const loadCodes = useCommonCodeStore((s) => s.loadCodes)
  const key = groupCodes.join(',')
  useEffect(() => {
    void loadCodes(key.split(','))
  }, [key, loadCodes])
}
