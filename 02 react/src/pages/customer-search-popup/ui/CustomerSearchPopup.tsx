import { useEffect, useState } from 'react'
import { CUSTOMER_SEARCH_MSG, customerApi, type Customer, type CustomerSearchPopupData } from '@/domains/customer'
import { formatBizNo } from '@/shared/lib/format'
import { closeSelf, usePopupData } from '@/shared/lib/popup'

/** 거래처 검색 팝업 — 행 더블클릭 또는 선택 버튼으로 부모에 전달 */
export function CustomerSearchPopup() {
  const { data, received } = usePopupData<CustomerSearchPopupData>()
  // 사용자가 입력하기 전(null)에는 부모가 넘긴 검색어 사용
  const [keywordInput, setKeyword] = useState<string | null>(null)
  const keyword = keywordInput ?? data?.keyword ?? ''
  const [rows, setRows] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  const search = async (k: string) => {
    setLoading(true)
    try {
      setRows(await customerApi.search(k))
    } finally {
      setLoading(false)
    }
  }

  // 부모 데이터 수신 후 초기 검색 (부모 없이 열려도 1회 검색)
  useEffect(() => {
    if (!received && window.opener) return
    let cancelled = false
    customerApi.search(data?.keyword ?? '').then((r) => {
      if (!cancelled) setRows(r)
    })
    return () => {
      cancelled = true
    }
  }, [received, data?.keyword])

  const select = (c: Customer) => closeSelf(CUSTOMER_SEARCH_MSG.SELECT, c)

  return (
    <div>
      <h1 className="popup-title">거래처 검색</h1>
      <form
        className="form-row"
        onSubmit={(e) => {
          e.preventDefault()
          void search(keyword)
        }}
      >
        <input
          className="input inline"
          placeholder="거래처코드 / 거래처명 / 사업자번호"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? '검색 중...' : '검색'}
        </button>
      </form>

      <table className="table clickable" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>코드</th>
            <th>거래처명</th>
            <th>사업자번호</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.custCd} onDoubleClick={() => select(c)}>
              <td>{c.custCd}</td>
              <td>
                {c.custNm} {c.stopYn === 'Y' && <span className="badge error">거래정지</span>}
              </td>
              <td>{formatBizNo(c.bizRegNo)}</td>
              <td>
                <button className="small" onClick={() => select(c)}>
                  선택
                </button>
              </td>
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={4} className="empty">
                검색 결과가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="desc small">행을 더블클릭해도 선택됩니다. 거래정지 거래처를 선택하면 서버 검증 오류를 확인할 수 있습니다.</p>
    </div>
  )
}
