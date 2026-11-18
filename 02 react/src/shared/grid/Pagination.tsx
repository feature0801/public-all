interface PaginationProps {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
  onSizeChange?: (size: number) => void
  sizeOptions?: number[]
  /** 표시할 페이지 번호 개수 */
  window?: number
}

/** 서버 페이징용 페이지네이션 */
export function Pagination({
  page,
  size,
  total,
  onPageChange,
  onSizeChange,
  sizeOptions = [20, 50, 100],
  window = 10,
}: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / size))
  const start = Math.floor((page - 1) / window) * window + 1
  const end = Math.min(lastPage, start + window - 1)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), lastPage)
    if (next !== page) onPageChange(next)
  }

  return (
    <div className="pagination">
      <span className="total">
        총 <b>{total.toLocaleString()}</b>건
      </span>
      <span className="pages">
        <button className="page" onClick={() => go(1)} disabled={page === 1} aria-label="첫 페이지">
          «
        </button>
        <button className="page" onClick={() => go(start - 1)} disabled={start === 1} aria-label="이전">
          ‹
        </button>
        {pages.map((p) => (
          <button key={p} className={`page ${p === page ? 'current' : ''}`} onClick={() => go(p)}>
            {p}
          </button>
        ))}
        <button className="page" onClick={() => go(end + 1)} disabled={end === lastPage} aria-label="다음">
          ›
        </button>
        <button className="page" onClick={() => go(lastPage)} disabled={page === lastPage} aria-label="마지막 페이지">
          »
        </button>
      </span>
      {onSizeChange && (
        <select className="select size" value={size} onChange={(e) => onSizeChange(Number(e.target.value))}>
          {sizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}개씩
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
