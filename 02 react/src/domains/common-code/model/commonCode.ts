/** 공통코드 1건 */
export interface CommonCode {
  /** 그룹 코드 (예: USER_STATUS) */
  groupCode: string
  /** 코드 값 (예: ACTIVE) */
  code: string
  /** 화면 표시명 (예: 활성) */
  name: string
  /** 정렬 순서 */
  sortOrder: number
  /** 사용 여부 — 'N' 은 기본적으로 선택 목록에서 숨기고, 기존 데이터 표시(라벨)에는 사용 */
  useYn: 'Y' | 'N'
}

/** groupCode → 코드 목록 */
export type CommonCodeMap = Record<string, CommonCode[]>
