/**
 * 공통코드 API
 * 화면/스토어는 이 모듈만 사용하고, mock 여부는 여기서 분기한다.
 * 실제 API 가 준비되면 .env 의 VITE_USE_MOCK=false 로 바꾸면 된다.
 */
import { mockGetCommonCodes } from '@/mocks/commonCodeMock'
import { http, USE_MOCK } from '@/shared/api'
import type { CommonCodeMap } from '../model/commonCode'

export const commonCodeApi = {
  /**
   * 여러 그룹의 공통코드를 한 번에 조회
   * GET /common-codes?groups=USER_STATUS,DEPT
   * 응답: { USER_STATUS: CommonCode[], DEPT: CommonCode[] }
   */
  getCodes(groupCodes: string[]): Promise<CommonCodeMap> {
    if (USE_MOCK) return mockGetCommonCodes(groupCodes)
    return http.get<CommonCodeMap>('/common-codes', { groups: groupCodes.join(',') })
  },
}
