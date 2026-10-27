/** Evergreen form controls: 52 px fields, pill chips and segmented controls, sliders, steppers and selects. */
import { Check, ChevronDown, CircleAlert, Minus, Plus, Search, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View, type GestureResponderEvent, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from 'react-native';

import { Sheet } from './Sheet';
import { AppText } from './Text';
import { brandText, colors, font, palette } from '@/lib/theme';

const FOCUS_RING = { shadowColor: palette.green[500], shadowOpacity: 0.22, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } } as const;

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  secure,
  keyboardType,
  autoCapitalize = 'sentences',
  multiline,
  right,
  style,
  maxLength,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  hint?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  right?: ReactNode;
  style?: ViewStyle;
  maxLength?: number;
  /** Leading icon inside the field (additive). */
  icon?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 7 }, style]}>
      <AppText variant="label" color={palette.ink[800]}>
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          multiline && { minHeight: 108, alignItems: 'flex-start', paddingVertical: 12 },
          focused && styles.fieldFocus,
          focused && { ...FOCUS_RING, shadowRadius: 4 },
          !!error && styles.fieldError,
        ]}>
        {icon ? <View style={multiline ? { paddingTop: 2 } : undefined}>{icon}</View> : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.ink[400]}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && { textAlignVertical: 'top', minHeight: 80 }]}
        />
        {right}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <CircleAlert size={14} color={colors.danger} />
          <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite" style={{ flex: 1, fontSize: 12.5 }}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  disabled,
  right,
  last,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  right?: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !last && styles.rowBorder]}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AppText variant="bodyMedium">{title}</AppText>
          {right}
        </View>
        {subtitle ? (
          <AppText variant="small" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: palette.ink[200], true: palette.green[600] }}
        thumbColor={colors.surface}
        ios_backgroundColor={palette.ink[200]}
      />
    </View>
  );
}

type SegTone = 'green' | 'rose' | 'lavender' | 'peach' | 'sky';
const SEG_TONES: Record<SegTone, { fg: string; border: string }> = {
  green: { fg: brandText, border: palette.green[200] },
  rose: { fg: palette.rose[700], border: palette.rose[200] },
  lavender: { fg: palette.lavender[700], border: palette.lavender[200] },
  peach: { fg: palette.peach[700], border: palette.peach[200] },
  sky: { fg: palette.sky[700], border: palette.sky[200] },
};

