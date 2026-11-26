/**
 * Window Popup 유틸
 *
 * [부모] 컴포넌트 안에서는 usePopup 훅만 사용한다 (언마운트 시 팝업 닫기, 최신 handlers 보장).
 *       아래 함수는 컴포넌트 밖(일반 함수)에서 쓸 때만 사용.
 * - openPopup(url, name, { width, height, position, data, handlers, onClose, onBlocked })
 * - openPopupForResult(url, name, options) : 팝업이 closeSelf(result) 로 보낸 값을 Promise 로 (그냥 닫히면 null)
 * - closeAllPopups()
 *
 * [팝업]
 * - usePopupData()                 : 부모가 넘긴 data (부모가 update 하면 갱신)
 * - sendToOpener(type, payload)    : 부모의 handlers[type] 실행 (팝업은 열린 채로)
 * - closeSelf(result?)             : 결과를 보내고 닫기. 인자 없이 호출하면 그냥 닫기(부모는 null 을 받음)
 *
 * - 데이터는 postMessage(structured clone)로 "복사"되어 전달된다 → 부모와 팝업의 데이터는 서로 독립.
 * - 함수는 보낼 수 없으므로, 콜백은 부모에 등록하고 팝업이 이름(type)으로 호출한다.
 * - 같은 name 으로 다시 열면 이전 팝업은 닫힌 것으로 처리(onClose)하고 같은 창에 새로 로드한다.
 * - 팝업이 차단되면 기본으로 alert 를 띄운다 (onBlocked 로 변경 가능).
 */

const SOURCE = 'app-popup'
/** 팝업 → 부모 : 로드 완료, data 요청 */
const READY = '__popup_ready__'
/** 부모 → 팝업 : data 전달 */
const INIT = '__popup_init__'
/** 팝업 → 부모 : closeSelf(result) 의 결과 */
const RESULT = '__popup_result__'

const BLOCKED_MESSAGE = '팝업이 차단되었습니다. 브라우저의 팝업 차단 설정을 확인해주세요.'

/**
 * 팝업 위치 (어느 경우든 모니터 밖으로 나가지 않게 보정)
 * - 'center'        : 부모 브라우저 창 기준 가운데 (기본)
 * - 'screen-center' : 부모 창이 있는 모니터 기준 가운데
 * - { left, top }   : 모니터 좌표(px)
 */
export type PopupPosition = 'center' | 'screen-center' | { left: number; top: number }

export interface PopupOptions {
  /** 기본 600 */
  width?: number
  /** 기본 500 */
  height?: number
  /** 기본 'center' */
  position?: PopupPosition
  /** 팝업에 넘길 데이터. 연 시점에 복사된다 (함수, AG Grid RowNode 등은 불가) */
  data?: any
  /** 팝업이 sendToOpener(type, payload) 로 호출할 콜백. key 가 type */
  handlers?: Record<string, (payload: any) => void>
  /** 팝업이 닫혔을 때 (사용자가 닫음 / closePopup / 같은 name 으로 다시 열림) */
  onClose?: () => void
  /** 팝업이 차단되었을 때. 기본은 alert */
  onBlocked?: () => void
}

/** 팝업에 보낼 수 없는 값(함수, 클래스 인스턴스, Proxy 등)이 있을 때. 개발자 실수이므로 그대로 throw */
export class PopupDataError extends Error {
  constructor(cause: any) {
    super(
      '팝업에 전달할 수 없는 데이터가 포함되어 있습니다. 순수 데이터(객체/배열/문자열/숫자/Date 등)만 넘겨주세요. ' +
        `그리드라면 getSelectedNodes() 대신 getSelectedRows() 를 사용하세요. (${cause?.message ?? cause})`,
      { cause },
    )
    this.name = 'PopupDataError'
  }
}

/* ------------------------------------------------------------------ */
/* 공통                                                                */
/* ------------------------------------------------------------------ */

/** from 창에서 온 우리 메시지인지 (확장 프로그램 등 다른 postMessage 무시) */
function isPopupMessage(event: MessageEvent, from: Window | null): boolean {
  return (
    !!from &&
    event.source === from &&
    event.origin === window.location.origin &&
    event.data?.source === SOURCE &&
    typeof event.data.type === 'string'
  )
}

function post(target: Window, type: string, payload?: any): boolean {
  if (target.closed) return false
  try {
    target.postMessage({ source: SOURCE, type, payload }, window.location.origin)
  } catch (e: any) {
    throw e?.name === 'DataCloneError' ? new PopupDataError(e) : e
  }
  return true
}

/** postMessage 와 같은 방식으로 미리 복사 → 보낼 수 없는 값은 창을 열기 전에 에러, 연 시점 값으로 고정 */
function snapshot(data: any): any {
  try {
    return structuredClone(data)
  } catch (e) {
    throw new PopupDataError(e)
  }
}

/* ------------------------------------------------------------------ */
/* 부모 창                                                              */
/* ------------------------------------------------------------------ */

