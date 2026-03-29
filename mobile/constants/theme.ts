// Primary color: purple
const PRIMARY       = '#7c3aed';   // purple-600
const PRIMARY_DARK  = '#5b21b6';   // purple-800
const PRIMARY_LIGHT = '#ede9fe';   // purple-100

export const C = {
  primary:      PRIMARY,
  primaryDark:  PRIMARY_DARK,
  primaryLight: PRIMARY_LIGHT,
  bg:           '#f5f3ff',
  card:         '#ffffff',
  sidebar:      PRIMARY,
  sidebarText:  '#ffffff',
  text:         '#0f0f1a',
  textSub:      '#4b5563',
  border:       '#e5e7eb',
  success:      '#22c55e',
  warning:      '#f59e0b',
  danger:       '#ef4444',
  info:         '#3b82f6',
  white:        '#ffffff',
};

export const S = {
  card: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  page: {
    flex: 1,
    backgroundColor: '#f8f8ff',
  },
  px: {
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#ffffff',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#0f0f1a',
    marginBottom: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    fontWeight: '500' as const,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    color: '#0f0f1a',
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 11,
    paddingBottom: 32,
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
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
  tag: {
    backgroundColor: PRIMARY_LIGHT,
    color: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600' as const,
    overflow: 'hidden' as const,
  },
};
