/**
 * LiquidGlass — Apple-style transparent glass surface
 *
 * The glass is a very light tint over whatever is behind it.
 * Background shows through naturally — no BlurView needed.
 * Clean white edge highlights define the glass boundary.
 */
import React from 'react';
import {View, StyleSheet, ViewStyle, StyleProp, LayoutChangeEvent} from 'react-native';
import {
  Canvas,
  RoundedRect,
  LinearGradient as SkiaGradient,
  vec,
  Rect,
  Group,
  rrect,
  rect,
} from '@shopify/react-native-skia';
import {BorderRadius} from './theme';

export interface LiquidGlassProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  borderRadius?: number;
  tintOpacity?: number;
  disableSpecular?: boolean;
  useBlur?: boolean;
}

const LiquidGlass: React.FC<LiquidGlassProps> = ({
  style,
  children,
  borderRadius = BorderRadius.xl,
  tintOpacity = 0.08,
  disableSpecular = false,
}) => {
  const [layout, setLayout] = React.useState({width: 0, height: 0});

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setLayout({width, height});
  }, []);

  const {width: w, height: h} = layout;
  const r = borderRadius;

  return (
    <View
      style={[{borderRadius: r, overflow: 'hidden'}, style]}
      onLayout={onLayout}>

      {/* ── Layer 1: Very transparent white tint ──
           This is the "glass". It's barely there — just enough to
           distinguish it from the background behind. The background
           gradient shows through naturally. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {backgroundColor: `rgba(255, 255, 255, ${tintOpacity})`},
        ]}
      />

      {/* ── Layer 2: Skia edge effects ── */}
      {w > 0 && h > 0 && !disableSpecular && (
        <Canvas
          style={[StyleSheet.absoluteFill, {zIndex: 2}]}
          pointerEvents="none">
          <Group clip={rrect(rect(0, 0, w, h), r, r)}>

            {/* TOP HIGHLIGHT — bright light hitting the glass surface */}
            <Rect x={0} y={0} width={w} height={h * 0.04}>
              <SkiaGradient
                start={vec(w * 0.5, 0)}
                end={vec(w * 0.5, h * 0.04)}
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
              />
            </Rect>

            {/* RIM STROKE — bright at top, dim at sides, subtle at bottom */}
            <RoundedRect
              x={0.5}
              y={0.5}
              width={w - 1}
              height={h - 1}
              r={Math.max(r - 0.5, 0)}
              style="stroke"
              strokeWidth={1}>
              <SkiaGradient
                start={vec(w * 0.5, 0)}
                end={vec(w * 0.5, h)}
                colors={[
                  'rgba(255,255,255,0.45)',  // Top: bright specular
                  'rgba(255,255,255,0.08)',  // Upper-mid: fading
                  'rgba(255,255,255,0.04)',  // Mid: nearly invisible
                  'rgba(255,255,255,0.08)',  // Lower-mid
                  'rgba(255,255,255,0.20)',  // Bottom: subtle
                ]}
                positions={[0, 0.15, 0.5, 0.85, 1]}
              />
            </RoundedRect>

            {/* BOTTOM SHADOW — gives convex depth */}
            <Rect x={0} y={h * 0.85} width={w} height={h * 0.15}>
              <SkiaGradient
                start={vec(w * 0.5, h * 0.85)}
                end={vec(w * 0.5, h)}
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.10)']}
              />
            </Rect>

          </Group>
        </Canvas>
      )}

      {/* ── Layer 3: Content ── */}
      <View style={{position: 'relative', zIndex: 5}}>
        {children}
      </View>
    </View>
  );
};

export default LiquidGlass;
