import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface EditProfileViewProps {
  onBack: () => void;
}

export default function EditProfileView({ onBack }: EditProfileViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const setUserName = useAuthStore((state) => state.setUserName);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  
  // 🚀 დაზღვეულია any-ით, რათა მკაცრმა TypeScript-მა აღარ გამოიტანოს ერორები კომპილაციისას
  const t: any = translations[language as LanguageType] || translations.ka;

  // ფორმის ინპუტების სთეითები
  const [name, setName] = useState('');
  const [sphere, setSphere] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // მიმდინარე მონაცემების ჩატვირთვა
  const loadCurrentData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('name, sphere, portfolio_url, bio, skills')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name || '');
        setSphere(data.sphere || '');
        setPortfolioUrl(data.portfolio_url || '');
        setBio(data.bio || '');
        setSkills(data.skills || '');
      }
    } catch (error: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა ❌', t.error_fetch_data || 'მონაცემების წამოღება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentData();
  }, [userId]);

  // მონაცემების ბაზაში შენახვის ფუნქცია
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t.error_alert_title || 'შეცდომა', t.name_required_error || 'სახელის ველი სავალდებულოა');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          sphere: sphere.trim(),
          portfolio_url: portfolioUrl.trim(),
          bio: bio.trim(),
          skills: skills.trim()
        })
        .eq('id', userId);

      if (error) throw error;

      // ვანახლებთ სახელს გლობალურ Zustand სთეითშიც, რომ ნავბარში ეგრევე შეიცვალოს
      setUserName(name.trim());

      Alert.alert(t.success_title || 'წარმატება 🎉', t.profile_update_success || 'პროფილი წარმატებით განახლდა!');
      onBack(); // ვბრუნდებით სეთინგებში
    } catch (error: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა ❌', error.message || (t.error_save_data || 'მონაცემების შენახვა ვერ მოხერხდა'));
    } finally {
      setSaving(false);
    }
  };

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#222227' : '#f2f2f7',
  };

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#5B42F5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* უკან დაბრუნების ზედა პანელი */}
        <TouchableOpacity style={styles.backButtonRow} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#5B42F5" />
          <Text style={styles.backButtonText}>{t.back_to_settings || 'პარამეტრებში დაბრუნება'}</Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          
          {/* ინპუტი 1: სახელი */}
          <Text style={[styles.label, { color: theme.subText }]}>{t.full_name_label || 'სრული სახელი'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder={t.full_name_placeholder || "ჩაწერე სახელი და გვარი..."}
            placeholderTextColor="#555"
          />

          {/* ინპუტი 2: სფერო */}
          <Text style={[styles.label, { color: theme.subText }]}>{t.sphere_label_edit || 'სპეციალობა / სფერო'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            value={sphere}
            onChangeText={setSphere}
            placeholder={t.sphere_placeholder_edit || "მაგ: ვიდეოგრაფი, დეველოპერი..."}
            placeholderTextColor="#555"
          />

          {/* ინპუტი 3: პორტფოლიო */}
          <Text style={[styles.label, { color: theme.subText }]}>{t.portfolio_url_label || 'პორტფოლიოს ბმული (URL)'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            placeholder={t.portfolio_url_placeholder || "მაგ: myportfolio.com"}
            placeholderTextColor="#555"
            autoCapitalize="none"
          />

          {/* ინპუტი 4: უნარები */}
          <Text style={[styles.label, { color: theme.subText }]}>{t.skills_label_edit || 'უნარები (გამოყავით მძიმეებით)'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            value={skills}
            onChangeText={setSkills}
            placeholder={t.skills_placeholder_edit || "React, Supabase, Premiere Pro"}
            placeholderTextColor="#555"
          />

          {/* ინპუტი 5: ბიო */}
          <Text style={[styles.label, { color: theme.subText }]}>{t.bio_label || 'ჩემ შესახებ (Bio)'}</Text>
          <TextInput
            style={[
              styles.input, 
              styles.textArea, 
              { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder={t.bio_placeholder || "მოყევი მოკლედ შენი გამოცდილების შესახებ..."}
            placeholderTextColor="#555"
            multiline={true}
            numberOfLines={4}
          />

          {/* შენახვის ღილაკი */}
          <TouchableOpacity 
            style={[styles.saveButton, saving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t.save_changes_btn || 'ცვლილებების შენახვა'}</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 110 },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 4 },
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 20, borderRadius: 24, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4, letterSpacing: 0.5 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#5B42F5', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' }
});