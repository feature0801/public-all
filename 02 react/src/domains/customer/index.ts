// public API, 외부에서는 이 파일로만 import
export { customerApi, type Customer } from './api/customerApi'
export { customerKeys, customerQueries } from './model/customerQueries'
export {
  CUSTOMER_SEARCH_POPUP_URL,
  type CustomerSearchPopupData,
} from './model/customerSearchContract'
