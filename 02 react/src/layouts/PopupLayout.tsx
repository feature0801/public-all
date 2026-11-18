import { Outlet } from 'react-router-dom'

/** window.open 으로 열리는 팝업 전용 레이아웃 (헤더/메뉴 없음) */
export function PopupLayout() {
  return (
    <div className="popup-layout">
      <Outlet />
    </div>
  )
}
