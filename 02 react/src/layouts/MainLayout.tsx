import { NavLink, Outlet } from 'react-router-dom'

const menus = [
  { to: '/', label: '홈' },
  { to: '/samples/popup', label: 'Window Popup' },
  { to: '/samples/common-code', label: '공통코드 (zustand)' },
  { to: '/samples/order', label: '주문 조회 (검색+Grid)' },
]

export function MainLayout() {
  return (
    <div className="layout">
      <header className="layout-header">
        <span className="logo">React Sample</span>
      </header>
      <div className="layout-body">
        <nav className="layout-nav">
          {menus.map((m) => (
            <NavLink key={m.to} to={m.to} end className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
