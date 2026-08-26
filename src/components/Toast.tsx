import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  type?: ToastType;
  title: string;
  message?: string;
  onHide: () => void;
  duration?: number;
}

const CONFIG = {
  success: { icon: 'checkmark-circle' as const, color: '#34c759', bg: '#1a2e1f', bgLight: '#eafaef' },
  error:   { icon: 'close-circle' as const,     color: '#ff3b30', bg: '#2e1a1a', bgLight: '#fdecea' },
  info:    { icon: 'information-circle' as const, color: '#5B42F5', bg: '#1c1a2e', bgLight: '#eeecfe' },
};

export default function Toast({
  visible,
  type = 'success',
  title,
  message,
  onHide,
  duration = 2800,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const cfg = CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 16,
          stiffness: 130,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(hide, duration);
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -140, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={hide}
        style={[styles.toast, { backgroundColor: cfg.bg, borderColor: cfg.color + '55' }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: cfg.color + '22' }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>

        <View style={styles.textBox}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {message ? <Text style={styles.message} numberOfLines={2}>{message}</Text> : null}
        </View>

        <Ionicons name="close" size={18} color="rgba(255,255,255,0.35)" />
      </TouchableOpacity>

      {/* პროგრეს-ხაზი */}
      <View style={[styles.progressTrack, { backgroundColor: cfg.color + '20' }]}>
        <ProgressBar color={cfg.color} duration={duration} />
      </View>
    </Animated.View>
  );
}

function ProgressBar({ color, duration }: { color: string; duration: number }) {
  const width = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        height: '100%',
        backgroundColor: color,
        width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textBox: { flex: 1, marginRight: 8 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  message: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  progressTrack: { height: 3, width: '100%' },
});