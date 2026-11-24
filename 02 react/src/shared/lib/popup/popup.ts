/**
 * Window Popup 유틸
 *
 * [부모 창] — React 컴포넌트에서는 hooks/usePopup 사용을 권장 (stale closure / 언마운트 처리 포함)
 * - openPopup           : 팝업 오픈 (크기/위치 지정, 차단 감지, 재사용)
 *                         + position : 'center'(창 기준, 기본) | 'screen-center'(모니터 기준) | { left, top }
 *                         + data     : 팝업에 넘길 초기 데이터
 *                         + handlers : 팝업이 호출할 콜백 (반환값은 팝업으로 돌아감)
 *                         + onClose  : 팝업이 닫혔을 때 콜백
 * - openPopupForResult  : 팝업이 결과를 보내거나 닫힐 때까지 Promise 로 대기
 * - updatePopupData     : 열려 있는 팝업의 데이터를 갱신 (팝업의 usePopupData 가 다시 렌더링됨)
 * - sendToPopup         : 열려 있는 팝업에 임의 메시지 전송
 * - closePopup / closeAllPopups
 *
 * [팝업 창]
 * - usePopupData (hooks) : 부모가 넘긴 data 수신
 * - sendToOpener         : 부모로 단방향 메시지 전송 (부모의 handlers 실행)
 * - requestOpener        : 부모의 handler 를 호출하고 반환값을 Promise 로 받음
 * - closeSelf            : 결과 전송 후 닫기
 *
 * 함수는 postMessage 로 직접 전달할 수 없으므로(structured clone 불가),
 * "부모에 콜백을 등록 → 팝업이 이름(type)으로 호출" 하는 방식을 사용한다.
 * 같은 origin 의 메시지만 처리한다.
 */

export interface PopupMessage<T = unknown> {
  /** 다른 postMessage(확장 프로그램, devtools 등)와 구분하기 위한 표식 */
  source: typeof POPUP_MESSAGE_SOURCE
  /** 메시지 종류 (예: 'select-user') */
  type: string
  payload?: T
  /** requestOpener 의 요청/응답 매칭용 */
  requestId?: string
  /** handler 에서 에러가 난 경우 메시지 */
  error?: string
}

export const POPUP_MESSAGE_SOURCE = 'app-popup' as const

/** 유틸 내부에서 사용하는 예약 메시지 타입 */
export const POPUP_INTERNAL_TYPE = {
  /** 팝업 → 부모 : 준비 완료, 데이터 요청 */
  READY: '__popup_ready__',
  /** 부모 → 팝업 : data 전달 */
  INIT: '__popup_init__',
  /** 부모 → 팝업 : requestOpener 응답 */
  RESPONSE: '__popup_response__',
} as const

/**
 * 팝업이 호출할 수 있는 콜백 목록. key 가 메시지 type.
 * 반환값(또는 Promise 결과)은 requestOpener 로 호출한 경우 팝업에 전달된다.
 */
// payload 를 never 로 두어 (user: User) => ... 같은 구체 타입 핸들러를 그대로 받을 수 있게 한다
export type PopupHandlers = Record<string, (payload: never) => unknown>

/**
 * 팝업 위치
 * - 'center'        : 현재 브라우저 창 기준 가운데 (기본값. 듀얼 모니터에서도 부모 창이 있는 쪽에 뜸)
 * - 'screen-center' : 부모 창이 있는 "모니터" 기준 가운데
 * - { left, top }   : 모니터 좌표(px)로 직접 지정
 * 어떤 경우든 팝업이 모니터 밖으로 나가지 않도록 보정한다.
 */
export type PopupPosition = 'center' | 'screen-center' | { left: number; top: number }

export interface PopupOptions {
  /** 팝업 너비(px). 기본 600 */
  width?: number
  /** 팝업 높이(px). 기본 500 */
  height?: number
  /** 팝업 위치. 기본 'center' */
  position?: PopupPosition
  /** position 대신 좌표만 개별로 지정할 때 (지정한 축만 position 값을 덮어씀) */
  left?: number
  top?: number
  /** 스크롤바 표시 여부. 기본 true */
  scrollbars?: boolean
  /** 크기 조절 가능 여부. 기본 true */
  resizable?: boolean
  /** 위 옵션 외 추가 window features (예: 'menubar=no') */
  extraFeatures?: string
  /** 이미 같은 name 의 팝업이 열려 있으면 URL 을 다시 로드하지 않고 focus 만 한다. 기본 false */
  focusIfOpened?: boolean

