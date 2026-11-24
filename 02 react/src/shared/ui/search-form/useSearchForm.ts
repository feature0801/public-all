/**
 * 검색 폼 공통 훅
 *
 * 조회 흐름
 *   [조회 클릭/Enter]
 *     → ① zod 스키마 검증 (실패 시 첫 번째 오류 필드로 focus + onInvalid)
 *     → ② toParams(values) 로 API 파라미터 변환
 *     → ③ beforeSearch(values, params)  ← 예외 처리 지점 (확인창, 조건 보정, 취소 등)
 *     → ④ onSearch(params, values)       ← 실제 조회
 *     → ⑤ 서버 검증 오류(ApiError.data.fieldErrors)면 해당 필드에 오류 표시
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, type FieldErrors, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { ApiError } from '@/shared/api'

/** 서버가 내려주는 필드 오류 형식 (백엔드와 맞춰서 수정) */
export interface ServerFieldError {
  field: string
  message: string
}

export interface UseSearchFormOptions<TInput extends FieldValues, TOutput, TParams> {
  schema: z.ZodType<TOutput, TInput>
  defaultValues: TInput
  /** 검증된 값 → API 파라미터 */
  toParams: (values: TOutput) => TParams
  /** 실제 조회 */
  onSearch: (params: TParams, values: TOutput) => unknown
  /**
   * 조회 직전 훅. false 를 반환하면 조회 취소.
   * 예: 기간이 길면 confirm, 특정 조건 조합 경고
   */
  beforeSearch?: (values: TOutput, params: TParams) => boolean | Promise<boolean>
  /** 검증 실패 시 (기본: 첫 번째 오류 메시지를 alert) */
  onInvalid?: (errors: FieldErrors<TInput>, firstMessage: string | undefined) => void
  /** API 파라미터명 → 폼 필드명 (서버 필드 오류를 화면 필드에 표시할 때) */
  serverFieldMap?: Record<string, Path<TInput>>
}

export interface UseSearchFormReturn<TInput extends FieldValues, TOutput, TParams> {
  form: UseFormReturn<TInput, unknown, TOutput>
  /** <form onSubmit={submit}> */
  submit: (e?: React.BaseSyntheticEvent) => Promise<void>
  /** 기본값으로 초기화 */
  reset: () => void
  /** 마지막으로 조회에 사용한 파라미터 (페이지 이동/엑셀 다운로드 등에 재사용) */
  lastParams: TParams | null
  searching: boolean
}

/** errors 객체에서 첫 번째 메시지를 찾는다 (중첩 객체 포함) */
function findFirstMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined
  const e = errors as { message?: unknown }
  if (typeof e.message === 'string' && e.message) return e.message
  for (const value of Object.values(errors)) {
    if (value && typeof value === 'object' && !('nodeType' in value)) {
      const found = findFirstMessage(value)
      if (found) return found
    }
  }
  return undefined
}

const defaultOnInvalid = (_: unknown, message: string | undefined) => {
  if (message) alert(message)
}

export function useSearchForm<TInput extends FieldValues, TOutput, TParams>(
  options: UseSearchFormOptions<TInput, TOutput, TParams>,
): UseSearchFormReturn<TInput, TOutput, TParams> {
  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(options.schema),
    defaultValues: options.defaultValues as never,
    mode: 'onSubmit', // 처음엔 조회 시점에만 검사
    reValidateMode: 'onChange', // 오류가 난 뒤에는 입력할 때마다 다시 검사
    shouldFocusError: true,
  })

  const [lastParams, setLastParams] = useState<TParams | null>(null)
  const [searching, setSearching] = useState(false)

  // 최신 옵션을 ref 로 (콜백이 매 렌더 바뀌어도 submit 이 안정적이도록)
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const applyServerErrors = useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof ApiError)) return false
      const fieldErrors = (error.data as { fieldErrors?: ServerFieldError[] } | undefined)?.fieldErrors
      if (!fieldErrors?.length) return false

      const map = optionsRef.current.serverFieldMap ?? {}
      let applied = false
      fieldErrors.forEach((fe, i) => {
        const name = map[fe.field] ?? (fe.field as Path<TInput>)
        form.setError(name, { type: 'server', message: fe.message }, { shouldFocus: i === 0 })
        applied = true
      })
      if (applied) alert(fieldErrors[0].message)
      return applied
    },
    [form],
  )

  const submit = useCallback(
    (e?: React.BaseSyntheticEvent) =>
      form.handleSubmit(
        async (values) => {
          const opts = optionsRef.current
          const params = opts.toParams(values)
          if (opts.beforeSearch && !(await opts.beforeSearch(values, params))) return

          setSearching(true)
          try {
            setLastParams(params)
            await opts.onSearch(params, values)
          } catch (error) {
            // 서버 필드 오류는 화면 필드에 표시, 그 외 오류는 onSearch 쪽(그리드 등)에서 표시했다고 보고 로그만
            if (!applyServerErrors(error)) console.error('[search]', error)
          } finally {
            setSearching(false)
          }
        },
        (errors) => {
          const handler = optionsRef.current.onInvalid ?? defaultOnInvalid
          handler(errors, findFirstMessage(errors))
        },
      )(e),
    [form, applyServerErrors],
  )

  const reset = useCallback(() => {
    form.reset(optionsRef.current.defaultValues as never)
  }, [form])

  return { form, submit, reset, lastParams, searching }
}
