/**
 * 화면 표시용 포맷 / 입력값 정리 유틸
 */
import dayjs from 'dayjs'

/** 숫자만 남김 ('123-45-67890' → '1234567890') */
export const digitsOnly = (v: string | null | undefined): string => (v ?? '').replace(/\D/g, '')

/** 천 단위 콤마 (1234567 → '1,234,567'). null/undefined 는 '' */
export function formatNumber(v: number | null | undefined, fractionDigits = 0): string {
  if (v == null || Number.isNaN(v)) return ''
  return v.toLocaleString('ko-KR', { maximumFractionDigits: fractionDigits })
}

/** 콤마가 섞인 문자열 → 숫자. 비어 있으면 null */
export function parseNumber(v: string): number | null {
  const cleaned = v.replace(/[^\d.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number(cleaned)
  return Number.isNaN(n) ? null : n
}

/** 사업자등록번호 형식 (1234567890 → 123-45-67890), 입력 중인 값도 처리 */
export function formatBizNo(v: string | null | undefined): string {
  const d = digitsOnly(v).slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

/** 'YYYYMMDD' / 'YYYY-MM-DD' / Date → 'YYYY-MM-DD' */
export function formatDate(v: string | Date | null | undefined, format = 'YYYY-MM-DD'): string {
  if (!v) return ''
  const d = dayjs(v) // 'YYYYMMDD' 도 기본 파서가 처리
  return d.isValid() ? d.format(format) : ''
}
