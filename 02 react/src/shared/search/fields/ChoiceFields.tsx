/**
 * 선택형 필드: Select / Radio / CheckboxGroup / Checkbox
 * 옵션은 codeGroup(공통코드) 또는 options(고정값) 중 하나를 지정
 */
import { Controller, useFormContext } from 'react-hook-form'
import { FieldError } from './FieldError'
import { useFieldError, useOptions, type Option } from './fieldUtils'

interface ChoiceProps {
  name: string
  codeGroup?: string
  options?: Option[]
  disabled?: boolean
}

/* ------------------------------------------------------------------ */

interface SelectFieldProps extends ChoiceProps {
  /** 첫 번째 빈 옵션 문구 ('전체', '선택'). 없으면 빈 옵션 없음 */
  placeholder?: string
}

export function SelectField({ name, codeGroup, options, placeholder, disabled }: SelectFieldProps) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const { options: items, loading } = useOptions(codeGroup, options)

  return (
    <div className="field">
      <select id={name} className={`select ${error ? 'invalid' : ''}`} disabled={disabled || loading} {...register(name)}>
        {placeholder !== undefined && <option value="">{loading ? '불러오는 중...' : placeholder}</option>}
        {items.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface RadioFieldProps extends ChoiceProps {
  /** '전체' 같은 빈 값('') 옵션 문구 */
  allLabel?: string
}

export function RadioField({ name, codeGroup, options, allLabel, disabled }: RadioFieldProps) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const { options: items } = useOptions(codeGroup, options)
  const all = allLabel !== undefined ? [{ value: '', label: allLabel }, ...items] : items

  return (
    <div className="field">
      <div className="choice-row" role="radiogroup">
        {all.map((o) => (
          <label key={o.value}>
            <input type="radio" value={o.value} disabled={disabled} {...register(name)} />
            {o.label}
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface CheckboxGroupFieldProps extends ChoiceProps {
  /** '전체' 체크박스 표시 */
  showAll?: boolean
}

/** 다중 선택 — 폼 값은 string[] */
export function CheckboxGroupField({ name, codeGroup, options, showAll, disabled }: CheckboxGroupFieldProps) {
  const { control } = useFormContext()
  const error = useFieldError(name)
  const { options: items } = useOptions(codeGroup, options)

  return (
    <div className="field">
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const value: string[] = field.value ?? []
          const allChecked = items.length > 0 && items.every((o) => value.includes(o.value))
          const toggle = (v: string) =>
            field.onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

          return (
            <div className="choice-row">
              {showAll && (
                <label>
                  <input
                    type="checkbox"
                    ref={field.ref}
                    checked={allChecked}
                    disabled={disabled}
                    onChange={() => field.onChange(allChecked ? [] : items.map((o) => o.value))}
                  />
                  전체
                </label>
              )}
              {items.map((o, i) => (
                <label key={o.value}>
                  <input
                    type="checkbox"
                    ref={!showAll && i === 0 ? field.ref : undefined}
                    checked={value.includes(o.value)}
                    disabled={disabled}
                    onChange={() => toggle(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )
        }}
      />
      <FieldError message={error} />
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** 단일 체크박스 — 폼 값은 boolean */
export function CheckboxField({ name, label, disabled }: { name: string; label: string; disabled?: boolean }) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  return (
    <div className="field">
      <label className="choice-single">
        <input type="checkbox" id={name} disabled={disabled} {...register(name)} />
        {label}
      </label>
      <FieldError message={error} />
    </div>
  )
}
