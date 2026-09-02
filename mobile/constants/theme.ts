import { Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

// ── Colours ───────────────────────────────────────────────────────────────────
const PRIMARY       = '#6c63ff';   // indigo-violet — matches sample project
const PRIMARY_DARK  = '#5a52d5';
const PRIMARY_LIGHT = '#f0eeff';

export const C = {
  primary:      PRIMARY,
  primaryDark:  PRIMARY_DARK,
  primaryLight: PRIMARY_LIGHT,

  bg:      '#f8f9fc',
  surface: '#ffffff',
  card:    '#ffffff',

  text:    '#1a1a2e',
  textSub: '#6b7280',
  textMuted: '#9ca3af',

  border:      '#e5e7eb',
  borderLight: '#f3f4f6',

  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
  dangerLight: '#fee2e2',
  info:    '#3b82f6',
  white:   '#ffffff',
};

// ── Responsive layout ─────────────────────────────────────────────────────────
// On web (PC) content is wide — use larger horizontal padding.
// On mobile keep it tight.
const isWeb   = Platform.OS === 'web';
const isWide  = width > 768;   // tablet / PC

export const LAYOUT = {
  // Horizontal padding for list content and scroll containers
  px:        isWide ? 40  : 16,
  // Max content width on wide screens
  maxWidth:  isWide ? 800 : undefined as number | undefined,
  // Card inner padding
  cardPad:   16,
};

// ── Shared style primitives ───────────────────────────────────────────────────
export const S = {
  page: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Standard content wrapper — use as contentContainerStyle on ScrollView/FlatList
  content: {
    paddingHorizontal: LAYOUT.px,
    paddingTop: 14,
    paddingBottom: 40,
    ...(isWide && LAYOUT.maxWidth
      ? { alignSelf: 'center' as const, width: '100%' as const, maxWidth: LAYOUT.maxWidth }
      : {}),
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: LAYOUT.cardPad,
    marginBottom: 12,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.08)',
  },

  input: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    fontWeight: '500' as const,
    borderWidth: 1.5,
    borderColor: C.border,
    color: C.text,
    marginBottom: 12,
  },

  btn: {
    backgroundColor: PRIMARY,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
    marginTop: 4,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700' as const,
  },

  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#ffffff',
    flex: 1,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: C.textSub,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },

  tag: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600' as const,
    color: PRIMARY,
    overflow: 'hidden' as const,
  },

  badge: (bg: string, color: string) => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: bg,
    alignSelf: 'flex-start' as const,
  }),
  badgeText: (color: string) => ({
    fontSize: 11,
    fontWeight: '700' as const,
    color,
  }),
};
