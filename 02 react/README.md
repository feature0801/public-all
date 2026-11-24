# React Sample

다른 프로젝트에서 참고하기 위한 기본 구조 / 공통 로직 샘플 프로젝트.

- Vite + React 19 + TypeScript
- react-router-dom (data router)
- 경로 alias: `@/` → `src/`

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## 구조

```
src/
├── app/router.tsx          # 라우트 정의 (MainLayout / PopupLayout 분리)
├── layouts/                # MainLayout(헤더+메뉴), PopupLayout(팝업 전용)
├── pages/
│   ├── HomePage.tsx
│   ├── PopupDemoPage.tsx   # popup 유틸 사용 예제
│   └── popup/              # window.open 으로 열리는 페이지
├── shared/
│   ├── hooks/usePopupMessage.ts
│   ├── types/
│   └── utils/popup.ts
└── styles/global.css
```

## 상태관리 (zustand)

### 구조 / 규칙
```
src/
├── api/commonCodeApi.ts              # API 함수. USE_MOCK 이면 mocks 로 분기
├── mocks/                            # 더미 API (지연, 실패 시뮬레이션, 호출 로그)
│   ├── mockUtils.ts
│   ├── commonCodeMock.ts
│   └── data/commonCodes.ts
├── stores/
│   └── commonCode/
│       ├── commonCodeStore.ts        # 스토어 + React 밖 헬퍼(getCodeName ...)
│       └── useCommonCodes.ts         # 컴포넌트용 훅
└── shared/
    ├── api/http.ts                   # fetch 래퍼, ApiError
    ├── components/CodeSelect.tsx, CodeLabel.tsx
    └── constants/codeGroups.ts       # CODE_GROUP 상수
```

- 스토어는 **도메인별 폴더**(`stores/<domain>/`)로 나누고, 하나의 `create()` 에 state 와 actions 를 같이 둔다.
- 컴포넌트는 **selector 로 필요한 값만 구독**한다. 여러 값을 꺼낼 때는 `useShallow`.
- API 호출은 스토어 action 또는 `api/` 함수에서만 하고, 컴포넌트에서 `http` 를 직접 부르지 않는다.
- React 밖(유틸, 그리드 formatter)에서는 `useXxxStore.getState()` 기반 헬퍼를 사용한다.
- 미들웨어: `devtools`(개발 모드에서만, Redux DevTools 확장), 필요하면 `persist`.
- 실제 API 가 준비되면 `.env.*` 의 `VITE_USE_MOCK=false` 로 바꾼다.

### 공통코드 스토어
| 기능 | 설명 |
| --- | --- |
| 그룹 단위 캐시 | TTL 30분, `sessionStorage` 에 저장 → 새로고침해도 재조회 안 함 |
| 요청 묶기 | 같은 tick 에 여러 컴포넌트가 요청한 그룹을 API 1회로 조회 |
| 중복 요청 제거 | 조회 중인 그룹은 기존 요청을 기다림 |
| 사용 여부 | `useYn='N'` 은 선택 목록에서 제외, 라벨 표시에는 사용 |

```tsx
// 컴포넌트
<CodeSelect group={CODE_GROUP.USER_STATUS} value={v} onChange={setV} placeholder="전체" />
<CodeLabel group={CODE_GROUP.DEPT} code={user.dept} />
const { codes, loading, getName } = useCommonCodes(CODE_GROUP.GENDER)

// React 밖
getCodeName(CODE_GROUP.USER_STATUS, 'ACTIVE') // '활성'

// 강제 새로고침 / 캐시 비우기
useCommonCodeStore.getState().loadCodes([CODE_GROUP.DEPT], { force: true })
useCommonCodeStore.getState().clear()
```

공통코드 그룹을 추가하려면 `CODE_GROUP` 에 상수를 추가하고, mock 사용 중이면 `mocks/data/commonCodes.ts` 에 데이터를 추가한다.

## 검색조건 + Grid (`/samples/order`)

