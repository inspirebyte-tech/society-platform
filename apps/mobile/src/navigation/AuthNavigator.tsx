import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { LoginPhoneScreen } from '../screens/auth/LoginPhoneScreen'
import { LoginOTPScreen } from '../screens/auth/LoginOTPScreen'
import { SetNameScreen } from '../screens/auth/SetNameScreen'
import { SelectSocietyScreen } from '../screens/auth/SelectSocietyScreen'

export type AuthStackParamList = {
  LoginPhone: undefined
  LoginOTP: { phone: string }
  SetName: {
    requiresOrgSelection: boolean
    memberships: Array<{ orgId: string; orgName: string; role: string }>
    currentOrgId: string | undefined
  }
  SelectSociety: { memberships: Array<{ orgId: string; orgName: string; role: string }> }
}

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginPhone" component={LoginPhoneScreen} />
      <Stack.Screen name="LoginOTP" component={LoginOTPScreen} />
      <Stack.Screen name="SetName" component={SetNameScreen} />
      <Stack.Screen name="SelectSociety" component={SelectSocietyScreen} />
    </Stack.Navigator>
  )
}
