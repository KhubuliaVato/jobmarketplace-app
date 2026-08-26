import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

// ერთი მოძრავი ფერადი ლაქა (blob). ნელა ცურავს და ოდნავ სუნთქავს.
function Blob({
  color,
  size,
  startX,
  startY,
  driftX,
  driftY,
  duration,
  delay = 0,
}: {
  color: string;
  size: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay?: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // ბრუნდება უკან — გლუვი, უსასრულო მოძრაობა
    );
  }, [duration]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: startX + driftX * p },
        { translateY: startY + driftY * p },
        { scale: 1 + 0.12 * p }, // მსუბუქი „სუნთქვა"
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// მრავალფენიანი ბუნდოვანი ფონი — Apple/Wise-ისებრი aurora ეფექტი.
// blur-ის ილუზია იქმნება დიდი, დაბალ-ოპაციანი, გადაფარებული ლაქებით.
export function AuroraBackground({ intensity = 1 }: { intensity?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* ბაზისური მუქი ფონი */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#08080b' }]} />

      {/* მოძრავი ფერადი ლაქები */}
      <Blob color="rgba(91,66,245,0.55)" size={W * 1.1} startX={-W * 0.3} startY={-H * 0.1} driftX={W * 0.25} driftY={H * 0.12} duration={9000} />
      <Blob color="rgba(46,120,255,0.40)" size={W * 0.95} startX={W * 0.45} startY={H * 0.15} driftX={-W * 0.2} driftY={H * 0.15} duration={11000} delay={800} />
      <Blob color="rgba(190,80,220,0.32)" size={W * 0.9} startX={W * 0.1} startY={H * 0.55} driftX={W * 0.22} driftY={-H * 0.12} duration={13000} delay={1600} />
      <Blob color="rgba(40,180,200,0.22)" size={W * 0.75} startX={-W * 0.15} startY={H * 0.65} driftX={W * 0.3} driftY={H * 0.08} duration={15000} delay={400} />

      {/* გამჭვირვალე მუქი ფენა ზემოდან — ფერებს არბილებს და კონტრასტს ინარჩუნებს */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(8,8,11,${0.55 - 0.15 * (intensity - 1)})` }]} />
    </View>
  );
}