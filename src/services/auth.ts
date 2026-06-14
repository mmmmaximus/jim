import { isMockClient, supabase } from '@/db/supabase';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export async function signUpWithEmail(email: string, password: string) {
  if (isMockClient || !supabase) {
    return { data: null, error: { message: 'Supabase not configured. Set env variables.' } };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  if (isMockClient || !supabase) {
    return { data: null, error: { message: 'Supabase not configured. Set env variables.' } };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signInWithGoogle() {
  if (isMockClient || !supabase) {
    return { data: null, error: { message: 'Supabase not configured. Set env variables.' } };
  }

  try {
    if (Platform.OS === 'web') {
      // Web uses OAuth redirect flow; session is recovered on app load.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/login`,
          skipBrowserRedirect: true,
        },
      });

      if (!error && data?.url && typeof window !== 'undefined') {
        window.location.assign(data.url);
      }

      return { data, error };
    } else {
      // Mobile uses Supabase OAuth in browser session + code exchange.
      const redirectTo = Linking.createURL('/auth/login'); // resolves to jim://auth/login
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return { data: null, error };
      }

      if (!data?.url) {
        return { data: null, error: { message: 'No Google auth URL returned.' } };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        return { data: null, error: { message: 'Google sign-in was cancelled.' } };
      }

      return await getOAuthSessionFromUrl(result.url);
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      data: null,
      error: error instanceof Error ? error : { message: 'Google sign-in failed.' },
    };
  }
}

export async function getOAuthSessionFromUrl(url: string) {
  if (isMockClient || !supabase) {
    return { data: null, error: { message: 'Supabase not configured. Set env variables.' } };
  }

  try {
    const callbackUrl = new URL(url);
    const code = callbackUrl.searchParams.get('code');
    if (!code) {
      return { data: null, error: { message: 'No auth code in callback URL.' } };
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    return { data, error };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : { message: 'Failed to parse callback URL.' },
    };
  }
}

export async function signOut() {
  if (isMockClient || !supabase) {
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  if (isMockClient || !supabase) {
    return null;
  }
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

export async function getSession() {
  if (isMockClient || !supabase) {
    return null;
  }
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}
