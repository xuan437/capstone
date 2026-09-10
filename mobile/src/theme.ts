// SSLG Executive Design System Theme Tokens - Matched with Web System CSS Tokens

export const getTheme = (isDarkMode: boolean = true) => {
  const theme = {
    isDark: isDarkMode,

    // Core Brand Colors (Matching Web --primary-navy, --primary-magenta, --primary-gold)
    primaryEmerald: isDarkMode ? '#10B981' : '#0D7A3E',
    primaryMint: '#10B981',
    primaryNavy: '#0A192F',
    primaryHover: isDarkMode ? '#059669' : '#0A5E2F',
    secondaryNavy: isDarkMode ? '#064E2E' : '#064E2E',
    emeraldMuted: isDarkMode ? '#047857' : '#15803D',

    primaryMagenta: isDarkMode ? '#E0249C' : '#C026D3',
    primaryGold: '#F59E0B',
    goldLight: isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7',

    // Surface & Background Tokens
    bgMain: isDarkMode ? '#0B1320' : '#FFFFFF',
    bgSurface: isDarkMode ? '#070D18' : '#F8FAFC',
    bgCard: isDarkMode ? '#111C2E' : '#FFFFFF',
    cardBg: isDarkMode ? '#111C2E' : '#FFFFFF',
    bgSubtle: isDarkMode ? '#1E293B' : '#F1F5F9',

    // Glassmorphic Card Styling Tokens
    glassBg: isDarkMode ? 'rgba(17, 28, 46, 0.88)' : 'rgba(255, 255, 255, 0.88)',
    glassBorder: isDarkMode ? 'rgba(255, 255, 255, 0.14)' : 'rgba(13, 122, 62, 0.18)',

    // Text & Contrast Tokens
    textMain: isDarkMode ? '#F8FAFC' : '#0F172A',
    textMuted: isDarkMode ? '#CBD5E1' : '#334155',
    textLight: isDarkMode ? '#94A3B8' : '#64748B',
    textSubtle: isDarkMode ? '#94A3B8' : '#64748B',
    textWhite: '#FFFFFF',

    // Input & Border Tokens
    inputBg: isDarkMode ? '#0B1320' : '#FFFFFF',
    inputBorder: isDarkMode ? 'rgba(255, 255, 255, 0.18)' : '#CBD5E1',
    borderLight: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',

    // Semantic Status Colors
    colorSuccess: isDarkMode ? '#10B981' : '#0D7A3E',
    colorSuccessBg: isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
    colorSuccessBorder: isDarkMode ? '#059669' : '#A7F3D0',

    colorDanger: isDarkMode ? '#F87171' : '#DC2626',
    danger: isDarkMode ? '#F87171' : '#DC2626',
    colorDangerBg: isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#FEF3F2',
    colorDangerBorder: isDarkMode ? '#B91C1C' : '#FEE2E2',

    colorWarning: isDarkMode ? '#FBBF24' : '#D97706',
    colorWarningBg: isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7',
    colorWarningBorder: isDarkMode ? '#D97706' : '#FDE68A',

    colorInfo: '#0284C7',
    colorInfoBg: isDarkMode ? 'rgba(2, 132, 199, 0.18)' : '#E0F2FE',
  };

  return theme;
};

export const COLORS = getTheme(true); // Default Dark Mode tokens for legacy references

export const RADIUS = {
  xl: 14,
  lg: 12,
  md: 8,
  sm: 6,
  xs: 4,
  full: 9999,
};

export const FONTS = {
  headingWeight: '800' as const,
  subheadingWeight: '700' as const,
  bodyWeight: '500' as const,
  boldWeight: '700' as const,
};
