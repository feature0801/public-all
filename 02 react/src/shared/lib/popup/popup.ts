/**
 * Window Popup 유틸
 *
 * [부모] React 컴포넌트에서는 usePopup 훅을 사용. 컴포넌트 밖(일반 함수)에서는 아래 함수 사용.
 * - openPopup(url, name, { width, height, position, data, handlers, onClose })
 * - openPopupForResult(url, name, resultType, options) : 팝업 결과를 Promise 로 (그냥 닫히면 null)
 * - updatePopupData(name, data) / closePopup(name) / closeAllPopups()
 *
 * [팝업]
 * - usePopupData()                 : 부모가 넘긴 data (부모가 update 하면 갱신)
 * - sendToOpener(type, payload)    : 부모의 handlers[type] 실행
 * - closeSelf(type?, payload?)     : 결과를 보내고 닫기
 *
 * - 데이터는 postMessage(structured clone)로 "복사"되어 전달된다 → 부모와 팝업의 데이터는 서로 독립.
 * - 함수는 보낼 수 없으므로, 콜백은 부모에 등록하고 팝업이 이름(type)으로 호출한다.
 * - 같은 name 으로 다시 열면 이전 팝업은 닫힌 것으로 처리(onClose)하고 같은 창에 새로 로드한다.
 */

const SOURCE = 'app-popup'
/** 팝업 → 부모 : 로드 완료, data 요청 */
const READY = '__popup_ready__'
/** 부모 → 팝업 : data 전달 */
const INIT = '__popup_init__'

interface PopupMessage {
  /** 다른 postMessage(확장 프로그램 등)와 구분하기 위한 표식 */
  source: typeof SOURCE
  type: string
  payload?: unknown
}

/**
 * 팝업 위치 (어느 경우든 모니터 밖으로 나가지 않게 보정)
 * - 'center'        : 부모 브라우저 창 기준 가운데 (기본)
 * - 'screen-center' : 부모 창이 있는 모니터 기준 가운데
 * - { left, top }   : 모니터 좌표(px)
 */
export type PopupPosition = 'center' | 'screen-center' | { left: number; top: number }

/** 팝업이 sendToOpener / closeSelf 로 호출할 콜백. key 가 메시지 type */
// payload 를 never 로 두어 (user: User) => ... 같은 구체 타입 함수를 그대로 받을 수 있게 한다
export type PopupHandlers = Record<string, (payload: never) => unknown>

export interface PopupOptions {
  /** 기본 600 */
  width?: number
  /** 기본 500 */
  height?: number
  /** 기본 'center' */
  position?: PopupPosition
  /** 팝업에 넘길 데이터. 연 시점에 복사된다 (함수, AG Grid RowNode 등은 불가) */
  data?: unknown
  handlers?: PopupHandlers
  /** 팝업이 닫혔을 때 (사용자가 닫음 / closePopup / 같은 name 으로 다시 열림) */
  onClose?: () => void
}

export class PopupBlockedError extends Error {
  constructor() {
    super('팝업이 차단되었습니다. 브라우저의 팝업 차단 설정을 확인해주세요.')
    this.name = 'PopupBlockedError'
  }
}

/** 팝업에 보낼 수 없는 값(함수, 클래스 인스턴스, Proxy 등)이 있을 때 */
export class PopupDataError extends Error {
  constructor(cause: unknown) {
    super(
      '팝업에 전달할 수 없는 데이터가 포함되어 있습니다. 순수 데이터(객체/배열/문자열/숫자/Date 등)만 넘겨주세요. ' +
        `그리드라면 getSelectedNodes() 대신 getSelectedRows() 를 사용하세요. (${cause instanceof Error ? cause.message : cause})`,
      { cause },
    )
    this.name = 'PopupDataError'
  }
}

/* ------------------------------------------------------------------ */
/* 공통                                                                */
/* ------------------------------------------------------------------ */

function isPopupMessage(event: MessageEvent, from: Window | null): event is MessageEvent<PopupMessage> {
  const msg = event.data as Partial<PopupMessage> | null
  return (
    !!from &&
    event.source === from &&
    event.origin === window.location.origin &&
    msg?.source === SOURCE &&
    typeof msg.type === 'string'
  )
}

function post(target: Window, type: string, payload?: unknown): boolean {
  if (target.closed) return false
  try {
    target.postMessage({ source: SOURCE, type, payload } satisfies PopupMessage, window.location.origin)
  } catch (e) {
    throw e instanceof DOMException && e.name === 'DataCloneError' ? new PopupDataError(e) : e
  }
  return true
}

