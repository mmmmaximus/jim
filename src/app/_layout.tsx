import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { isMockClient, supabase } from '@/db/supabase';
import { queryClient, setupQueryPersistence } from '@/lib/query-client';
import { syncUserDataFromSupabase } from '@/services/supabase-sync';
import { useGymStore } from '@/store/gymStore';

export default function RootLayout() {
  const BYPASS_AUTH_FOR_DEV = false;
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { setUser, user, initializeDefaultData } = useGymStore();

  useEffect(() => {
    setupQueryPersistence();
  }, [BYPASS_AUTH_FOR_DEV, initializeDefaultData, router, setUser]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // Keep local development fresh by disabling SW caching.
    if (__DEV__) {
      if (!('serviceWorker' in navigator)) return;

      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });

      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            caches.delete(key);
          });
        });
      }

      return;
    }

    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[PWA] Service worker registration failed:', error);
    });
  }, [BYPASS_AUTH_FOR_DEV, initializeDefaultData, router, setUser]);

  useEffect(() => {
    if (BYPASS_AUTH_FOR_DEV) {
      setUser({ id: 'offline-user', email: 'offline@jim.app' });
      initializeDefaultData();
      router.replace('/');
      return;
    }

    const initializeAuth = async () => {
      try {
        // Check if user is already logged in (from Supabase or mock)
        if (isMockClient) {
          // Offline mode: use default data
          console.log('[Auth] Running in offline mode');
          initializeDefaultData();
        } else if (supabase) {
          // Try to get existing session
          const { data } = await supabase.auth.getSession();

          if (data?.session?.user) {
            // User is logged in
            console.log('[Auth] User session found:', data.session.user.email);
            setUser({
              id: data.session.user.id,
              email: data.session.user.email || '',
            });

            // Sync data from Supabase
            await syncUserDataFromSupabase(data.session.user.id);
            router.replace('/');
          } else {
            // No session, redirect to login
            console.log('[Auth] No session found, redirecting to login');
            router.replace('/auth/login');
          }
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
        // Fall back to offline mode
        initializeDefaultData();
      }
    };

    initializeAuth();

    // Listen for auth state changes
    if (!isMockClient && supabase) {
      const subscription = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          console.log('[Auth] Auth state changed - user logged in');
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
          syncUserDataFromSupabase(session.user.id);
          router.replace('/');
        } else {
          console.log('[Auth] Auth state changed - user logged out');
          setUser(null);
          router.replace('/auth/login');
        }
      });

      return () => {
        subscription.data?.subscription?.unsubscribe();
      };
    }
  }, [BYPASS_AUTH_FOR_DEV, initializeDefaultData, router, setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {BYPASS_AUTH_FOR_DEV ? <AppTabs /> : user ? <AppTabs /> : <Slot />}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
