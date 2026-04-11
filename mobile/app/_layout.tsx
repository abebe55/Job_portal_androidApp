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
    const inAuth       = segments[0] === '(auth)';
    const inPending    = segments[0] === 'employer-pending';
    const onVerifyPage = segments[1] === 'verify-email';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    if (user) {
      // Already verified but still on verify page → redirect out
      if (user.email_verified && onVerifyPage) {
        if (user.role === 'employer' && !user.is_approved) {
          router.replace('/employer-pending');
        } else {
          router.replace('/(tabs)/' as any);
        }
        return;
      }

      // Allow verify-email page when email not verified
      if (!user.email_verified && onVerifyPage) return;

      // Unverified user trying to access app — send to verify-email
      if (!user.email_verified && !inAuth) {
        router.replace('/(auth)/verify-email');
        return;
      }

      if (inAuth && !onVerifyPage) {
        if (user.role === 'employer' && !user.is_approved) {
          router.replace('/employer-pending');
        } else if (user.email_verified) {
          router.replace('/(tabs)/' as any);
        }
        return;
      }

      if (user.role === 'employer' && !user.is_approved && !inPending) {
        router.replace('/employer-pending');
      }

      // Approved employer on pending page → go to tabs
      if (user.role === 'employer' && user.is_approved && inPending) {
        router.replace('/(tabs)/' as any);
      }
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
