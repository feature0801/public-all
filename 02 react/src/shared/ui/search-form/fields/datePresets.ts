import dayjs from 'dayjs'

export interface DatePreset {
  label: string
  /** [시작일, 종료일] 'YYYY-MM-DD' */
  range: () => [string, string]
}

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD')

/** 기본 기간 버튼 — 페이지마다 다르면 DateRangeField 의 presets 로 교체 */
export const DEFAULT_DATE_PRESETS: DatePreset[] = [
  { label: '오늘', range: () => [fmt(dayjs()), fmt(dayjs())] },
  { label: '1주', range: () => [fmt(dayjs().subtract(6, 'day')), fmt(dayjs())] },
  { label: '1개월', range: () => [fmt(dayjs().subtract(1, 'month').add(1, 'day')), fmt(dayjs())] },
  { label: '3개월', range: () => [fmt(dayjs().subtract(3, 'month').add(1, 'day')), fmt(dayjs())] },
]
