import { mockSearchCustomers } from '@/mocks/customerMock'
import { http, USE_MOCK } from '@/shared/api'

export interface Customer {
  custCd: string
  custNm: string
  bizRegNo: string
  /** 거래정지 여부 */
  stopYn: 'Y' | 'N'
}

export const customerApi = {
  /** GET /customers?keyword= (코드/명/사업자번호 부분일치) */
  search(keyword: string): Promise<Customer[]> {
    if (USE_MOCK) return mockSearchCustomers(keyword)
    return http.get<Customer[]>('/customers', { keyword })
  },
}
