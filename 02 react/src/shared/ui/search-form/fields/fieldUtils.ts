import { get, useFormContext, useFormState } from 'react-hook-form'
import { getCodeSource } from '@/shared/lib/code-source'

export interface Option {
  value: string
  label: string
}

type ErrorNode = { message?: string; code?: { message?: string } } | undefined

/** 필드의 오류 메시지 (여러 name 중 첫 번째 오류) */
export function useFieldError(...names: string[]): string | undefined {
  const { control } = useFormContext()
  const { errors } = useFormState({ control, name: names })
  for (const name of names) {
    const err = get(errors, name) as ErrorNode
    // lookup 처럼 객체 필드는 하위 경로(code)의 오류도 확인
    const message = err?.message ?? err?.code?.message
    if (message) return String(message)
  }
  return undefined
}

/**
 * 옵션 목록: codeGroup(공통코드) 또는 options(고정값) 중 하나 사용
 * (hook 규칙 때문에 useCodeOptions 는 항상 호출하고, 그룹이 없으면 '' 로 조회 생략)
 * 코드 조회 구현은 app/init 에서 등록된 CodeSource 가 담당한다.
 */
export function useOptions(codeGroup?: string, options?: Option[]): { options: Option[]; loading: boolean } {
  const { useCodeOptions } = getCodeSource()
  const { options: codeOptions, loading } = useCodeOptions(codeGroup ?? '')
  if (options) return { options, loading: false }
  return { options: codeOptions, loading }
}

/* ---------- Lookup ---------- */

export interface LookupValue {
  code: string
  name: string
}

export const EMPTY_LOOKUP: LookupValue = { code: '', name: '' }
