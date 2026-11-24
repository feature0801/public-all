// public API, 외부에서는 이 파일로만 import
export { commonCodeApi } from './api/commonCodeApi'
export type { CommonCode, CommonCodeMap } from './model/commonCode'
export { CODE_GROUP, type CodeGroup } from './model/codeGroups'
export {
  useCommonCodeStore,
  getCodes,
  getCodeName,
  preloadCommonCodes,
  type LoadStatus,
} from './model/commonCodeStore'
export { useCommonCodes, usePrefetchCommonCodes } from './model/useCommonCodes'
export { commonCodeSource } from './model/commonCodeSource'
export { CodeLabel } from './ui/CodeLabel'
export { CodeSelect } from './ui/CodeSelect'
