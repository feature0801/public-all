/**
 * 검색조건 검증 공통 (zod)
 *
 * 원칙
 * - 스키마는 "화면 값(form value)" 을 검증한다. API 형식 변환은 params.ts / 페이지의 toParams 에서.
 * - 단일 필드 규칙 → 아래 z* 헬퍼 사용
 * - 여러 필드 간 규칙(기간, 범위, 조건부 필수) → 스키마의 superRefine 안에서 refine* 헬퍼 사용
 * - 메시지는 MSG 에서 만들어 문구를 통일한다
 */
import dayjs from 'dayjs'
import { z } from 'zod'
import { digitsOnly } from '@/shared/utils/format'

/* ------------------------------------------------------------------ */
/* 메시지                                                              */
/* ------------------------------------------------------------------ */

export const MSG = {
  required: (label: string) => `${label}을(를) 입력해주세요.`,
  select: (label: string) => `${label}을(를) 선택해주세요.`,
  minLength: (label: string, n: number) => `${label}은(는) ${n}자 이상 입력해주세요.`,
  maxLength: (label: string, n: number) => `${label}은(는) ${n}자 이하로 입력해주세요.`,
  format: (label: string) => `${label} 형식이 올바르지 않습니다.`,
  invalidDate: (label: string) => `${label}이(가) 올바른 날짜가 아닙니다.`,
  dateOrder: (label: string) => `${label}의 시작일이 종료일보다 늦습니다.`,
  dateMaxRange: (label: string, months: number) => `${label}은(는) 최대 ${months}개월까지 조회할 수 있습니다.`,
  numberOrder: (label: string) => `${label}의 최소값이 최대값보다 큽니다.`,
  min: (label: string, n: number) => `${label}은(는) ${n.toLocaleString()} 이상이어야 합니다.`,
  max: (label: string, n: number) => `${label}은(는) ${n.toLocaleString()} 이하여야 합니다.`,
}

/* ------------------------------------------------------------------ */
/* 단일 필드 스키마                                                     */
/* ------------------------------------------------------------------ */

interface TextOptions {
  label: string
  required?: boolean
  min?: number
  max?: number
  /** 허용 패턴 (값이 있을 때만 검사) */
  pattern?: RegExp
  patternMessage?: string
}

/** 텍스트. 앞뒤 공백은 제거된 값으로 검사/전달된다 */
export function zText({ label, required, min, max, pattern, patternMessage }: TextOptions) {
  return z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (v === '') {
        if (required) ctx.addIssue({ code: 'custom', message: MSG.required(label) })
        return
      }
      if (min !== undefined && v.length < min) ctx.addIssue({ code: 'custom', message: MSG.minLength(label, min) })
      if (max !== undefined && v.length > max) ctx.addIssue({ code: 'custom', message: MSG.maxLength(label, max) })
      if (pattern && !pattern.test(v)) ctx.addIssue({ code: 'custom', message: patternMessage ?? MSG.format(label) })
    })
}

/** 'YYYY-MM-DD' 문자열 날짜 ('' 허용, 필수 여부는 refineDateRange 또는 required 로) */
export function zDate(label: string, required = false) {
  return z.string().superRefine((v, ctx) => {
    if (v === '') {
      if (required) ctx.addIssue({ code: 'custom', message: MSG.select(label) })
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !dayjs(v).isValid()) {
      ctx.addIssue({ code: 'custom', message: MSG.invalidDate(label) })
    }
  })
}

/** 숫자 (null = 미입력) */
export function zNumber({ label, required, min, max }: { label: string; required?: boolean; min?: number; max?: number }) {
  return z.number().nullable().superRefine((v, ctx) => {
    if (v === null) {
      if (required) ctx.addIssue({ code: 'custom', message: MSG.required(label) })
      return
    }
    if (min !== undefined && v < min) ctx.addIssue({ code: 'custom', message: MSG.min(label, min) })
    if (max !== undefined && v > max) ctx.addIssue({ code: 'custom', message: MSG.max(label, max) })
  })
}

/** 사업자등록번호 체크섬 */
export function isValidBizNo(value: string): boolean {
  const d = digitsOnly(value)
  if (d.length !== 10) return false
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0)
  sum += Math.floor((Number(d[8]) * 5) / 10)
  return (10 - (sum % 10)) % 10 === Number(d[9])
}

/** 사업자등록번호 (입력 시에만 검사) */
export function zBizNo(label = '사업자번호', required = false) {
  return z.string().superRefine((v, ctx) => {
    if (digitsOnly(v) === '') {
      if (required) ctx.addIssue({ code: 'custom', message: MSG.required(label) })
      return
    }
    if (!isValidBizNo(v)) ctx.addIssue({ code: 'custom', message: MSG.format(label) })
  })
}

/** 코드/이름 쌍 (거래처, 품목 등 팝업으로 고르는 값) */
export function zLookup(label: string, required = false) {
  return z.object({ code: z.string(), name: z.string() }).superRefine((v, ctx) => {
    if (required && !v.code) ctx.addIssue({ code: 'custom', message: MSG.select(label), path: ['code'] })
  })
}

/* ------------------------------------------------------------------ */
/* 여러 필드 간 규칙 — 스키마의 superRefine 안에서 호출                    */
/* ------------------------------------------------------------------ */

type Ctx = z.RefinementCtx

interface DateRangeRule {
  label: string
  from: string
  to: string
  /** 필드 경로 (에러 표시 위치) */
  fromPath: string
  toPath: string
  required?: boolean
  /** 최대 조회 기간 (개월) */
  maxMonths?: number
}

/** 기간: 필수, 시작 ≤ 종료, 최대 기간 */
export function refineDateRange(ctx: Ctx, rule: DateRangeRule): void {
  const { label, from, to, fromPath, toPath } = rule
  if (rule.required) {
    if (!from) ctx.addIssue({ code: 'custom', message: MSG.select(`${label} 시작일`), path: [fromPath] })
    if (!to) ctx.addIssue({ code: 'custom', message: MSG.select(`${label} 종료일`), path: [toPath] })
  }
  if (!from || !to) return

  const f = dayjs(from)
  const t = dayjs(to)
  if (!f.isValid() || !t.isValid()) return // 형식 오류는 zDate 에서 처리

  if (f.isAfter(t)) {
    ctx.addIssue({ code: 'custom', message: MSG.dateOrder(label), path: [toPath] })
    return
  }
  if (rule.maxMonths && t.isAfter(f.add(rule.maxMonths, 'month'))) {
    ctx.addIssue({ code: 'custom', message: MSG.dateMaxRange(label, rule.maxMonths), path: [toPath] })
  }
}

/** 숫자 범위: 최소 ≤ 최대 */
export function refineNumberRange(
  ctx: Ctx,
  rule: { label: string; min: number | null; max: number | null; maxPath: string },
): void {
  if (rule.min !== null && rule.max !== null && rule.min > rule.max) {
    ctx.addIssue({ code: 'custom', message: MSG.numberOrder(rule.label), path: [rule.maxPath] })
  }
}

/** 조건부 필수 — 예: 결제수단이 '카드'면 카드사 필수 */
export function refineRequiredIf(ctx: Ctx, condition: boolean, value: unknown, path: string, message: string): void {
  const empty = value === '' || value == null || (Array.isArray(value) && value.length === 0)
  if (condition && empty) ctx.addIssue({ code: 'custom', message, path: [path] })
}
