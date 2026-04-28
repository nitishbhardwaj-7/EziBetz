import React from "react";
import { View, StyleSheet } from "react-native";

interface DiceFaceProps {
  value: number;
  size?: number;
  primaryColor?: string;
  pipColor?: string;
}

const pipLayouts: boolean[][] = [
  [false, false, false, false, true, false, false, false, false], // 1
  [false, false, true, false, false, false, true, false, false],  // 2
  [false, false, true, false, true, false, true, false, false],   // 3
  [true, false, true, false, false, false, true, false, true],    // 4
  [true, false, true, false, true, false, true, false, true],     // 5
  [true, false, true, true, false, true, true, false, true],      // 6
];

export function DiceFace({
  value,
  size = 120,
  primaryColor = "#c59aff",
  pipColor = "#420082",
}: DiceFaceProps) {
  const clampedValue = Math.max(1, Math.min(6, value));
  const pips = pipLayouts[clampedValue - 1];
  const pipSize = size * 0.13;
  const borderRadius = size * 0.2;

  return (
    <View
      style={[
        styles.dice,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: primaryColor,
          shadowColor: primaryColor,
        },
      ]}
    >
      <View style={styles.pipGrid}>
        {pips.map((active, i) => (
          <View key={i} style={styles.pipCell}>
            {active && (
              <View
                style={[
                  styles.pip,
                  {
                    width: pipSize,
                    height: pipSize,
                    borderRadius: pipSize / 2,
                    backgroundColor: pipColor,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.gloss} />
    </View>
  );
}

const styles = StyleSheet.create({
  dice: {
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  pipGrid: {
    width: "75%",
    height: "75%",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pipCell: {
    width: "33.33%",
    height: "33.33%",
    alignItems: "center",
    justifyContent: "center",
  },
  pip: {},
  gloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});
