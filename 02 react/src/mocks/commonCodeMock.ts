import type { CommonCodeMap } from '@/shared/types/commonCode'
import { COMMON_CODE_TABLE } from './data/commonCodes'
import { mockResponse } from './mockUtils'

/** GET /common-codes?groups=A,B 의 더미 구현 */
export function mockGetCommonCodes(groupCodes: string[]): Promise<CommonCodeMap> {
  return mockResponse('GET /common-codes', { groups: groupCodes.join(',') }, () => {
    const result: CommonCodeMap = {}
    groupCodes.forEach((group) => {
      result[group] = COMMON_CODE_TABLE.filter((c) => c.groupCode === group).sort((a, b) => a.sortOrder - b.sortOrder)
    })
    return result
  })
}
