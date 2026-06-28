import type { Config } from 'tailwindcss';

const colors = {
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  accent: {
    50: '#FEFBF0',
    100: '#FDF3D0',
    200: '#FAE4A1',
    300: '#F7CF68',
    400: '#F3B830',
    500: '#E8A020',
    600: '#C4841A',
    700: '#9E6914',
    800: '#7A500F',
    900: '#573908',
  },
};

const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        cream: '#F5F8FF',
        surface: '#FFFFFF',
        ink: {
          900: '#1C1C1E',
          700: '#374151',
          500: '#6B7280',
          400: '#9CA3AF',
        },
        success: '#2D6A4F',
        'success-light': '#D1FAE5',
        warning: '#E8A020',
        'warning-light': '#FEF3C7',
        error: '#DC2626',
        'error-light': '#FEE2E2',
        info: '#2563EB',
        'info-light': '#DBEAFE',
        border: {
          DEFAULT: '#E5E7EB',
          strong: '#D1D5DB',
        },
        divider: '#F3F4F6',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 2px 8px rgba(0,0,0,0.08)',
        lg: '0 4px 16px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