react-hook-form + zod + AG Grid. ERP 처럼 검색 필드가 많고 예외 규칙이 잦은 화면을 기준으로 한다.

### 조회 흐름
```
[조회 / Enter]
  ① 검증      orderSearchSchema (zod)          실패 → 첫 오류 필드 focus + alert, 필드 아래 메시지
  ② 변환      toOrderSearchParams(values)      화면 값 → API 파라미터 (이름/형식/조건부 제외)
  ③ 조회 전   beforeSearch(values, params)     false 반환 시 취소 (confirm 등)
  ④ 조회      grid.search(params)              + page/size/sort → orderApi.search
  ⑤ 서버 오류 ApiError.data.fieldErrors        serverFieldMap 으로 해당 필드에 오류 표시
```

### 화면 하나의 파일 구성 (`pages/order/`)
| 파일 | 역할 | 예외가 생기면 |
| --- | --- | --- |
| `orderSearchSchema.ts` | 폼 값 타입, 기본값, 검증 규칙 | `superRefine` 에 규칙 추가 (path 로 표시 위치 지정) |
| `orderSearchParams.ts` | 화면 값 → API 파라미터, 서버 필드명 매핑 | 해당 필드 변환 한 줄 수정 |
| `orderColumns.ts` | 그리드 컬럼 (`col.date()`, `col.code()` ...) | 컬럼 추가/수정 |
| `OrderListPage.tsx` | 검색 영역 배치 + 그리드 | 커스텀 필드는 `SearchItem` 안에 직접 JSX |

### 원칙
- **검증과 변환을 분리**: 스키마는 화면 값(`'2026-11-01'`, `'123-45-67890'`, `{code,name}`)만 검증하고, API 형식(`'20261101'`, `'1234567890'`, `custCd`)은 `toParams` 에서 만든다.
- **빈 값은 보내지 않음**: `cleanParams` 가 `''`, `null`, `undefined`, `[]` 를 제거. (`0`, `'N'` 은 유지)
- **페이지 이동/정렬은 마지막 조회 조건으로**: 조건을 바꾸고 조회를 누르지 않은 상태에서 페이지를 넘겨도 이전 조건 유지.
- **서버 페이징/정렬**: 그리드 정렬 클릭 → `sort=field,asc` 로 재조회 (`AppGrid serverSort`).

### 공통 모듈 (`shared/search`, `shared/grid`)
| 분류 | 항목 |
| --- | --- |
| 필드 | `TextField`(대문자 변환), `MaskedField`(사업자번호 등), `NumberRangeField`(콤마), `DateRangeField`(기간 버튼), `SelectField` / `RadioField` / `CheckboxGroupField`(공통코드 또는 고정 옵션), `CheckboxField`, `LookupField`(코드+명, 팝업 연동) |
| 검증 | `zText`, `zDate`, `zNumber`, `zBizNo`, `zLookup`, `refineDateRange`(필수/순서/최대기간), `refineNumberRange`, `refineRequiredIf`, 메시지 `MSG` |
| 변환 | `toYmd`, `toText`, `toDigits`, `toCsv`, `toYn`, `toStartOfDay`/`toEndOfDay`, `cleanParams` |
| 훅 | `useSearchForm`(검증→변환→조회 흐름), `useGridSearch`(페이징/정렬/race 방지) |
| 그리드 | `AppGrid`(테마, 한글, 서버 정렬, 공통코드 갱신 시 셀 다시 그림), `col.*` 컬럼 타입, `Pagination` |

### 샘플에 들어있는 예외 규칙
- 주문번호를 입력하면 기간 필수/최대 3개월 규칙 해제, API 에도 기간을 보내지 않음
- 주문상태 '취소' 선택 시 '취소건 포함' 체크 필수
- 출고일 기준 + 주문완료/결제완료 상태 조합 불가
- 거래처 없이 1개월 초과 조회 시 confirm (`beforeSearch`)
- 거래정지 거래처(C0099) 선택 시 서버 검증 오류 → 거래처 필드에 표시

