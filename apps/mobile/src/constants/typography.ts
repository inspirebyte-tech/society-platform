import { Platform } from 'react-native'

export const FontFamily = {
  regular: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  medium: Platform.select({ ios: 'System', android: 'Roboto-Medium', default: 'System' }),
  bold: Platform.select({ ios: 'System', android: 'Roboto-Bold', default: 'System' }),
} as const

export const Typography = {
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 36,
    color: '#0f172a',
  },
  header: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 27,
    color: '#0f172a',
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: '#0f172a',
  },
  helper: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 19,
    color: '#64748b',
  },
} as const
