package com.example.demo.erp.mapping;

import com.example.demo.erp.mapping.converter.ErpDateConverter;
import com.example.demo.erp.mapping.converter.YnConverter;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ErpMapperTest {

    private final ErpMapper mapper = new ErpMapper();

    // ---- 샘플 DTO: 이름이 전혀 다른 필드만 @ErpField, 나머지는 UPPER_SNAKE 자동 ----

    @ErpMapped
    record Customer(
            @ErpField(value = "KUNNR", required = true) String customerId,
            @ErpField("NAME1") String customerName,
            String phoneNumber,                                      // → PHONE_NUMBER
            @ErpField(value = "ACTIVE_YN", converter = YnConverter.class) Boolean active,
            @ErpField(value = "ERDAT", converter = ErpDateConverter.class) LocalDate createdAt,
            @ErpField("CREDIT_LMT") BigDecimal creditLimit,
            int grade,                                               // → GRADE, "3" → 3
            @ErpIgnore String uiOnlyMemo,
            @ErpField("ET_ORDERS") List<Order> orders                // ERP table
    ) {
    }

    @ErpMapped
    record Order(@ErpField("VBELN") String orderNo, @ErpField("NETWR") BigDecimal amount) {
    }

    /** 일반 클래스 + 다른 네이밍 규칙 */
    @ErpMapped(naming = ErpNaming.PASCAL)
    static class Vendor {
        String vendorCode;            // → VendorCode
        @ErpField("LIFNR_NM") String name;
        long count;
    }

    @Test
    void javaToErp() {
        Customer c = new Customer("C001", "홍길동", "010-1234", true, LocalDate.of(2026, 11, 27),
                new BigDecimal("1000.50"), 3, "memo", List.of(new Order("O1", BigDecimal.TEN)));

        Map<String, Object> erp = mapper.toErp(c);

        assertThat(erp)
                .containsEntry("KUNNR", "C001")
                .containsEntry("NAME1", "홍길동")
                .containsEntry("PHONE_NUMBER", "010-1234")
                .containsEntry("ACTIVE_YN", "Y")
                .containsEntry("ERDAT", "20261127")
                .containsEntry("CREDIT_LMT", new BigDecimal("1000.50"))
                .containsEntry("GRADE", 3)
                .doesNotContainKey("UI_ONLY_MEMO");
        assertThat(erp.get("ET_ORDERS")).isEqualTo(List.of(Map.of("VBELN", "O1", "NETWR", BigDecimal.TEN)));
    }

    @Test
    void erpToJava_withTypeConversion() {
        Map<String, Object> erp = Map.of(
                "KUNNR", "C002",
                "NAME1", "김철수",
                "ACTIVE_YN", "N",
                "ERDAT", "00000000",
                "CREDIT_LMT", "2500.00",   // 문자열 → BigDecimal
                "GRADE", "5",              // 문자열 → int
                "ET_ORDERS", List.of(Map.of("VBELN", "O9", "NETWR", "99.9")));

        Customer c = mapper.fromErp(erp, Customer.class);

        assertThat(c.customerId()).isEqualTo("C002");
        assertThat(c.customerName()).isEqualTo("김철수");
        assertThat(c.phoneNumber()).isNull();
        assertThat(c.active()).isFalse();
        assertThat(c.createdAt()).isNull();
        assertThat(c.creditLimit()).isEqualByComparingTo("2500.00");
        assertThat(c.grade()).isEqualTo(5);
        assertThat(c.orders()).containsExactly(new Order("O9", new BigDecimal("99.9")));
    }

    @Test
    void roundTrip() {
        Customer c = new Customer("C003", "이영희", null, false, LocalDate.of(2025, 1, 2),
                BigDecimal.ONE, 1, null, List.of());
        assertThat(mapper.fromErp(mapper.toErp(c), Customer.class)).isEqualTo(c);
    }

    @Test
    void pojoWithPascalNaming() {
        Vendor v = mapper.fromErp(Map.of("VendorCode", "V1", "LIFNR_NM", "공급사", "Count", "7"), Vendor.class);
        assertThat(v.vendorCode).isEqualTo("V1");
        assertThat(v.name).isEqualTo("공급사");
        assertThat(v.count).isEqualTo(7L);
        assertThat(mapper.toErp(v)).containsEntry("VendorCode", "V1").containsEntry("Count", 7L);
    }

    @Test
    void listMapping() {
        List<Order> orders = mapper.fromErpList(
                List.of(Map.of("VBELN", "A"), Map.of("VBELN", "B", "NETWR", "")), Order.class);
        assertThat(orders).extracting(Order::orderNo).containsExactly("A", "B");
        assertThat(orders.get(1).amount()).isNull();   // "" → null
    }

    @Test
    void requiredMissing() {
        assertThatThrownBy(() -> mapper.fromErp(Map.of("NAME1", "x"), Customer.class))
                .isInstanceOf(ErpMappingException.class)
                .hasMessageContaining("Customer.customerId(KUNNR)");
    }

    @Test
    void conversionErrorPointsToField() {
        assertThatThrownBy(() -> mapper.fromErp(Map.of("KUNNR", "C", "GRADE", "abc"), Customer.class))
                .isInstanceOf(ErpMappingException.class)
                .hasMessageContaining("Customer.grade(GRADE)");
    }

    record Duplicated(@ErpField("X") String a, @ErpField("X") String b) {
    }

    @Test
    void duplicateErpNameFailsFast() {
        assertThatThrownBy(() -> mapper.toErp(new Duplicated("1", "2")))
                .isInstanceOf(ErpMappingException.class)
                .hasMessageContaining("중복");
    }
}
