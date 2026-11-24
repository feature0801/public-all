import type { CommonCode } from '@/domains/common-code'

const code = (groupCode: string, code: string, name: string, sortOrder: number, useYn: 'Y' | 'N' = 'Y'): CommonCode => ({
  groupCode,
  code,
  name,
  sortOrder,
  useYn,
})

/** 더미 공통코드 테이블 (실제로는 DB 의 공통코드 테이블) */
export const COMMON_CODE_TABLE: CommonCode[] = [
  code('USER_STATUS', 'ACTIVE', '활성', 1),
  code('USER_STATUS', 'DORMANT', '휴면', 2),
  code('USER_STATUS', 'LOCKED', '잠금', 3),
  code('USER_STATUS', 'WITHDRAWN', '탈퇴', 4, 'N'),

  code('DEPT', 'D100', '개발팀', 1),
  code('DEPT', 'D200', '기획팀', 2),
  code('DEPT', 'D300', '디자인팀', 3),
  code('DEPT', 'D400', '영업팀', 4),
  code('DEPT', 'D500', '인사팀', 5),
  code('DEPT', 'D900', '구 TF팀', 9, 'N'),

  code('GENDER', 'M', '남성', 1),
  code('GENDER', 'F', '여성', 2),

  code('ORDER_STATUS', 'ORDERED', '주문완료', 1),
  code('ORDER_STATUS', 'PAID', '결제완료', 2),
  code('ORDER_STATUS', 'SHIPPING', '배송중', 3),
  code('ORDER_STATUS', 'DELIVERED', '배송완료', 4),
  code('ORDER_STATUS', 'CANCELED', '취소', 5),

  code('PAY_METHOD', 'CARD', '카드', 1),
  code('PAY_METHOD', 'BANK', '계좌이체', 2),
  code('PAY_METHOD', 'CASH', '현금', 3),
  code('PAY_METHOD', 'POINT', '포인트', 4, 'N'),
]