  /** 팝업에 넘길 데이터 (structured clone 가능한 값: 객체, 배열, Date, Map 등. 함수 불가) */
  data?: unknown
  /** 팝업이 sendToOpener / requestOpener 로 호출할 콜백 */
  handlers?: PopupHandlers
  /** 팝업이 닫혔을 때 (사용자가 닫거나 closePopup 호출) */
  onClose?: () => void
}

/** 팝업 차단 시 throw 되는 에러 */
export class PopupBlockedError extends Error {
  constructor() {
    super('팝업이 차단되었습니다. 브라우저의 팝업 차단 설정을 확인해주세요.')
    this.name = 'PopupBlockedError'
  }
}

/**
 * 팝업에 보낼 수 없는 데이터일 때 throw 되는 에러.
 * postMessage 는 structured clone 으로 복사하므로 함수, DOM, Proxy, 함수를 가진 객체
 * (예: AG Grid RowNode, 그리드 api, react-hook-form 의 control 등)는 보낼 수 없다.
 * 이전에는 부모 콘솔에만 에러가 찍히고 팝업은 data 를 영원히 기다렸다.
 */
export class PopupDataError extends Error {
  constructor(cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    super(
      `팝업에 전달할 수 없는 데이터가 포함되어 있습니다. 순수 데이터(객체/배열/문자열/숫자/Date 등)만 넘겨주세요. ` +
        `그리드라면 getSelectedNodes() 대신 getSelectedRows() 를 사용하세요. (${detail})`,
      { cause },
    )
    this.name = 'PopupDataError'
  }
}

/* ------------------------------------------------------------------ */
/* 공통                                                                */
/* ------------------------------------------------------------------ */

/** 받은 MessageEvent 가 우리 앱의 팝업 메시지인지 검사 */
export function isPopupMessage<T = unknown>(event: MessageEvent): event is MessageEvent<PopupMessage<T>> {
  if (event.origin !== window.location.origin) return false
  const data = event.data as Partial<PopupMessage> | null
  return !!data && data.source === POPUP_MESSAGE_SOURCE && typeof data.type === 'string'
}

function post(target: Window, message: Omit<PopupMessage, 'source'>): boolean {
  if (target.closed) return false
  try {
    target.postMessage({ source: POPUP_MESSAGE_SOURCE, ...message }, window.location.origin)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'DataCloneError') throw new PopupDataError(e)
    throw e
  }
  return true
}

/**
 * 팝업에 보낼 data 를 미리 복사해 둔다 (postMessage 와 같은 structured clone).
 * - 보낼 수 없는 값이면 팝업을 열기 "전에" PopupDataError 를 던져 호출한 쪽에서 바로 알 수 있게 한다.
 * - 연 시점의 스냅샷이 되므로, 이후 부모가 원본 배열/객체를 수정해도 팝업 data 는 바뀌지 않는다
 *   (바꾸려면 updatePopupData 사용).
 */
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

interface PopupSession {
  win: Window
  data: unknown
  handlers: PopupHandlers
  onClose?: () => void
  /**
   * 같은 name 으로 다시 열려 이 세션의 소유권이 넘어갈 때 호출 (내부용).
   * openPopupForResult 가 대기 중인 Promise 를 null 로 끝내는 데 사용한다.
   */
  onReplaced?: () => void
  dispose: () => void
}

/** name 별로 열린 팝업 세션 (재사용 / 데이터 갱신 / 일괄 닫기 용도) */
const sessions = new Map<string, PopupSession>()

/**
 * 부모 창이 있는 모니터의 사용 가능 영역 (작업표시줄/독 제외).
 * 멀티 모니터에서는 좌표가 음수일 수 있다 (주 모니터 왼쪽/위쪽 모니터).
 * availLeft/availTop 은 비표준이라 없으면 0 으로 본다.
 */
function getAvailableScreen() {
  const s = window.screen as Screen & { availLeft?: number; availTop?: number }
  return { left: s.availLeft ?? 0, top: s.availTop ?? 0, width: s.availWidth, height: s.availHeight }
}

function clamp(value: number, min: number, max: number): number {
  // 팝업이 화면보다 크면 max < min 이 되므로 왼쪽/위쪽 끝에 맞춘다
  return Math.max(min, Math.min(value, max))
}

