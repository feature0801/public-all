/**
 * 주문 TanStack Query 정의 (쿼리 키 + 조회 함수)
 * 저장/삭제 후 목록 갱신: queryClient.invalidateQueries({ queryKey: orderKeys.all })
 */
import { queryOptions } from '@tanstack/react-query'
import type { PageRequest } from '@/shared/ui/search-form'
import { orderApi, type OrderSearchParams } from '../api/orderApi'

export const orderKeys = {
  all: ['order'] as const,
  search: (params: OrderSearchParams & PageRequest) => [...orderKeys.all, 'search', params] as const,
}

export const orderQueries = {
  search: (params: OrderSearchParams & PageRequest) =>
    queryOptions({ queryKey: orderKeys.search(params), queryFn: () => orderApi.search(params) }),
}
