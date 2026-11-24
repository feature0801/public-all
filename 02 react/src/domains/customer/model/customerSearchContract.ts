/** 거래처 검색 팝업 계약 (부모 ↔ 팝업 공용) */
export const CUSTOMER_SEARCH_POPUP_URL = '/popup/customer-search'
export const CUSTOMER_SEARCH_POPUP_NAME = 'customerSearch'

export const CUSTOMER_SEARCH_MSG = {
  SELECT: 'select-customer',
} as const

export interface CustomerSearchPopupData {
  /** 초기 검색어 */
  keyword?: string
}
