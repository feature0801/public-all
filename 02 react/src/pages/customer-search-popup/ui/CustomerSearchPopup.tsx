import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { customerQueries, type Customer } from '@/domains/customer'
import { formatBizNo } from '@/shared/lib/format'
import { closeSelf, isOpenedAsPopup, usePopupData } from '@/shared/lib/popup'

/** 거래처 검색 팝업 — 행 더블클릭 또는 선택 버튼으로 부모에 전달. 부모 data 는 CustomerSearchPopupData */
export function CustomerSearchPopup() {
  const { data, received } = usePopupData()
  // 사용자가 입력하기 전(null)에는 부모가 넘긴 검색어 사용
  const [keywordInput, setKeyword] = useState<string | null>(null)
  const keyword = keywordInput ?? data?.keyword ?? ''
  // 실제로 조회한 검색어 (검색 버튼을 누르기 전에는 부모가 넘긴 검색어)
  const [searched, setSearched] = useState<string | null>(null)
  const searchKeyword = searched ?? data?.keyword ?? ''

  const query = useQuery({
    ...customerQueries.search(searchKeyword),
    // 부모 데이터를 받은 뒤 초기 검색 (부모 없이 열리면 바로 검색)
    enabled: received || !isOpenedAsPopup(),
  })
  const rows = query.data ?? []
  const loading = query.isFetching

  const search = () => {
    // 같은 검색어로 다시 누르면 새로 조회
    if (keyword === searchKeyword) void query.refetch()
    else setSearched(keyword)
  }

  const select = (c: Customer) => closeSelf(c)

  return (
    <div>
      <h1 className="popup-title">거래처 검색</h1>
      <form
        className="form-row"
        onSubmit={(e) => {
          e.preventDefault()
          search()
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
