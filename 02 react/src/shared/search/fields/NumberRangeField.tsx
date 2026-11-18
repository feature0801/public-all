import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { formatNumber, parseNumber } from '@/shared/utils/format'
import { FieldError } from './FieldError'
import { useFieldError } from './fieldUtils'

interface NumberInputProps {
  name: string
  placeholder?: string
  invalid?: boolean
  suffix?: string
}

/**
 * 숫자 입력 (천 단위 콤마 표시, 폼 값은 number | null)
 * 포커스 중에는 입력 그대로, blur 시 콤마 형식으로 표시
 */
export function NumberInput({ name, placeholder, invalid, suffix }: NumberInputProps) {
  const { control } = useFormContext()
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <span className="number-input">
          <input
            id={name}
            ref={field.ref}
            className={`input num ${invalid ? 'invalid' : ''}`}
            inputMode="numeric"
            placeholder={placeholder}
            autoComplete="off"
            value={editing ?? formatNumber(field.value)}
            onFocus={() => setEditing(field.value == null ? '' : String(field.value))}
            onChange={(e) => {
              const text = e.target.value.replace(/[^\d]/g, '')
              setEditing(text)
              field.onChange(parseNumber(text))
            }}
            onBlur={() => {
              setEditing(null)
              field.onBlur()
            }}
          />
          {suffix && <span className="suffix">{suffix}</span>}
        </span>
      )}
    />
  )
}

interface NumberRangeFieldProps {
  minName: string
  maxName: string
  suffix?: string
}

/** 숫자 범위 (최소 ~ 최대) */
export function NumberRangeField({ minName, maxName, suffix }: NumberRangeFieldProps) {
  const minError = useFieldError(minName)
  const maxError = useFieldError(maxName)

  return (
    <div className="field">
      <div className="range">
        <NumberInput name={minName} placeholder="최소" invalid={!!minError} suffix={suffix} />
        <span className="range-sep">~</span>
        <NumberInput name={maxName} placeholder="최대" invalid={!!maxError} suffix={suffix} />
      </div>
      <FieldError message={minError ?? maxError} />
    </div>
  )
}
