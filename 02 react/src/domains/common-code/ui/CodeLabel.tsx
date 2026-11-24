import { useCommonCodes } from '../model/useCommonCodes'

interface CodeLabelProps {
  group: string
  code: string | null | undefined
  /** 코드가 없거나 매칭되지 않을 때 표시 (기본: 코드 값 그대로) */
  fallback?: string
}

/** 코드 값을 표시명으로 출력 (사용 안 함 코드도 표시) */
export function CodeLabel({ group, code, fallback }: CodeLabelProps) {
  const { getName } = useCommonCodes(group, { includeUnused: true })
  return <>{getName(code, fallback)}</>
}
