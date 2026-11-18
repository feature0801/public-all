import type { InputHTMLAttributes } from 'react'
import { useFormContext } from 'react-hook-form'
import { FieldError } from './FieldError'
import { useFieldError } from './fieldUtils'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: string
  /** 입력 즉시 대문자로 변환 (주문번호, 코드 등) */
  upperCase?: boolean
}

/** 텍스트 입력 */
export function TextField({ name, upperCase, className, ...rest }: TextFieldProps) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const reg = register(name)

  return (
    <div className="field">
      <input
        id={name}
        className={`input ${error ? 'invalid' : ''} ${className ?? ''}`}
        aria-invalid={!!error}
        autoComplete="off"
        {...rest}
        {...reg}
        onChange={(e) => {
          if (upperCase) e.target.value = e.target.value.toUpperCase()
          return reg.onChange(e)
        }}
      />
      <FieldError message={error} />
    </div>
  )
}
