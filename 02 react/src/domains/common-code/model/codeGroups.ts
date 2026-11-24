/**
 * 공통코드 그룹 상수
 * 문자열을 직접 쓰지 말고 이 상수를 사용 (오타 방지, 사용처 검색 용이)
 */
export const CODE_GROUP = {
  USER_STATUS: 'USER_STATUS',
  DEPT: 'DEPT',
  GENDER: 'GENDER',
  ORDER_STATUS: 'ORDER_STATUS',
  PAY_METHOD: 'PAY_METHOD',
} as const

export type CodeGroup = (typeof CODE_GROUP)[keyof typeof CODE_GROUP]
