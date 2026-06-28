const { colors } = require('./tokens/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        background: colors.background,
        surface: colors.surface,
        'text-primary': colors.textPrimary,
        'text-secondary': colors.textSecondary,
        'text-tertiary': colors.textTertiary,
        success: colors.success,
        'success-light': colors.successLight,
        warning: colors.warning,
        'warning-light': colors.warningLight,
        error: colors.error,
        'error-light': colors.errorLight,
        info: colors.info,
        'info-light': colors.infoLight,
        border: colors.border,
        'border-strong': colors.borderStrong,
        divider: colors.divider,
      },
      fontFamily: {
        display: ['PlusJakartaSans_700Bold', 'PlusJakartaSans_600SemiBold', 'sans-serif'],
        body: ['Inter_400Regular', 'Inter_500Medium', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
