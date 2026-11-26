package com.example.demo.erp.mapping;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** ERP 매핑에서 제외할 필드. */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ErpIgnore {
}
