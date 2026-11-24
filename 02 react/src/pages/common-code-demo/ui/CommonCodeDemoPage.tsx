import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { mockConfig, onMockApiCall, type MockApiLog } from '@/mocks/mockUtils'
import {
  CODE_GROUP,
  CodeLabel,
  CodeSelect,
  getCodeName,
  useCommonCodes,
  useCommonCodeStore,
} from '@/domains/common-code'

/** 서버에서 받은 데이터라고 가정 — 코드 값만 들어 있음 */
const SAMPLE_USERS = [
  { id: 1, name: '김철수', dept: 'D100', status: 'ACTIVE', gender: 'M' },
  { id: 2, name: '이영희', dept: 'D200', status: 'DORMANT', gender: 'F' },
  { id: 3, name: '박민수', dept: 'D900', status: 'WITHDRAWN', gender: 'M' },
  { id: 4, name: '최지은', dept: 'D300', status: 'LOCKED', gender: 'F' },
]

const ALL_GROUPS = Object.values(CODE_GROUP)

export function CommonCodeDemoPage() {
  const [filter, setFilter] = useState({ status: '', dept: '', orderStatus: '' })
  const [apiLogs, setApiLogs] = useState<MockApiLog[]>([])
  const [failNext, setFailNext] = useState(false)

  // mock API 호출 로그 구독
  useEffect(
    () =>
      onMockApiCall((log) => {
        setApiLogs((prev) => [log, ...prev].slice(0, 20))
        setFailNext(mockConfig.failNext)
      }),
    [],
  )

  // 스토어에서 여러 값을 꺼낼 때는 useShallow 로 묶어서 불필요한 리렌더링 방지
  const { loadedAt, status, error, loadCodes, clear } = useCommonCodeStore(
    useShallow((s) => ({ loadedAt: s.loadedAt, status: s.status, error: s.error, loadCodes: s.loadCodes, clear: s.clear })),
  )

  // 훅으로 직접 목록 사용 (커스텀 UI 를 만들 때)
  const { codes: genderCodes } = useCommonCodes(CODE_GROUP.GENDER)
  const [gender, setGender] = useState('')

  const filteredUsers = SAMPLE_USERS.filter(
    (u) => (!filter.status || u.status === filter.status) && (!filter.dept || u.dept === filter.dept) && (!gender || u.gender === gender),
  )

  const toggleFailNext = () => {
    mockConfig.failNext = !mockConfig.failNext
    setFailNext(mockConfig.failNext)
  }

  return (
    <section>
      <h1>공통코드 (zustand)</h1>
      <p className="desc">
        <code>src/stores/commonCode</code> 사용 예제. API 는 <code>src/mocks</code> 의 더미 API(지연 {mockConfig.delay}ms)를
        사용합니다.
      </p>

      <div className="card">
        <h2>1. CodeSelect — 여러 컴포넌트가 동시에 요청해도 API 1회</h2>
        <p className="desc">
          아래 select 3개가 각자 <code>useCommonCodes</code> 를 호출하지만, 같은 tick 의 요청은 묶여서 오른쪽 API 로그에 1건만
          찍힙니다. 이후에는 캐시(sessionStorage, 30분)를 사용해 새로고침해도 재조회하지 않습니다. 사용 안 함 코드(탈퇴,
          구 TF팀)는 목록에서 제외됩니다.
        </p>
        <div className="form-grid">
          <label>회원상태</label>
          <CodeSelect
            group={CODE_GROUP.USER_STATUS}
            value={filter.status}
            onChange={(v) => setFilter((f) => ({ ...f, status: v }))}
            placeholder="전체"
          />
          <label>부서</label>
          <CodeSelect
            group={CODE_GROUP.DEPT}
            value={filter.dept}
            onChange={(v) => setFilter((f) => ({ ...f, dept: v }))}
            placeholder="전체"
          />
          <label>주문상태</label>
          <CodeSelect
            group={CODE_GROUP.ORDER_STATUS}
            value={filter.orderStatus}
            onChange={(v) => setFilter((f) => ({ ...f, orderStatus: v }))}
            placeholder="선택"
          />
          <label>성별 (훅 직접 사용)</label>
          <div className="radio-row">
            {[{ code: '', name: '전체' }, ...genderCodes].map((c) => (
              <label key={c.code}>
                <input type="radio" name="gender" checked={gender === c.code} onChange={() => setGender(c.code)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>2. CodeLabel — 코드 값을 표시명으로</h2>
        <p className="desc">
          서버 데이터에는 코드 값만 있습니다. <code>&lt;CodeLabel group code /&gt;</code> 로 표시하며, 사용 안 함 코드도
          이름이 나옵니다. 위 조건으로 필터링됩니다.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>이름</th>
              <th>부서</th>
              <th>상태</th>
              <th>성별</th>
              <th>getCodeName (React 밖)</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>
                  <CodeLabel group={CODE_GROUP.DEPT} code={u.dept} />
                </td>
                <td>
                  <CodeLabel group={CODE_GROUP.USER_STATUS} code={u.status} />
                </td>
                <td>
                  <CodeLabel group={CODE_GROUP.GENDER} code={u.gender} />
                </td>
                <td className="muted">{getCodeName(CODE_GROUP.USER_STATUS, u.status)}</td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  조건에 맞는 사용자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="split">
        <div className="card">
          <h2>3. 스토어 상태</h2>
          <div className="btn-row">
            <button onClick={() => void loadCodes(ALL_GROUPS, { force: true })}>전체 새로고침 (force)</button>
            <button className="secondary" onClick={() => clear()}>
              캐시 비우기
            </button>
            <button className={failNext ? 'danger' : 'secondary'} onClick={toggleFailNext}>
              {failNext ? '다음 요청 실패 ✓' : '다음 요청 실패시키기'}
            </button>
          </div>
          {error && <p className="status fail">{error}</p>}
          <table className="table compact">
            <thead>
              <tr>
                <th>그룹</th>
                <th>상태</th>
                <th>조회 시각</th>
              </tr>
            </thead>
            <tbody>
              {ALL_GROUPS.map((g) => (
                <tr key={g}>
                  <td>{g}</td>
                  <td>
                    <span className={`badge ${status[g] ?? (loadedAt[g] ? 'cached' : 'idle')}`}>
                      {status[g] ?? (loadedAt[g] ? 'cached' : 'idle')}
                    </span>
                  </td>
                  <td className="muted">{loadedAt[g] ? new Date(loadedAt[g]).toLocaleTimeString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="desc small">
            cached = sessionStorage 에서 복원된 값. Redux DevTools 확장이 있으면 <code>commonCode</code> 스토어의 action
            이력을 볼 수 있습니다.
          </p>
        </div>

        <div className="card">
          <h2>API 호출 로그</h2>
          <pre className="code log">
            {apiLogs.length === 0
              ? '아직 호출 없음 (캐시 사용 중일 수 있음)'
              : apiLogs
                  .map(
                    (l) =>
                      `#${l.id} ${l.at.toLocaleTimeString()} ${l.ok ? '✅' : '❌'} ${l.api} ${JSON.stringify(l.params)} (${l.ms}ms)`,
                  )
                  .join('\n')}
          </pre>
        </div>
      </div>
    </section>
  )
}
