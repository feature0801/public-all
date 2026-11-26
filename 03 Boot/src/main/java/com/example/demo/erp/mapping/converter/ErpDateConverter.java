package com.example.demo.erp.mapping.converter;

import com.example.demo.erp.mapping.ErpConverter;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/** LocalDate ↔ "yyyyMMdd". 빈 값/"00000000" 은 null. */
public class ErpDateConverter implements ErpConverter<LocalDate> {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    @Override
    public Object toErp(LocalDate value) {
        return value.format(FORMAT);
    }

    @Override
    public LocalDate fromErp(Object erpValue) {
        if (erpValue instanceof LocalDate d) {
            return d;
        }
        String s = erpValue.toString().trim();
        if (s.isEmpty() || "00000000".equals(s)) {
            return null;
        }
        return LocalDate.parse(s, FORMAT);
    }
}
