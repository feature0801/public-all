/**
 * 그리드 조회 공통 훅 (서버 페이징 / 서버 정렬) — TanStack Query 기반
 *
 * - 검색조건 파라미터 + page/size/sort 를 합친 "요청" 이 곧 쿼리 키 → 요청이 바뀌면 자동 조회
 * - 페이지/정렬 변경 시 "마지막으로 조회한 검색조건" 으로 재조회
 *   (사용자가 조건을 바꾸고 조회를 안 누른 상태에서 페이지를 넘겨도 이전 조건 유지 — ERP 기본 동작)
 * - 조회 버튼은 같은 조건이어도 항상 새로 조회, 페이지 왕복은 캐시(staleTime) 사용
 * - 페이지 이동 중에는 이전 행을 유지 (keepPreviousData)
 * - 늦게 도착한 이전 응답은 쿼리 키가 달라서 자동으로 무시된다
 *
 * @example
 * const grid = useGridSearch(orderQueries.search, { pageSize: 20 })
 */
import {
  keepPreviousData,
  skipToken,
  useQuery,
  useQueryClient,
  type QueryFunction,
  type QueryKey,
} from '@tanstack/react-query'
import { useState } from 'react'

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

/** 도메인의 {domain}Queries.search 처럼 요청 → { queryKey, queryFn } 을 만드는 함수 */
type GridQuery<TParams, TRow> = (request: TParams & PageRequest) => {
  queryKey: QueryKey
  // 키 타입을 any 로 둬야 도메인 쿼리의 구체적인 키 타입(readonly ['order', 'search', ...])을 그대로 받을 수 있다
  queryFn?: QueryFunction<PageResult<TRow>, any>
}

export function useGridSearch<TParams extends object, TRow>(
  query: GridQuery<TParams, TRow>,
  options: { pageSize?: number } = {},
) {
  const queryClient = useQueryClient()
  /** 마지막으로 조회한 전체 요청 (조회 전이면 null) */
  const [request, setRequest] = useState<(TParams & PageRequest) | null>(null)
  const paging: PageRequest = request
    ? { page: request.page, size: request.size, sort: request.sort }
    : { page: 1, size: options.pageSize ?? 20 }

  const result = useQuery({
    ...(request ? query(request) : { queryKey: ['grid-search', 'idle'], queryFn: skipToken }),
    placeholderData: keepPreviousData,
  })

  const toRequest = (params: TParams, next: PageRequest) => {
    const req = { ...params, ...next }
    if (!req.sort) delete req.sort
    return req
  }

  /**
   * 새 검색조건으로 조회 (1페이지부터).
   * 반환 Promise 는 실패 시 reject → useSearchForm 이 서버 필드 오류를 화면에 표시할 수 있다.
   */
  const search = async (params: TParams) => {
    const req = toRequest(params, { ...paging, page: 1 })
    setRequest(req)
    // staleTime: 0 → 같은 조건으로 다시 눌러도 새로 조회. useQuery 와 같은 키라 요청은 1번만 나간다
    await queryClient.fetchQuery({ ...query(req), staleTime: 0 })
  }

  /** 이전 검색조건으로 페이지/정렬/사이즈만 바꿔 재조회 */
  const reload = (change: Partial<PageRequest>) => {
    if (!request) return
    const next = { ...paging, ...change }
    // 정렬/사이즈가 바뀌면 1페이지로
    if (change.sort !== undefined || change.size !== undefined) next.page = change.page ?? 1
    setRequest(toRequest(request, next))
  }

  return {
    rows: result.data?.items ?? [],
    total: result.data?.total ?? 0,
    loading: result.isFetching,
    error: result.error ? result.error.message : null,
    paging,
    lastRequest: request,
    search,
    goPage: (page: number) => reload({ page }),
    changeSize: (size: number) => reload({ size }),
    changeSort: (sort: string | undefined) => reload({ sort: sort ?? '' }),
  }
}
