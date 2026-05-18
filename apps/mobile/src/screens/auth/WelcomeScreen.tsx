import React, { useEffect, useRef } from 'react'
import { View, Text, Image, Pressable, StyleSheet, StatusBar, Dimensions, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFonts, Montserrat_300Light, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/AuthNavigator'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

const { width } = Dimensions.get('window');
const SLATE_DEEP = '#2f3e4e';
const SLATE_LIGHT = '#42576e';
const PLATINUM = 'rgba(255,255,255,0.85)';

const FEATURES: React.ComponentProps<typeof Ionicons>['name'][] = [
  'business-outline', 'people-outline', 'warning-outline',
  'notifications-outline', 'megaphone-outline', 'shield-checkmark-outline'
]

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ Montserrat_300Light, Montserrat_600SemiBold })

  // Master driver: 0 to 1
  const waveAnim = useRef(new Animated.Value(0)).current
  const scrollAnim = useRef(new Animated.Value(0)).current
  const entranceAnim = useRef(new Animated.Value(0)).current

  // Assign a unique starting offset to each icon
  const offsets = React.useMemo(() => FEATURES.map(() => Math.random()), [])

  useEffect(() => {
    // 1: Blueprint Build-In (One-time entrance)
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: true,
    }).start()

    // 2: Master loop for the 8-second shimmer
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start()

    // 4: Slow, infinite scroll for the architecture (40 seconds per loop)
    Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: 1,
        duration: 40000,
        useNativeDriver: false, // Using false because we need to calculate width-based translate
      })
    ).start()
  }, [])

  if (!fontsLoaded) return null

  const renderBuildings = (offsetIndex: number = 0) => {
    // Strictly theme-safe colors
    const LIGHTS = [
      PLATINUM + '70', // Platinum (Active)
      'rgba(255, 255, 255, 0.4)', // Pure White (High Focus)
      SLATE_LIGHT + '60', // Slate Light (Reflective)
    ];

    const getBuildStyle = (index: number) => {
      const start = index * 0.1;
      const end = Math.min(start + 0.3, 1);
      
      return {
        opacity: entranceAnim.interpolate({
          inputRange: [start, end],
          outputRange: [0, 1],
          extrapolate: 'clamp'
        }),
        transform: [
          {
            scaleY: entranceAnim.interpolate({
              inputRange: [start, end],
              outputRange: [0, 1],
              extrapolate: 'clamp'
            })
          },
          {
            translateY: entranceAnim.interpolate({
              inputRange: [start, end],
              outputRange: [20, 0], // Subtle rise from the ground
              extrapolate: 'clamp'
            })
          }
        ]
      };
    };

    return (
      <>
        {/* 1: Modern Residential Tower */}
        <Animated.View style={getBuildStyle(0)}>
          <Animated.View style={[styles.archBuilding, { height: 60, width: 26, opacity: waveAnim.interpolate({ inputRange: [0, 0.1, 0.25, 1], outputRange: [0.3, 0.85, 0.3, 0.3] }) }]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <View key={i} style={{ position: 'absolute', top: `${i * 12}%`, left: '8%', width: '84%', height: '11%', borderTopWidth: 0.7, borderColor: 'rgba(255,255,255,0.4)' }} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <View key={`w${i}`} style={{ position: 'absolute', top: `${i * 12 + 2}%`, left: '12%', width: 5, height: 3, backgroundColor: Math.random() > 0.4 ? LIGHTS[Math.floor(Math.random() * 3)] : 'transparent', borderRadius: 1 }} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <View key={`w2${i}`} style={{ position: 'absolute', top: `${i * 12 + 2}%`, right: '12%', width: 5, height: 3, backgroundColor: Math.random() > 0.4 ? LIGHTS[Math.floor(Math.random() * 3)] : 'transparent', borderRadius: 1 }} />
            ))}
          </Animated.View>
        </Animated.View>

        {/* 2: Contemporary Apartment Block */}
        <Animated.View style={getBuildStyle(1)}>
          <Animated.View style={[styles.archBuilding, { height: 50, width: 38, opacity: waveAnim.interpolate({ inputRange: [0, 0.2, 0.35, 1], outputRange: [0.3, 0.85, 0.3, 0.3] }) }]}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <View key={i} style={{ position: 'absolute', top: `${i * 16.67}%`, left: 0, right: 0, height: 0.6, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            ))}
            {Array.from({ length: 6 }).map((_, row) =>
              Array.from({ length: 3 }).map((_, col) => (
                <View
                  key={`${row}-${col}`}
                  style={{
                    position: 'absolute',
                    top: `${row * 16.67 + 3}%`,
                    left: `${col * 32 + 5}%`,
                    width: 6,
                    height: 4,
                    backgroundColor: Math.random() > 0.5 ? LIGHTS[Math.floor(Math.random() * 3)] : 'transparent',
                    borderRadius: 0.5,
                  }}
                />
              ))
            )}
          </Animated.View>
        </Animated.View>

        {/* 3: Classic Villa */}
        <Animated.View style={getBuildStyle(2)}>
          <Animated.View style={[styles.archBuilding, { height: 35, width: 44, opacity: waveAnim.interpolate({ inputRange: [0, 0.3, 0.45, 1], outputRange: [0.3, 0.85, 0.3, 0.3] }) }]}>
            <View style={{ position: 'absolute', top: -8, left: -2, width: '55%', height: 1.5, backgroundColor: 'rgba(255,255,255,0.6)', transform: [{ rotate: '-20deg' }] }} />
            <View style={{ position: 'absolute', top: -8, right: -2, width: '55%', height: 1.5, backgroundColor: 'rgba(255,255,255,0.6)', transform: [{ rotate: '20deg' }] }} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 0.8, borderColor: 'rgba(255,255,255,0.45)' }} />
            <View style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -4, width: 8, height: 14, borderWidth: 0.7, borderColor: 'rgba(255,255,255,0.4)', borderBottomWidth: 0 }} />
            <View style={{ position: 'absolute', top: 8, left: 6, width: 8, height: 6, borderWidth: 0.6, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: Math.random() > 0.3 ? LIGHTS[1] : 'transparent' }} />
            <View style={{ position: 'absolute', top: 8, right: 6, width: 8, height: 6, borderWidth: 0.6, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: Math.random() > 0.3 ? LIGHTS[1] : 'transparent' }} />
          </Animated.View>
        </Animated.View>

        {/* 4: Skyscraper Tower */}
        <Animated.View style={getBuildStyle(3)}>
          <Animated.View style={[styles.archBuilding, { height: 58, width: 18, opacity: waveAnim.interpolate({ inputRange: [0, 0.4, 0.55, 1], outputRange: [0.3, 0.85, 0.3, 0.3] }) }]}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <View key={i} style={{ position: 'absolute', top: `${i * 10}%`, left: 0, right: 0, height: 0.7, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <View key={`l${i}`} style={{ position: 'absolute', top: `${i * 10 + 2}%`, left: '15%', width: 4, height: 3, backgroundColor: Math.random() > 0.4 ? LIGHTS[0] : 'transparent', borderRadius: 0.5 }} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <View key={`r${i}`} style={{ position: 'absolute', top: `${i * 10 + 2}%`, right: '15%', width: 4, height: 3, backgroundColor: Math.random() > 0.4 ? LIGHTS[0] : 'transparent', borderRadius: 0.5 }} />
            ))}
          </Animated.View>
        </Animated.View>

        {/* 5: Modern Flat-Top */}
        <Animated.View style={getBuildStyle(4)}>
          <Animated.View style={[styles.archBuilding, { height: 40, width: 32, opacity: waveAnim.interpolate({ inputRange: [0, 0.5, 0.65, 1], outputRange: [0.3, 0.85, 0.3, 0.3] }) }]}>
            <View style={{ position: 'absolute', top: -3, left: '10%', right: '10%', height: 2, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={{ position: 'absolute', top: `${i * 25}%`, left: 0, right: 0, height: 0.7, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            ))}
            {Array.from({ length: 4 }).map((_, row) =>
              Array.from({ length: 2 }).map((_, col) => (
                <View
                  key={`${row}-${col}`}
                  style={{
                    position: 'absolute',
                    top: `${row * 25 + 4}%`,
                    left: `${col === 0 ? 10 : 65}%`,
                    width: 7,
                    height: 5,
                    backgroundColor: Math.random() > 0.5 ? LIGHTS[Math.floor(Math.random() * 3)] : 'transparent',
                    borderRadius: 0.5,
                  }}
                />
              ))
            )}
          </Animated.View>
        </Animated.View>

        {/* 6: Twin Tower Complex */}
        <Animated.View style={getBuildStyle(5)}>
          <Animated.View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, opacity: waveAnim.interpolate({ inputRange: [0, 0.6, 0.75, 1], outputRange: [0.3, 0.85, 0.3, 0.3] }) }}>
            <View style={[styles.archBuilding, { height: 55, width: 14, borderBottomWidth: 0.8 }]}>
              <View style={{ position: 'absolute', top: -4, left: 0, width: 8, height: 1, backgroundColor: 'rgba(255,255,255,0.5)' }} />
              {[0, 1, 2, 3, 4].map(i => (
                <View key={i} style={{ position: 'absolute', top: `${i * 18 + 8}%`, left: 3, width: 3, height: 4, backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.15)' : 'transparent', borderRadius: 0.5 }} />
              ))}
            </View>
            <View style={[styles.archBuilding, { height: 38, width: 18, borderLeftWidth: 0, borderBottomWidth: 0.8 }]}>
              <View style={{ position: 'absolute', top: '40%', left: -4, width: 4, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 10 }} />
              {[0, 1, 2].map(i => (
                <View key={i} style={{ position: 'absolute', top: `${i * 28 + 10}%`, right: 3, width: 8, height: 1.5, backgroundColor: 'rgba(255,255,255,0.25)' }} />
              ))}
              <View style={{ position: 'absolute', bottom: 0, right: 4, width: 6, height: 8, borderWidth: 0.6, borderColor: 'rgba(255,255,255,0.4)', borderBottomWidth: 0 }} />
            </View>
          </Animated.View>
        </Animated.View>

        {/* 7: Large Residential Complex */}
        <Animated.View style={getBuildStyle(6)}>
          <Animated.View style={[styles.archBuilding, { height: 48, width: 46, opacity: waveAnim.interpolate({ inputRange: [0, 0.7, 0.85, 1], outputRange: [0.3, 0.85, 0.3, 0.3] }) }]}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={{ position: 'absolute', top: `${i * 20}%`, left: 0, right: 0, height: 0.7, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            ))}
            {Array.from({ length: 5 }).map((_, row) =>
              Array.from({ length: 4 }).map((_, col) => (
                <View
                  key={`${row}-${col}`}
                  style={{
                    position: 'absolute',
                    top: `${row * 20 + 2.5}%`,
                    left: `${col * 23 + 4}%`,
                    width: 5,
                    height: 3.5,
                    backgroundColor: Math.random() > 0.6 ? LIGHTS[Math.floor(Math.random() * 3)] : 'transparent',
                    borderRadius: 0.4,
                  }}
                />
              ))
            )}
          </Animated.View>
        </Animated.View>

        {/* 8: Corner Building */}
        <Animated.View style={getBuildStyle(7)}>
          <Animated.View style={[styles.archBuilding, { height: 42, width: 28, opacity: waveAnim.interpolate({ inputRange: [0, 0.8, 0.95, 1], outputRange: [0.3, 0.85, 0.3, 0.3] }) }]}>
            <View style={{ position: 'absolute', top: -4, left: '5%', right: '5%', height: 2.5, backgroundColor: 'rgba(255,255,255,0.45)' }} />
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={{ position: 'absolute', top: `${i * 20}%`, left: 0, right: 0, height: 0.8, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            ))}
            {Array.from({ length: 5 }).map((_, row) =>
              Array.from({ length: 2 }).map((_, col) => (
                <View
                  key={`${row}-${col}`}
                  style={{
                    position: 'absolute',
                    top: `${row * 20 + 3}%`,
                    left: `${col === 0 ? 12 : 65}%`,
                    width: 8,
                    height: 5,
                    backgroundColor: Math.random() > 0.5 ? LIGHTS[Math.floor(Math.random() * 3)] : 'transparent',
                    borderRadius: 0.5,
                  }}
                />
              ))
            )}
          </Animated.View>
        </Animated.View>
      </>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[SLATE_DEEP, SLATE_LIGHT, SLATE_DEEP]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.top, { paddingTop: insets.top + 120 }]}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.textContainer}>
          <Text style={styles.appName}>V A A S T I O</Text>
          <Text style={styles.tagline}>Where Societies Start Organized</Text>
        </View>

        <View style={styles.gridContainer}>
          {FEATURES.map((icon, index) => {
            const offset = offsets[index];
            const opacity = waveAnim.interpolate({
              inputRange: [0, (0.5 + offset) % 1, 1],
              outputRange: [0.4, 0.7, 0.4],
            });

            const scale = waveAnim.interpolate({
              inputRange: [0, (0.5 + offset) % 1, 1],
              outputRange: [1, 1.06, 1],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.iconCircle,
                  {
                    opacity,
                    transform: [{ scale }]
                  }
                ]}
              >
                <Ionicons name={icon} size={20} color="rgba(255,255,255,0.8)" />
              </Animated.View>
            )
          })}
        </View>

        {/* ── Continuous Community Panorama ── */}
        <View style={styles.archRowContainer}>
          <Animated.View style={[styles.archRow, {
            transform: [{
              translateX: scrollAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -320] // Width of one complete set of buildings + gaps
              })
            }]
          }]}>
            {renderBuildings()}
            {renderBuildings()}
          </Animated.View>
        </View>
      </View>

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
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SLATE_DEEP,
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
    opacity: 0.90,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 30,
    color: '#fff',
    letterSpacing: 0,
    fontFamily: 'Montserrat_300Light',
    marginBottom: 12,
    opacity: 0.9,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    letterSpacing: 1.5,
    fontFamily: 'Montserrat_300Light',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: width * 0.7,
    gap: 25,
    marginBottom: 80,
  },
  archRowContainer: {
    width: '120%', // Slightly wider to ensure edge-to-edge coverage
    height: 80,
    overflow: 'hidden',
    marginBottom: 5,
    marginTop: 15,
  },
  archRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 15,
    // Width will be handled by content
  },
  archBuilding: {
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.45)', // Brighter, more defined borders
    backgroundColor: 'rgba(255,255,255,0.03)',
    position: 'relative',
  },
  buildingLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0.8,
    backgroundColor: 'rgba(255,255,255,0.35)', // Crisper internal lines
    left: '50%',
  },
  buildingFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.8,
    backgroundColor: 'rgba(255,255,255,0.25)', // Brighter floor dividers
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bottom: {
    paddingHorizontal: 45,
  },
  btnPrimary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: PLATINUM,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
    letterSpacing: 3,
  },
})
