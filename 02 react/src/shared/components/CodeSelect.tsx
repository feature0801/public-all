import type { SelectHTMLAttributes } from 'react'
import { useCommonCodes } from '@/stores/commonCode/useCommonCodes'

interface CodeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  /** 공통코드 그룹 (CODE_GROUP 상수 사용) */
  group: string
  value: string
  onChange: (code: string) => void
  /** 첫 번째 빈 옵션 문구 (예: '전체', '선택'). 지정하지 않으면 빈 옵션 없음 */
  placeholder?: string
  /** 사용 안 함 코드 포함 여부 */
  includeUnused?: boolean
}

/** 공통코드 select */
export function CodeSelect({ group, value, onChange, placeholder, includeUnused, disabled, ...rest }: CodeSelectProps) {
  const { codes, loading } = useCommonCodes(group, { includeUnused })

  return (
    <select
      className="select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{loading ? '불러오는 중...' : placeholder}</option>}
      {codes.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
