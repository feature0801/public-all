import { useEffect, useRef } from 'react'
import { isPopupMessage, type PopupMessage } from '@/shared/utils/popup'

/**
 * 메시지 수신 훅 (부모/팝업 양쪽에서 사용 가능)
 * - 팝업 쪽 : 부모가 sendToPopup 으로 보낸 메시지 수신
 * - 부모 쪽 : openPopup 의 handlers 를 쓰기 어려울 때(여러 팝업 공통 수신 등) 사용
 *
 * @example
 * usePopupMessage<string>('notice', (text) => setNotice(text))
 */
export function usePopupMessage<T = unknown>(
  type: string,
  handler: (payload: T | undefined, message: PopupMessage<T>) => void,
): void {
  // handler 가 매 렌더마다 바뀌어도 리스너를 재등록하지 않도록 ref 에 보관
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isPopupMessage<T>(event) || event.data.type !== type) return
      handlerRef.current(event.data.payload, event.data)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [type])
}
