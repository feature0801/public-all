/**
 * 검색조건(form value) → API 파라미터 변환 헬퍼
 *
 * 원칙
 * - 페이지마다 toParams(values) 함수를 하나 두고, 아래 헬퍼로 필드별 변환을 명시적으로 작성한다.
 *   (이름 변경, 형식 변환, 조건부 제외 같은 예외를 그 함수 안에서 자유롭게 처리)
 * - 마지막에 cleanParams 로 빈 값을 제거해서 "입력 안 함 = 파라미터 없음" 으로 통일한다.
 */
import dayjs from 'dayjs'
import { digitsOnly } from '@/shared/lib/format'

/** 'YYYY-MM-DD' → 'YYYYMMDD' (빈 값은 undefined) */
export const toYmd = (v: string | null | undefined): string | undefined =>
  v ? dayjs(v).format('YYYYMMDD') : undefined

/** 'YYYY-MM-DD' → ISO 시작/끝 시각 (백엔드가 datetime 을 받을 때) */
export const toStartOfDay = (v: string | null | undefined) => (v ? dayjs(v).startOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined)
export const toEndOfDay = (v: string | null | undefined) => (v ? dayjs(v).endOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined)

/** 앞뒤 공백 제거, 빈 문자열은 undefined */
export const toText = (v: string | null | undefined): string | undefined => {
  const t = (v ?? '').trim()
  return t === '' ? undefined : t
}

/** 숫자만 ('123-45-67890' → '1234567890'), 빈 값은 undefined */
export const toDigits = (v: string | null | undefined): string | undefined => digitsOnly(v) || undefined

/** 배열 → 콤마 문자열 (['A','B'] → 'A,B'), 빈 배열은 undefined */
export const toCsv = (v: string[] | null | undefined): string | undefined => (v && v.length > 0 ? v.join(',') : undefined)

/** boolean → 'Y' / 'N' */
export const toYn = (v: boolean | null | undefined): 'Y' | 'N' => (v ? 'Y' : 'N')

/**
 * 빈 값 제거: undefined, null, '', 빈 배열
 * (0, false, 'N' 은 유지)
 */
export function cleanParams<T extends object>(params: T): T {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
    ),
  ) as T
}
