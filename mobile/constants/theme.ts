import { Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

// ── Colours ───────────────────────────────────────────────────────────────────
const PRIMARY       = '#6c63ff';
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
const isWeb  = Platform.OS === 'web';

export const LAYOUT = {
  px:       16,   // uniform horizontal padding for ALL screens on ALL platforms
  cardPad:  16,
};

// ── Shared style primitives ───────────────────────────────────────────────────
export const S = {
  page: {
    flex: 1,
    backgroundColor: '#f8f9fc',
  },

  // Standard content padding — same on ALL platforms. WebLayout adds 0 outer padding.
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    fontWeight: '500' as const,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    color: '#1a1a2e',
    marginBottom: 12,
  },

  // ── Primary button: white background + strong blue/purple text + border
  // Matches sample project — NOT a filled solid button
  btn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c4b5fd',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center' as const,
    marginTop: 4,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 6,
  },
  btnText: {
    color: '#1d4ed8',          // strong blue, matches sample
    fontSize: 15,
    fontWeight: '700' as const,
  },

  // Solid primary (for high-emphasis actions only)
  btnSolid: {
    backgroundColor: PRIMARY,
    padding: 13,
    borderRadius: 10,
    alignItems: 'center' as const,
    marginTop: 4,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 6,
  },
  btnSolidText: {
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
    color: '#6b7280',
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
};
