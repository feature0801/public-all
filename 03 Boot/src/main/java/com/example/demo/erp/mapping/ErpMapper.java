package com.example.demo.erp.mapping;

import org.springframework.beans.BeanUtils;
import org.springframework.core.convert.ConversionService;
import org.springframework.core.convert.TypeDescriptor;
import org.springframework.core.convert.support.DefaultConversionService;
import org.springframework.stereotype.Component;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Java DTO ↔ ERP 파라미터(Map) 공통 변환기.
 *
 * <ul>
 *   <li>이름 매핑: {@code @ErpField("NAME1")} 로 개별 지정, 없으면 {@code @ErpMapped(naming)} 규칙</li>
 *   <li>값 변환: {@code @ErpField(converter)} → 없으면 Spring ConversionService 로 타입 변환</li>
 *   <li>중첩: {@code @ErpMapped} 타입 필드 → Map, {@code List<@ErpMapped>} → List&lt;Map&gt; (ERP structure / table)</li>
 *   <li>성능: 클래스별 메타데이터(필드, 이름, 변환기, 생성자)를 최초 1회만 분석해 캐싱</li>
 * </ul>
 * record 와 일반 클래스(no-arg 생성자) 모두 지원한다. thread-safe.
 */
@Component
public class ErpMapper {

    private final ConversionService conversionService;
    private final Map<Class<?>, TypeMeta> metaCache = new ConcurrentHashMap<>();
    private final Map<Class<?>, ErpConverter<Object>> converterCache = new ConcurrentHashMap<>();

    public ErpMapper() {
        this(DefaultConversionService.getSharedInstance());
    }

    public ErpMapper(ConversionService conversionService) {
        this.conversionService = conversionService;
    }

    // ------------------------------------------------------------------ Java → ERP

    /** DTO → ERP 파라미터. null 필드는 제외된다. */
    public Map<String, Object> toErp(Object source) {
        if (source == null) {
            return new LinkedHashMap<>();
        }
        TypeMeta meta = meta(source.getClass());
        Map<String, Object> out = new LinkedHashMap<>(meta.fields().size() * 2);
        for (FieldMeta f : meta.fields()) {
            Object value = f.get(source);
            if (value != null) {
                out.put(f.erpName(), toErpValue(meta, f, value));
            }
        }
        return out;
    }

    public List<Map<String, Object>> toErpList(Collection<?> sources) {
        List<Map<String, Object>> out = new ArrayList<>(sources.size());
        for (Object s : sources) {
            out.add(toErp(s));
        }
        return out;
    }

    private Object toErpValue(TypeMeta meta, FieldMeta f, Object value) {
        try {
            if (f.converter() != null) {
                return f.converter().toErp(value);
            }
            if (f.nested()) {
                return toErp(value);
            }
            if (f.elementNested()) {
                return toErpList((Collection<?>) value);
            }
            return value;
        } catch (ErpMappingException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new ErpMappingException(location(meta, f) + " → ERP 변환 실패: " + value, e);
        }
    }

    // ------------------------------------------------------------------ ERP → Java

    /** ERP 결과(Map) → DTO. */
    public <T> T fromErp(Map<String, ?> source, Class<T> type) {
        if (source == null) {
            return null;
        }
        TypeMeta meta = meta(type);
        Object[] values = new Object[meta.fields().size()];
        for (int i = 0; i < values.length; i++) {
            FieldMeta f = meta.fields().get(i);
            Object raw = source.get(f.erpName());
            Object value = raw == null ? null : fromErpValue(meta, f, raw);
            if (value == null && f.required()) {
                throw new ErpMappingException(location(meta, f) + " 필수 값 누락");
            }
            values[i] = value;
        }
        return type.cast(meta.instantiate(values));
    }

    public <T> List<T> fromErpList(Collection<? extends Map<String, ?>> rows, Class<T> type) {
        if (rows == null) {
            return List.of();
        }
        List<T> out = new ArrayList<>(rows.size());
        for (Map<String, ?> row : rows) {
            out.add(fromErp(row, type));
        }
        return out;
    }

