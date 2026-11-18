import { useEffect, useState } from 'react'
import { isPopupMessage, POPUP_INTERNAL_TYPE, sendToOpener } from '@/shared/utils/popup'

/**
 * (팝업 쪽) 부모가 openPopup({ data }) 로 넘긴 데이터를 받는다.
 * 부모가 updatePopupData 로 갱신하면 다시 렌더링된다.
 *
 * - received : 부모로부터 응답을 받았는지 (부모 없이 직접 열린 경우 계속 false)
 *
 * @example
 * const { data, received } = usePopupData<UserSearchPopupData>()
 */
export function usePopupData<T>(): { data: T | undefined; received: boolean } {
  const [state, setState] = useState<{ data: T | undefined; received: boolean }>({
    data: undefined,
    received: false,
  })

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.opener || !isPopupMessage<T>(event)) return
      if (event.data.type !== POPUP_INTERNAL_TYPE.INIT) return
      setState({ data: event.data.payload, received: true })
    }
    window.addEventListener('message', onMessage)
    // 리스너 등록 후 부모에게 데이터 요청
    sendToOpener(POPUP_INTERNAL_TYPE.READY)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return state
}
