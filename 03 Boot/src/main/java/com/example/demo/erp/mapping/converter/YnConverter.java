package com.example.demo.erp.mapping.converter;

import com.example.demo.erp.mapping.ErpConverter;

/** Boolean ↔ "Y"/"N" */
public class YnConverter implements ErpConverter<Boolean> {

    @Override
    public Object toErp(Boolean value) {
        return Boolean.TRUE.equals(value) ? "Y" : "N";
    }

    @Override
    public Boolean fromErp(Object erpValue) {
        String s = erpValue.toString().trim();
        if (s.isEmpty()) {
            return null;
        }
        return "Y".equalsIgnoreCase(s) || "X".equalsIgnoreCase(s);
    }
}