    private Object fromErpValue(TypeMeta meta, FieldMeta f, Object raw) {
        try {
            if (f.converter() != null) {
                return f.converter().fromErp(raw);
            }
            if (f.nested()) {
                return fromErp(asMap(raw), f.type());
            }
            if (f.elementNested()) {
                List<Object> list = new ArrayList<>();
                for (Object row : (Collection<?>) raw) {
                    list.add(fromErp(asMap(row), f.elementType()));
                }
                return list;
            }
            // ERP 는 숫자/날짜 빈 값을 "" 로 주는 경우가 많다
            if (raw instanceof String s && s.isBlank() && f.type() != String.class) {
                return null;
            }
            return conversionService.convert(raw, TypeDescriptor.forObject(raw), f.typeDescriptor());
        } catch (ErpMappingException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new ErpMappingException(location(meta, f) + " ← ERP 변환 실패: " + raw, e);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, ?> asMap(Object raw) {
        if (raw instanceof Map<?, ?> m) {
            return (Map<String, ?>) m;
        }
        throw new ErpMappingException("Map 이 와야 하는데 " + raw.getClass().getName() + " 수신");
    }

    private static String location(TypeMeta meta, FieldMeta f) {
        return meta.type().getSimpleName() + "." + f.field().getName() + "(" + f.erpName() + ")";
    }

    // ------------------------------------------------------------------ 메타데이터 (클래스당 1회)

    private TypeMeta meta(Class<?> type) {
        return metaCache.computeIfAbsent(type, this::buildMeta);
    }

    private TypeMeta buildMeta(Class<?> type) {
        ErpMapped mapped = type.getAnnotation(ErpMapped.class);
        ErpNaming naming = mapped != null ? mapped.naming() : ErpNaming.UPPER_SNAKE;

        List<Field> candidates = new ArrayList<>();
        Constructor<?> ctor;
        int[] ctorIndex;
        int ctorArgCount;

        if (type.isRecord()) {
            RecordComponent[] components = type.getRecordComponents();
            Class<?>[] paramTypes = new Class<?>[components.length];
            for (int i = 0; i < components.length; i++) {
                paramTypes[i] = components[i].getType();
                candidates.add(declaredField(type, components[i].getName()));
            }
            ctor = declaredConstructor(type, paramTypes);
            ctorArgCount = components.length;
        } else {
            for (Class<?> c = type; c != null && c != Object.class; c = c.getSuperclass()) {
                for (Field field : c.getDeclaredFields()) {
                    if (!Modifier.isStatic(field.getModifiers()) && !field.isSynthetic()) {
                        candidates.add(field);
                    }
                }
            }
            ctor = declaredConstructor(type);
            ctorArgCount = 0;
        }

        List<FieldMeta> fields = new ArrayList<>();
        List<Integer> indexes = new ArrayList<>();
        Map<String, String> seen = new HashMap<>();
        for (int i = 0; i < candidates.size(); i++) {
            Field field = candidates.get(i);
            if (field.isAnnotationPresent(ErpIgnore.class)) {
                continue;
            }
            field.setAccessible(true);
            FieldMeta fm = buildField(field, naming);
            String dup = seen.putIfAbsent(fm.erpName(), field.getName());
            if (dup != null) {
                throw new ErpMappingException(type.getSimpleName() + ": ERP 이름 '" + fm.erpName()
                        + "' 이 " + dup + ", " + field.getName() + " 에 중복 매핑됨");
            }
            fields.add(fm);
            indexes.add(i);
        }
        ctorIndex = indexes.stream().mapToInt(Integer::intValue).toArray();
        return new TypeMeta(type, List.copyOf(fields), ctor, type.isRecord(), ctorIndex, ctorArgCount,
                type.isRecord() ? candidates.stream().map(Field::getType).toArray(Class<?>[]::new) : null);
    }

    private FieldMeta buildField(Field field, ErpNaming naming) {
        ErpField ann = field.getAnnotation(ErpField.class);
        String erpName = ann != null && !ann.value().isBlank() ? ann.value() : naming.apply(field.getName());
        ErpConverter<Object> converter = ann != null && ann.converter() != ErpConverter.None.class
                ? converterCache.computeIfAbsent(ann.converter(), ErpMapper::newConverter)
                : null;
        boolean required = ann != null && ann.required();

        Class<?> fieldType = field.getType();
        boolean nested = converter == null && fieldType.isAnnotationPresent(ErpMapped.class);
        Class<?> elementType = null;
        if (converter == null && Collection.class.isAssignableFrom(fieldType)
                && field.getGenericType() instanceof ParameterizedType pt) {
            Type arg = pt.getActualTypeArguments()[0];
            if (arg instanceof Class<?> c && c.isAnnotationPresent(ErpMapped.class)) {
                elementType = c;
            }
        }
        return new FieldMeta(field, erpName, converter, required, nested, elementType, new TypeDescriptor(field));
    }

    @SuppressWarnings("unchecked")
    private static ErpConverter<Object> newConverter(Class<?> type) {
        return (ErpConverter<Object>) BeanUtils.instantiateClass(type);
    }

    private static Field declaredField(Class<?> type, String name) {
        try {
            return type.getDeclaredField(name);
        } catch (NoSuchFieldException e) {
            throw new ErpMappingException(type.getName() + "." + name + " 필드 없음", e);
        }
    }

    private static Constructor<?> declaredConstructor(Class<?> type, Class<?>... params) {
        try {
            Constructor<?> c = type.getDeclaredConstructor(params);
            c.setAccessible(true);
            return c;
        } catch (NoSuchMethodException e) {
            throw new ErpMappingException(type.getName() + ": "
                    + (params.length == 0 ? "no-arg 생성자가 필요합니다" : "canonical 생성자를 찾을 수 없습니다"), e);
        }
    }

    private record FieldMeta(Field field, String erpName, ErpConverter<Object> converter, boolean required,
                             boolean nested, Class<?> elementType, TypeDescriptor typeDescriptor) {

        Class<?> type() {
            return field.getType();
        }

        boolean elementNested() {
            return elementType != null;
        }

        Object get(Object target) {
            try {
                return field.get(target);
            } catch (IllegalAccessException e) {
                throw new ErpMappingException(field + " 읽기 실패", e);
            }
        }
    }

    private record TypeMeta(Class<?> type, List<FieldMeta> fields, Constructor<?> ctor, boolean record,
                            int[] ctorIndex, int ctorArgCount, Class<?>[] ctorParamTypes) {

        Object instantiate(Object[] values) {
            try {
                if (record) {
                    Object[] args = new Object[ctorArgCount];
                    for (int i = 0; i < ctorArgCount; i++) {
                        args[i] = defaultValue(ctorParamTypes[i]);
                    }
                    for (int i = 0; i < values.length; i++) {
                        if (values[i] != null) {
                            args[ctorIndex[i]] = values[i];
                        }
                    }
                    return ctor.newInstance(args);
                }
                Object instance = ctor.newInstance();
                for (int i = 0; i < values.length; i++) {
                    if (values[i] != null) {
                        fields.get(i).field().set(instance, values[i]);
                    }
                }
                return instance;
            } catch (ReflectiveOperationException | IllegalArgumentException e) {
                throw new ErpMappingException(type.getName() + " 생성 실패", e);
            }
        }

        private static Object defaultValue(Class<?> t) {
            if (!t.isPrimitive()) return null;
            if (t == boolean.class) return false;
            if (t == char.class) return '\0';
            if (t == long.class) return 0L;
            if (t == float.class) return 0f;
            if (t == double.class) return 0d;
            if (t == byte.class) return (byte) 0;
            if (t == short.class) return (short) 0;
            return 0;
        }
    }
}
