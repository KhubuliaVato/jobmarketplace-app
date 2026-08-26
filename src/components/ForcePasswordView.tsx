import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  onDone: () => void;
}

export default function ForcePasswordView({ onDone }: Props) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const userId = useAuthStore((state) => state.userId);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
    accent: '#5B42F5',
  };

  const handleSave = async () => {
    if (newPassword.length < 6) {
      Alert.alert('შეცდომა', 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('შეცდომა', 'პაროლები არ ემთხვევა');
      return;
    }

    try {
      setLoading(true);

      // 1. პაროლის შეცვლა
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // 2. ფლაგის მოხსნა
      await supabase.from('companies').update({ must_change_password: false }).eq('id', userId);

      Alert.alert('მზადაა ✅', 'პაროლი წარმატებით შეიცვალა');
      onDone();
    } catch (err: any) {
      Alert.alert('შეცდომა', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Ionicons name="lock-closed" size={40} color={theme.accent} style={{ alignSelf: 'center', marginBottom: 16 }} />

        <Text style={[styles.title, { color: theme.text }]}>შექმენით ახალი პაროლი</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          უსაფრთხოებისთვის, გთხოვთ შეცვალოთ დროებითი პაროლი
        </Text>

        <Text style={[styles.label, { color: theme.subText }]}>ახალი პაროლი *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="••••••••"
          placeholderTextColor="#555"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: theme.subText }]}>გაიმეორეთ პაროლი *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="••••••••"
          placeholderTextColor="#555"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>შენახვა</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  button: { height: 52, borderRadius: 12, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});