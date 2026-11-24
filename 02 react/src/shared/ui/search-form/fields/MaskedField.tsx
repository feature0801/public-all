import type { InputHTMLAttributes } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { FieldError } from './FieldError'
import { useFieldError } from './fieldUtils'

interface MaskedFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange'> {
  name: string
  /** 입력값 → 화면 표시 형식 (예: formatBizNo, 전화번호, 법인번호) */
  format: (raw: string) => string
}

/**
 * 형식이 있는 입력 (사업자번호, 전화번호 등)
 * 폼 값은 "형식이 적용된 문자열" 로 저장하고, API 로 보낼 때 toDigits 로 숫자만 추출한다.
 */
export function MaskedField({ name, format, className, ...rest }: MaskedFieldProps) {
  const { control } = useFormContext()
  const error = useFieldError(name)

  return (
    <div className="field">
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            id={name}
            ref={field.ref}
            className={`input ${error ? 'invalid' : ''} ${className ?? ''}`}
            aria-invalid={!!error}
            inputMode="numeric"
            autoComplete="off"
            {...rest}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(format(e.target.value))}
            onBlur={field.onBlur}
          />
        )}
      />
      <FieldError message={error} />
    </div>
  )
}
