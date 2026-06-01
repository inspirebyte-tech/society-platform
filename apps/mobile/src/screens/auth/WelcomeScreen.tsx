import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native'
import Svg, { Rect, Line, Path, Polyline } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFonts, Montserrat_300Light, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/AuthNavigator'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

const { width } = Dimensions.get('window')
const SLATE_DEEP = '#2f3e4e'
const SLATE_LIGHT = '#42576e'
const PLATINUM = 'rgba(255,255,255,0.85)'

// SVG building palette
const S = 'rgba(255,255,255,0.25)'   // structure strokes
const F = 'rgba(255,255,255,0.13)'   // floor divider lines
const W = 'rgba(220,228,238,0.80)'   // lit window
const D = 'rgba(220,228,238,0.07)'   // dim window

const FEATURES: React.ComponentProps<typeof Ionicons>['name'][] = [
  'business-outline', 'people-outline', 'warning-outline',
  'notifications-outline', 'megaphone-outline', 'shield-checkmark-outline',
]

// ─── Window helper ─────────────────────────────────────────────────────────────
// Deterministic lit state — no Math.random() in render, no flicker on re-render
function Win({ x, y, w = 4, h = 3, lit }: {
  x: number; y: number; w?: number; h?: number; lit: boolean
}) {
  return <Rect x={x} y={y} width={w} height={h} fill={lit ? W : D} />
}

// ─── 16 SVG building components ───────────────────────────────────────────────
// All share height=68 with flex-end bottom-alignment in the skyline row.
// Widths: 18+42+12+46+20+38+14+50+14+40+24+40+34+28+30+38 = 488px
// Gaps: 15 × 14 = 210px, trailing gap 14px → SCROLL_WIDTH = 712

