import React from 'react'
import { View, Text } from 'react-native'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Colors } from '../../constants/colors'

export function StructureScreen() {
  return (
    <ScreenWrapper>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, color: Colors.subtle }}>Structure — coming next</Text>
      </View>
    </ScreenWrapper>
  )
}
