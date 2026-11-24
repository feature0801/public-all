import { useFormContext } from 'react-hook-form'
import { DEFAULT_DATE_PRESETS, type DatePreset } from './datePresets'
import { FieldError } from './FieldError'
import { useFieldError } from './fieldUtils'

interface DateRangeFieldProps {
  fromName: string
  toName: string
  /** 기간 버튼. [] 이면 숨김 */
  presets?: DatePreset[]
  disabled?: boolean
}

/** 기간 (시작일 ~ 종료일) + 기간 버튼 */
export function DateRangeField({ fromName, toName, presets = DEFAULT_DATE_PRESETS, disabled }: DateRangeFieldProps) {
  const { register, setValue, formState } = useFormContext()
  const fromError = useFieldError(fromName)
  const toError = useFieldError(toName)

  const applyPreset = (preset: DatePreset) => {
    const [from, to] = preset.range()
    // 이미 조회를 한 번 눌렀다면(오류 표시 중일 수 있으므로) 바로 다시 검사
    const opts = { shouldDirty: true, shouldValidate: formState.isSubmitted }
    setValue(fromName, from, opts)
    setValue(toName, to, opts)
  }

  return (
    <div className="field">
      <div className="range">
        <input
          type="date"
          id={fromName}
          className={`input date ${fromError ? 'invalid' : ''}`}
          disabled={disabled}
          {...register(fromName)}
        />
        <span className="range-sep">~</span>
        <input
          type="date"
          id={toName}
          className={`input date ${toError ? 'invalid' : ''}`}
          disabled={disabled}
          {...register(toName)}
        />
        {presets.length > 0 && (
          <span className="presets">
            {presets.map((p) => (
              <button key={p.label} type="button" className="preset" disabled={disabled} onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </span>
        )}
      </div>
      <FieldError message={fromError ?? toError} />
    </div>
  )
}
