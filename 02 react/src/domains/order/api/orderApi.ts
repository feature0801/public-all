/**
 * 주문 API
 * 파라미터/응답 필드명은 백엔드(ERP) 명명 규칙을 그대로 따른다고 가정 (ordNo, custCd, fromDt ...)
 * → 화면 폼 필드명과 다를 수 있으며, 변환은 페이지의 toParams 에서 한다.
 */
import { mockSearchOrders } from '@/mocks/orderMock'
import { http, USE_MOCK } from '@/shared/api'
import type { PageRequest, PageResult } from '@/shared/ui/search-form'

export interface Order {
  ordNo: string
  /** YYYYMMDD */
  ordDt: string
  payDt: string | null
  shipDt: string | null
  custCd: string
  custNm: string
  bizRegNo: string
  deptCd: string
  ordStatCd: string
  payMthdCd: string
  ordAmt: number
  mgrNm: string
  itemNm: string
}

/** 주문 조회 API 파라미터 (값이 없으면 키 자체를 보내지 않음) */
export interface OrderSearchParams {
  /** 기간 기준 */
  dateType?: 'ORD_DT' | 'PAY_DT' | 'SHIP_DT'
  /** YYYYMMDD */
  fromDt?: string
  toDt?: string
  ordNo?: string
  custCd?: string
  /** 콤마 구분 (ORDERED,PAID) */
  ordStatCds?: string
  deptCd?: string
  payMthdCd?: string
  minAmt?: number
  maxAmt?: number
  /** 숫자 10자리 */
  bizRegNo?: string
  mgrNm?: string
  /** 취소건 포함 */
  inclCnclYn: 'Y' | 'N'
}

export const orderApi = {
  /** GET /orders?fromDt=...&page=1&size=20&sort=ordDt,desc */
  search(params: OrderSearchParams & PageRequest): Promise<PageResult<Order>> {
    if (USE_MOCK) return mockSearchOrders(params)
    return http.get<PageResult<Order>>('/orders', { ...params })
  },
}
