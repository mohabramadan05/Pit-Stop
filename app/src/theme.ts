import { MD3LightTheme } from "react-native-paper";

export const colors = {
  primary: "#FF6B2C", 
  secondary: "#1F4E5F", 
  background: "#FAFAF7",
  surface: "#FFFFFF",
  text: "#1C1C1E",
  muted: "#6B6B70",
  border: "#E2E0D9",
};

// React Native Paper theme, so every Paper component uses these colours
export const theme = {
  ...MD3LightTheme,
  roundness: 4, // x4 = 16px corners on cards
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.text,
    onBackground: colors.text,
    outline: colors.border,
  },
};
