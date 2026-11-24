/**
 * 주문 조회 — 검색조건 스키마 (화면 값 검증)
 *
 * 1) 필드 단위 규칙 : z.object 안의 zText / zDate / zNumber ...
 * 2) 필드 간 규칙   : superRefine 안에서 refineDateRange / refineNumberRange / 직접 addIssue
 *    → 업무 예외 규칙은 여기에 계속 추가한다. path 를 지정하면 해당 필드 아래에 메시지가 표시된다.
 */
import dayjs from 'dayjs'
import { z } from 'zod'
import {
  EMPTY_LOOKUP,
  refineDateRange,
  refineNumberRange,
  zBizNo,
  zDate,
  zLookup,
  zNumber,
  zText,
  type Option,
} from '@/shared/ui/search-form'

export const DATE_TYPE_OPTIONS: Option[] = [
  { value: 'ORDER', label: '주문일' },
  { value: 'PAY', label: '결제일' },
  { value: 'SHIP', label: '출고일' },
]

const MAX_AMOUNT = 9_999_999_999

export const orderSearchSchema = z
  .object({
    dateType: z.enum(['ORDER', 'PAY', 'SHIP']),
    fromDate: zDate('시작일'),
    toDate: zDate('종료일'),
    orderNo: zText({
      label: '주문번호',
      min: 4,
      max: 20,
      pattern: /^[A-Z0-9]+$/,
      patternMessage: '주문번호는 영문 대문자와 숫자만 입력할 수 있습니다.',
    }),
    customer: zLookup('거래처'),
    statuses: z.array(z.string()),
    dept: z.string(),
    payMethod: z.string(),
    minAmount: zNumber({ label: '최소금액', min: 0, max: MAX_AMOUNT }),
    maxAmount: zNumber({ label: '최대금액', min: 0, max: MAX_AMOUNT }),
    bizNo: zBizNo('사업자번호'),
    managerName: zText({
      label: '담당자명',
      max: 20,
      pattern: /^[가-힣a-zA-Z\s]+$/,
      patternMessage: '담당자명은 한글/영문만 입력할 수 있습니다.',
    }),
    includeCanceled: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // [예외 1] 주문번호로 조회하면 기간 없이 조회 가능 (기간 필수/최대기간 규칙 해제)
    const byOrderNo = v.orderNo.length > 0
    refineDateRange(ctx, {
      label: '조회기간',
      from: v.fromDate,
      to: v.toDate,
      fromPath: 'fromDate',
      toPath: 'toDate',
      required: !byOrderNo,
      maxMonths: byOrderNo ? undefined : 3,
    })

    refineNumberRange(ctx, { label: '주문금액', min: v.minAmount, max: v.maxAmount, maxPath: 'maxAmount' })

    // [예외 2] '취소' 상태를 고르면 '취소건 포함' 이 체크되어 있어야 함
    if (v.statuses.includes('CANCELED') && !v.includeCanceled) {
      ctx.addIssue({
        code: 'custom',
        path: ['includeCanceled'],
        message: '주문상태에 "취소"를 선택하면 "취소건 포함"을 체크해야 합니다.',
      })
    }

    // [예외 3] 출고일 기준 조회는 출고 전 상태(주문완료/결제완료)와 함께 쓸 수 없음
    if (v.dateType === 'SHIP' && v.statuses.some((s) => s === 'ORDERED' || s === 'PAID')) {
      ctx.addIssue({
        code: 'custom',
        path: ['statuses'],
        message: '출고일 기준 조회에서는 주문완료/결제완료 상태를 선택할 수 없습니다.',
      })
    }
  })

/** 폼 입력 값 타입 (useForm 의 값) */
export type OrderSearchForm = z.input<typeof orderSearchSchema>
/** 검증 통과 후 값 타입 (trim 등이 적용된 값) */
export type OrderSearchValues = z.output<typeof orderSearchSchema>

/** 기본값 — 날짜는 호출 시점 기준이어야 하므로 함수로 */
export function getOrderSearchDefaults(): OrderSearchForm {
  return {
    dateType: 'ORDER',
    fromDate: dayjs().subtract(1, 'month').add(1, 'day').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
    orderNo: '',
    customer: EMPTY_LOOKUP,
    statuses: [],
    dept: '',
    payMethod: '',
    minAmount: null,
    maxAmount: null,
    bizNo: '',
    managerName: '',
    includeCanceled: false,
  }
}
