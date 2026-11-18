import { useState, type ReactNode } from 'react'
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form'

interface SearchFormProps<TInput extends FieldValues, TOutput> {
  form: UseFormReturn<TInput, unknown, TOutput>
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>
  onReset: () => void
  /** 기본 검색조건 */
  children: ReactNode
  /** 상세 검색조건 (펼치기/접기) */
  detail?: ReactNode
  /** 상세 조건 처음부터 펼침 */
  detailOpen?: boolean
  searching?: boolean
  /** 조회/초기화 버튼 옆 추가 버튼 (엑셀 다운로드 등) */
  actions?: ReactNode
}

/**
 * 검색 영역 레이아웃
 * - 4열 그리드, SearchItem 의 span 으로 칸 수 조절
 * - Enter 키로 조회 (form submit)
 */
export function SearchForm<TInput extends FieldValues, TOutput>({
  form,
  onSubmit,
  onReset,
  children,
  detail,
  detailOpen = false,
  searching,
  actions,
}: SearchFormProps<TInput, TOutput>) {
  const [open, setOpen] = useState(detailOpen)

  return (
    <FormProvider {...form}>
      <form className="search-form" onSubmit={onSubmit} noValidate>
        <div className="search-grid">{children}</div>
        {detail && open && <div className="search-grid detail">{detail}</div>}

        <div className="search-actions">
          {detail && (
            <button type="button" className="link-btn" onClick={() => setOpen((v) => !v)}>
              {open ? '상세조건 접기 ▲' : '상세조건 펼치기 ▼'}
            </button>
          )}
          <span className="spacer" />
          {actions}
          <button type="button" className="secondary" onClick={onReset} disabled={searching}>
            초기화
          </button>
          <button type="submit" disabled={searching}>
            {searching ? '조회 중...' : '조회'}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}

interface SearchItemProps {
  label: string
  /** 필수 표시(*) — 실제 필수 검사는 스키마에서 */
  required?: boolean
  /** 차지할 칸 수 (1~4) */
  span?: 1 | 2 | 3 | 4
  /** label 클릭 시 포커스할 input id (보통 필드 name) */
  htmlFor?: string
  /** 라벨 옆 도움말 */
  hint?: string
  children: ReactNode
}

/** 검색조건 한 칸 (라벨 + 입력) */
export function SearchItem({ label, required, span = 1, htmlFor, hint, children }: SearchItemProps) {
  return (
    <div className={`search-item span-${span}`}>
      <label className="search-label" htmlFor={htmlFor} title={hint}>
        {label}
        {required && <span className="required">*</span>}
        {hint && <span className="hint">ⓘ</span>}
      </label>
      <div className="search-control">{children}</div>
    </div>
  )
}
