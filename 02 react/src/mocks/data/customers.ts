import type { Customer } from '@/api/customerApi'

/** 앞 9자리로 체크섬이 맞는 사업자번호 생성 */
function bizNo(first9: string): string {
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = weights.reduce((acc, w, i) => acc + Number(first9[i]) * w, 0)
  sum += Math.floor((Number(first9[8]) * 5) / 10)
  return first9 + ((10 - (sum % 10)) % 10)
}

const NAMES = [
  '한빛상사', '대한물산', '서울유통', '미래테크', '동방무역', '그린푸드', '오성전자', '태평양화학',
  '새한건설', '우리약품', '나라정밀', '하나로지스', '푸른농산', '세종소프트', '중앙기계',
]

export const CUSTOMERS: Customer[] = [
  ...NAMES.map((name, i) => ({
    custCd: `C${String(i + 1).padStart(4, '0')}`,
    custNm: name,
    bizRegNo: bizNo(`${120 + i}${String(81 + i).padStart(2, '0')}${String(1000 + i * 37).padStart(4, '0')}`),
    stopYn: 'N' as const,
  })),
  // 서버 검증 오류 시연용 — 거래정지 거래처
  { custCd: 'C0099', custNm: '(정지)부실상사', bizRegNo: bizNo('999881234'), stopYn: 'Y' },
]
