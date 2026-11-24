import type { Customer } from '@/domains/customer'
import { CUSTOMERS } from './data/customers'
import { mockResponse } from './mockUtils'

export function mockSearchCustomers(keyword: string): Promise<Customer[]> {
  return mockResponse('GET /customers', { keyword }, () => {
    const k = keyword.trim().toUpperCase()
    const digits = k.replace(/\D/g, '')
    return CUSTOMERS.filter(
      (c) => !k || c.custCd.includes(k) || c.custNm.includes(keyword.trim()) || (digits && c.bizRegNo.includes(digits)),
    )
  })
}
