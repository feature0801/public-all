package com.example.demo.erp.mapping;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * ERP 와 매핑되는 DTO 임을 표시한다.
 * <p>
 * {@code @ErpField} 가 없는 필드는 {@link #naming()} 규칙으로 ERP 이름을 자동 생성한다.
 * 중첩 구조(ERP structure / table)로 쓰이는 DTO 에도 반드시 붙여야 재귀 매핑된다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ErpMapped {

    ErpNaming naming() default ErpNaming.UPPER_SNAKE;
}
