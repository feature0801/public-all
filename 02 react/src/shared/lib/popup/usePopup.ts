import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { closePopup, isPopupOpen, openPopup, openPopupForResult, updatePopupData, type PopupOptions } from './popup'

export interface UsePopupConfig extends Omit<PopupOptions, 'data'> {
  /** 팝업 URL (예: '/popup/user-search') */
  url: string
  /** window name. 생략하면 컴포넌트마다 고유한 이름 */
  name?: string
}

/**
 * (부모 쪽) React 컴포넌트에서 window popup 을 다루는 훅. 컴포넌트 안에서는 항상 이 훅을 사용한다.
 * - handlers / onClose 는 항상 "최신 render" 의 함수가 실행된다 (팝업을 연 뒤 state 가 바뀌어도 OK)
 * - 컴포넌트가 언마운트(페이지 이동 등)되면 팝업도 닫는다
 * - 설정값(width, position 등)은 열 때마다 최신 값을 읽는다
 * - 차단되면 기본으로 alert (onBlocked 로 변경 가능)
 *
 * open / openForResult 는 클릭 핸들러 안에서 바로 호출할 것 (await 뒤나 useEffect 안이면 브라우저가 차단)
 *
 * @example
 * const userPopup = usePopup({
 *   url: USER_SEARCH_POPUP_URL, width: 480, height: 600,
 *   handlers: { [USER_SEARCH_MSG.ADD]: (u: User) => addUser(u) },
 * })
 * userPopup.open({ keyword })
 * const user = await userPopup.openForResult({ keyword }) // 팝업의 closeSelf(user) 값, 그냥 닫히면 null
 */
export function usePopup(config: UsePopupConfig) {
  const autoName = `popup_${useId().replace(/\W/g, '')}`
  const name = config.name ?? autoName

  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  })

  const [isOpen, setIsOpen] = useState(false)

  const toOptions = useCallback((data: any): PopupOptions => {
    const { handlers = {}, ...rest } = configRef.current
    return {
      ...rest,
      data,
      // ref 를 거쳐 호출 → 등록 시점이 아닌 최신 함수 실행 (stale closure 방지)
      handlers: Object.fromEntries(
        Object.keys(handlers).map((key) => [key, (payload: any) => configRef.current.handlers?.[key]?.(payload)]),
      ),
      onClose: () => {
        setIsOpen(false)
        configRef.current.onClose?.()
      },
    }
  }, [])

  /** 팝업을 연다. @throws PopupDataError */
  const open = useCallback(
    (data?: any) => {
      openPopup(configRef.current.url, name, toOptions(data))
      setIsOpen(isPopupOpen(name))
    },
    [name, toOptions],
  )

  /** 팝업이 closeSelf(result) 로 보낸 값을 기다린다. 그냥 닫히거나 차단되면 null */
  const openForResult = useCallback(
    (data?: any): Promise<any> => {
      const result = openPopupForResult(configRef.current.url, name, toOptions(data))
      setIsOpen(isPopupOpen(name))
      return result
    },
    [name, toOptions],
  )

  /** 열려 있는 팝업의 data 갱신 (전체 교체) */
  const update = useCallback((data: any) => updatePopupData(name, data), [name])
  const close = useCallback(() => closePopup(name), [name])

  useEffect(() => () => closePopup(name), [name])

  return { isOpen, open, openForResult, update, close }
}
