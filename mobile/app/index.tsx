import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { C } from '../constants/theme';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) router.replace('/(tabs)/');
      else router.replace('/(auth)/login');
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );
}