/** 팝업 좌상단 좌표 계산 (모니터 좌표계) */
function resolvePosition(opts: PopupOptions, width: number, height: number): { left: number; top: number } {
  const screen = getAvailableScreen()
  const position = opts.position ?? 'center'

  let left: number
  let top: number
  if (position === 'center') {
    // screenX/Y + outer 크기 → 부모 창이 어느 모니터에 있든 그 창의 가운데
    left = window.screenX + (window.outerWidth - width) / 2
    top = window.screenY + (window.outerHeight - height) / 2
  } else if (position === 'screen-center') {
    left = screen.left + (screen.width - width) / 2
    top = screen.top + (screen.height - height) / 2
  } else {
    left = position.left
    top = position.top
  }
  left = opts.left ?? left
  top = opts.top ?? top

  // 이전 구현의 Math.max(0, …) 는 왼쪽 보조 모니터(음수 좌표)에서 주 모니터로 튀는 문제가 있었다.
  // 현재 모니터 영역 안으로만 보정한다.
  return {
    left: Math.round(clamp(left, screen.left, screen.left + screen.width - width)),
    top: Math.round(clamp(top, screen.top, screen.top + screen.height - height)),
  }
}

function buildFeatures(opts: PopupOptions): string {
  const width = opts.width ?? 600
  const height = opts.height ?? 500
  const { left, top } = resolvePosition(opts, width, height)

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    `scrollbars=${opts.scrollbars === false ? 'no' : 'yes'}`,
    `resizable=${opts.resizable === false ? 'no' : 'yes'}`,
  ]
  if (opts.extraFeatures) features.push(opts.extraFeatures)
  return features.join(',')
}

function createSession(name: string, win: Window, options: PopupOptions): void {
  const session: PopupSession = {
    win,
    data: options.data,
    handlers: options.handlers ?? {},
    onClose: options.onClose,
    dispose: () => {},
  }

  const onMessage = (event: MessageEvent) => {
    if (event.source !== win || !isPopupMessage(event)) return
    const { type, payload, requestId } = event.data

    // 팝업이 로드(또는 새로고침)되면 READY 를 보내고, 부모는 현재 data 로 응답
    if (type === POPUP_INTERNAL_TYPE.READY) {
      post(win, { type: POPUP_INTERNAL_TYPE.INIT, payload: session.data })
      return
    }

    const handler = session.handlers[type]
    if (!handler) {
      if (requestId) {
        post(win, { type: POPUP_INTERNAL_TYPE.RESPONSE, requestId, error: `등록된 handler 가 없습니다: ${type}` })
      }
      return
    }

    const respondError = (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      if (requestId) post(win, { type: POPUP_INTERNAL_TYPE.RESPONSE, requestId, error: message })
      else console.error(`[popup:${name}] handler '${type}' 실행 중 오류`, err)
    }

    Promise.resolve()
      .then(() => handler(payload as never))
      .then((result) => {
        // handler 반환값이 보낼 수 없는 값이면 (PopupDataError) 아래 catch 에서 에러로 응답
        if (requestId) post(win, { type: POPUP_INTERNAL_TYPE.RESPONSE, requestId, payload: result })
      })
      .catch(respondError)
  }

  // 팝업 close 는 이벤트가 없으므로 polling 으로 감지
  const timer = window.setInterval(() => {
    if (win.closed) {
      session.dispose()
      session.onClose?.()
    }
  }, 300)

  session.dispose = () => {
    window.removeEventListener('message', onMessage)
    window.clearInterval(timer)
    if (sessions.get(name) === session) sessions.delete(name)
  }

  window.addEventListener('message', onMessage)
  sessions.set(name, session)
}

/** 현재 열려 있는(닫히지 않은) 팝업인지 확인 */
export function isPopupOpen(name: string): boolean {
  const session = sessions.get(name)
  return !!session && !session.win.closed
}

/**
 * 팝업을 연다.
 * @throws PopupBlockedError 팝업이 차단된 경우
 * @throws PopupDataError    data 에 보낼 수 없는 값(함수, RowNode 등)이 있는 경우 — 창을 열기 전에 검사
 *
 * @example
 * openPopup('/popup/user-search', 'userSearch', {
 *   data: { keyword: '김' },                       // 화면 데이터 → 팝업
 *   handlers: { 'add-user': (u: User) => add(u) },  // 팝업 → 부모 콜백
 *   onClose: () => console.log('closed'),
 * })
 */
