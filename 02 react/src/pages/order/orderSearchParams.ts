/**
 * 주문 조회 — 화면 값 → API 파라미터 변환
 *
 * 필드별 변환을 한 줄씩 명시적으로 적는다. (이름 변경 / 형식 변환 / 조건부 제외)
 * 백엔드 스펙이 바뀌거나 예외가 생기면 이 파일만 수정한다.
 */
import type { OrderSearchParams } from '@/api/orderApi'
import { cleanParams, toCsv, toDigits, toText, toYmd, toYn } from '@/shared/search'
import type { OrderSearchForm, OrderSearchValues } from './orderSearchSchema'

const DATE_TYPE_MAP = { ORDER: 'ORD_DT', PAY: 'PAY_DT', SHIP: 'SHIP_DT' } as const

export function toOrderSearchParams(v: OrderSearchValues): OrderSearchParams {
  // [예외] 주문번호로 조회할 때는 기간 조건을 보내지 않는다
  const byOrderNo = v.orderNo !== ''

  return cleanParams<OrderSearchParams>({
    dateType: byOrderNo ? undefined : DATE_TYPE_MAP[v.dateType],
    fromDt: byOrderNo ? undefined : toYmd(v.fromDate), // '2026-11-01' → '20261101'
    toDt: byOrderNo ? undefined : toYmd(v.toDate),
    ordNo: toText(v.orderNo),
    custCd: toText(v.customer.code), // { code, name } → code 만
    ordStatCds: toCsv(v.statuses), // ['PAID','SHIPPING'] → 'PAID,SHIPPING'
    deptCd: toText(v.dept),
    payMthdCd: toText(v.payMethod),
    minAmt: v.minAmount ?? undefined,
    maxAmt: v.maxAmount ?? undefined,
    bizRegNo: toDigits(v.bizNo), // '123-45-67890' → '1234567890'
    mgrNm: toText(v.managerName),
    inclCnclYn: toYn(v.includeCanceled), // boolean → 'Y' | 'N'
  })
}

/**
 * 서버 필드 오류 매핑: API 파라미터명 → 폼 필드명
 * 서버가 { fieldErrors: [{ field: 'custCd', message }] } 를 주면 '거래처' 필드에 표시된다.
 */
export const ORDER_SERVER_FIELD_MAP: Record<string, keyof OrderSearchForm> = {
  fromDt: 'fromDate',
  toDt: 'toDate',
  ordNo: 'orderNo',
  custCd: 'customer',
  ordStatCds: 'statuses',
  deptCd: 'dept',
  payMthdCd: 'payMethod',
  minAmt: 'minAmount',
  maxAmt: 'maxAmount',
  bizRegNo: 'bizNo',
  mgrNm: 'managerName',
}
