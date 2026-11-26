package com.example.demo.erp.mapping;

/**
 * 필드 값 변환기. 구현체는 public no-arg 생성자가 있어야 하며, 인스턴스는 캐싱되어 공유되므로 무상태여야 한다.
 *
 * @param <T> Java 쪽 타입
 */
public interface ErpConverter<T> {

    Object toErp(T value);

    T fromErp(Object erpValue);

    /** "변환기 지정 안 함" 표시용. */
    final class None implements ErpConverter<Object> {
        private None() {
        }

        @Override
        public Object toErp(Object value) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Object fromErp(Object erpValue) {
            throw new UnsupportedOperationException();
        }
    }
}
