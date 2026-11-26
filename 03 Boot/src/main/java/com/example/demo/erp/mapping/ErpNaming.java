package com.example.demo.erp.mapping;

import java.util.Locale;

/** {@code @ErpField} 가 없는 필드의 기본 이름 생성 규칙. */
public enum ErpNaming {

    /** customerName → customerName */
    AS_IS {
        @Override
        public String apply(String javaName) {
            return javaName;
        }
    },
    /** customerName → CUSTOMER_NAME */
    UPPER_SNAKE {
        @Override
        public String apply(String javaName) {
            return toSnake(javaName).toUpperCase(Locale.ROOT);
        }
    },
    /** customerName → customer_name */
    LOWER_SNAKE {
        @Override
        public String apply(String javaName) {
            return toSnake(javaName).toLowerCase(Locale.ROOT);
        }
    },
    /** customerName → CustomerName */
    PASCAL {
        @Override
        public String apply(String javaName) {
            return javaName.isEmpty() ? javaName
                    : Character.toUpperCase(javaName.charAt(0)) + javaName.substring(1);
        }
    };

    public abstract String apply(String javaName);

    private static String toSnake(String name) {
        StringBuilder sb = new StringBuilder(name.length() + 8);
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (Character.isUpperCase(c) && i > 0) {
                char prev = name.charAt(i - 1);
                boolean nextLower = i + 1 < name.length() && Character.isLowerCase(name.charAt(i + 1));
                if (Character.isLowerCase(prev) || Character.isDigit(prev)
                        || (Character.isUpperCase(prev) && nextLower)) {
                    sb.append('_');
                }
            }
            sb.append(c);
        }
        return sb.toString();
    }
}
