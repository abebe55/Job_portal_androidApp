import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import '../i18n';

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth    = segments[0] === '(auth)';
    const inPending = segments[0] === 'employer-pending';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      // Unapproved employer → pending screen
      if (user.role === 'employer' && !user.is_approved) {
        router.replace('/employer-pending');
      } else {
        router.replace('/(tabs)/');
      }
    } else if (user && user.role === 'employer' && !user.is_approved && !inPending) {
      router.replace('/employer-pending');
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <AuthProvider>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
