import { useEffect, useRef, useState } from 'react'
import type { User } from '@/shared/types/user'
import {
  closeAllPopups,
  closePopup,
  openPopup,
  openPopupForResult,
  PopupBlockedError,
  sendToPopup,
  updatePopupData,
} from '@/shared/utils/popup'
import {
  USER_SEARCH_MSG,
  USER_SEARCH_POPUP_URL,
  type AddUserResult,
  type UserSearchPopupData,
} from './popup/userSearchContract'

const MULTI_POPUP = 'userSearchMulti'
const MAX_MULTI = 3

export function PopupDemoPage() {
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [multi, setMulti] = useState<User[]>([])
  const [notice, setNotice] = useState('저장 전에 확인해주세요')
  const [log, setLog] = useState<string[]>([])

  // handler 는 팝업을 열 때 등록되므로, 최신 state 를 읽기 위해 ref 사용
  const multiRef = useRef(multi)

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30))

  const handleError = (e: unknown) => {
    if (e instanceof PopupBlockedError) alert(e.message)
    else throw e
  }

  /* 1) 화면 데이터 전달 + 결과 받기 ------------------------------------ */
  const handleSelectUser = async () => {
    const data: UserSearchPopupData = { keyword, selectedIds: selected ? [selected.id] : [] }
    try {
      addLog(`단일 선택 팝업 오픈 — data: ${JSON.stringify(data)}`)
      const user = await openPopupForResult<User>(USER_SEARCH_POPUP_URL, 'userSearch', USER_SEARCH_MSG.SELECT, {
        width: 480,
        height: 600,
        data,
      })
      if (user) {
        setSelected(user)
        addLog(`선택 결과 수신: ${user.name}`)
      } else {
        addLog('선택 없이 팝업이 닫힘 (null)')
      }
    } catch (e) {
      handleError(e)
    }
  }

  /* 2) 콜백 전달 + 반환값 ---------------------------------------------- */
  // 팝업이 requestOpener('add-user', user) 로 호출하면 실행되고, 반환값이 팝업으로 돌아간다
  const handleAddUser = (user: User): AddUserResult => {
    const current = multiRef.current
    if (current.some((u) => u.id === user.id)) {
      return { ok: false, message: `${user.name}은(는) 이미 추가되었습니다.` }
    }
    if (current.length >= MAX_MULTI) {
      return { ok: false, message: `최대 ${MAX_MULTI}명까지 추가할 수 있습니다.` }
    }
    const next = [...current, user]
    multiRef.current = next
    setMulti(next)
    addLog(`handler 'add-user' 호출됨: ${user.name}`)
    return { ok: true, message: `${user.name} 추가됨 (${next.length}/${MAX_MULTI})` }
  }

  const multiKeywordRef = useRef('')

  const handleOpenMulti = () => {
    multiKeywordRef.current = keyword
    try {
      openPopup(USER_SEARCH_POPUP_URL, MULTI_POPUP, {
        width: 480,
        height: 640,
        focusIfOpened: true,
        data: { multi: true, keyword, selectedIds: multi.map((u) => u.id) } satisfies UserSearchPopupData,
        handlers: { [USER_SEARCH_MSG.ADD]: handleAddUser },
        onClose: () => addLog('다중 선택 팝업 닫힘 (onClose)'),
      })
      addLog('다중 선택 팝업 오픈')
    } catch (e) {
      handleError(e)
    }
  }

  // 부모 화면의 목록이 바뀌면 열려 있는 팝업 data 도 갱신 → 팝업의 "선택됨" 표시가 동기화됨
  useEffect(() => {
    multiRef.current = multi
    updatePopupData(MULTI_POPUP, {
      multi: true,
      // 팝업을 연 시점의 검색어 유지 (부모 입력 중에 팝업 검색어가 바뀌지 않도록)
      keyword: multiKeywordRef.current,
      selectedIds: multi.map((u) => u.id),
    } satisfies UserSearchPopupData)
  }, [multi])

  const handleRemove = (id: number) => setMulti((prev) => prev.filter((u) => u.id !== id))

  /* 3) 부모 → 팝업 메시지 ---------------------------------------------- */
  const handleSendNotice = () => {
    const ok = sendToPopup(MULTI_POPUP, USER_SEARCH_MSG.NOTICE, notice)
    addLog(ok ? `팝업에 알림 전송: ${notice}` : '열린 다중 선택 팝업이 없습니다')
  }

  /* 4) 기타 ------------------------------------------------------------ */
  const handleOpenExternal = () => {
    try {
      openPopup('https://react.dev', 'external', { width: 1000, height: 700 })
      addLog('외부 URL 팝업 오픈')
    } catch (e) {
      handleError(e)
    }
  }

  return (
    <section>
      <h1>Window Popup</h1>
      <p className="desc">
        <code>src/shared/utils/popup.ts</code> 사용 예제. 팝업은 현재 브라우저 창 기준 가운데에 열립니다.
      </p>

      <div className="card">
        <h2>1. 화면 데이터 → 팝업, 결과 받기</h2>
        <p className="desc">
          <code>openPopupForResult(url, name, 'select-user', {'{ data }'})</code> — 입력한 검색어와 현재 선택값을
          팝업에 넘기고, 선택 결과를 Promise 로 받습니다. 그냥 닫으면 <code>null</code>.
        </p>
        <div className="form-row">
          <label>검색어</label>
          <input className="input inline" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 개발" />
          <button onClick={handleSelectUser}>사용자 선택</button>
        </div>
        <div className="result">선택된 사용자: {selected ? `${selected.name} (${selected.dept})` : '-'}</div>
      </div>

      <div className="card">
        <h2>2. 콜백 전달 — handlers + 반환값</h2>
        <p className="desc">
          <code>openPopup(url, name, {'{ data, handlers, onClose }'})</code> — 팝업이{' '}
          <code>requestOpener('add-user', user)</code> 를 호출하면 부모의 콜백이 실행되고, 반환값(성공/실패 메시지)이
          팝업으로 돌아갑니다. 중복 또는 {MAX_MULTI}명 초과 시 거절. 부모 목록이 바뀌면 <code>updatePopupData</code>로
          팝업도 동기화됩니다.
        </p>
        <div className="btn-row">
          <button onClick={handleOpenMulti}>다중 선택 팝업 열기</button>
          <button className="secondary" onClick={() => closePopup(MULTI_POPUP)}>
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
        <h2>3. 부모 → 팝업 메시지 — sendToPopup</h2>
        <p className="desc">
          2번 팝업이 열려 있을 때 전송하세요. 팝업은 <code>usePopupMessage('notice', ...)</code> 로 수신합니다.
        </p>
        <div className="form-row">
          <input className="input inline" value={notice} onChange={(e) => setNotice(e.target.value)} />
          <button onClick={handleSendNotice}>팝업에 전송</button>
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
