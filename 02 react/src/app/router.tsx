import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { PopupLayout } from '@/layouts/PopupLayout'
import { HomePage } from '@/pages/HomePage'
import { PopupDemoPage } from '@/pages/PopupDemoPage'
import { CommonCodeDemoPage } from '@/pages/CommonCodeDemoPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { UserSearchPopup } from '@/pages/popup/UserSearchPopup'
import { CustomerSearchPopup } from '@/pages/popup/CustomerSearchPopup'
import { OrderListPage } from '@/pages/order/OrderListPage'

/**
 * 라우트 구성
 * - MainLayout  : 헤더/사이드 메뉴가 있는 일반 페이지
 * - PopupLayout : window.open 으로 열리는 팝업 전용 페이지 (메뉴 없음)
 */
export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/samples/popup', element: <PopupDemoPage /> },
      { path: '/samples/common-code', element: <CommonCodeDemoPage /> },
      { path: '/samples/order', element: <OrderListPage /> },
    ],
  },
  {
    path: '/popup',
    element: <PopupLayout />,
    children: [
      { path: 'user-search', element: <UserSearchPopup /> },
      { path: 'customer-search', element: <CustomerSearchPopup /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
