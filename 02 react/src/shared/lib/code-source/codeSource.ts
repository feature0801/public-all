/**
 * 코드 조회 인터페이스 (의존성 역전용)
 *
 * shared 의 범용 컴포넌트(그리드 코드명 컬럼, 검색폼 선택 필드 등)는 "코드 → 명칭", "코드 목록"이 필요하지만
 * 특정 도메인(common-code)을 import 할 수 없다. 그래서 shared 는 인터페이스만 정의하고,
 * 실제 구현은 도메인이 제공하며 app/init 에서 앱 시작 시 1회 등록한다.
 */

export interface CodeOption {
  value: string
  label: string
}

export interface CodeSource {
  /** 코드 → 표시명. 없으면 fallback (기본: 코드 값 그대로) */
  getName: (groupCode: string, code: string | null | undefined, fallback?: string) => string
  /**
   * (React hook) 그룹의 선택 옵션 목록. groupCode 가 '' 이면 조회하지 않는다.
   * hook 이므로 컴포넌트/hook 안에서만 호출한다.
   */
  useCodeOptions: (groupCode: string) => { options: CodeOption[]; loading: boolean }
  /** 코드 데이터가 바뀌면 listener 호출. 해제 함수 반환 */
  subscribe: (listener: () => void) => () => void
}

const EMPTY_OPTIONS: CodeOption[] = []

/** 등록 전 기본 구현: 코드를 그대로 표시, 옵션 없음 */
const noopSource: CodeSource = {
  getName: (_groupCode, code, fallback) => (code == null || code === '' ? (fallback ?? '') : (fallback ?? code)),
  useCodeOptions: () => ({ options: EMPTY_OPTIONS, loading: false }),
  subscribe: () => () => {},
}

let current: CodeSource = noopSource

/** 앱 시작 시 1회 호출 (첫 렌더 전에 등록해야 hook 호출 순서가 바뀌지 않는다) */
export function registerCodeSource(source: CodeSource): void {
  current = source
}

export function getCodeSource(): CodeSource {
  return current
}
