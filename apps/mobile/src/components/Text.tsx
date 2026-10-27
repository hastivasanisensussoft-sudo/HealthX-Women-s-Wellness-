import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, font } from '@/lib/theme';

export type TextVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyMedium'
  | 'bodyBold'
  | 'small'
  | 'smallMedium'
  | 'caption'
  | 'label'
  | 'overline';

const variants: Record<TextVariant, TextStyle> = {
  hero: { fontFamily: font.displayBold, fontSize: 38, lineHeight: 44, letterSpacing: -0.8 },
  display: { fontFamily: font.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: font.display, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  h3: { fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 23 },
  bodyMedium: { fontFamily: font.medium, fontSize: 15, lineHeight: 23 },
  bodyBold: { fontFamily: font.bold, fontSize: 15, lineHeight: 23 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 19 },
  smallMedium: { fontFamily: font.semibold, fontSize: 13, lineHeight: 19 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: font.monoMedium, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.6, textTransform: 'uppercase' },
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  muted?: boolean;
  center?: boolean;
}

export function AppText({ variant = 'body', color, muted, center, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        variants[variant],
        { color: color ?? (muted ? colors.textMuted : colors.text) },
        center && styles.center,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
