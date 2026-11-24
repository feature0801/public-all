import { useEffect, useState } from 'react'
import { subscribeOpenerData } from './popup'

/**
 * (팝업 쪽) 부모가 넘긴 data 를 받는다. 부모가 update 하면 다시 렌더링된다.
 * - received : 부모로부터 data 를 받았는지 (부모 없이 직접 열린 경우 계속 false)
 *
 * @example
 * const { data, received } = usePopupData<UserSearchPopupData>()
 */
export function usePopupData<T>(): { data: T | undefined; received: boolean } {
  const [state, setState] = useState<{ data: T | undefined; received: boolean }>({ data: undefined, received: false })
  useEffect(() => subscribeOpenerData((data) => setState({ data: data as T, received: true })), [])
  return state
}
