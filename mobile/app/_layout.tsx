import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import '../i18n';

SplashScreen.preventAutoHideAsync();

// ── Inject global web CSS — removes browser blue outline on all inputs ────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    *, *:focus, *:active {
      outline: none !important;
      -webkit-tap-highlight-color: transparent;
    }
    input, textarea, select {
      outline: none !important;
      box-shadow: none !important;
    }
    input:focus, textarea:focus, select:focus {
      outline: none !important;
      box-shadow: none !important;
      border-color: #c4b5fd !important;
    }
  `;
  document.head.appendChild(style);
}

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
        const email = (user.email || '').trim().toLowerCase();
        router.replace(
          `/(auth)/verify-email?email=${encodeURIComponent(email)}` as any,
        );
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
