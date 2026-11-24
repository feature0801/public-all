/**
 * 사용자 검색 팝업의 "계약" — 부모와 팝업이 같이 import 해서
 * URL / 메시지 type / 데이터 타입을 한 곳에서 관리한다.
 * 새 팝업을 만들 때 이 파일 형태를 복사해서 사용.
 */

export const USER_SEARCH_POPUP_URL = '/popup/user-search'

/** 메시지 type */
export const USER_SEARCH_MSG = {
  /** 단일 선택 결과 (팝업 → 부모, 팝업 닫힘) */
  SELECT: 'select-user',
  /** 다중 모드 추가 요청 (팝업 → 부모 handler, 결과 반환) */
  ADD: 'add-user',
  /** 부모 → 팝업 알림 */
  NOTICE: 'notice',
} as const

/** 부모 → 팝업 으로 넘기는 데이터 */
export interface UserSearchPopupData {
  /** 초기 검색어 (부모 화면의 입력값) */
  keyword?: string
  /** 이미 선택된 사용자 id (팝업에서 표시/비활성화) */
  selectedIds?: number[]
  /** true 면 여러 명 추가 모드 */
  multi?: boolean
}

/** ADD handler 의 반환값 */
export interface AddUserResult {
  ok: boolean
  message?: string
}
