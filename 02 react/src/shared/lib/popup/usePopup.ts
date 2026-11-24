import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  closePopup,
  isPopupOpen,
  openPopup,
  openPopupForResult,
  sendToPopup,
  updatePopupData,
  type PopupHandlers,
  type PopupOptions,
} from './popup'

/** 창 관련 옵션 (크기/위치 등). 열 때마다 override 가능 */
type PopupWindowOptions = Omit<PopupOptions, 'data' | 'handlers' | 'onClose'>

export interface UsePopupConfig extends PopupWindowOptions {
  /** 팝업 URL (예: '/popup/user-search') */
  url: string
  /** window name. 생략하면 컴포넌트마다 고유한 이름이 자동 생성된다 */
  name?: string
  /** 팝업이 sendToOpener / requestOpener 로 호출할 콜백 — 항상 "최신 render" 의 함수가 실행된다 */
  handlers?: PopupHandlers
  /** 팝업이 닫혔을 때 */
  onClose?: () => void
  /** 컴포넌트가 언마운트(페이지 이동 등)되면 팝업도 닫는다. 기본 true */
  closeOnUnmount?: boolean
}

/**
 * (부모 쪽) React 컴포넌트에서 window popup 을 다루는 훅.
 * popup.ts 의 함수를 그대로 쓰되, React 에서만 생기는 문제를 정리해준다.
 *
 * 1. stale closure : handlers/onClose 를 ref 로 보관해서, 팝업을 연 뒤에 state 가 바뀌어도
 *                    팝업이 호출하는 콜백은 항상 최신 state 를 본다. (useRef 우회 불필요)
 * 2. 언마운트       : SPA 에서 페이지를 이동하면 팝업을 같이 닫는다 (고아 팝업 방지)
 * 3. isOpen        : 팝업 열림 여부를 state 로 제공 → 버튼 활성/비활성 등에 바로 사용
 *
 * @example
 * const userPopup = usePopup({
 *   url: USER_SEARCH_POPUP_URL,
 *   width: 480, height: 600, position: 'screen-center',
 *   handlers: { [USER_SEARCH_MSG.ADD]: (u: User) => addUser(u) },  // 최신 state 사용 OK
 *   onClose: () => console.log('closed'),
 * })
 *
 * <button onClick={() => userPopup.open({ keyword })}>열기</button>
 * const user = await userPopup.openForResult<User>(USER_SEARCH_MSG.SELECT, { keyword })
 */
export function usePopup(config: UsePopupConfig) {
  const autoName = `popup_${useId().replace(/[^a-zA-Z0-9_]/g, '')}`
  const name = config.name ?? autoName

  // 매 render 의 config 를 보관 → 콜백이 항상 최신 값을 참조
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  })

  const [isOpen, setIsOpen] = useState(() => isPopupOpen(name))

  /** popup.ts 에 넘길 옵션 생성. handlers 는 ref 를 거쳐 최신 함수를 호출하는 프록시로 감싼다 */
  const buildOptions = useCallback((data: unknown, override?: PopupWindowOptions): PopupOptions => {
    const { url: _url, name: _name, handlers, onClose: _onClose, closeOnUnmount: _c, ...windowOptions } =
      configRef.current
    const proxied: PopupHandlers = {}
    for (const key of Object.keys(handlers ?? {})) {
      proxied[key] = (payload: never) => configRef.current.handlers?.[key]?.(payload)
    }
    return {
      ...windowOptions,
      ...override,
      data,
      handlers: proxied,
      onClose: () => {
        setIsOpen(false)
        configRef.current.onClose?.()
      },
    }
  }, [])

  /**
   * 팝업을 연다. 반드시 클릭 등 사용자 이벤트 안에서 "동기적으로" 호출할 것
   * (await 뒤나 useEffect 안에서 호출하면 브라우저가 팝업을 차단한다)
   * @throws PopupBlockedError
   */
  const open = useCallback(
    (data?: unknown, override?: PopupWindowOptions): Window => {
      const win = openPopup(configRef.current.url, name, buildOptions(data, override))
      setIsOpen(true)
      return win
    },
    [name, buildOptions],
  )

  /**
   * 팝업을 열고 resultType 메시지가 올 때까지 대기. 결과 없이 닫히면 null.
   * 팝업 차단 시 PopupBlockedError 로 reject.
   */
  const openForResult = useCallback(
    <T>(resultType: string, data?: unknown, override?: PopupWindowOptions): Promise<T | null> => {
      const promise = openPopupForResult<T>(configRef.current.url, name, resultType, buildOptions(data, override))
      // openPopupForResult 는 동기적으로 창을 열므로 바로 확인 가능
      setIsOpen(isPopupOpen(name))
      return promise
    },
    [name, buildOptions],
  )

  const close = useCallback(() => closePopup(name), [name])
  /** 열려 있는 팝업의 data 갱신 (팝업의 usePopupData 가 다시 렌더링됨) */
  const update = useCallback((data: unknown) => updatePopupData(name, data), [name])
  /** 열려 있는 팝업에 메시지 전송 (팝업은 usePopupMessage 로 수신) */
  const send = useCallback(<T>(type: string, payload?: T) => sendToPopup(name, type, payload), [name])

  // 언마운트 시 팝업 닫기.
  // StrictMode 의 mount → unmount → mount 시점에는 아직 팝업이 없으므로 영향 없음.
  useEffect(
    () => () => {
      if (configRef.current.closeOnUnmount !== false) closePopup(name)
    },
    [name],
  )

  return { name, isOpen, open, openForResult, close, update, send }
}
