/**
 * 사용자 검색 팝업의 "계약" — 부모와 팝업이 같이 import 해서
 * URL / 메시지 type / 데이터 형태를 한 곳에서 관리한다.
 * 새 팝업을 만들 때 이 파일 형태를 복사해서 사용.
 * - 결과 : closeSelf(user) → 부모의 openForResult 가 User 를 받음 (메시지 type 불필요)
 */

export const USER_SEARCH_POPUP_URL = '/popup/user-search'

/** 팝업이 열린 채로 부모를 호출할 때의 메시지 type (sendToOpener → 부모 handlers) */
export const USER_SEARCH_MSG = {
  /** 다중 모드 추가 요청 */
  ADD: 'add-user',
} as const

/** 부모 → 팝업 으로 넘기는 데이터 */
export interface UserSearchPopupData {
  /** 초기 검색어 (부모 화면의 입력값) */
  keyword?: string
  /** 이미 선택된 사용자 id (팝업에서 표시/비활성화) */
  selectedIds?: number[]
  /** true 면 여러 명 추가 모드 */
  multi?: boolean
  /** 다중 모드 최대 인원 (도달하면 팝업에서 추가 버튼 비활성화) */
  max?: number
}
