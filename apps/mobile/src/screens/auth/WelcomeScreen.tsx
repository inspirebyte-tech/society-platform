import React from 'react'
import { View, Text, Image, Pressable, StyleSheet, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFonts, Montserrat_300Light, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/AuthNavigator'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

const BRAND = '#4338ca'

const FEATURES: React.ComponentProps<typeof Ionicons>['name'][] = [
  'business-outline',
  'people-outline',
  'chatbubble-ellipses-outline',
]

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ Montserrat_300Light, Montserrat_600SemiBold })

  if (!fontsLoaded) return null

  return (
    <LinearGradient colors={['#4338ca', '#3730a3']} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      {/* ── Brand area ── */}
      <View style={[styles.top, { paddingTop: insets.top + 24 }]}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Vaastio</Text>
        <Text style={styles.tagline}>Where societies start organised.</Text>

        {/* ── Icon bubbles ── */}
        <View style={styles.bubblesRow}>
          {FEATURES.map((icon) => (
            <View key={icon} style={styles.bubble}>
              <Ionicons name={icon} size={24} color="#fff" />
            </View>
          ))}
        </View>
      </View>

      {/* ── Bottom button ── */}
      <View style={[styles.bottom, { marginBottom: Math.max(insets.bottom, 48) }]}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
          onPress={() => navigation.navigate('LoginPhone')}
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
        </Pressable>
        <Text style={styles.terms}>By continuing you agree to our Terms of Service</Text>
      </View>
    </LinearGradient>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Brand area ──
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  logo: {
    width: 92,
    height: 116,
    tintColor: '#fff',
    marginBottom: 4,
  },
  appName: {
    fontSize: 48,
    color: '#fff',
    letterSpacing: 4,
    fontFamily: 'Montserrat_300Light',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    letterSpacing: 0.1,
    lineHeight: 24,
  },
  // ── Icon bubbles ──
  bubblesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,   // gap:12 + marginTop:20 = 32px from tagline
  },
  bubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Bottom button ──
  bottom: {
    paddingHorizontal: 32,
    gap: 14,
  },
  btnPrimary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  btnPrimaryPressed: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  terms: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
})
