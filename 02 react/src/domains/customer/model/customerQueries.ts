/** 거래처 TanStack Query 정의 (쿼리 키 + 조회 함수) */
import { queryOptions } from '@tanstack/react-query'
import { customerApi } from '../api/customerApi'

export const customerKeys = {
  all: ['customer'] as const,
  search: (keyword: string) => [...customerKeys.all, 'search', keyword] as const,
}

export const customerQueries = {
  search: (keyword: string) =>
    queryOptions({ queryKey: customerKeys.search(keyword), queryFn: () => customerApi.search(keyword) }),
}