/** Pill segmented control: soft mint track, white raised thumb on the active option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
  tone = 'green',
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
  /** Accent of the active option (additive). */
  tone?: SegTone;
}) {
  const t = SEG_TONES[tone];
  return (
    <View style={[styles.segment, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            aria-selected={active}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => [styles.segItem, active && [styles.segActive, { borderColor: t.border }], pressed && !active && { backgroundColor: palette.green[100] }]}>
            <AppText variant="smallMedium" color={active ? t.fg : palette.ink[600]} numberOfLines={1} style={active ? { fontFamily: font.bold } : undefined}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

type ChipTone = 'green' | 'rose' | 'lavender' | 'peach' | 'sky' | 'indigo';
const CHIP_TONES: Record<ChipTone, { bg: string; border: string; fg: string; check: string }> = {
  green: { bg: palette.green[100], border: palette.green[500], fg: brandText, check: palette.green[700] },
  rose: { bg: palette.rose[100], border: palette.rose[400], fg: palette.rose[700], check: palette.rose[600] },
  lavender: { bg: palette.lavender[100], border: palette.lavender[400], fg: palette.lavender[700], check: palette.lavender[600] },
  peach: { bg: palette.peach[100], border: palette.peach[400], fg: palette.peach[700], check: palette.peach[600] },
  sky: { bg: palette.sky[100], border: palette.sky[400], fg: palette.sky[700], check: palette.sky[600] },
  indigo: { bg: palette.indigo[100], border: palette.indigo[400], fg: palette.indigo[700], check: palette.indigo[600] },
};

/**
 * Pill chip. "tint" (default) fills with the tone's soft tint and shows a check when selected;
 * "solid" fills evergreen (filters, category tabs).
 */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  tone = 'green',
  style,
  variant = 'tint',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  tone?: ChipTone;
  style?: ViewStyle;
  /** Selected look (additive): tinted (default) or solid evergreen. */
  variant?: 'tint' | 'solid';
}) {
  const t = CHIP_TONES[tone];
  const solid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      aria-selected={!!selected}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        selected ? (solid ? styles.chipSolid : { backgroundColor: t.bg, borderColor: t.border }) : null,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {selected && solid ? <Check size={14} color="#FFFFFF" /> : icon}
      <AppText variant="smallMedium" color={selected ? (solid ? '#FFFFFF' : t.fg) : palette.ink[800]}>
        {label}
      </AppText>
      {selected && !solid ? (
        <View style={[styles.chipCheck, { backgroundColor: t.check }]}>
          <Check size={10} color="#fff" strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Search', style }: { value: string; onChangeText: (v: string) => void; placeholder?: string; style?: ViewStyle }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.fieldFocus, style]}>
      <Search size={18} color={focused ? palette.green[700] : palette.ink[400]} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.ink[400]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { paddingVertical: 0 }]}
        returnKeyType="search"
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} hitSlop={8} style={styles.clear}>
          <X size={14} color={palette.ink[600]} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** 1–10 rating selector (energy, stress) — D-28 canonical scale. */
export function Scale10({ value, onChange, color = palette.green[600], label }: { value: number; onChange: (v: number) => void; color?: string; label: string }) {
  return (
    <View style={styles.scale} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value} of 10`}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const on = n <= value;
        return (
          <Pressable
            key={n}
            accessibilityLabel={`${label} ${n}`}
            onPress={() => onChange(n)}
            hitSlop={4}
            style={[styles.scaleDot, { backgroundColor: on ? color : palette.ink[100] }, n === value && styles.scaleCurrent]}>
            {n === value ? (
              <AppText variant="caption" color="#fff" style={{ fontSize: 11 }}>
                {n}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100,
  format = (v: number) => String(v),
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  label: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <View style={styles.stepper} accessibilityLabel={label}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={() => set(value - step)} style={({ pressed }) => [styles.stepBtn, value <= min && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.94 }] }]}>
        <Minus size={18} color={brandText} />
      </Pressable>
      <AppText style={styles.stepValue} accessibilityLiveRegion="polite">
        {format(value)}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={() => set(value + step)} style={({ pressed }) => [styles.stepBtn, styles.stepBtnPlus, value >= max && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.94 }] }]}>
        <Plus size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: palette.ink[200],
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldFocus: { borderColor: palette.green[500], backgroundColor: palette.green[50] },
  search: { height: 50, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: palette.ink[200], flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  clear: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.ink[100], alignItems: 'center', justifyContent: 'center' },
  fieldError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // The field draws its own focus state, so the browser outline is turned off on web; minWidth lets inputs shrink in rows.
  input: { flex: 1, minWidth: 0, fontFamily: font.medium, fontSize: 15.5, color: colors.text, paddingVertical: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  segment: { flexDirection: 'row', backgroundColor: palette.green[50], borderRadius: 999, padding: 4, borderWidth: 1, borderColor: palette.green[100] },
  segItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 8, borderWidth: 1, borderColor: 'transparent' },
  segActive: { backgroundColor: colors.surface, shadowColor: '#0D4336', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: palette.ink[200],
    backgroundColor: colors.surface,
  },
  chipSolid: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  chipCheck: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: -4 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  scaleDot: { flex: 1, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scaleCurrent: { transform: [{ scaleY: 1.12 }] },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, borderRadius: 999, borderWidth: 1.5, borderColor: palette.ink[200], paddingHorizontal: 7, backgroundColor: colors.surface },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  stepBtnPlus: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  stepValue: { flex: 1, textAlign: 'center', fontFamily: font.display, fontSize: 20, lineHeight: 26, color: colors.text },
  sliderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sliderValue: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  sliderHit: { height: 36, justifyContent: 'center', marginTop: 6 },
  sliderTrack: { height: 10, borderRadius: 10, backgroundColor: palette.ink[100], overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 10 },
  sliderThumb: { position: 'absolute', top: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 4, shadowColor: '#0D4336', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sliderTicks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  select: { minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: palette.ink[200], backgroundColor: colors.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, marginBottom: 4 },
  optionOn: { backgroundColor: palette.green[50] },
  box: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: palette.ink[300], backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
});

/** Slider (track + round thumb) for 1–10 scales. Tap or drag; adjustable for screen readers. */
export function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  color = palette.green[700],
  hideHeader,
  icon,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  color?: string;
  hideHeader?: boolean;
  /** Leading icon in the header (additive). */
  icon?: ReactNode;
  /** End labels under the track (additive). */
  lowLabel?: string;
  highLabel?: string;
}) {
  const [w, setW] = useState(0);
  const pct = (value - min) / (max - min);
  const fromX = (e: GestureResponderEvent) => {
    if (!w) return;
    const ratio = Math.min(1, Math.max(0, e.nativeEvent.locationX / w));
    const next = Math.round(min + ratio * (max - min));
    if (next !== value) onChange(next);
  };
  return (
    <View>
      {!hideHeader ? (
        <View style={styles.sliderHead}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            {icon}
            <AppText variant="h3">{label}</AppText>
          </View>
          <View style={[styles.sliderValue, { backgroundColor: palette.ink[50], borderWidth: 1, borderColor: palette.ink[100] }]}>
            <AppText variant="smallMedium" color={palette.ink[800]} style={{ fontFamily: font.bold }}>
              {value} / {max}
            </AppText>
          </View>
        </View>
      ) : null}
      <View
        style={styles.sliderHit}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={fromX}
        onResponderMove={fromX}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}>
        <View pointerEvents="none" style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
        <View pointerEvents="none" style={[styles.sliderThumb, { left: Math.min(Math.max(0, pct * w - 13), Math.max(0, w - 26)), borderColor: color }]} />
      </View>
      {lowLabel || highLabel ? (
        <View style={styles.sliderTicks}>
          <AppText variant="caption" muted>
            {lowLabel}
          </AppText>
          <AppText variant="caption" muted>
            {highLabel}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** Field that opens a bottom sheet of options (country, language, timezone…). */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  style,
}: {
  label?: string;
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value)?.label ?? value;
  return (
    <View style={[{ gap: 7 }, style]}>
      {label ? (
        <AppText variant="label" color={palette.ink[800]}>
          {label}
        </AppText>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`${label ?? 'Select'}: ${current}`} onPress={() => setOpen(true)} style={({ pressed }) => [styles.select, (pressed || open) && styles.fieldFocus]}>
        {icon}
        <AppText variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
          {current}
        </AppText>
        <ChevronDown size={16} color={palette.green[700]} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? 'Select'}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              aria-selected={on}
              onPress={() => {
                onChange(o.key);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.option, (on || pressed) && styles.optionOn]}>
              <AppText variant="bodyMedium" style={{ flex: 1 }} color={on ? brandText : colors.text}>
                {o.label}
              </AppText>
              {on ? (
                <View style={[styles.box, styles.boxOn]}>
                  <Check size={13} color="#fff" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

/** Round check (mockup .dot) used in checklists, consent and agreement rows. */
export function CheckBox({ checked, onPress, label, children, style }: { checked: boolean; onPress?: () => void; label: string; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={4}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 }, style]}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}</View>
      {children ?? (
        <AppText variant="small" style={{ flex: 1 }}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}
