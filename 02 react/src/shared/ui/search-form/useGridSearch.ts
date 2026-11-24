/**
 * 그리드 조회 공통 훅 (서버 페이징 / 서버 정렬)
 *
 * - 검색조건 파라미터 + page/size/sort 를 합쳐서 fetcher 호출
 * - 페이지/정렬 변경 시 "마지막으로 조회한 검색조건" 으로 재조회
 *   (사용자가 조건을 바꾸고 조회를 안 누른 상태에서 페이지를 넘겨도 이전 조건 유지 — ERP 기본 동작)
 * - 늦게 도착한 이전 응답은 무시 (race condition 방지)
 */
import { useCallback, useRef, useState } from 'react'

export interface PageRequest {
  page: number // 1부터
  size: number
  /** 'field,asc' | 'field,desc' */
  sort?: string
}

export interface PageResult<T> {
  items: T[]
  total: number
}

export function useGridSearch<TParams extends object, TRow>(
  fetcher: (params: TParams & PageRequest) => Promise<PageResult<TRow>>,
  options: { pageSize?: number } = {},
) {
  const [rows, setRows] = useState<TRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paging, setPaging] = useState<PageRequest>({ page: 1, size: options.pageSize ?? 20 })
  /** 마지막으로 실제 조회한 전체 요청 (화면 확인용) */
  const [lastRequest, setLastRequest] = useState<(TParams & PageRequest) | null>(null)

  const paramsRef = useRef<TParams | null>(null)
  const pagingRef = useRef(paging)
  const requestSeq = useRef(0)

  const run = useCallback(
    async (params: TParams, nextPaging: PageRequest) => {
      const seq = ++requestSeq.current
      paramsRef.current = params
      pagingRef.current = nextPaging
      setPaging(nextPaging)

      const request = { ...params, ...nextPaging }
      if (!request.sort) delete request.sort
      setLastRequest(request)
      setLoading(true)
      setError(null)
      try {
        const res = await fetcher(request)
        if (seq !== requestSeq.current) return
        setRows(res.items)
        setTotal(res.total)
      } catch (e) {
        if (seq !== requestSeq.current) return
        setRows([])
        setTotal(0)
        setError(e instanceof Error ? e.message : String(e))
        throw e // 호출한 쪽(useSearchForm)에서 서버 필드 오류 처리할 수 있도록
      } finally {
        if (seq === requestSeq.current) setLoading(false)
      }
    },
    [fetcher],
  )

  /** 새 검색조건으로 조회 (1페이지부터) */
  const search = useCallback(
    (params: TParams) => run(params, { ...pagingRef.current, page: 1 }),
    [run],
  )

  /** 이전 검색조건으로 페이지/정렬/사이즈만 바꿔 재조회 */
  const reload = useCallback(
    (change: Partial<PageRequest>) => {
      if (!paramsRef.current) return
      const next = { ...pagingRef.current, ...change }
      // 정렬/사이즈가 바뀌면 1페이지로
      if (change.sort !== undefined || change.size !== undefined) next.page = change.page ?? 1
      run(paramsRef.current, next).catch(() => {})
    },
    [run],
  )

  return {
    rows,
    total,
    loading,
    error,
    paging,
    lastRequest,
    search,
    goPage: (page: number) => reload({ page }),
    changeSize: (size: number) => reload({ size }),
    changeSort: (sort: string | undefined) => reload({ sort: sort ?? '' }),
  }
}
