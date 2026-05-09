import React, { useRef } from "react";
import {
  Animated,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
} from "react-native";

interface PressableScaleProps extends TouchableOpacityProps {
  scale?: number;
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const PressableScale = React.memo(function PressableScale({
  scale = 0.93,
  children,
  onPress,
  disabled,
  containerStyle,
  style,
  ...rest
}: PressableScaleProps) {
  const anim = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(anim, {
      toValue: disabled ? 1 : scale,
      friction: 10,
      tension: 400,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(anim, {
      toValue: 1,
      friction: 7,
      tension: 200,
      useNativeDriver: true,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      style={containerStyle}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale: anim }] }, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
});