function buildFeatures({ width = 600, height = 500, position = 'center' }: PopupOptions): string {
  // 부모 창이 있는 모니터의 사용 가능 영역. 멀티 모니터에서는 음수일 수 있다 (availLeft/Top 은 비표준)
  const s: any = window.screen
  const area = { left: s.availLeft ?? 0, top: s.availTop ?? 0, width: s.availWidth, height: s.availHeight }

  let left: number
  let top: number
  if (position === 'center') {
    left = window.screenX + (window.outerWidth - width) / 2
    top = window.screenY + (window.outerHeight - height) / 2
  } else if (position === 'screen-center') {
    left = area.left + (area.width - width) / 2
    top = area.top + (area.height - height) / 2
  } else {
    left = position.left
    top = position.top
  }

  // 모니터 안으로 보정 (팝업이 화면보다 크면 왼쪽/위쪽 끝)
  const clamp = (v: number, min: number, room: number) => Math.round(Math.max(min, Math.min(v, min + room)))
  return [
    `width=${width}`,
    `height=${height}`,
    `left=${clamp(left, area.left, area.width - width)}`,
    `top=${clamp(top, area.top, area.height - height)}`,
    'scrollbars=yes',
    'resizable=yes',
  ].join(',')
}

interface Session {
  win: Window
  data: any
  end: () => void
}

/** name 별로 열려 있는 팝업 */
const sessions = new Map<string, Session>()

/**
 * 팝업을 연다. 차단되면 onBlocked(기본 alert) 호출 후 null 반환.
 * @throws PopupDataError data 에 보낼 수 없는 값이 있는 경우 (창을 열기 전에 검사)
 */
export function openPopup(url: string, name: string, options: PopupOptions = {}): Window | null {
  const { handlers = {}, onClose, onBlocked = () => alert(BLOCKED_MESSAGE) } = options
  const data = snapshot(options.data)

  const win = window.open(url, name, buildFeatures(options))
  // 차단 시 null 이거나, 일부 브라우저는 closed=true 인 창을 돌려준다
  if (!win || win.closed) {
    onBlocked()
    return null
  }

  // 같은 name 이면 같은 창에 새 URL 이 로드되므로 이전 팝업은 닫힌 것으로 처리
  sessions.get(name)?.end()

  const session: Session = { win, data, end: () => {} }

  const onMessage = (event: MessageEvent) => {
    if (!isPopupMessage(event, win)) return
    const { type, payload } = event.data
    // 팝업이 로드(또는 새로고침)될 때마다 READY → 현재 data 로 응답
    if (type === READY) post(win, INIT, session.data)
    else handlers[type]?.(payload)
  }
  window.addEventListener('message', onMessage)

  // 창 닫힘은 이벤트가 없으므로 polling 으로 감지
  const timer = window.setInterval(() => {
    if (win.closed) session.end()
  }, 300)

  session.end = () => {
    if (sessions.get(name) !== session) return // 이미 끝난 세션
    sessions.delete(name)
    window.removeEventListener('message', onMessage)
    window.clearInterval(timer)
    onClose?.()
  }

  sessions.set(name, session)
  win.focus()
  return win
}

/**
 * 팝업을 열고, 팝업이 closeSelf(result) 로 보낸 값을 기다린다. 결과 없이 닫히거나 차단되면 null.
 *
 * @example
 * const user = await openPopupForResult('/popup/user-search', 'userSearch', { data: { keyword } })
 */
export function openPopupForResult(url: string, name: string, options: PopupOptions = {}): Promise<any> {
  // resolve 는 처음 1번만 적용되므로 결과 수신 후의 닫힘(null)은 무시된다. PopupDataError 는 reject 가 된다
  return new Promise((resolve) => {
    const win = openPopup(url, name, {
      ...options,
      handlers: { ...options.handlers, [RESULT]: (payload) => resolve(payload ?? null) },
      onClose: () => {
        options.onClose?.()
        resolve(null)
      },
    })
    if (!win) resolve(null)
  })
}

/** (usePopup 용) 열려 있는 팝업의 data 를 바꾼다 */
export function updatePopupData(name: string, data: any): boolean {
  const session = sessions.get(name)
  if (!session) return false
  session.data = snapshot(data)
  return post(session.win, INIT, session.data)
}

/** (usePopup 용) */
export function isPopupOpen(name: string): boolean {
  return sessions.has(name)
}

/** (usePopup 용) name 으로 연 팝업을 닫는다 (onClose 호출됨) */
export function closePopup(name: string): void {
  const session = sessions.get(name)
  if (!session) return
  session.win.close()
  session.end()
}

/** 이 창에서 연 모든 팝업을 닫는다 (예: 로그아웃) */
export function closeAllPopups(): void {
  ;[...sessions.keys()].forEach(closePopup)
}

/* ------------------------------------------------------------------ */
/* 팝업 창                                                              */
/* ------------------------------------------------------------------ */

/** 현재 창이 부모 창에 의해 열린 팝업인지 */
export function isOpenedAsPopup(): boolean {
  return !!window.opener && !window.opener.closed
}

/** 부모의 handlers[type] 실행. 부모가 없으면 false */
export function sendToOpener(type: string, payload?: any): boolean {
  return isOpenedAsPopup() && post(window.opener, type, payload)
}

/** 결과를 부모에게 보내고 팝업을 닫는다. 인자 없이 호출하면 결과 없이 닫기 */
export function closeSelf(result?: any): void {
  if (result !== undefined) sendToOpener(RESULT, result)
  window.close()
}

/** (usePopupData 용) 부모 data 수신을 구독하고 부모에게 data 를 요청한다. 해제 함수 반환 */
export function subscribeOpenerData(listener: (data: any) => void): () => void {
  const onMessage = (event: MessageEvent) => {
    if (isPopupMessage(event, window.opener) && event.data.type === INIT) listener(event.data.payload)
  }
  window.addEventListener('message', onMessage)
  sendToOpener(READY)
  return () => window.removeEventListener('message', onMessage)
}
