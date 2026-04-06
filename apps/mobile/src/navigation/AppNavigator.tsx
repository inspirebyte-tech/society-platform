import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { CreateSocietyScreen } from '../screens/society/CreateSocietyScreen'
import { DashboardScreen } from '../screens/society/DashboardScreen'
import { StructureScreen } from '../screens/society/StructureScreen'
import { AddNodeScreen } from '../screens/society/AddNodeScreen'
import { InviteMemberScreen } from '../screens/society/InviteMemberScreen'
import { MemberListScreen } from '../screens/members/MemberListScreen'
import { MemberDetailScreen } from '../screens/members/MemberDetailScreen'
import { Colors } from '../constants/colors'

export type AppStackParamList = {
  CreateSociety: undefined
  Dashboard: { societyId: string }
  Structure: { societyId: string }
  AddNode: { societyId: string; parentId?: string; parentName?: string }
  InviteMember: { societyId: string }
  MemberList: { societyId: string }
  MemberDetail: { societyId: string; memberId: string; memberName: string }
}

const Stack = createNativeStackNavigator<AppStackParamList>()

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: Colors.primary,
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: Colors.text },
      }}
    >
      <Stack.Screen name="CreateSociety" component={CreateSocietyScreen} options={{ title: 'Create Society' }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: '' }} />
      <Stack.Screen name="Structure" component={StructureScreen} options={{ title: 'Structure' }} />
      <Stack.Screen name="AddNode" component={AddNodeScreen} options={{ title: 'Add to Structure' }} />
      <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ title: 'Invite Member' }} />
      <Stack.Screen name="MemberList" component={MemberListScreen} options={{ title: 'Members' }} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={({ route }) => ({ title: route.params.memberName })} />
    </Stack.Navigator>
  )
}
