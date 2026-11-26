/**
 * 거래처 검색 팝업 계약 (부모 ↔ 팝업 공용)
 * - 결과 : closeSelf(customer) → 부모의 openForResult 가 Customer 를 받음
 */
export const CUSTOMER_SEARCH_POPUP_URL = '/popup/customer-search'

/** 부모 → 팝업 으로 넘기는 데이터 */
export interface CustomerSearchPopupData {
  /** 초기 검색어 */
  keyword?: string
}
