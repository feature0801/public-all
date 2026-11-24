// public API, 외부에서는 이 파일로만 import
export {
  PopupBlockedError,
  PopupDataError,
  openPopup,
  openPopupForResult,
  closeAllPopups,
  isOpenedAsPopup,
  sendToOpener,
  closeSelf,
  type PopupPosition,
  type PopupOptions,
} from './popup'
export { usePopup, type UsePopupConfig } from './usePopup'
export { usePopupData } from './usePopupData'
