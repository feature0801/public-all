import dayjs from 'dayjs'
import type { Order } from '@/api/orderApi'
import { CUSTOMERS } from './customers'

/** 시드 고정 난수 (새로고침해도 같은 데이터) */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20261119)
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

const DEPTS = ['D100', 'D200', 'D300', 'D400', 'D500']
const STATUSES = ['ORDERED', 'PAID', 'SHIPPING', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'CANCELED']
const PAY_METHODS = ['CARD', 'CARD', 'BANK', 'CASH', 'POINT']
const MANAGERS = ['김철수', '이영희', '박민수', '최지은', '정우성', '한소희', '강동원', '윤아름']
const ITEMS = ['노트북', '모니터', '사무용 의자', 'A4 용지', '프린터 토너', '서버 랙', '네트워크 스위치', '책상', '복합기']

function generate(count: number): Order[] {
  const today = dayjs().startOf('day')
  const seqByDate = new Map<string, number>()
  const orders: Order[] = []

  for (let i = 0; i < count; i++) {
    const ordDate = today.subtract(between(0, 180), 'day')
    const ordDt = ordDate.format('YYYYMMDD')
    const seq = (seqByDate.get(ordDt) ?? 0) + 1
    seqByDate.set(ordDt, seq)

    const status = pick(STATUSES)
    const paid = status !== 'ORDERED' && !(status === 'CANCELED' && rand() < 0.5)
    const payDate = paid ? ordDate.add(between(0, 2), 'day') : null
    const shipDate = payDate && (status === 'SHIPPING' || status === 'DELIVERED') ? payDate.add(between(1, 3), 'day') : null
    const cust = pick(CUSTOMERS)

    orders.push({
      ordNo: `ORD${ordDt}${String(seq).padStart(3, '0')}`,
      ordDt,
      payDt: payDate?.format('YYYYMMDD') ?? null,
      shipDt: shipDate?.format('YYYYMMDD') ?? null,
      custCd: cust.custCd,
      custNm: cust.custNm,
      bizRegNo: cust.bizRegNo,
      deptCd: pick(DEPTS),
      ordStatCd: status,
      payMthdCd: pick(PAY_METHODS),
      ordAmt: between(1, 50_000) * 1_000,
      mgrNm: pick(MANAGERS),
      itemNm: pick(ITEMS),
    })
  }
  return orders.sort((a, b) => b.ordNo.localeCompare(a.ordNo))
}

export const ORDERS: Order[] = generate(600)
