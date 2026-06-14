import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { isMockClient } from '@/db/supabase';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/services/auth';
import { useGymStore } from '@/store/gymStore';

export default function LogoutButton() {
  const router = useRouter();
  const theme = useTheme();
  const { user, setUser, clearAllData } = useGymStore();

  if (!user) return null;

  const handleLogout = async () => {
    if (!isMockClient) {
      const { error } = await signOut();
      if (error) {
        Alert.alert('Logout Failed', error.message || 'Unable to sign out right now.');
        return;
      }
    }

    clearAllData();
    setUser(null);
    router.replace('/auth/login');
  };

  return (
    <Pressable onPress={handleLogout} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.75 : 1 }]}>
      <LogOut size={16} color={theme.text} />
      <ThemedText type="smallBold">Logout</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
