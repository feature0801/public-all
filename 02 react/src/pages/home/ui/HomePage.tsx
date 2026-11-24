import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section>
      <h1>React Sample Project</h1>
      <p className="desc">다른 프로젝트에서 참고하기 위한 기본 구조와 공통 로직 모음입니다.</p>

      <h2>디렉토리 구조</h2>
      <pre className="code">{`src/
├── app/            # 앱 진입 설정 (router 등)
├── api/            # 도메인별 API 함수 (mock 분기 포함)
├── mocks/          # 더미 API / 더미 데이터
├── stores/         # zustand 스토어 (도메인별 폴더)
│   └── commonCode/
├── layouts/        # MainLayout, PopupLayout
├── pages/          # 라우트 단위 페이지
│   ├── order/      # 화면별 폴더 (스키마 / 파라미터 변환 / 컬럼 / 페이지)
│   └── popup/      # window.open 으로 열리는 팝업 페이지
├── shared/
│   ├── api/        # http 클라이언트
│   ├── search/     # 검색 폼 공통 (필드, 검증, 파라미터 변환, 훅)
│   ├── grid/       # AG Grid 래퍼, 컬럼 타입, 페이지네이션
│   ├── components/ # 공통 컴포넌트 (CodeSelect, CodeLabel ...)
│   ├── constants/  # 상수 (공통코드 그룹 ...)
│   ├── hooks/      # 공통 훅
│   ├── types/      # 공통 타입
│   └── utils/      # 공통 유틸 (popup.ts ...)
└── styles/         # 전역 스타일`}</pre>

      <h2>샘플 목록</h2>
      <ul className="sample-list">
        <li>
          <Link to="/samples/popup">Window Popup</Link>
          <span> — 팝업 열기/닫기, 차단 감지, 부모↔팝업 데이터 전달</span>
        </li>
        <li>
          <Link to="/samples/common-code">공통코드 (zustand)</Link>
          <span> — 공통코드 캐시 스토어, 요청 묶기, CodeSelect / CodeLabel</span>
        </li>
        <li>
          <Link to="/samples/order">주문 조회 (검색+Grid)</Link>
          <span> — 검색조건 검증(zod), API 파라미터 변환, AG Grid 서버 페이징/정렬</span>
        </li>
      </ul>
    </section>
  )
}
