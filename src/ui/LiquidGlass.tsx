/**
 * LiquidGlass — GPU-accelerated Apple-style glass surface
 *
 * The glass rim is a SINGLE continuous thin RoundedRect stroke
 * that follows the entire card curvature. The gradient on the
 * stroke makes the top AND bottom arcs equally bright, while
 * the left/right sides are dim. No separate broken pieces.
 */
import React from 'react';
import {View, StyleSheet, ViewStyle, StyleProp, LayoutChangeEvent} from 'react-native';
import {BlurView} from '@react-native-community/blur';
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
  blurAmount?: number;
  tintOpacity?: number;
  disableSpecular?: boolean;
}

const LiquidGlass: React.FC<LiquidGlassProps> = ({
  style,
  children,
  borderRadius = BorderRadius.xl,
  blurAmount = 28,
  tintOpacity = 0.3,
  disableSpecular = false,
}) => {
  const [layout, setLayout] = React.useState({width: 0, height: 0});

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setLayout({width, height});
  }, []);

  const {width: w, height: h} = layout;
  const r = borderRadius;
  const clipRRect = rrect(rect(0, 0, w, h), r, r);

  return (
    <View
      style={[{borderRadius: r, overflow: 'hidden'}, style]}
      onLayout={onLayout}>

      {/* ── Layer 1: Backdrop blur ── */}
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="dark"
        blurAmount={blurAmount}
        overlayColor="transparent"
        reducedTransparencyFallbackColor="#1C1C1E"
      />

      {/* ── Layer 2: Glass surface tint ── */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {backgroundColor: `rgba(38, 38, 42, ${tintOpacity})`},
        ]}
      />

      {/* ── Layer 3: Skia glass effects ── */}
      {w > 0 && h > 0 && (
        <Canvas
          style={[StyleSheet.absoluteFill, {zIndex: 2}]}
          pointerEvents="none">

          {!disableSpecular && (
            <Group clip={clipRRect}>

              {/* ── SINGLE RIM STROKE ──
                   One continuous thin stroke around the entire rounded rect.
                   Vertical gradient: bright top → dim sides → bright bottom.
                   This naturally follows the curvature — the bright portion
                   extends through the corner curves on both top and bottom.
                   Both arcs look and behave the same.
              */}
              <RoundedRect
                x={1}
                y={0.5}
                width={w - 2}
                height={h - 2}
                r={Math.max(r - 1, 0)}
                style="stroke"
                strokeWidth={2}>
                <SkiaGradient
                  start={vec(w * 0.5, 0)}
                  end={vec(w * 0.5, h)}
                  colors={[
                    'rgba(255,255,255,0.60)',   // Top arc — bright
                    'rgba(255,255,255,0.00)',   // Into top curves
                    'rgba(255,255,255,0.00)',   // Left/right sides — dim
                    'rgba(255,255,255,0.00)',   // Into bottom curves
                    'rgba(255,255,255,0.60)',   // Bottom arc — equally bright
                  ]}
                  positions={[0, 0.12, 0.5, 0.88, 1]}
                />
              </RoundedRect>

              {/* ── SUBTLE BOTTOM DEPTH ──
                   Gentle inner shadow at the bottom for convex depth.
              */}
              <Rect x={0} y={h * 0.7} width={w} height={h * 0.3}>
                <SkiaGradient
                  start={vec(w * 0.5, h * 0.7)}
                  end={vec(w * 0.5, h)}
                  colors={[
                    'rgba(0,0,0,0)',
                    'rgba(0,0,0,0.10)',
                  ]}
                />
              </Rect>

            </Group>
          )}
        </Canvas>
      )}

      {/* ── Layer 4: Content ── */}
      <View style={{position: 'relative', zIndex: 5}}>
        {children}
      </View>
    </View>
  );
};

export default LiquidGlass;
