import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Detect if we are using a mock Supabase engine
export const isMockClient = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder');

type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const getWebStorage = (): WebStorageLike | null => {
  if (typeof window === 'undefined') return null;

  const storage = (window as unknown as { localStorage?: unknown }).localStorage;
  if (!storage || typeof storage !== 'object') return null;

  const candidate = storage as Partial<WebStorageLike>;
  if (
    typeof candidate.getItem !== 'function' ||
    typeof candidate.setItem !== 'function' ||
    typeof candidate.removeItem !== 'function'
  ) {
    return null;
  }

  return candidate as WebStorageLike;
};

// Custom storage adapter for secure persistence
const ExpoSecureStorage = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      return Promise.resolve(storage ? storage.getItem(key) : null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      if (storage) storage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      if (storage) storage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = isMockClient
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });

console.log(`[Jim DB] Mode: ${isMockClient ? 'Offline Mock (Local Storage)' : 'Online Supabase Connected'}`);
