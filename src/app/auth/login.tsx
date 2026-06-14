import { useRouter } from 'expo-router';
import { Globe, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/services/auth';
import { syncUserDataFromSupabase } from '@/services/supabase-sync';
import { useJimStore } from '@/store/jimStore';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setUser } = useJimStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const { data, error } = isSignUp
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);

    if (error) {
      Alert.alert('Auth Error', error.message || 'Authentication failed');
      setLoading(false);
      return;
    }

    if (data?.user) {
      setUser({ id: data.user.id, email: data.user.email || '' });
      await syncUserDataFromSupabase(data.user.id);
      router.replace('/');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { data, error } = await signInWithGoogle();

    if (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Google login failed';
      Alert.alert('Google Auth Error', message);
      setLoading(false);
      return;
    }

    if (data && 'user' in data && data.user) {
      setUser({ id: data.user.id, email: data.user.email || '' });
      await syncUserDataFromSupabase(data.user.id);
      router.replace('/');
    }
    setLoading(false);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
              <ThemedText type="title" style={styles.appName}>Jim ⚡️</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                Your Training Engine
            </ThemedText>
          </View>

          {/* Form Card */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="default" style={{ fontWeight: '600', marginBottom: Spacing.three }}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </ThemedText>

            {/* Email Input */}
            <View style={[styles.inputWrapper, { borderColor: theme.backgroundSelected }]}>
              <Mail size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputWrapper, { borderColor: theme.backgroundSelected }]}>
              <Lock size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            {/* Email Sign In Button */}
            <Pressable
              onPress={handleEmailAuth}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                { opacity: loading ? 0.6 : pressed ? 0.9 : 1 },
              ]}
            >
              <ThemedText type="smallBold" style={{ color: '#000000' }}>
                {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </ThemedText>
            </Pressable>

            {/* Toggle Sign Up */}
            <Pressable
              onPress={() => {
                setIsSignUp(!isSignUp);
                setPassword('');
              }}
              disabled={loading}
            >
              <ThemedText type="small" style={{ textAlign: 'center', marginTop: Spacing.two }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </ThemedText>
              </ThemedText>
            </Pressable>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Google Sign In Button */}
            <Pressable
              onPress={handleGoogleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.googleButton,
                { borderColor: theme.backgroundSelected, opacity: loading ? 0.6 : pressed ? 0.9 : 1 },
              ]}
            >
              <Globe size={18} color={theme.text} />
              <ThemedText type="smallBold">Sign In with Google</ThemedText>
            </Pressable>
          </ThemedView>

          {/* Info Footer */}
          <View style={styles.footer}>
            <ThemedText type="code" themeColor="textSecondary" style={{ textAlign: 'center', fontSize: 11 }}>
              Your data is encrypted and stored securely in Supabase.
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 13,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.one,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: Spacing.two + 2,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.two,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    paddingVertical: Spacing.two + 2,
    borderRadius: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.three,
  },
});
