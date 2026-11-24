// public API, 외부에서는 이 파일로만 import
export { customerApi, type Customer } from './api/customerApi'
export { customerKeys, customerQueries } from './model/customerQueries'
export {
  CUSTOMER_SEARCH_POPUP_URL,
  CUSTOMER_SEARCH_POPUP_NAME,
  CUSTOMER_SEARCH_MSG,
  type CustomerSearchPopupData,
} from './model/customerSearchContract'
