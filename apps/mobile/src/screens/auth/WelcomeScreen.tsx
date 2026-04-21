import React from 'react'
import { View, Text, Image, Pressable, StyleSheet, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useFonts, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/AuthNavigator'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

const BRAND = '#4338ca'

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ Montserrat_800ExtraBold })

  // Hold until Montserrat is ready — native splash still showing
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
        <Text style={styles.subline}>Built for every person in a society.</Text>
      </View>

      {/* ── Bottom card ── */}
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
          onPress={() => navigation.navigate('LoginPhone')}
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
        </Pressable>
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
    fontSize: 44,
    color: '#fff',
    letterSpacing: 1.2,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    letterSpacing: 0.1,
    lineHeight: 24,
  },
  subline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    letterSpacing: 0.1,
    marginTop: -2,
  },

  // ── Bottom card ──
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 36,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 14,
  },
  btnPrimary: {
    backgroundColor: BRAND,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryPressed: {
    opacity: 0.85,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },
})
