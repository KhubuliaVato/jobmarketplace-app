import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';
import { searchUniversities, universityLogoUrl } from '../utils/georgianUniversities';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface EditProfileViewProps {
  onBack: () => void;
}


export default function EditProfileView({ onBack }: EditProfileViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const setUserName = useAuthStore((state) => state.setUserName);
  const userRole = useAuthStore((state) => state.userRole);
  const isCompany = userRole === 'company';

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [location, setLocation] = useState('');
  const [availability, setAvailability] = useState('');
  const [salaryExpect, setSalaryExpect] = useState('');
  const [lookingForWork, setLookingForWork] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [showContactEmail, setShowContactEmail] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [experience, setExperience] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [uniDropdownId, setUniDropdownId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const addExp = () => setExperience((p) => [...p, { id: genId(), company: '', position: '', from: '', to: '', current: false }]);
  const updExp = (id: string, patch: any) => setExperience((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const delExp = (id: string) => setExperience((p) => p.filter((e) => e.id !== id));

  const addEdu = () => setEducation((p) => [...p, { id: genId(), school: '', degree: '', from: '', to: '', current: false }]);
  const updEdu = (id: string, patch: any) => setEducation((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const delEdu = (id: string) => setEducation((p) => p.filter((e) => e.id !== id));

  const addLang = () => setLanguages((p) => [...p, { id: genId(), name: '', level: 'B2' }]);
  const updLang = (id: string, patch: any) => setLanguages((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const delLang = (id: string) => setLanguages((p) => p.filter((l) => l.id !== id));

  // მიმდინარე მონაცემების ჩატვირთვა
  const loadCurrentData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(isCompany ? 'companies' : 'users')
        .select('name, sphere, portfolio_url, bio, skills, avatar_url, location, availability, salary_expect, looking_for_work, contact_email, phone_number, show_contact_email, show_phone, jobs_experience, education, languages')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setName(data.name || '');
        setSphere(data.sphere || '');
        setPortfolioUrl(data.portfolio_url || '');
        setBio(data.bio || '');
        setSkills(data.skills || '');
        setAvatarUrl(data.avatar_url || null);
        setLocation(data.location || '');
        setAvailability(data.availability || '');
        setSalaryExpect(data.salary_expect || '');
        setLookingForWork(data.looking_for_work || false);
        setContactEmail(data.contact_email || '');
        setPhoneNumber(data.phone_number || '');
        setShowContactEmail(data.show_contact_email || false);
        setShowPhone(data.show_phone || false);
        setExperience(Array.isArray(data.jobs_experience) ? data.jobs_experience : []);
        setEducation(Array.isArray(data.education) ? data.education : []);
        setLanguages(Array.isArray(data.languages) ? data.languages : []);
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

  const pickAndUploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.error_alert_title || 'შეცდომა ❌', 'გალერეაზე წვდომა საჭიროა');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    uploadAvatar(result.assets[0].uri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!userId) return;
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, { contentType: blob.type || 'image/jpeg', upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updErr } = await supabase
        .from(isCompany ? 'companies' : 'users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      if (updErr) throw updErr;

      setAvatarUrl(publicUrl);
    } catch (error: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა ❌', error.message || 'ავატარის ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploading(false);
    }
  };

  // მონაცემების ბაზაში შენახვის ფუნქცია
  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    try {
      setSaving(true);

      const payload: any = isCompany
        ? {
            company_name: name.trim(),
            sphere: sphere.trim(),
            portfolio_url: portfolioUrl.trim(),
            bio: bio.trim(),
          }
        : {
            name: name.trim(),
            sphere: sphere.trim(),
            portfolio_url: portfolioUrl.trim(),
            bio: bio.trim(),
            skills: skills.trim(),
            location: location.trim() || null,
            availability: availability.trim() || null,
            salary_expect: salaryExpect.trim() || null,
            looking_for_work: lookingForWork,
            contact_email: contactEmail.trim() || null,
            phone_number: phoneNumber.trim() || null,
            show_contact_email: showContactEmail,
            show_phone: showPhone,
            jobs_experience: experience
              .filter((e) => e.company?.trim())
              .map((e) => ({ id: e.id, company: e.company.trim(), position: (e.position || '').trim(), from: e.from || '', to: e.current ? '' : (e.to || ''), current: !!e.current })),
            education: education
              .filter((e) => e.school?.trim())
              .map((e) => ({ id: e.id, school: e.school.trim(), degree: (e.degree || '').trim(), from: e.from || '', to: e.current ? '' : (e.to || ''), current: !!e.current })),
            languages: languages
              .filter((l) => l.name?.trim())
              .map((l) => ({ id: l.id, name: l.name.trim(), level: l.level || '' })),
          };

      const { data, error } = await supabase
        .from(isCompany ? 'companies' : 'users')
        .update(payload)
        .eq('id', userId)
        .select();

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

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
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

          {/* ავატარი */}
          <View style={styles.avatarRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, { backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>{(name || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.avatarBtn} onPress={pickAndUploadAvatar} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="camera" size={15} color="#fff" />
                  <Text style={styles.avatarBtnText}>{avatarUrl ? 'სურათის შეცვლა' : 'სურათის ატვირთვა'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

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

          {!isCompany && (
            <>
              <Text style={[styles.label, { color: theme.subText }]}>ქალაქი</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                value={location}
                onChangeText={setLocation}
                placeholder="თბილისი"
                placeholderTextColor="#555"
              />

              <Text style={[styles.label, { color: theme.subText }]}>დასაქმების ტიპი</Text>
              <View style={[styles.pickerRow]}>
                {['სრული განაკვეთი', 'ნახევარი განაკვეთი', 'დისტანციური', 'პროექტული'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setAvailability(availability === opt ? '' : opt)}
                    style={[
                      styles.chip,
                      { borderColor: theme.border, backgroundColor: availability === opt ? '#5B42F5' : theme.inputBg },
                    ]}
                  >
                    <Text style={{ color: availability === opt ? '#fff' : theme.text, fontSize: 12.5, fontWeight: '600' }}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.subText, marginTop: 16 }]}>სასურველი ანაზღაურება</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                value={salaryExpect}
                onChangeText={setSalaryExpect}
                placeholder="2000₾+"
                placeholderTextColor="#555"
              />

              <View style={[styles.toggleRow, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>ვეძებ სამსახურს</Text>
                  <Text style={[styles.toggleSub, { color: theme.subText }]}>პროფილზე გამოჩნდება მწვანე badge</Text>
                </View>
                <Switch
                  value={lookingForWork}
                  onValueChange={setLookingForWork}
                  trackColor={{ false: theme.border, true: '#37B562' }}
                  thumbColor="#fff"
                />
              </View>
            </>
          )}

          <Text style={[styles.label, { color: theme.subText, marginTop: 4 }]}>საკონტაქტო მეილი</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="example@gmail.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={[styles.toggleRowInline]}>
            <Text style={[styles.toggleSub, { color: theme.subText }]}>მეილის ჩვენება პროფილზე (საჯაროდ)</Text>
            <Switch
              value={showContactEmail}
              onValueChange={setShowContactEmail}
              trackColor={{ false: theme.border, true: '#5B42F5' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={[styles.label, { color: theme.subText, marginTop: 4 }]}>ტელეფონის ნომერი (SMS შეტყობინებებისთვის)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="5XXXXXXXX"
            placeholderTextColor="#555"
            keyboardType="phone-pad"
          />
          <View style={[styles.toggleRowInline, { marginBottom: 16 }]}>
            <Text style={[styles.toggleSub, { color: theme.subText }]}>ტელეფონის ჩვენება პროფილზე (საჯაროდ)</Text>
            <Switch
              value={showPhone}
              onValueChange={setShowPhone}
              trackColor={{ false: theme.border, true: '#5B42F5' }}
              thumbColor="#fff"
            />
          </View>

          {!isCompany && (
            <>
              {/* სამსახურეობრივი გამოცდილება */}
              <View style={[styles.sectionDivider, { borderTopColor: theme.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>სამსახურეობრივი გამოცდილება</Text>
                  <TouchableOpacity style={[styles.addBtn, { borderColor: theme.border, backgroundColor: theme.inputBg }]} onPress={addExp}>
                    <Ionicons name="add" size={15} color={theme.text} />
                    <Text style={[styles.addBtnText, { color: theme.text }]}>დამატება</Text>
                  </TouchableOpacity>
                </View>

                {experience.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.subText }]}>ჯერ არაფერი დაგიმატებია.</Text>
                ) : (
                  experience.map((e) => (
                    <View key={e.id} style={[styles.entryCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                      <View style={styles.entryRow}>
                        <TextInput
                          style={[styles.entryInput, { color: theme.text }]}
                          value={e.company}
                          onChangeText={(v) => updExp(e.id, { company: v })}
                          placeholder="კომპანია / ორგანიზაცია"
                          placeholderTextColor="#555"
                        />
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => delExp(e.id)}>
                          <Ionicons name="trash-outline" size={17} color="#ff453a" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.entryInput, { color: theme.text, borderColor: theme.border, marginBottom: 10 }]}
                        value={e.position}
                        onChangeText={(v) => updExp(e.id, { position: v })}
                        placeholder="პოზიცია"
                        placeholderTextColor="#555"
                      />
                      <View style={styles.dateRow}>
                        <TextInput
                          style={[styles.entryInput, { flex: 1, color: theme.text, borderColor: theme.border }]}
                          value={e.from}
                          onChangeText={(v) => updExp(e.id, { from: v })}
                          placeholder="დაწყება (2023-06)"
                          placeholderTextColor="#555"
                        />
                        <TextInput
                          style={[styles.entryInput, { flex: 1, color: theme.text, borderColor: theme.border }]}
                          value={e.current ? '' : e.to}
                          onChangeText={(v) => updExp(e.id, { to: v })}
                          editable={!e.current}
                          placeholder="დასრულება"
                          placeholderTextColor="#555"
                        />
                      </View>
                      <TouchableOpacity style={styles.currentRow} onPress={() => updExp(e.id, { current: !e.current })}>
                        <Ionicons name={e.current ? 'checkbox' : 'square-outline'} size={19} color={e.current ? '#5B42F5' : theme.subText} />
                        <Text style={{ color: theme.text, fontSize: 13, marginLeft: 8 }}>ამჟამად აქ ვმუშაობ</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* ენები */}
              <View style={[styles.sectionDivider, { borderTopColor: theme.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>ენები</Text>
                  <TouchableOpacity style={[styles.addBtn, { borderColor: theme.border, backgroundColor: theme.inputBg }]} onPress={addLang}>
                    <Ionicons name="add" size={15} color={theme.text} />
                    <Text style={[styles.addBtnText, { color: theme.text }]}>დამატება</Text>
                  </TouchableOpacity>
                </View>

                {languages.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.subText }]}>ენა არ დაგიმატებია.</Text>
                ) : (
                  languages.map((l) => (
                    <View key={l.id} style={{ marginBottom: 12 }}>
                      <View style={styles.entryRow}>
                        <TextInput
                          style={[styles.entryInput, { flex: 1, color: theme.text, borderColor: theme.border }]}
                          value={l.name}
                          onChangeText={(v) => updLang(l.id, { name: v })}
                          placeholder="ენა (მაგ. ინგლისური)"
                          placeholderTextColor="#555"
                        />
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => delLang(l.id)}>
                          <Ionicons name="trash-outline" size={17} color="#ff453a" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.pickerRow}>
                        {['მშობლიური', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1'].map((lvl) => (
                          <TouchableOpacity
                            key={lvl}
                            onPress={() => updLang(l.id, { level: lvl })}
                            style={[styles.chip, { borderColor: theme.border, backgroundColor: l.level === lvl ? '#5B42F5' : theme.inputBg }]}
                          >
                            <Text style={{ color: l.level === lvl ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>{lvl}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* განათლება */}
              <View style={[styles.sectionDivider, { borderTopColor: theme.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>განათლება</Text>
                  <TouchableOpacity style={[styles.addBtn, { borderColor: theme.border, backgroundColor: theme.inputBg }]} onPress={addEdu}>
                    <Ionicons name="add" size={15} color={theme.text} />
                    <Text style={[styles.addBtnText, { color: theme.text }]}>დამატება</Text>
                  </TouchableOpacity>
                </View>

                {education.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.subText }]}>ჯერ არაფერი დაგიმატებია.</Text>
                ) : (
                  education.map((e) => (
                    <View key={e.id} style={[styles.entryCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                      <View style={styles.entryRow}>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            style={[styles.entryInput, { color: theme.text, width: '100%' }]}
                            value={e.school}
                            onChangeText={(v) => { updEdu(e.id, { school: v }); setUniDropdownId(e.id); }}
                            onFocus={() => setUniDropdownId(e.id)}
                            placeholder="სასწავლებელი"
                            placeholderTextColor="#555"
                          />
                          {uniDropdownId === e.id && e.school?.trim().length > 0 && (
                            <View style={[styles.uniDropdownInline, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                              {searchUniversities(e.school).map((u) => {
                                const logo = universityLogoUrl(u.domain);
                                return (
                                  <TouchableOpacity
                                    key={u.name}
                                    style={styles.uniOption}
                                    onPress={() => { updEdu(e.id, { school: u.name }); setUniDropdownId(null); }}
                                  >
                                    {logo ? (
                                      <Image source={{ uri: logo }} style={styles.uniLogo} />
                                    ) : (
                                      <View style={[styles.uniLogo, styles.uniLogoFallback]}>
                                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{u.name.charAt(0)}</Text>
                                      </View>
                                    )}
                                    <Text style={{ color: theme.text, fontSize: 12.5, flex: 1 }} numberOfLines={2}>{u.name}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                              {searchUniversities(e.school).length === 0 && (
                                <Text style={{ color: theme.subText, fontSize: 12, padding: 12 }}>ვერ მოიძებნა — თავად ჩაწერე ხელით</Text>
                              )}
                            </View>
                          )}
                        </View>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => delEdu(e.id)}>
                          <Ionicons name="trash-outline" size={17} color="#ff453a" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.entryInput, { color: theme.text, borderColor: theme.border, marginBottom: 10 }]}
                        value={e.degree}
                        onChangeText={(v) => updEdu(e.id, { degree: v })}
                        placeholder="ფაკულტეტი / ხარისხი"
                        placeholderTextColor="#555"
                      />
                      <View style={styles.dateRow}>
                        <TextInput
                          style={[styles.entryInput, { flex: 1, color: theme.text, borderColor: theme.border }]}
                          value={e.from}
                          onChangeText={(v) => updEdu(e.id, { from: v })}
                          placeholder="დაწყება (2020-09)"
                          placeholderTextColor="#555"
                        />
                        <TextInput
                          style={[styles.entryInput, { flex: 1, color: theme.text, borderColor: theme.border }]}
                          value={e.current ? '' : e.to}
                          onChangeText={(v) => updEdu(e.id, { to: v })}
                          editable={!e.current}
                          placeholder="დასრულება"
                          placeholderTextColor="#555"
                        />
                      </View>
                      <TouchableOpacity style={styles.currentRow} onPress={() => updEdu(e.id, { current: !e.current })}>
                        <Ionicons name={e.current ? 'checkbox' : 'square-outline'} size={19} color={e.current ? '#5B42F5' : theme.subText} />
                        <Text style={{ color: theme.text, fontSize: 13, marginLeft: 8 }}>ამჟამად ვსწავლობ</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

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
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.15)' },
  avatarImg: { width: 76, height: 76, borderRadius: 20, marginRight: 16 },
  avatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#5B42F5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  avatarBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },

  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 16 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 13, borderWidth: 1.3 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  toggleTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  toggleSub: { fontSize: 11.5, flex: 1, marginRight: 10 },
  toggleRowInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: -6 },

  sectionDivider: { marginTop: 20, paddingTop: 20, borderTopWidth: 1 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  sectionTitle: { fontSize: 15.5, fontWeight: '800', letterSpacing: 0.1, flexShrink: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 11, borderWidth: 1, flexShrink: 0 },
  addBtnText: { fontSize: 12.5, fontWeight: '700' },
  emptyText: { fontSize: 13 },

  entryCard: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  entryInput: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.16)',
    paddingHorizontal: 15,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  deleteBtn: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,69,58,0.12)', justifyContent: 'center', alignItems: 'center' },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  currentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },

  uniDropdownInline: {
    marginTop: 8,
    borderRadius: 13, borderWidth: 1, overflow: 'hidden',
  },
  uniOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.12)' },
  uniLogo: { width: 26, height: 26, borderRadius: 7 },
  uniLogoFallback: { backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' },
});