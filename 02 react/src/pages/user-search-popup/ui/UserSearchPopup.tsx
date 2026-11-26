import { useMemo, useState } from 'react'
import { USER_SEARCH_MSG, type User } from '@/domains/user'
import { closeSelf, isOpenedAsPopup, sendToOpener, usePopupData } from '@/shared/lib/popup'

const MOCK_USERS: User[] = [
  { id: 1, name: '김철수', dept: '개발팀' },
  { id: 2, name: '이영희', dept: '기획팀' },
  { id: 3, name: '박민수', dept: '디자인팀' },
  { id: 4, name: '최지은', dept: '개발팀' },
  { id: 5, name: '정우성', dept: '영업팀' },
  { id: 6, name: '한소희', dept: '인사팀' },
]

/**
 * 사용자 검색 팝업
 * - 부모가 넘긴 data(UserSearchPopupData: 검색어, 선택된 id, 모드)로 초기화
 * - 단일 모드 : 선택 → closeSelf(user) 로 결과 전달 후 닫힘
 * - 다중 모드 : sendToOpener(ADD) 로 부모 콜백 호출. 부모가 update 로 보내주는 selectedIds 로
 *               이미 추가된 사용자 / 최대 인원 도달 시 버튼을 비활성화한다
 */
export function UserSearchPopup() {
  const { data, received } = usePopupData()
  // 사용자가 입력하기 전(null)에는 부모가 넘긴 검색어를 사용
  const [keywordInput, setKeyword] = useState<string | null>(null)
  const keyword = keywordInput ?? data?.keyword ?? ''

  const isMulti = !!data?.multi
  const selectedIds = data?.selectedIds ?? []
  const isFull = isMulti && data?.max != null && selectedIds.length >= data.max

  const users = useMemo(
    () => MOCK_USERS.filter((u) => u.name.includes(keyword) || u.dept.includes(keyword)),
    [keyword],
  )

  const handleSelect = (user: User) => {
    if (isMulti) sendToOpener(USER_SEARCH_MSG.ADD, user) // 부모의 handlers['add-user'] 실행
    else closeSelf(user)
  }

  return (
    <div>
      <h1 className="popup-title">사용자 검색 {isMulti && '(다중)'}</h1>

      {!isOpenedAsPopup() && (
        <p className="warn">부모 창 없이 직접 열린 페이지입니다. 데이터 수신/선택 결과 전달이 되지 않습니다.</p>
      )}

      <details className="received">
        <summary>부모로부터 받은 data {received ? '' : '(대기 중)'}</summary>
        <pre>{JSON.stringify(data ?? null, null, 2)}</pre>
      </details>

      <input
        className="input"
        placeholder="이름 또는 부서 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus
      />

      <table className="table">
        <thead>
          <tr>
            <th>이름</th>
            <th>부서</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelected = selectedIds.includes(u.id)
            return (
              <tr key={u.id} className={isSelected ? 'selected' : undefined}>
                <td>{u.name}</td>
                <td>{u.dept}</td>
                <td>
                  <button
                    className="small"
                    onClick={() => handleSelect(u)}
                    disabled={isMulti && (isSelected || isFull)}
                  >
                    {isMulti ? (isSelected ? '추가됨' : '추가') : isSelected ? '선택됨' : '선택'}
                  </button>
                </td>
              </tr>
            )
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={3} className="empty">
                검색 결과가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isFull && <p className="status fail">최대 {data?.max}명까지 추가할 수 있습니다.</p>}

      <div className="popup-footer">
        <button className="secondary" onClick={() => closeSelf()}>
          닫기
        </button>
      </div>
    </div>
  )
}
