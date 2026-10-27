/**
 * Photo with a soft placeholder, a cross-fade on load and a graceful fallback (mint panel with
 * a leaf) when the image can't load. Shapes: rounded, arch (Mira / Balanza) or circle.
 */
import type { PhotoKey } from '@healthx/shared';
import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

import { PHOTOS } from '@/lib/photos';
import { palette } from '@/lib/theme';

export function Photo({
  photo,
  source,
  style,
  radius = 22,
  shape = 'rounded',
  alt,
  position,
  children,
}: {
  photo?: PhotoKey;
  source?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  shape?: 'rounded' | 'arch' | 'circle' | 'none';
  /** Accessible description; omit for decorative photos. */
  alt?: string;
  /** contentPosition, e.g. "top" to keep faces in frame. */
  position?: 'top' | 'center' | 'bottom';
  children?: ReactNode;
}) {
  const src = source ?? (photo ? PHOTOS[photo] : undefined);
  const [failed, setFailed] = useState(!src);
  const shapeStyle: ViewStyle =
    shape === 'none' ? {} : shape === 'circle' ? { borderRadius: 9999 } : shape === 'arch' ? { borderTopLeftRadius: 9999, borderTopRightRadius: 9999, borderBottomLeftRadius: radius, borderBottomRightRadius: radius } : { borderRadius: radius };
  return (
    <View style={[styles.wrap, shapeStyle, style]} accessible={!!alt} accessibilityRole={alt ? 'image' : undefined} accessibilityLabel={alt}>
      {!failed && src ? (
        <Image source={src as never} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={position ?? 'center'} transition={350} onError={() => setFailed(true)} accessible={false} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <View style={[styles.leaf, { top: '18%', right: '16%', backgroundColor: palette.rose[100] }]} />
          <View style={[styles.leaf, styles.leafAlt, { bottom: '18%', left: '14%' }]} />
          <ImageOff size={22} color={palette.green[700]} />
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: palette.green[100] },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green[50] },
  leaf: { position: 'absolute', width: 34, height: 34, borderTopRightRadius: 26, borderBottomLeftRadius: 26 },
  leafAlt: { width: 26, height: 26, backgroundColor: 'rgba(255,255,255,0.8)', borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderTopLeftRadius: 20, borderBottomRightRadius: 20 },
});
