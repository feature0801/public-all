import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '../layout/MainLayout'
import { PopupLayout } from '../layout/PopupLayout'
import { HomePage } from '@/pages/home'
import { PopupDemoPage } from '@/pages/popup-demo'
import { CommonCodeDemoPage } from '@/pages/common-code-demo'
import { NotFoundPage } from '@/pages/not-found'
import { UserSearchPopup } from '@/pages/user-search-popup'
import { CustomerSearchPopup } from '@/pages/customer-search-popup'
import { OrderListPage } from '@/pages/order-list'

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
