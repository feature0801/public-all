package com.example.demo.erp.mapping;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 필드 단위 ERP 매핑 정의. 이름이 규칙과 전혀 다를 때(예: customerName ↔ NAME1)만 붙이면 된다.
 * record 컴포넌트에 붙여도 동작한다.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ErpField {

    /** ERP 쪽 필드명. 비우면 {@link ErpMapped#naming()} 규칙을 따른다. */
    String value() default "";

    /** 값 변환기 (예: Boolean ↔ "Y"/"N", LocalDate ↔ "yyyyMMdd"). */
    Class<? extends ErpConverter<?>> converter() default ErpConverter.None.class;

    /** ERP → Java 변환 시 키가 없거나 null 이면 예외. */
    boolean required() default false;
}
