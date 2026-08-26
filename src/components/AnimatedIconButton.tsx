import { useRef } from "react";
import { Animated, TouchableWithoutFeedback, ViewStyle } from "react-native";

interface AnimatedIconButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export default function AnimatedIconButton({
  onPress,
  disabled,
  style,
  children,
}: AnimatedIconButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.86,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : pressIn}
      onPressOut={disabled ? undefined : pressOut}
    >
      <Animated.View
        style={[
          style,
          { transform: [{ scale }] },
          disabled ? { opacity: 0.45 } : null,
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
