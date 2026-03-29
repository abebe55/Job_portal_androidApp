import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Jobs', tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="cv" options={{ title: 'Create CV', tabBarIcon: ({ color, size }) => <Ionicons name="create-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="mycv" options={{ title: 'My CV', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="applications" options={{ title: 'Applied', tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
