/**
 * 자주 쓰는 컬럼 정의 조각
 * colDef 에 스프레드해서 사용: { field: 'amt', headerName: '금액', ...col.number() }
 */
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { getCodeSource } from '@/shared/lib/code-source'
import { formatBizNo, formatDate, formatNumber } from '@/shared/lib/format'

/** 스프레드해도 컬럼의 field 타입(ColDef<Order>)을 깨지 않도록 필요한 속성만 */
type Col = Pick<ColDef, 'type' | 'valueFormatter' | 'cellClass'>

export const col = {
  /** 숫자 (우측 정렬, 콤마) */
  number: (fractionDigits = 0): Col => ({
    type: 'rightAligned',
    valueFormatter: (p: ValueFormatterParams) => formatNumber(p.value, fractionDigits),
  }),

  /** 날짜 ('YYYYMMDD' 등 → 'YYYY-MM-DD') */
  date: (format = 'YYYY-MM-DD'): Col => ({
    cellClass: 'cell-center',
    valueFormatter: (p: ValueFormatterParams) => formatDate(p.value, format),
  }),

  /** 공통코드 → 명칭 (공통코드가 나중에 조회돼도 AppGrid 가 셀을 다시 그림) */
  code: (groupCode: string): Col => ({
    valueFormatter: (p: ValueFormatterParams) => getCodeSource().getName(groupCode, p.value, ''),
  }),

  /** 사업자번호 */
  bizNo: (): Col => ({
    cellClass: 'cell-center',
    valueFormatter: (p: ValueFormatterParams) => formatBizNo(p.value),
  }),

  center: (): Col => ({ cellClass: 'cell-center' }),
}
