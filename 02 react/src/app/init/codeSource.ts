/** shared 의 코드 조회 인터페이스에 공통코드 도메인 구현을 연결 (앱 시작 시 1회) */
import { commonCodeSource } from '@/domains/common-code'
import { registerCodeSource } from '@/shared/lib/code-source'

registerCodeSource(commonCodeSource)