function ClockTower() {
  const fh = 48 / 6
  return (
    <Svg width={18} height={68}>
      <Line x1={9} y1={0} x2={9} y2={5} stroke={S} strokeWidth={0.7} />
      <Polyline points="4,9 9,4 14,9" fill="none" stroke={S} strokeWidth={0.7} />
      <Rect x={3} y={9} width={12} height={11} fill="none" stroke={S} strokeWidth={0.7} />
      <Polyline points="5,20 5,15 9,11 13,15 13,20" fill="none" stroke={F} strokeWidth={0.5} />
      <Rect x={5} y={20} width={8} height={48} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(5)].map((_, i) => (
        <Line key={i} x1={5} y1={20 + (i + 1) * fh} x2={13} y2={20 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {[true, false, true, true, false, true].map((l, i) => (
        <Win key={i} x={7} y={22 + i * fh} w={3} h={3} lit={l} />
      ))}
    </Svg>
  )
}

function LargeComplex() {
  const fh = 56 / 5
  const cols = [
    [true, false, true, true, true],
    [true, true, false, true, false],
    [false, true, true, false, true],
    [true, false, true, true, false],
  ]
  return (
    <Svg width={42} height={68}>
      <Rect x={1} y={12} width={40} height={56} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(4)].map((_, i) => (
        <Line key={i} x1={1} y1={12 + (i + 1) * fh} x2={41} y2={12 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {[4, 13, 22, 31].map((cx, ci) =>
        cols[ci].map((l, ri) => (
          <Win key={`${ci}-${ri}`} x={cx} y={12 + ri * fh + 2} w={5} h={4} lit={l} />
        ))
      )}
    </Svg>
  )
}

function SoloSpire() {
  const fh = 66 / 11
  const lit = [true, false, true, true, false, true, true, false, true, true, false]
  return (
    <Svg width={12} height={68}>
      <Line x1={6} y1={0} x2={6} y2={2} stroke={S} strokeWidth={0.6} />
      <Rect x={1} y={2} width={10} height={66} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(10)].map((_, i) => (
        <Line key={i} x1={1} y1={2 + (i + 1) * fh} x2={11} y2={2 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {lit.map((l, i) => <Win key={i} x={4} y={2 + i * fh + 1.5} w={3} h={2} lit={l} />)}
    </Svg>
  )
}

function LowRise() {
  const fh = 24 / 3
  const cols = [
    [true, true, false],
    [false, true, true],
    [true, false, true],
    [true, true, false],
  ]
  return (
    <Svg width={46} height={68}>
      <Rect x={6} y={40} width={5} height={4} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />
      <Rect x={20} y={39} width={8} height={5} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />
      <Rect x={34} y={40} width={5} height={4} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />
      <Rect x={1} y={44} width={44} height={24} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(2)].map((_, i) => (
        <Line key={i} x1={1} y1={44 + (i + 1) * fh} x2={45} y2={44 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {[5, 16, 27, 38].map((cx, ci) =>
        cols[ci].map((l, ri) => (
          <Win key={`${ci}-${ri}`} x={cx} y={44 + ri * fh + 2} w={5} h={4} lit={l} />
        ))
      )}
    </Svg>
  )
}

function Tower1() {
  const fh = 63 / 8
  const lc = [true, true, false, true, true, false, true, true]
  const rc = [false, true, true, false, true, true, false, true]
  return (
    <Svg width={20} height={68}>
      <Rect x={1} y={5} width={18} height={63} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(7)].map((_, i) => (
        <Line key={i} x1={1} y1={5 + (i + 1) * fh} x2={19} y2={5 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {lc.map((l, i) => <Win key={`l${i}`} x={3} y={5 + i * fh + 2} lit={l} />)}
      {rc.map((l, i) => <Win key={`r${i}`} x={13} y={5 + i * fh + 2} lit={l} />)}
    </Svg>
  )
}

function DomeCrown() {
  const fh = 32 / 3
  const lc = [true, false, true]
  const rc = [true, true, false]
  return (
    <Svg width={38} height={68}>
      <Path d="M 1,36 A 18,22 0 0 1 37,36" fill="none" stroke={S} strokeWidth={0.8} />
      <Line x1={19} y1={14} x2={19} y2={36} stroke={F} strokeWidth={0.5} />
      <Win x={5} y={24} w={6} h={5} lit={true} />
      <Win x={27} y={24} w={6} h={5} lit={true} />
      <Rect x={1} y={36} width={36} height={32} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(2)].map((_, i) => (
        <Line key={i} x1={1} y1={36 + (i + 1) * fh} x2={37} y2={36 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {lc.map((l, i) => <Win key={`l${i}`} x={4} y={38 + i * fh} w={5} h={4} lit={l} />)}
      {rc.map((l, i) => <Win key={`r${i}`} x={29} y={38 + i * fh} w={5} h={4} lit={l} />)}
    </Svg>
  )
}

function NarrowTower() {
  const fh = 62 / 6
  const cc = [true, true, false, true, false, true]
  return (
    <Svg width={14} height={68}>
      <Rect x={1} y={6} width={12} height={62} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(5)].map((_, i) => (
        <Line key={i} x1={1} y1={6 + (i + 1) * fh} x2={13} y2={6 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {cc.map((l, i) => <Win key={i} x={5} y={6 + i * fh + 2} w={3} h={3} lit={l} />)}
    </Svg>
  )
}

function ClubHouse() {
  const fh = 26 / 2
  const wins: boolean[][] = [[true, true], [false, true], [true, false]]
  return (
    <Svg width={50} height={68}>
      <Rect x={0} y={38} width={50} height={4} fill="none" stroke={S} strokeWidth={0.7} />
      <Rect x={0} y={42} width={50} height={26} fill="none" stroke={S} strokeWidth={0.7} />
      <Line x1={0} y1={42 + fh} x2={50} y2={42 + fh} stroke={F} strokeWidth={0.4} />
      {[5, 20, 35].map((cx, ci) =>
        wins[ci].map((l, ri) => (
          <Win key={`${ci}-${ri}`} x={cx} y={42 + ri * fh + 3} w={10} h={8} lit={l} />
        ))
      )}
    </Svg>
  )
}

function Skyscraper() {
  const fh = 67 / 10
  const lc = [true, false, true, true, false, true, true, false, true, false]
  const rc = [false, true, true, false, true, false, true, true, false, true]
  return (
    <Svg width={14} height={68}>
      <Rect x={1} y={1} width={12} height={67} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(9)].map((_, i) => (
        <Line key={i} x1={1} y1={1 + (i + 1) * fh} x2={13} y2={1 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {lc.map((l, i) => <Win key={`l${i}`} x={2} y={1 + i * fh + 1.5} w={3} h={2} lit={l} />)}
      {rc.map((l, i) => <Win key={`r${i}`} x={9} y={1 + i * fh + 1.5} w={3} h={2} lit={l} />)}
    </Svg>
  )
}

function TaperedTower() {
  return (
    <Svg width={40} height={68}>
      <Line x1={20} y1={3} x2={20} y2={10} stroke={S} strokeWidth={0.6} />
      <Rect x={12} y={10} width={16} height={14} fill="none" stroke={S} strokeWidth={0.7} />
      <Line x1={12} y1={17} x2={28} y2={17} stroke={F} strokeWidth={0.4} />
      <Win x={14} y={12} w={4} h={3} lit={true} />
      <Win x={22} y={12} w={4} h={3} lit={false} />
      <Win x={14} y={19} w={4} h={3} lit={true} />
      <Win x={22} y={19} w={4} h={3} lit={true} />
      <Rect x={6} y={24} width={28} height={20} fill="none" stroke={S} strokeWidth={0.7} />
      <Line x1={6} y1={34} x2={34} y2={34} stroke={F} strokeWidth={0.4} />
      <Win x={9} y={27} w={5} h={4} lit={true} />
      <Win x={17} y={27} w={5} h={4} lit={false} />
      <Win x={25} y={27} w={5} h={4} lit={true} />
      <Win x={9} y={37} w={5} h={4} lit={false} />
      <Win x={17} y={37} w={5} h={4} lit={true} />
      <Win x={25} y={37} w={5} h={4} lit={true} />
      <Rect x={0} y={44} width={40} height={24} fill="none" stroke={S} strokeWidth={0.7} />
      <Line x1={0} y1={56} x2={40} y2={56} stroke={F} strokeWidth={0.4} />
      <Win x={4} y={47} w={5} h={4} lit={true} />
      <Win x={16} y={47} w={5} h={4} lit={false} />
      <Win x={28} y={47} w={5} h={4} lit={true} />
      <Win x={4} y={59} w={5} h={4} lit={false} />
      <Win x={16} y={59} w={5} h={4} lit={true} />
      <Win x={28} y={59} w={5} h={4} lit={true} />
    </Svg>
  )
}

function CondoTower() {
  const ufh = 16 / 2
  const mfh = 44 / 4
  const lc = [true, true, false, true]
  const rc = [false, true, true, false]
  return (
    <Svg width={24} height={68}>
      <Rect x={4} y={8} width={16} height={16} fill="none" stroke={S} strokeWidth={0.7} />
      <Line x1={4} y1={8 + ufh} x2={20} y2={8 + ufh} stroke={F} strokeWidth={0.4} />
      <Win x={9} y={8 + 2} w={5} h={4} lit={true} />
      <Win x={9} y={8 + ufh + 2} w={5} h={4} lit={false} />
      <Rect x={0} y={24} width={24} height={44} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(3)].map((_, i) => (
        <Line key={i} x1={0} y1={24 + (i + 1) * mfh} x2={24} y2={24 + (i + 1) * mfh} stroke={F} strokeWidth={0.4} />
      ))}
      {lc.map((l, i) => <Win key={`l${i}`} x={2} y={24 + i * mfh + 2} w={4} h={4} lit={l} />)}
      {rc.map((l, i) => <Win key={`r${i}`} x={18} y={24 + i * mfh + 2} w={4} h={4} lit={l} />)}
    </Svg>
  )
}

function Villa() {
  return (
    <Svg width={40} height={68}>
      <Polyline points="20,33 0,46 40,46" fill="none" stroke={S} strokeWidth={0.8} />
      <Rect x={3} y={46} width={34} height={22} fill="none" stroke={S} strokeWidth={0.7} />
      <Rect x={15} y={57} width={10} height={11} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={0.6} />
      <Win x={6} y={50} w={8} h={6} lit={true} />
      <Win x={26} y={50} w={8} h={6} lit={true} />
    </Svg>
  )
}

function TwinTower() {
  const lfh = 65 / 8
  const rfh = 53 / 6
  const lc = [true, true, false, true, false, true, true, false]
  const rc = [true, false, true, true, false, true]
  return (
    <Svg width={34} height={68}>
      <Rect x={0} y={3} width={15} height={65} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(7)].map((_, i) => (
        <Line key={i} x1={0} y1={3 + (i + 1) * lfh} x2={15} y2={3 + (i + 1) * lfh} stroke={F} strokeWidth={0.4} />
      ))}
      {lc.map((l, i) => <Win key={`l${i}`} x={5} y={3 + i * lfh + 2} w={4} h={3} lit={l} />)}
      <Rect x={15} y={26} width={4} height={3} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.4} />
      <Rect x={19} y={15} width={15} height={53} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(5)].map((_, i) => (
        <Line key={i} x1={19} y1={15 + (i + 1) * rfh} x2={34} y2={15 + (i + 1) * rfh} stroke={F} strokeWidth={0.4} />
      ))}
      {rc.map((l, i) => <Win key={`r${i}`} x={24} y={15 + i * rfh + 2} w={4} h={3} lit={l} />)}
    </Svg>
  )
}

function FlatTop() {
  const fh = 41 / 4
  const lc = [true, false, true, true]
  const rc = [false, true, false, true]
  return (
    <Svg width={28} height={68}>
      <Rect x={2} y={23} width={24} height={4} fill="none" stroke={S} strokeWidth={0.7} />
      <Rect x={0} y={27} width={28} height={41} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(3)].map((_, i) => (
        <Line key={i} x1={0} y1={27 + (i + 1) * fh} x2={28} y2={27 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {lc.map((l, i) => <Win key={`l${i}`} x={4} y={27 + i * fh + 2} w={5} h={4} lit={l} />)}
      {rc.map((l, i) => <Win key={`r${i}`} x={19} y={27 + i * fh + 2} w={5} h={4} lit={l} />)}
    </Svg>
  )
}

function ArchwayBlock() {
  const fh = 47 / 5
  const lc = [true, false, true, true, false]
  const rc = [false, true, true, false, true]
  return (
    <Svg width={30} height={68}>
      <Rect x={0} y={5} width={30} height={3} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={0.5} />
      <Path d="M 1,55 L 1,8 L 29,8 L 29,55" fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(4)].map((_, i) => (
        <Line key={i} x1={1} y1={8 + (i + 1) * fh} x2={29} y2={8 + (i + 1) * fh} stroke={F} strokeWidth={0.4} />
      ))}
      {lc.map((l, i) => <Win key={`l${i}`} x={3} y={10 + i * fh} w={4} h={4} lit={l} />)}
      {rc.map((l, i) => <Win key={`r${i}`} x={23} y={10 + i * fh} w={4} h={4} lit={l} />)}
      <Path d="M 8,55 A 7,8 0 0 1 22,55" fill="none" stroke={S} strokeWidth={0.7} />
      <Path d="M 1,55 L 1,68 L 8,68 L 8,55" fill="none" stroke={S} strokeWidth={0.7} />
      <Path d="M 22,55 L 22,68 L 29,68 L 29,55" fill="none" stroke={S} strokeWidth={0.7} />
    </Svg>
  )
}

function SteppedBlock() {
  const lfh = 58 / 6
  const rfh = 42 / 4
  const lc = [true, false, true, true, false, true]
  const rc1 = [true, true, false, true]
  const rc2 = [false, true, true, false]
  return (
    <Svg width={38} height={68}>
      <Rect x={0} y={10} width={18} height={58} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(5)].map((_, i) => (
        <Line key={i} x1={0} y1={10 + (i + 1) * lfh} x2={18} y2={10 + (i + 1) * lfh} stroke={F} strokeWidth={0.4} />
      ))}
      {lc.map((l, i) => <Win key={`l${i}`} x={6} y={10 + i * lfh + 2} w={4} h={3} lit={l} />)}
      <Rect x={18} y={26} width={20} height={42} fill="none" stroke={S} strokeWidth={0.7} />
      {[...Array(3)].map((_, i) => (
        <Line key={i} x1={18} y1={26 + (i + 1) * rfh} x2={38} y2={26 + (i + 1) * rfh} stroke={F} strokeWidth={0.4} />
      ))}
      {rc1.map((l, i) => <Win key={`r1${i}`} x={21} y={26 + i * rfh + 2} w={4} h={3} lit={l} />)}
      {rc2.map((l, i) => <Win key={`r2${i}`} x={30} y={26 + i * rfh + 2} w={4} h={3} lit={l} />)}
    </Svg>
  )
}

// Skyline order: alternates tall/short, narrow/wide for a varied silhouette
const BUILDINGS = [
  ClockTower,    // 18w — tall Gothic spire
  LargeComplex,  // 42w — medium wide slab
  SoloSpire,     // 12w — thin needle
  LowRise,       // 46w — very short 3-storey (BIG height contrast)
  Tower1,        // 20w — standard tall
  DomeCrown,     // 38w — dome arch top
  NarrowTower,   // 14w — slim column
  ClubHouse,     // 50w — widest + shortest
  Skyscraper,    // 14w — very tall narrow
  TaperedTower,  // 40w — stepped pyramid tiers
  CondoTower,    // 24w — setback upper block
  Villa,         // 40w — pitched roof, low
  TwinTower,     // 34w — two-tower complex
  FlatTop,       // 28w — cornice cap
  ArchwayBlock,  // 30w — vaulted entrance arch
  SteppedBlock,  // 38w — two staggered volumes
] as const

// Total one-copy width: 488px buildings + 15×14px gaps + 14px trailing = 712px
const SCROLL_WIDTH = 712

// ─── Screen ───────────────────────────────────────────────────────────────────

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ Montserrat_300Light, Montserrat_600SemiBold })

  const waveAnim = useRef(new Animated.Value(0)).current
  const scrollAnim = useRef(new Animated.Value(0)).current
  const entranceAnim = useRef(new Animated.Value(0)).current

  const offsets = React.useMemo(() => FEATURES.map(() => Math.random()), [])

  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 2800,
      useNativeDriver: true,
    }).start()

    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start()

    // useNativeDriver: true — translateX is numeric, runs on UI thread
    Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: 1,
        duration: 50000,
        useNativeDriver: true,
      })
    ).start()
  }, [])

  if (!fontsLoaded) return null

  const N = BUILDINGS.length

  function renderBuildings() {
    return BUILDINGS.map((Building, i) => {
      // Entrance: buildings rise and fade in from ground, staggered
      const start = i / N
      const end = Math.min(start + 0.22, 1)

      const entranceOpacity = entranceAnim.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
      const entranceScaleY = entranceAnim.interpolate({
        inputRange: [start, end],
        outputRange: [0.05, 1],
        extrapolate: 'clamp',
      })
      const entranceTranslateY = entranceAnim.interpolate({
        inputRange: [start, end],
        outputRange: [24, 0],
        extrapolate: 'clamp',
      })

      // Wave shimmer: sequential brightness pulse across the skyline
      const peak = (i + 0.5) / N
      const hw = 0.38 / N
      const waveOpacity = waveAnim.interpolate({
        inputRange: [Math.max(0.001, peak - hw), peak, Math.min(0.999, peak + hw)],
        outputRange: [0.38, 0.92, 0.38],
        extrapolate: 'clamp',
      })

      return (
        <Animated.View
          key={i}
          style={{
            opacity: entranceOpacity,
            transform: [{ scaleY: entranceScaleY }, { translateY: entranceTranslateY }],
          }}
        >
          <Animated.View style={{ opacity: waveOpacity }}>
            <Building />
          </Animated.View>
        </Animated.View>
      )
    })
  }

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

        {/* Feature icon grid */}
        <View style={styles.gridContainer}>
          {FEATURES.map((icon, index) => {
            const offset = offsets[index]
            const opacity = waveAnim.interpolate({
              inputRange: [0, (0.5 + offset) % 1, 1],
              outputRange: [0.4, 0.7, 0.4],
            })
            const scale = waveAnim.interpolate({
              inputRange: [0, (0.5 + offset) % 1, 1],
              outputRange: [1, 1.06, 1],
            })
            return (
              <Animated.View
                key={index}
                style={[styles.iconCircle, { opacity, transform: [{ scale }] }]}
              >
                <Ionicons name={icon} size={20} color="rgba(255,255,255,0.8)" />
              </Animated.View>
            )
          })}
        </View>

        {/* Scrolling skyline */}
        <View style={styles.skylineContainer}>
          <Animated.View
            style={[
              styles.skylineRow,
              {
                transform: [{
                  translateX: scrollAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -SCROLL_WIDTH],
                  }),
                }],
              },
            ]}
          >
            {renderBuildings()}
            {renderBuildings()}
          </Animated.View>
        </View>
      </View>

      <View style={[styles.bottom, { marginBottom: Math.max(insets.bottom, 60) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && { backgroundColor: 'rgba(255,255,255,0.1)' },
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
  skylineContainer: {
    width: '120%',
    height: 80,
    overflow: 'hidden',
    marginBottom: 5,
    marginTop: 15,
  },
  skylineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
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