export function openPopup(url: string, name: string, options: PopupOptions = {}): Window {
  // 창을 열기 전에 data 검사 + 스냅샷 (보낼 수 없는 값이면 여기서 PopupDataError)
  if ('data' in options) options = { ...options, data: snapshot(options.data) }
  const existing = sessions.get(name)

  if (options.focusIfOpened && existing && !existing.win.closed) {
    // 다시 로드하지 않고 옵션만 갱신
    existing.onReplaced?.()
    existing.onReplaced = undefined
    if ('data' in options) updatePopupData(name, options.data)
    if (options.handlers) existing.handlers = options.handlers
    if (options.onClose) existing.onClose = options.onClose
    existing.win.focus()
    return existing.win
  }

  const win = window.open(url, name, buildFeatures(options))

  // 팝업 차단 시 null 이거나, 일부 브라우저는 closed=true 인 창을 돌려준다
  if (!win || win.closed) {
    throw new PopupBlockedError()
  }

  // 같은 name 이면 같은 창에 새 URL 이 로드되므로 이전 세션은 정리 (onClose 는 호출하지 않음)
  existing?.dispose()
  existing?.onReplaced?.()
  createSession(name, win, options)
  win.focus()
  return win
}

/**
 * 팝업을 열고 결과를 기다린다.
 * - 팝업이 resultType 으로 sendToOpener / closeSelf 하면 payload 로 resolve
 * - 결과 없이 팝업이 닫히면 null 로 resolve
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
  return new Promise<T | null>((resolve, reject) => {
    let settled = false
    const finish = (value: T | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    try {
      openPopup(url, name, {
        ...options,
        handlers: {
          ...options.handlers,
          [resultType]: (payload: T | undefined) => finish(payload ?? null),
        },
        onClose: () => {
          options.onClose?.()
          finish(null)
        },
      })
      // 결과를 받기 전에 같은 name 으로 다른 팝업이 열리면 이 Promise 는 null 로 끝낸다
      // (이전에는 영원히 pending 상태로 남았음)
      const session = sessions.get(name)
      if (session) session.onReplaced = () => finish(null)
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 열려 있는 팝업의 data 를 갱신한다. 팝업의 usePopupData 값이 바뀐다.
 * @throws PopupDataError 보낼 수 없는 값이 있는 경우
 */
export function updatePopupData(name: string, data: unknown): boolean {
  const session = sessions.get(name)
  if (!session) return false
  session.data = snapshot(data)
  return post(session.win, { type: POPUP_INTERNAL_TYPE.INIT, payload: data })
}

/** 열려 있는 팝업에 메시지 전송. 팝업에서는 usePopupMessage 로 수신 */
export function sendToPopup<T>(name: string, type: string, payload?: T): boolean {
  const session = sessions.get(name)
  if (!session) return false
  return post(session.win, { type, payload })
}

/** name 으로 연 팝업을 닫는다 (onClose 호출됨) */
export function closePopup(name: string): void {
  const session = sessions.get(name)
  if (!session) return
  if (!session.win.closed) session.win.close()
  session.dispose()
  session.onClose?.()
}

/** 이 창에서 연 모든 팝업을 닫는다 (예: 로그아웃 시) */
export function closeAllPopups(): void {
  ;[...sessions.keys()].forEach(closePopup)
}

/* ------------------------------------------------------------------ */
/* 팝업 창                                                              */
/* ------------------------------------------------------------------ */

/** 현재 창이 다른 창에 의해 열린 팝업인지 */
export function isOpenedAsPopup(): boolean {
  return !!window.opener && !window.opener.closed
}

/** 부모 창으로 메시지 전송 (부모의 handlers[type] 실행). 부모가 없으면 false */
export function sendToOpener<T>(type: string, payload?: T): boolean {
  if (!isOpenedAsPopup()) return false
  return post(window.opener as Window, { type, payload })
}

let requestSeq = 0

/**
 * 부모의 handlers[type] 를 호출하고 반환값을 받는다.
 * handler 가 throw 하거나 없으면 reject.
 *
 * @example
 * const res = await requestOpener<{ ok: boolean }>('add-user', user)
 */
export function requestOpener<R = unknown, T = unknown>(type: string, payload?: T, timeoutMs = 10_000): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    if (!isOpenedAsPopup()) {
      reject(new Error('부모 창이 없습니다.'))
      return
    }
    const opener = window.opener as Window
    const requestId = `${Date.now()}-${++requestSeq}`

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      window.clearTimeout(timer)
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== opener || !isPopupMessage<R>(event)) return
      const msg = event.data
      if (msg.type !== POPUP_INTERNAL_TYPE.RESPONSE || msg.requestId !== requestId) return
      cleanup()
      if (msg.error) reject(new Error(msg.error))
      else resolve(msg.payload as R)
    }

    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error(`부모 창 응답 시간 초과: ${type}`))
    }, timeoutMs)

    window.addEventListener('message', onMessage)
    post(opener, { type, payload, requestId })
  })
}

/** 결과를 부모에게 전달하고 팝업을 닫는다 */
export function closeSelf<T>(resultType?: string, payload?: T): void {
  if (resultType) sendToOpener(resultType, payload)
  window.close()
}
