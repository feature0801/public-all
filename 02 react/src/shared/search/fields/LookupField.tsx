import { Controller, useFormContext } from 'react-hook-form'
import { FieldError } from './FieldError'
import { EMPTY_LOOKUP, useFieldError, type LookupValue } from './fieldUtils'

interface LookupFieldProps {
  /** 폼 값은 { code, name } 객체 */
  name: string
  /** 검색 버튼 클릭 시 (팝업 등). 선택값을 반환하거나, 취소면 null */
  onLookup: (current: LookupValue) => Promise<LookupValue | null>
  placeholder?: string
  disabled?: boolean
}

/**
 * 코드 + 명칭 조회 필드 (거래처, 품목, 사원 등 ERP 의 "돋보기" 필드)
 * 실제 선택은 onLookup 에서 팝업(openPopupForResult) 등으로 처리한다.
 */
export function LookupField({ name, onLookup, placeholder = '검색 버튼으로 선택', disabled }: LookupFieldProps) {
  const { control } = useFormContext()
  const error = useFieldError(name)

  return (
    <div className="field">
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const value: LookupValue = field.value ?? EMPTY_LOOKUP
          const handleLookup = async () => {
            const selected = await onLookup(value)
            if (selected) field.onChange(selected)
          }
          return (
            <div className="lookup">
              <input
                ref={field.ref}
                className={`input lookup-code ${error ? 'invalid' : ''}`}
                value={value.code}
                placeholder="코드"
                readOnly
                onDoubleClick={handleLookup}
              />
              <input className="input lookup-name" value={value.name} placeholder={placeholder} readOnly tabIndex={-1} />
              <button type="button" className="icon-btn" onClick={handleLookup} disabled={disabled} aria-label="검색">
                🔍
              </button>
              {value.code && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => field.onChange(EMPTY_LOOKUP)}
                  disabled={disabled}
                  aria-label="지우기"
                >
                  ✕
                </button>
              )}
            </div>
          )
        }}
      />
      <FieldError message={error} />
    </div>
  )
}
