import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { CreateSocietyScreen } from '../screens/society/CreateSocietyScreen'
import { DashboardScreen } from '../screens/society/DashboardScreen'
import { StructureScreen } from '../screens/society/StructureScreen'
import { AddNodeScreen } from '../screens/society/AddNodeScreen'
import { InviteMemberScreen } from '../screens/society/InviteMemberScreen'
import { MemberListScreen } from '../screens/members/MemberListScreen'
import { MemberDetailScreen } from '../screens/members/MemberDetailScreen'
import { SwitchSocietyScreen } from '../screens/society/SwitchSocietyScreen'
import { ComplaintListScreen } from '../screens/complaints/ComplaintListScreen'
import { RaiseComplaintScreen } from '../screens/complaints/RaiseComplaintScreen'
import { ComplaintDetailScreen } from '../screens/complaints/ComplaintDetailScreen'
import { UnitInventoryScreen } from '../screens/units/UnitInventoryScreen'
import { UnitDetailScreen } from '../screens/units/UnitDetailScreen'
import { AssignUnitScreen } from '../screens/units/AssignUnitScreen'
import { MyHomeScreen } from '../screens/units/MyHomeScreen'
import { Colors } from '../constants/colors'

export type AppStackParamList = {
  CreateSociety: { source?: 'dashboard' }
  Dashboard: { societyId: string }
  SwitchSociety: undefined
  Structure: { societyId: string }
  AddNode: { societyId: string; parentId?: string; parentName?: string }
  InviteMember: { societyId: string }
  MemberList: { societyId: string }
  MemberDetail: { societyId: string; memberId: string; memberName: string }
  ComplaintList: { societyId: string }
  RaiseComplaint: { societyId: string }
  ComplaintDetail: { societyId: string; complaintId: string; title: string }
  UnitInventory: { societyId: string }
  UnitDetail: { societyId: string; unitId: string; unitName: string }
  AssignUnit: {
    societyId: string
    memberId: string
    memberName: string
    prefillUnitId?: string
    prefillUnitName?: string
  }
  MyHome: { societyId: string; memberId: string }
}

const Stack = createNativeStackNavigator<AppStackParamList>()

interface AppNavigatorProps {
  initialSocietyId?: string
}

export function AppNavigator({ initialSocietyId }: AppNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialSocietyId ? 'Dashboard' : 'CreateSociety'}
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: Colors.primary,
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: Colors.text },
      }}
    >
      <Stack.Screen name="CreateSociety" component={CreateSocietyScreen} options={{ title: 'Create Society' }} />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: '' }}
        initialParams={initialSocietyId ? { societyId: initialSocietyId } : undefined}
      />
      <Stack.Screen name="Structure" component={StructureScreen} options={{ title: 'Structure' }} />
      <Stack.Screen name="AddNode" component={AddNodeScreen} options={{ title: 'Add to Structure' }} />
      <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ title: 'Invite Member' }} />
      <Stack.Screen name="MemberList" component={MemberListScreen} options={{ title: 'Members' }} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={({ route }) => ({ title: route.params.memberName })} />
      <Stack.Screen name="SwitchSociety" component={SwitchSocietyScreen} options={{ title: 'Switch Society' }} />
      <Stack.Screen name="ComplaintList" component={ComplaintListScreen} options={{ title: 'Complaints' }} />
      <Stack.Screen name="RaiseComplaint" component={RaiseComplaintScreen} options={{ title: 'Raise Complaint' }} />
      <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={({ route }) => ({ title: route.params.title })} />
      <Stack.Screen name="UnitInventory" component={UnitInventoryScreen} options={{ title: 'Units' }} />
      <Stack.Screen name="UnitDetail" component={UnitDetailScreen} options={({ route }) => ({ title: route.params.unitName })} />
      <Stack.Screen name="AssignUnit" component={AssignUnitScreen} options={{ title: 'Assign Unit' }} />
      <Stack.Screen name="MyHome" component={MyHomeScreen} options={{ title: 'My Home' }} />
    </Stack.Navigator>
  )
}
