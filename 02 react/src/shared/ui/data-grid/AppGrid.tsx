/**
 * AG Grid 공통 래퍼
 * - 모듈 등록, 테마, 한글 문구, 기본 컬럼 옵션을 한 곳에서 관리
 * - serverSort: 정렬 클릭 시 그리드가 직접 정렬하지 않고 onSortChange('field,asc') 로 알려줌 → API 재조회
 */
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type SortChangedEvent } from 'ag-grid-community'
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react'
import { useEffect, useMemo, useRef } from 'react'
import { getCodeSource } from '@/shared/lib/code-source'

ModuleRegistry.registerModules([AllCommunityModule])

const appTheme = themeQuartz.withParams({
  fontSize: 13,
  headerFontSize: 13,
  rowHeight: 34,
  headerHeight: 36,
  spacing: 6,
  accentColor: '#2f6feb',
  wrapperBorderRadius: 6,
})

const LOCALE_KO: Record<string, string> = {
  noRowsToShow: '조회된 데이터가 없습니다.',
  loadingOoo: '조회 중...',
  page: '페이지',
  of: '/',
  to: '~',
}

/** 서버 정렬일 때: 그리드는 받은 순서를 그대로 유지 (정렬 아이콘만 표시) */
const keepOrder = () => 0

interface AppGridProps<T> extends AgGridReactProps<T> {
  /** 그리드 높이 (기본 480) */
  height?: number | string
  /** true 면 정렬을 서버에 위임 */
  serverSort?: boolean
  /** serverSort 일 때 정렬 변경 콜백 ('field,asc' | undefined) */
  onSortChange?: (sort: string | undefined) => void
}

export function AppGrid<T>({ height = 480, serverSort, onSortChange, defaultColDef, ...rest }: AppGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null)

  // 코드 데이터가 나중에 로드되면 코드명 컬럼(col.code)이 갱신되도록 셀 다시 그리기
  useEffect(() => getCodeSource().subscribe(() => gridRef.current?.api?.refreshCells({ force: true })), [])

  const mergedColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      resizable: true,
      suppressHeaderMenuButton: true,
      ...(serverSort ? { comparator: keepOrder } : {}),
      ...defaultColDef,
    }),
    [defaultColDef, serverSort],
  )

  const handleSortChanged = (e: SortChangedEvent<T>) => {
    rest.onSortChanged?.(e)
    if (!serverSort || !onSortChange) return
    const sorted = e.api.getColumnState().find((c) => c.sort)
    onSortChange(sorted ? `${sorted.colId},${sorted.sort}` : undefined)
  }

  return (
    <div style={{ height }}>
      <AgGridReact<T>
        ref={gridRef}
        theme={appTheme}
        localeText={LOCALE_KO}
        suppressMultiSort
        {...rest}
        defaultColDef={mergedColDef}
        onSortChanged={handleSortChanged}
      />
    </div>
  )
}