## Window Popup (`src/shared/lib/popup`)

| API | 사용 위치 | 설명 |
| --- | --- | --- |
| `usePopup({ url, width, height, position, handlers, onClose })` | 부모 (컴포넌트) | `open(data)` / `openForResult(type, data)` / `update(data)` / `close()` / `isOpen`. handlers 는 항상 최신 state 사용, 언마운트 시 팝업 닫음 |
| `openPopup(url, name, options)` | 부모 (컴포넌트 밖) | 훅 없이 오픈. 차단 시 `PopupBlockedError`, 보낼 수 없는 data 면 `PopupDataError` |
| `openPopupForResult<T>(url, name, resultType, options)` | 부모 (컴포넌트 밖) | 팝업이 결과를 보내면 resolve, 그냥 닫히면 `null` |
| `closeAllPopups()` | 부모 | 이 창에서 연 팝업 모두 닫기 (로그아웃 등) |
| `usePopupData<T>()` | 팝업 | 부모가 넘긴 data 수신 (부모가 update 하면 갱신) |
| `sendToOpener(type, payload)` | 팝업 | 부모의 `handlers[type]` 실행 |
| `closeSelf(type?, payload?)` | 팝업 | 결과 전송 후 닫기 |

- `position`: `'center'`(부모 창 기준, 기본) / `'screen-center'`(모니터 기준) / `{ left, top }`. 모니터 밖으로 나가지 않게 보정
- data 는 연 시점에 **복사**되어 전달된다 → 부모/팝업 데이터는 서로 독립. 반영은 `update()`(부모→팝업), `handlers`(팝업→부모)로만
- 함수, AG Grid RowNode 등은 보낼 수 없다 → 그리드는 `getSelectedRows()` 를 넘긴다
- 같은 name 으로 다시 열면 이전 팝업은 닫힌 것으로 처리(`onClose`)하고 같은 창에 새로 로드한다
- `open()` 은 클릭 핸들러 안에서 바로 호출 (`await` 뒤나 `useEffect` 안이면 브라우저가 차단)

### 데이터 / 콜백 흐름

```
부모                                         팝업
open(data) / openPopup({ data, handlers }) ─▶ (로드)
          ◀── READY ──────────────────────  usePopupData()
          ── INIT(data 복사본) ────────────▶  data 수신
update(data)                ── INIT ──────▶  data 갱신
handlers[type](payload)     ◀─────────────  sendToOpener(type, payload)
openForResult 결과 / onClose ◀─────────────  closeSelf(type, payload)
```

```tsx
// 부모
const userPopup = usePopup({
  url: USER_SEARCH_POPUP_URL,
  width: 480,
  height: 600,
  handlers: { [USER_SEARCH_MSG.ADD]: (u: User) => addUser(u) }, // 팝업이 호출할 콜백
})
userPopup.open({ keyword, selectedIds })                                        // 화면 데이터 → 팝업
const user = await userPopup.openForResult<User>(USER_SEARCH_MSG.SELECT, { keyword }) // 결과 받기

// 팝업
const { data } = usePopupData<UserSearchPopupData>()
sendToOpener(USER_SEARCH_MSG.ADD, user)   // 부모 콜백 실행
closeSelf(USER_SEARCH_MSG.SELECT, user)   // 결과 보내고 닫기
```

### 새 팝업 추가하는 방법
1. 관련 도메인의 `model/xxxContract.ts` 에 URL, 메시지 type, data 타입 정의 (`domains/user/model/userSearchContract.ts` 참고) 후 도메인 `index.ts` 에서 export
2. `pages/xxx-popup/ui/XxxPopup.tsx` + `index.ts` 작성 후 `app/router/router.tsx` 의 `/popup` children 에 등록 → `PopupLayout`(메뉴 없음)으로 렌더링
3. 부모에서 `usePopup` (컴포넌트 밖이면 `openPopupForResult`) 로 호출
