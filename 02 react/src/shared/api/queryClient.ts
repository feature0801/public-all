/**
 * TanStack Query 클라이언트 (앱 전체에서 1개)
 *
 * 역할 분담
 * - TanStack Query : 검색조건으로 조회하는 목록 등 "조회할 때마다 달라지는 서버 데이터"
 * - zustand        : 공통코드처럼 앱 전체가 공유하는 기준 데이터, 클라이언트 상태
 *
 * React 밖(저장 후 목록 갱신 등)에서는 이 인스턴스로 queryClient.invalidateQueries(...) 를 호출한다.
 */
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './http'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 같은 조건을 30초 안에 다시 보면(페이지 왕복 등) 캐시 사용. 조회 버튼은 항상 새로 조회한다 (useGridSearch)
      staleTime: 30_000,
      // 팝업을 열고 닫을 때마다 부모 창 focus 가 바뀌므로, focus 시 자동 재조회는 끈다
      refetchOnWindowFocus: false,
      // 4xx(검증 오류 등)는 재시도해도 같으므로 바로 실패, 네트워크/5xx 만 1회 재시도
      retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 1,
    },
  },
})