/** postMessage 와 같은 방식으로 미리 복사 → 보낼 수 없는 값은 창을 열기 전에 에러, 연 시점 값으로 고정 */
function snapshot<T>(data: T): T {
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
  const s = window.screen as Screen & { availLeft?: number; availTop?: number }
  const area = { left: s.availLeft ?? 0, top: s.availTop ?? 0, width: s.availWidth, height: s.availHeight }

  const { left, top } =
    position === 'center'
      ? { left: window.screenX + (window.outerWidth - width) / 2, top: window.screenY + (window.outerHeight - height) / 2 }
      : position === 'screen-center'
        ? { left: area.left + (area.width - width) / 2, top: area.top + (area.height - height) / 2 }
        : position

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
  data: unknown
  end: () => void
}

/** name 별로 열려 있는 팝업 */
const sessions = new Map<string, Session>()

/**
 * 팝업을 연다.
 * @throws PopupBlockedError 팝업이 차단된 경우
 * @throws PopupDataError    data 에 보낼 수 없는 값이 있는 경우 (창을 열기 전에 검사)
 */
export function openPopup(url: string, name: string, options: PopupOptions = {}): Window {
  const data = snapshot(options.data)
  const win = window.open(url, name, buildFeatures(options))
  // 차단 시 null 이거나, 일부 브라우저는 closed=true 인 창을 돌려준다
  if (!win || win.closed) throw new PopupBlockedError()

  // 같은 name 이면 같은 창에 새 URL 이 로드되므로 이전 팝업은 닫힌 것으로 처리
  sessions.get(name)?.end()

  const { handlers = {}, onClose } = options

  const onMessage = (event: MessageEvent) => {
    if (!isPopupMessage(event, win)) return
    const { type, payload } = event.data
    // 팝업이 로드(또는 새로고침)될 때마다 READY → 현재 data 로 응답
    if (type === READY) post(win, INIT, session.data)
    else handlers[type]?.(payload as never)
  }

  // 창 닫힘은 이벤트가 없으므로 polling 으로 감지
  const timer = window.setInterval(() => win.closed && session.end(), 300)

  const session: Session = {
    win,
    data,
    end: () => {
      if (sessions.get(name) !== session) return // 이미 끝난 세션
      sessions.delete(name)
      window.removeEventListener('message', onMessage)
      window.clearInterval(timer)
      onClose?.()
    },
  }

  window.addEventListener('message', onMessage)
  sessions.set(name, session)
  win.focus()
  return win
}

/**
 * 팝업을 열고, 팝업이 resultType 으로 보낸 값을 기다린다. 결과 없이 닫히면 null.
 *
 * @example
 * const user = await openPopupForResult<User>('/popup/user-search', 'userSearch', 'select-user', {
 *   data: { keyword },
 * })
 */
export function openPopupForResult<T>(
  url: string,
  name: string,
  resultType: string,
  options: PopupOptions = {},
): Promise<T | null> {
  // resolve 는 처음 1번만 적용되므로 결과 수신 후의 닫힘(null)은 무시된다. openPopup 의 throw 는 reject 가 된다
  return new Promise((resolve) => {
    openPopup(url, name, {
      ...options,
      handlers: { ...options.handlers, [resultType]: (payload: T) => resolve(payload ?? null) },
      onClose: () => {
        options.onClose?.()
        resolve(null)
      },
    })
  })
}

/** 열려 있는 팝업의 data 를 바꾼다 (팝업의 usePopupData 가 다시 렌더링됨) */
export function updatePopupData(name: string, data: unknown): boolean {
  const session = sessions.get(name)
  if (!session) return false
  session.data = snapshot(data)
  return post(session.win, INIT, session.data)
}

export function isPopupOpen(name: string): boolean {
  return sessions.has(name)
}

/** name 으로 연 팝업을 닫는다 (onClose 호출됨) */
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
export function sendToOpener(type: string, payload?: unknown): boolean {
  return isOpenedAsPopup() && post(window.opener as Window, type, payload)
}

/** 결과를 부모에게 보내고 팝업을 닫는다 */
export function closeSelf(resultType?: string, payload?: unknown): void {
  if (resultType) sendToOpener(resultType, payload)
  window.close()
}

/** (usePopupData 용) 부모 data 수신을 구독하고 부모에게 data 를 요청한다. 해제 함수 반환 */
export function subscribeOpenerData(listener: (data: unknown) => void): () => void {
  const onMessage = (event: MessageEvent) => {
    if (isPopupMessage(event, window.opener as Window | null) && event.data.type === INIT) listener(event.data.payload)
  }
  window.addEventListener('message', onMessage)
  sendToOpener(READY)
  return () => window.removeEventListener('message', onMessage)
}
