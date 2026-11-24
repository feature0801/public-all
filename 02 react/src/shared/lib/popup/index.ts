// public API, 외부에서는 이 파일로만 import
export {
  POPUP_MESSAGE_SOURCE,
  POPUP_INTERNAL_TYPE,
  PopupBlockedError,
  PopupDataError,
  isPopupMessage,
  isPopupOpen,
  openPopup,
  openPopupForResult,
  updatePopupData,
  sendToPopup,
  closePopup,
  closeAllPopups,
  isOpenedAsPopup,
  sendToOpener,
  requestOpener,
  closeSelf,
  type PopupMessage,
  type PopupHandlers,
  type PopupPosition,
  type PopupOptions,
} from './popup'
export { usePopup, type UsePopupConfig } from './usePopup'
export { usePopupData } from './usePopupData'
export { usePopupMessage } from './usePopupMessage'
