import type { ColDef } from 'ag-grid-community'
import type { Order } from '@/api/orderApi'
import { CODE_GROUP } from '@/shared/constants/codeGroups'
import { col } from '@/shared/grid/columnTypes'

/** 주문 목록 컬럼 — field 명이 서버 정렬 파라미터(sort=field,dir)로 그대로 전달됨 */
export const orderColumns: ColDef<Order>[] = [
  { field: 'ordNo', headerName: '주문번호', width: 150, pinned: 'left' },
  { field: 'ordDt', headerName: '주문일', width: 110, ...col.date() },
  {
    field: 'ordStatCd',
    headerName: '상태',
    width: 95,
    ...col.code(CODE_GROUP.ORDER_STATUS),
    cellClassRules: {
      'cell-canceled': (p) => p.value === 'CANCELED',
      'cell-done': (p) => p.value === 'DELIVERED',
    },
  },
  { field: 'custCd', headerName: '거래처코드', width: 105, ...col.center() },
  { field: 'custNm', headerName: '거래처명', width: 120 },
  { field: 'bizRegNo', headerName: '사업자번호', width: 125, ...col.bizNo() },
  { field: 'itemNm', headerName: '품목', flex: 1, minWidth: 120 },
  { field: 'ordAmt', headerName: '주문금액', width: 125, ...col.number() },
  { field: 'payMthdCd', headerName: '결제수단', width: 95, ...col.code(CODE_GROUP.PAY_METHOD) },
  { field: 'payDt', headerName: '결제일', width: 110, ...col.date() },
  { field: 'shipDt', headerName: '출고일', width: 110, ...col.date() },
  { field: 'deptCd', headerName: '부서', width: 95, ...col.code(CODE_GROUP.DEPT) },
  { field: 'mgrNm', headerName: '담당자', width: 90, ...col.center() },
]
