import { useWatch, type Control } from 'react-hook-form'
import dayjs from 'dayjs'
import { orderQueries, type Order } from '@/domains/order'
import { CODE_GROUP, usePrefetchCommonCodes } from '@/domains/common-code'
import { CUSTOMER_SEARCH_POPUP_URL, type CustomerSearchPopupData } from '@/domains/customer'
import { AppGrid } from '@/shared/ui/data-grid'
import { Pagination } from '@/shared/ui/pagination'
import {
  CheckboxField,
  CheckboxGroupField,
  DateRangeField,
  LookupField,
  MaskedField,
  NumberRangeField,
  RadioField,
  SearchForm,
  SearchItem,
  SelectField,
  TextField,
  useGridSearch,
  useSearchForm,
  type LookupValue,
} from '@/shared/ui/search-form'
import { formatBizNo } from '@/shared/lib/format'
import { usePopup } from '@/shared/lib/popup'
import { orderColumns } from '../model/orderColumns'
import { ORDER_SERVER_FIELD_MAP, toOrderSearchParams } from '../model/orderSearchParams'
import {
  DATE_TYPE_OPTIONS,
  getOrderSearchDefaults,
  orderSearchSchema,
  type OrderSearchForm,
  type OrderSearchValues,
} from '../model/orderSearchSchema'

/** 조회 직전 예외 처리 — 기간이 길면 확인 */
function confirmLongRange(values: OrderSearchValues): boolean {
  if (values.orderNo || values.customer.code) return true
  const days = dayjs(values.toDate).diff(dayjs(values.fromDate), 'day') + 1
  if (days <= 31) return true
  return confirm(`조회 기간이 ${days}일입니다. 거래처 없이 1개월을 넘게 조회하면 시간이 걸릴 수 있습니다.\n계속할까요?`)
}

export function OrderListPage() {
  usePrefetchCommonCodes([CODE_GROUP.ORDER_STATUS, CODE_GROUP.DEPT, CODE_GROUP.PAY_METHOD])

  const grid = useGridSearch(orderQueries.search, { pageSize: 20 })

  // 거래처 팝업 → { code, name }. 페이지를 벗어나면 팝업도 닫힌다
  const customerPopup = usePopup({ url: CUSTOMER_SEARCH_POPUP_URL, width: 560, height: 620 })
  const lookupCustomer = async (current: LookupValue): Promise<LookupValue | null> => {
    const data: CustomerSearchPopupData = { keyword: current.name }
    const c = await customerPopup.openForResult(data)
    return c ? { code: c.custCd, name: c.custNm } : null
  }

  const { form, submit, reset, searching } = useSearchForm({
    schema: orderSearchSchema,
    defaultValues: getOrderSearchDefaults(),
    toParams: toOrderSearchParams,
    beforeSearch: confirmLongRange,
    onSearch: (params) => grid.search(params),
    serverFieldMap: ORDER_SERVER_FIELD_MAP,
  })

  // 주문번호 입력 시 기간 조건 무시 안내
  const orderNo = useWatch({ control: form.control, name: 'orderNo' })
  const ignoreDate = orderNo.trim() !== ''

  return (
    <section>
      <h1>주문 조회</h1>
      <p className="desc">
        검색조건 검증(zod) → API 파라미터 변환 → AG Grid 서버 페이징/정렬 샘플. 아래 &quot;API 요청 확인&quot; 에서 실제
        전달된 값을 볼 수 있습니다.
      </p>

      <SearchForm
        form={form}
        onSubmit={submit}
        onReset={reset}
        searching={searching}
        detailOpen
        detail={
          <>
            <SearchItem label="부서" htmlFor="dept">
              <SelectField name="dept" codeGroup={CODE_GROUP.DEPT} placeholder="전체" />
            </SearchItem>
            <SearchItem label="사업자번호" htmlFor="bizNo">
              <MaskedField name="bizNo" format={formatBizNo} placeholder="000-00-00000" maxLength={12} />
            </SearchItem>
            <SearchItem label="주문금액" span={2}>
              <NumberRangeField minName="minAmount" maxName="maxAmount" suffix="원" />
            </SearchItem>
            <SearchItem label="결제수단" span={2}>
              <RadioField name="payMethod" codeGroup={CODE_GROUP.PAY_METHOD} allLabel="전체" />
            </SearchItem>
            <SearchItem label="담당자명" htmlFor="managerName">
              <TextField name="managerName" maxLength={20} placeholder="부분 일치" />
            </SearchItem>
            <SearchItem label="옵션">
              <CheckboxField name="includeCanceled" label="취소건 포함" />
            </SearchItem>
          </>
        }
      >
        <SearchItem label="조회기간" required={!ignoreDate} span={2} hint="주문번호로 조회하면 기간은 무시됩니다. 최대 3개월">
          <div className="inline-group">
            <SelectField name="dateType" options={DATE_TYPE_OPTIONS} />
            <DateRangeField fromName="fromDate" toName="toDate" />
          </div>
          {ignoreDate && <p className="field-hint">주문번호로 조회하므로 기간 조건은 적용되지 않습니다.</p>}
        </SearchItem>
        <SearchItem label="주문번호" htmlFor="orderNo">
          <TextField name="orderNo" upperCase maxLength={20} placeholder="4자 이상, 부분 일치" />
        </SearchItem>
        <SearchItem label="거래처">
          <LookupField name="customer" onLookup={lookupCustomer} />
        </SearchItem>
        <SearchItem label="주문상태" span={4}>
          <CheckboxGroupField name="statuses" codeGroup={CODE_GROUP.ORDER_STATUS} showAll />
        </SearchItem>
      </SearchForm>

      <div className="grid-panel">
        {grid.error && <p className="status fail">{grid.error}</p>}
        <AppGrid<Order>
          rowData={grid.rows}
          columnDefs={orderColumns}
          loading={grid.loading}
          serverSort
          onSortChange={grid.changeSort}
          getRowId={(p) => p.data.ordNo}
          height={520}
        />
        <Pagination
          page={grid.paging.page}
          size={grid.paging.size}
          total={grid.total}
          onPageChange={grid.goPage}
          onSizeChange={grid.changeSize}
        />
      </div>

      <details className="card debug" open>
        <summary>API 요청 확인</summary>
        <div className="split">
          <div>
            <h3>현재 폼 값 (form value)</h3>
            <FormValuesView control={form.control} />
          </div>
          <div>
            <h3>마지막 API 요청 파라미터</h3>
            <pre className="code">{grid.lastRequest ? JSON.stringify(grid.lastRequest, null, 2) : '조회 전'}</pre>
          </div>
        </div>
      </details>
    </section>
  )
}

/** 디버그용 — 폼 값 실시간 표시 */
function FormValuesView({ control }: { control: Control<OrderSearchForm> }) {
  const values = useWatch({ control })
  return <pre className="code">{JSON.stringify(values, null, 2)}</pre>
}
