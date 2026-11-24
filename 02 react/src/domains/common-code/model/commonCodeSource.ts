/**
 * shared/lib/code-source 인터페이스의 공통코드 구현.
 * app/init 에서 registerCodeSource(commonCodeSource) 로 등록한다.
 */
import type { CodeSource } from '@/shared/lib/code-source'
import { getCodeName, useCommonCodeStore } from './commonCodeStore'
import { useCommonCodes } from './useCommonCodes'

function useCommonCodeOptions(groupCode: string) {
  const { codes, loading } = useCommonCodes(groupCode)
  return { options: codes.map((c) => ({ value: c.code, label: c.name })), loading }
}

export const commonCodeSource: CodeSource = {
  getName: getCodeName,
  useCodeOptions: useCommonCodeOptions,
  subscribe: (listener) =>
    useCommonCodeStore.subscribe((state, prev) => {
      if (state.codes !== prev.codes) listener()
    }),
}
