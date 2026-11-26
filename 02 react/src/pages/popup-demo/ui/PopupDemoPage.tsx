import { useEffect, useRef, useState } from 'react'
import { USER_SEARCH_MSG, USER_SEARCH_POPUP_URL, type User, type UserSearchPopupData } from '@/domains/user'
import { closeAllPopups, usePopup, type PopupPosition } from '@/shared/lib/popup'

const MAX_MULTI = 3

const POSITION_OPTIONS: { label: string; value: PopupPosition }[] = [
  { label: '브라우저 창 가운데 (기본)', value: 'center' },
  { label: '모니터 가운데', value: 'screen-center' },
  { label: '모니터 좌상단 (0, 0)', value: { left: 0, top: 0 } },
  { label: '모니터 우하단 (보정됨)', value: { left: 99999, top: 99999 } },
]

export function PopupDemoPage() {
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [multi, setMulti] = useState<User[]>([])
  const [positionIdx, setPositionIdx] = useState(0)
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30))

  /* 1) 화면 데이터 전달 + 결과 받기 ------------------------------------ */
  const singlePopup = usePopup({ url: USER_SEARCH_POPUP_URL, name: 'userSearch', width: 480, height: 600 })

  const handleSelectUser = async () => {
    const data: UserSearchPopupData = { keyword, selectedIds: selected ? [selected.id] : [] }
    addLog(`단일 선택 팝업 오픈 — data: ${JSON.stringify(data)}`)
    // 팝업의 closeSelf(user) 값. 그냥 닫히거나 차단되면 null (차단 alert 는 라이브러리가 띄움)
    const user: User | null = await singlePopup.openForResult(data)
    if (user) {
      setSelected(user)
      addLog(`선택 결과 수신: ${user.name}`)
    } else {
      addLog('선택 없이 팝업이 닫힘 (null)')
    }
  }

  /* 2) 팝업 → 부모 콜백 + 부모 → 팝업 data 갱신 ------------------------- */
  // 팝업이 sendToOpener('add-user', user) 로 호출하면 실행된다.
  // usePopup 이 handlers 를 ref 로 관리하므로 여기서 multi state 를 그대로 읽어도 항상 최신값이다.
  const handleAddUser = (user: User) => {
    // 팝업에서도 막지만, 부모가 최종 검증
    if (multi.some((u) => u.id === user.id) || multi.length >= MAX_MULTI) return
    setMulti([...multi, user])
    addLog(`handler 'add-user' 호출됨: ${user.name}`)
  }

  const multiPopup = usePopup({
    url: USER_SEARCH_POPUP_URL,
    name: 'userSearchMulti',
    width: 480,
    height: 640,
    handlers: { [USER_SEARCH_MSG.ADD]: handleAddUser },
    onClose: () => addLog('다중 선택 팝업 닫힘 (onClose)'),
  })

  // 팝업을 연 시점의 검색어 (update 는 data 전체를 바꾸므로, 부모 입력 중에 팝업 검색어가 바뀌지 않도록 보관)
  const multiKeywordRef = useRef('')
  const buildMultiData = (users: User[]): UserSearchPopupData => ({
    multi: true,
    max: MAX_MULTI,
    keyword: multiKeywordRef.current,
    selectedIds: users.map((u) => u.id),
  })

  const handleOpenMulti = () => {
    multiKeywordRef.current = keyword
    multiPopup.open(buildMultiData(multi))
    addLog('다중 선택 팝업 오픈')
  }

  // 부모 화면의 목록이 바뀌면 열려 있는 팝업 data 도 갱신 → 팝업의 "선택됨" 표시가 동기화됨
  const { update: updateMulti } = multiPopup
  useEffect(() => {
    updateMulti(buildMultiData(multi)) // buildMultiData 는 ref 만 읽으므로 의존성 불필요
  }, [multi, updateMulti])

  const handleRemove = (id: number) => setMulti((prev) => prev.filter((u) => u.id !== id))

  /* 3) 위치 지정 ------------------------------------------------------- */
  // 설정값은 열 때마다 최신 render 값을 읽으므로 state 로 바로 지정 가능
  const positionPopup = usePopup({
    url: USER_SEARCH_POPUP_URL,
    name: 'positionDemo',
    width: 420,
    height: 360,
    position: POSITION_OPTIONS[positionIdx].value,
  })

  const handleOpenPosition = () => {
    positionPopup.open({ keyword: '' })
    addLog(`위치 지정 팝업 오픈: ${POSITION_OPTIONS[positionIdx].label}`)
  }

  /* 4) 기타 ------------------------------------------------------------ */
  // 외부 URL 은 postMessage 통신 불가, 단순 오픈만
  const externalPopup = usePopup({ url: 'https://react.dev', width: 1000, height: 700, position: 'screen-center' })
  const handleOpenExternal = () => {
    externalPopup.open()
    addLog('외부 URL 팝업 오픈')
  }

  return (
    <section>
      <h1>Window Popup</h1>
      <p className="desc">
        <code>src/shared/lib/popup</code> 사용 예제. 부모 컴포넌트는 <code>usePopup</code>, 팝업 페이지는{' '}
        <code>usePopupData</code> / <code>sendToOpener</code> / <code>closeSelf</code> 를 사용합니다. 데이터는 복사되어
        전달되므로 부모와 팝업의 데이터는 서로 독립입니다.
      </p>

      <div className="card">
        <h2>1. 화면 데이터 → 팝업, 결과 받기</h2>
        <p className="desc">
          <code>popup.openForResult(data)</code> — 입력한 검색어와 현재 선택값을
          팝업에 넘기고, 팝업이 <code>closeSelf(user)</code> 로 보낸 결과를 Promise 로 받습니다. 그냥 닫으면 <code>null</code>.
        </p>
        <div className="form-row">
          <label>검색어</label>
          <input className="input inline" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 개발" />
          <button onClick={handleSelectUser}>사용자 선택</button>
        </div>
        <div className="result">선택된 사용자: {selected ? `${selected.name} (${selected.dept})` : '-'}</div>
      </div>

      <div className="card">
        <h2>2. 팝업 → 부모 콜백, 부모 → 팝업 data 갱신</h2>
        <p className="desc">
          <code>usePopup({'{ url, handlers, onClose }'})</code> + <code>popup.open(data)</code> — 팝업이{' '}
          <code>sendToOpener('add-user', user)</code> 를 호출하면 부모의 콜백이 실행됩니다. handler 안에서 state 를
          그대로 읽어도 항상 최신값입니다. 부모 목록이 바뀌면 <code>popup.update(data)</code>로 팝업도 동기화되어 이미
          추가된 사용자와 {MAX_MULTI}명 초과는 팝업에서 비활성화됩니다.
        </p>
        <div className="btn-row">
          <button onClick={handleOpenMulti}>다중 선택 팝업 열기</button>
          <button className="secondary" onClick={multiPopup.close} disabled={!multiPopup.isOpen}>
            팝업 닫기
          </button>
          <button className="secondary" onClick={() => setMulti([])}>
            목록 비우기
          </button>
        </div>
        <div className="result">
          {multi.length === 0
            ? '추가된 사용자 없음'
            : multi.map((u) => (
                <span key={u.id} className="chip">
                  {u.name}
                  <button className="chip-remove" onClick={() => handleRemove(u.id)} aria-label={`${u.name} 제거`}>
                    ×
                  </button>
                </span>
              ))}
        </div>
      </div>

      <div className="card">
        <h2>3. 위치 지정 — position</h2>
        <p className="desc">
          <code>'center'</code>(브라우저 창 기준, 기본) / <code>'screen-center'</code>(모니터 기준) /{' '}
          <code>{'{ left, top }'}</code>(모니터 좌표). 화면 밖 좌표는 현재 모니터 안으로 보정됩니다.
        </p>
        <div className="form-row">
          <select className="select" value={positionIdx} onChange={(e) => setPositionIdx(Number(e.target.value))}>
            {POSITION_OPTIONS.map((o, i) => (
              <option key={o.label} value={i}>
                {o.label}
              </option>
            ))}
          </select>
          <button onClick={handleOpenPosition}>팝업 열기</button>
        </div>
      </div>

      <div className="card">
        <h2>4. 기타</h2>
        <div className="btn-row">
          <button onClick={handleOpenExternal}>외부 URL 팝업</button>
          <button className="secondary" onClick={closeAllPopups}>
            열린 팝업 모두 닫기
          </button>
        </div>
      </div>

      <div className="card">
        <h2>로그</h2>
        <pre className="code log">{log.join('\n') || '-'}</pre>
      </div>
    </section>
  )
}
