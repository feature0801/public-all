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

## Window Popup 유틸 (`src/shared/utils/popup.ts`)

| 함수 | 사용 위치 | 설명 |
| --- | --- | --- |
| `openPopup(url, name, options)` | 부모 | 현재 창 기준 가운데 정렬로 오픈. 차단 시 `PopupBlockedError` throw. `focusIfOpened` 로 재사용. `data` / `handlers` / `onClose` 지정 |
| `openPopupForResult<T>(url, name, resultType, options)` | 부모 | 팝업이 결과를 보내면 resolve, 그냥 닫히면 `null` |
| `updatePopupData(name, data)` | 부모 | 열린 팝업의 data 갱신 (팝업 재렌더링) |
| `sendToPopup(name, type, payload)` | 부모 | 열린 팝업에 메시지 전송 |
| `closePopup(name)` / `closeAllPopups()` | 부모 | 이 창에서 연 팝업 닫기 |
| `usePopupData<T>()` | 팝업 | 부모가 넘긴 data 수신 |
| `usePopupMessage<T>(type, handler)` | 양쪽 | 메시지 수신 훅 |
| `sendToOpener(type, payload)` | 팝업 | 부모의 `handlers[type]` 실행 (단방향) |
| `requestOpener<R>(type, payload)` | 팝업 | 부모의 `handlers[type]` 실행 후 **반환값**을 Promise 로 받음 |
| `closeSelf(type?, payload?)` | 팝업 | 결과 전송 후 닫기 |

### 데이터 / 콜백 흐름

```
부모                                         팝업
openPopup({ data, handlers })  ── open ──▶   (로드)
          ◀── READY ──────────────────────  usePopupData()
          ── INIT(data) ──────────────────▶  data 수신
updatePopupData(name, data) ── INIT ──────▶  data 갱신
sendToPopup(name, type)     ──────────────▶  usePopupMessage(type)
handlers[type](payload)     ◀─────────────  sendToOpener(type, payload)
handlers[type] 반환값       ── RESPONSE ──▶  await requestOpener(type, payload)
onClose()                   ◀── 닫힘 감지 ──  closeSelf()
```

함수는 `postMessage` 로 직접 넘길 수 없어서(structured clone 불가), 부모가 콜백을 `handlers` 로 등록하고 팝업이 type(이름)으로 호출하는 방식이다.

```tsx
// 부모
openPopup(USER_SEARCH_POPUP_URL, 'userSearchMulti', {
  data: { keyword, selectedIds },                                // 화면 데이터 → 팝업
  handlers: { 'add-user': (u: User) => ({ ok: true }) },          // 팝업이 호출할 콜백
  onClose: () => console.log('closed'),
})

// 팝업
const { data } = usePopupData<UserSearchPopupData>()
const res = await requestOpener<AddUserResult>('add-user', user)  // 콜백 반환값 수신
```

### 새 팝업 추가하는 방법
1. `pages/popup/xxxContract.ts` 에 URL, 메시지 type, data/결과 타입 정의 (`userSearchContract.ts` 참고)
2. `pages/popup/XxxPopup.tsx` 작성 후 `router.tsx` 의 `/popup` children 에 등록 → `PopupLayout`(메뉴 없음)으로 렌더링
3. 부모에서 `openPopup` / `openPopupForResult` 로 호출
