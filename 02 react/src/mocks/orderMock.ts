/**
 * GET /orders 더미 구현 — 실제 서버처럼 필터 / 정렬 / 페이징 / 서버 검증을 수행
 */
import type { Order, OrderSearchParams } from '@/api/orderApi'
import { ApiError } from '@/shared/api/http'
import type { PageRequest, PageResult } from '@/shared/search'
import { CUSTOMERS } from './data/customers'
import { ORDERS } from './data/orders'
import { mockResponse } from './mockUtils'

const DATE_FIELD = { ORD_DT: 'ordDt', PAY_DT: 'payDt', SHIP_DT: 'shipDt' } as const

export function mockSearchOrders(params: OrderSearchParams & PageRequest): Promise<PageResult<Order>> {
  return mockResponse('GET /orders', params, () => {
    /* ---------- 서버 검증 (화면 검증을 통과해도 서버 규칙으로 막히는 경우) ---------- */
    if (params.custCd) {
      const cust = CUSTOMERS.find((c) => c.custCd === params.custCd)
      if (cust?.stopYn === 'Y') {
        throw new ApiError(400, '검색조건 오류', {
          fieldErrors: [{ field: 'custCd', message: `거래가 정지된 거래처입니다. (${cust.custCd} ${cust.custNm})` }],
        })
      }
    }

    /* ---------- 필터 ---------- */
    const dateField = DATE_FIELD[params.dateType ?? 'ORD_DT']
    const statuses = params.ordStatCds?.split(',')

    let rows = ORDERS.filter((o) => {
      const d = o[dateField]
      if (params.fromDt && (!d || d < params.fromDt)) return false
      if (params.toDt && (!d || d > params.toDt)) return false
      if (params.ordNo && !o.ordNo.includes(params.ordNo)) return false
      if (params.custCd && o.custCd !== params.custCd) return false
      if (statuses && !statuses.includes(o.ordStatCd)) return false
      if (params.inclCnclYn === 'N' && o.ordStatCd === 'CANCELED') return false
      if (params.deptCd && o.deptCd !== params.deptCd) return false
      if (params.payMthdCd && o.payMthdCd !== params.payMthdCd) return false
      if (params.minAmt != null && o.ordAmt < params.minAmt) return false
      if (params.maxAmt != null && o.ordAmt > params.maxAmt) return false
      if (params.bizRegNo && o.bizRegNo !== params.bizRegNo) return false
      if (params.mgrNm && !o.mgrNm.includes(params.mgrNm)) return false
      return true
    })

    /* ---------- 정렬 ---------- */
    if (params.sort) {
      const [field, dir] = params.sort.split(',') as [keyof Order, 'asc' | 'desc']
      const sign = dir === 'desc' ? -1 : 1
      rows = [...rows].sort((a, b) => {
        const av = a[field] ?? ''
        const bv = b[field] ?? ''
        return (av < bv ? -1 : av > bv ? 1 : 0) * sign
      })
    }

    /* ---------- 페이징 ---------- */
    const start = (params.page - 1) * params.size
    return { items: rows.slice(start, start + params.size), total: rows.length }
  })
}
