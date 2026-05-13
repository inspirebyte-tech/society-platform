import React from 'react'
import { View, Text, Image, Pressable, StyleSheet, StatusBar, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFonts, Montserrat_300Light, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/AuthNavigator'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

const { width } = Dimensions.get('window');
const DEEP_NAVY = '#0F172A'; 
const PLATINUM = 'rgba(255,255,255,0.85)';

const FEATURES: React.ComponentProps<typeof Ionicons>['name'][] = [
  'business-outline', 'people-outline', 'warning-outline', 
  'notifications-outline', 'megaphone-outline', 'shield-checkmark-outline'
]

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ Montserrat_300Light, Montserrat_600SemiBold })

  if (!fontsLoaded) return null

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      
      {/* Background: Deep, expensive-looking radial fade */}
      <LinearGradient 
        colors={['#1e293b', '#0F172A', '#070a0f']} 
        style={StyleSheet.absoluteFill} 
      />

      {/* ── Brand area ── */}
      <View style={[styles.top, { paddingTop: insets.top + 140 }]}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <View style={styles.textContainer}>
          <Text style={styles.appName}>V A A S T I O</Text>
          <Text style={styles.tagline}>Where Societies Start Organized</Text>
        </View>

        {/* ── Soft Circular Feature Grid ── */}
        <View style={styles.gridContainer}>
          {FEATURES.map((icon, index) => (
            <View key={index} style={styles.iconCircle}>
              <Ionicons name={icon} size={20} color="rgba(255,255,255,0.4)" />
            </View>
          ))}
        </View>
      </View>

      {/* ── Bottom Action Area ── */}
      <View style={[styles.bottom, { marginBottom: Math.max(insets.bottom, 60) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.btnPrimary, 
            pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }
          ]}
          onPress={() => navigation.navigate('LoginPhone')}
        >
          <Text style={styles.btnPrimaryText}>GET STARTED</Text>
        </Pressable>
        
        <Text style={styles.terms}>
          _
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DEEP_NAVY,
  },
  top: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 90,
    height: 110,
    marginBottom: 25,
    opacity: 0.95,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 30,
    color: '#fff',
    letterSpacing: 1, // Wide spacing for luxury aesthetic
    fontFamily: 'Montserrat_300Light',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    letterSpacing: 1.5,
    fontFamily: 'Montserrat_300Light',
    //fontStyle: 'italic', // Italic adds a "posh" editorial feel
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: width * 0.7,
    gap: 25,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24, // Soft circular icons
    borderWidth: 0.8, 
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bottom: {
    paddingHorizontal: 45,
  },
  btnPrimary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: PLATINUM,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100, // Perfectly soft circular "pill" button
  },
  btnPrimaryText: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
    letterSpacing: 3,
  },
  terms: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 25,
    letterSpacing: 1.2,
    fontFamily: 'Montserrat_300Light',
  },
})