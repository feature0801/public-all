/**
 * Window Popup 유틸
 *
 * [부모 창]
 * - openPopup           : 팝업 오픈 (가운데 정렬, 차단 감지, 재사용)
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

export interface PopupOptions {
  /** 팝업 너비(px). 기본 600 */
  width?: number
  /** 팝업 높이(px). 기본 500 */
  height?: number
  /** 지정하지 않으면 현재 브라우저 창 기준 가운데 정렬 */
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
  target.postMessage({ source: POPUP_MESSAGE_SOURCE, ...message }, window.location.origin)
  return true
}

/* ------------------------------------------------------------------ */
/* 부모 창                                                              */
/* ------------------------------------------------------------------ */

interface PopupSession {
  win: Window
  data: unknown
  handlers: PopupHandlers
  onClose?: () => void
  dispose: () => void
}

/** name 별로 열린 팝업 세션 (재사용 / 데이터 갱신 / 일괄 닫기 용도) */
const sessions = new Map<string, PopupSession>()

function buildFeatures(opts: PopupOptions): string {
  const width = opts.width ?? 600
  const height = opts.height ?? 500

  // 듀얼 모니터 환경에서도 "현재 창" 기준 가운데에 뜨도록 screenX/Y + outer 크기 사용
  const left = opts.left ?? Math.max(0, window.screenX + (window.outerWidth - width) / 2)
  const top = opts.top ?? Math.max(0, window.screenY + (window.outerHeight - height) / 2)

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
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

    Promise.resolve()
      .then(() => handler(payload as never))
      .then(
        (result) => {
          if (requestId) post(win, { type: POPUP_INTERNAL_TYPE.RESPONSE, requestId, payload: result })
        },
        (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          if (requestId) post(win, { type: POPUP_INTERNAL_TYPE.RESPONSE, requestId, error: message })
          else console.error(`[popup:${name}] handler '${type}' 실행 중 오류`, err)
        },
      )
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
 *
 * @example
 * openPopup('/popup/user-search', 'userSearch', {
 *   data: { keyword: '김' },                       // 화면 데이터 → 팝업
 *   handlers: { 'add-user': (u: User) => add(u) },  // 팝업 → 부모 콜백
 *   onClose: () => console.log('closed'),
 * })
 */
export function openPopup(url: string, name: string, options: PopupOptions = {}): Window {
  const existing = sessions.get(name)

  if (options.focusIfOpened && existing && !existing.win.closed) {
    // 다시 로드하지 않고 옵션만 갱신
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
    } catch (e) {
      reject(e)
    }
  })
}

/** 열려 있는 팝업의 data 를 갱신한다. 팝업의 usePopupData 값이 바뀐다. */
export function updatePopupData(name: string, data: unknown): boolean {
  const session = sessions.get(name)
  if (!session) return false
  session.data = data
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
