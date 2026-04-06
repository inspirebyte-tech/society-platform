import React from 'react'
import { View, Text } from 'react-native'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Colors } from '../../constants/colors'

export function AddNodeScreen() {
  return (
    <ScreenWrapper>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, color: Colors.subtle }}>Add Node — coming next</Text>
      </View>
    </ScreenWrapper>
  )
}
