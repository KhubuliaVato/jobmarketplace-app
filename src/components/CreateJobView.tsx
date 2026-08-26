import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { CATEGORIES, CITIES, DURATIONS } from '../utils/jobConstants';
import { LanguageType, translations } from '../utils/translations';
import ChipInput from './ChipInput';

interface CreateJobViewProps {
  onSuccess: () => void;
}

export default function CreateJobView({ onSuccess }: CreateJobViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  const [loading, setLoading] = useState(false);

  // ძირითადი
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // დეტალები
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // ანაზღაურება
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [isBudgetAgreed, setIsBudgetAgreed] = useState(false);

  // გამოქვეყნება
  const [isUrgent, setIsUrgent] = useState(false);
  const [duration, setDuration] = useState(3);
  const [deadline, setDeadline] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('my_limits').then(({ data }: any) => setLimits(data));
  }, [userId]);

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
    inputBg: isDarkMode ? '#222227' : '#f2f2f7',
    urgentBg: isDarkMode ? '#2c1616' : '#fff5f5',
    uploadDashed: isDarkMode ? '#444' : '#ccc',
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t.permission_denied || 'ნებართვა უარყოფილია ❌',
        t.gallery_permission_required || 'განცხადებაზე ფოტოს მისაბმელად საჭიროა გალერეის ნებართვა.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const uploadImageToStorage = async (uri: string): Promise<string | null> => {
    const blob: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () { resolve(xhr.response); };
      xhr.onerror = function () { reject(new TypeError('ლოკალური ფაილის წაკითხვა ჩავარდა')); };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });

    const fileExt = uri.split('.').pop() || 'jpg';
    const fileName = `${userId}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('job_images')
      .upload(fileName, blob, { contentType: `image/${fileExt}`, upsert: false });

    if (typeof blob.close === 'function') blob.close();
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('job_images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const finalLocation = isRemote ? 'დისტანციური' : (location === 'სხვა' ? customLocation.trim() : location);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert(t.attention || 'ყურადღება ⚠️', t.fill_required_fields || 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი');
      return;
    }
    if (!category) {
      Alert.alert(t.attention || 'ყურადღება ⚠️', 'აირჩიეთ კატეგორია');
      return;
    }
    if (!finalLocation) {
      Alert.alert(t.attention || 'ყურადღება ⚠️', 'მიუთითეთ ლოკაცია');
      return;
    }
    if (!isBudgetAgreed && (!minBudget.trim() || !maxBudget.trim())) {
      Alert.alert(t.attention || 'ყურადღება ⚠️', t.fill_budget_or_negotiable || 'გთხოვთ შეიყვანოთ ბიუჯეტი ან მონიშნეთ „ფასი შეთანხმებით“');
      return;
    }

    if (limits) {
      if (limits.active_jobs >= limits.max_jobs) {
        Alert.alert('🔒 ლიმიტი ამოიწურა', `გაქვთ ${limits.active_jobs} აქტიური განცხადება (ლიმიტი ${limits.max_jobs}). წაშალეთ ერთი ან გადადით პრემიუმზე.`);
        return;
      }
      if (isUrgent && limits.urgent_used >= limits.max_urgent) {
        Alert.alert('🔒 ლიმიტი ამოიწურა', 'სასწრაფო განცხადების ლიმიტი ამოიწურა. პრემიუმზე შეუზღუდავია.');
        return;
      }
      if (!isUrgent && duration > limits.max_duration) {
        Alert.alert('🔒 შეზღუდვა', '10 და 15 დღე ხელმისაწვდომია პრემიუმ გამოწერით');
        return;
      }
    }

    try {
      setLoading(true);

      let uploadedImageUrl: string | null = null;
      if (selectedImageUri) {
        uploadedImageUrl = await uploadImageToStorage(selectedImageUri);
      }

      const combinedBudget = isBudgetAgreed ? 'შეთანხმებით' : `${minBudget.trim()}₾ - ${maxBudget.trim()}₾`;
      const effectiveDurationDays = isUrgent ? 2 : duration;

      const jobPayload: any = {
        title: title.trim(),
        category,
        location: finalLocation,
        is_remote: isRemote,
        description: description.trim(),
        skills: skills.join(', '),
        budget: combinedBudget,
        min_budget: isBudgetAgreed ? null : (minBudget.trim() ? Number(minBudget.trim()) : null),
        max_budget: isBudgetAgreed ? null : (maxBudget.trim() ? Number(maxBudget.trim()) : null),
        image_url: uploadedImageUrl,
        author_id: userId,
        type: 'private',
        is_urgent: isUrgent,
        status: 'active',
        expires_at: new Date(Date.now() + effectiveDurationDays * 86400000).toISOString(),
        due_date: isUrgent ? '48 საათი' : (deadline.trim() || null),
        email: email.trim() || null,
        phone: phone.trim() || null,
      };

      const { error } = await supabase.from('jobs').insert([jobPayload]);
      if (error) throw error;

      setTitle(''); setCategory(''); setLocation(''); setCustomLocation(''); setIsRemote(false);
      setDescription(''); setSkills([]); setSelectedImageUri(null);
      setMinBudget(''); setMaxBudget(''); setIsBudgetAgreed(false);
      setIsUrgent(false); setDuration(3); setDeadline(''); setEmail(''); setPhone('');

      onSuccess();
    } catch (error: any) {
      Alert.alert(t.error || 'შეცდომა ❌', error.message || (t.upload_failed || 'განცხადება ვერ აიტვირთა'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>

        <Text style={[styles.mainTitle, { color: theme.text }]}>{t.new_ad_title || 'ახალი განცხადება ➕'}</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          აღწერეთ სამუშაო, რომ ხელოსანმა ზუსტად გაიგოს
        </Text>

        {limits && limits.tier === 'free' && (
          <View style={[styles.limitsBanner, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={theme.subText} />
            <Text style={{ color: theme.subText, fontSize: 12.5, flex: 1, marginLeft: 8 }}>
              აქტიური განცხადება: <Text style={{ color: theme.text, fontWeight: '700' }}>{limits.active_jobs}/{limits.max_jobs}</Text> · მაქს. ვადა: <Text style={{ color: theme.text, fontWeight: '700' }}>{limits.max_duration} დღე</Text>
            </Text>
          </View>
        )}

        {/* სათაური */}
        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.ad_title_label || 'განცხადების სათაური *'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="მაგ: სანტექნიკის შეკეთება"
          placeholderTextColor="#555"
          value={title}
          onChangeText={setTitle}
        />

        {/* კატეგორია — dropdown selector */}
        <Text style={[styles.inputLabel, { color: theme.subText }]}>კატეგორია *</Text>
        <TouchableOpacity
          style={[styles.selectorField, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
          onPress={() => setCategoryModalVisible(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.selectorText, { color: category ? theme.text : '#777' }]} numberOfLines={1}>
            {category || 'აირჩიეთ კატეგორია'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.subText} />
        </TouchableOpacity>

        {/* ლოკაცია — dropdown selector */}
        <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 16 }]}>ლოკაცია *</Text>
        <TouchableOpacity
          style={[styles.selectorField, { backgroundColor: theme.inputBg, borderColor: theme.border, opacity: isRemote ? 0.5 : 1 }]}
          onPress={() => !isRemote && setLocationModalVisible(true)}
          activeOpacity={0.75}
          disabled={isRemote}
        >
          <Text style={[styles.selectorText, { color: location ? theme.text : '#777' }]} numberOfLines={1}>
            {location || 'აირჩიეთ ქალაქი'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.subText} />
        </TouchableOpacity>
        {location === 'სხვა' && !isRemote && (
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginTop: 8 }]}
            placeholder="მიუთითეთ ლოკაცია"
            placeholderTextColor="#555"
            value={customLocation}
            onChangeText={setCustomLocation}
          />
        )}
        <TouchableOpacity style={styles.agreementContainer} onPress={() => setIsRemote(!isRemote)} activeOpacity={0.7}>
          <View style={[styles.checkbox, isRemote && styles.checkboxChecked, { borderColor: theme.border }]}>
            {isRemote && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={[styles.agreementText, { color: theme.text }]}>დისტანციური სამუშაო</Text>
        </TouchableOpacity>

        {/* ფოტო */}
        <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 16 }]}>{t.ad_photo_label || 'განცხადების ფოტო'}</Text>
        {selectedImageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImageUri(null)}>
              <Ionicons name="close-circle" size={26} color="#ff453a" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.uploadBox, { backgroundColor: theme.inputBg, borderColor: theme.uploadDashed }]} onPress={pickImage}>
            <Ionicons name="image-outline" size={28} color="#5B42F5" />
            <Text style={[styles.uploadBoxText, { color: theme.text }]}>{t.upload_photo_gallery || 'ატვირთეთ ფოტო გალერეიდან'}</Text>
            <Text style={styles.uploadBoxSubtext}>{t.recommended_format || 'რეკომენდირებულია 16:9 ფორმატი'}</Text>
          </TouchableOpacity>
        )}

        {/* აღწერა */}
        <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 16 }]}>{t.description_label || 'აღწერა *'}</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="დეტალურად აღწერეთ შესასრულებელი სამუშაო..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        {/* უნარები */}
        <Text style={[styles.inputLabel, { color: theme.subText }]}>უნარები</Text>
        <ChipInput
          value={skills}
          onChange={setSkills}
          placeholder="ჩაწერე უნარი და დააჭირე Enter"
          suggestions={[]}
          isDarkMode={isDarkMode}
          accent="#5B42F5"
        />

        {/* ბიუჯეტი */}
        <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 16 }]}>{t.budget_range_label || 'ბიუჯეტის დიაპაზონი (₾)'}</Text>
        <View style={styles.budgetMainContainer}>
          <View style={[styles.budgetRow, isBudgetAgreed && { opacity: 0.4 }]}>
            <TextInput
              style={[styles.input, styles.budgetInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="მინ" placeholderTextColor="#555" keyboardType="number-pad"
              value={minBudget} onChangeText={setMinBudget} editable={!isBudgetAgreed}
            />
            <Text style={[styles.budgetDivider, { color: theme.subText }]}>-</Text>
            <TextInput
              style={[styles.input, styles.budgetInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="მაქს" placeholderTextColor="#555" keyboardType="number-pad"
              value={maxBudget} onChangeText={setMaxBudget} editable={!isBudgetAgreed}
            />
          </View>
          <TouchableOpacity style={styles.agreementContainer} onPress={() => setIsBudgetAgreed(!isBudgetAgreed)} activeOpacity={0.7}>
            <View style={[styles.checkbox, isBudgetAgreed && styles.checkboxChecked, { borderColor: theme.border }]}>
              {isBudgetAgreed && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={[styles.agreementText, { color: theme.text }]}>{t.budget_negotiable || 'ფასი შეთანხმებით'}</Text>
          </TouchableOpacity>
        </View>

        {/* სასწრაფო */}
        <View style={[styles.switchContainer, { borderColor: isUrgent ? '#ff453a' : theme.border, backgroundColor: isUrgent ? theme.urgentBg : 'transparent' }]}>
          <View style={styles.switchTextContainer}>
            <Text style={[styles.switchTitle, { color: isUrgent ? '#ff453a' : theme.text }]}>{t.urgent_ad_switch || 'სასწრაფო განცხადება ⚡'}</Text>
            <Text style={[styles.switchSubtitle, { color: theme.subText }]}>
              {t.urgent_ad_sub || 'მონიშნეთ, თუ საქმე გადაუდებელია. განცხადება ჩაჯდება „სასწრაფოების“ სექციაში და წაიშლება 48 საათში.'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#ffb3b3' }}
            thumbColor={isUrgent ? '#ff453a' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setIsUrgent}
            value={isUrgent}
          />
        </View>

        {/* ხანგრძლივობა */}
        {!isUrgent && (
          <>
            <Text style={[styles.inputLabel, { color: theme.subText }]}>რამდენ ხანს იდოს</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d) => {
                const locked = limits ? d > limits.max_duration : false;
                const active = duration === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.durationChip,
                      { borderColor: theme.border, backgroundColor: theme.inputBg },
                      active && !locked && { backgroundColor: '#5B42F5', borderColor: '#5B42F5' },
                      locked && { opacity: 0.5 },
                    ]}
                    onPress={() => {
                      if (locked) {
                        Alert.alert('🔒 შეზღუდვა', '10 და 15 დღე ხელმისაწვდომია პრემიუმ გამოწერით');
                        return;
                      }
                      setDuration(d);
                    }}
                  >
                    {locked && <Ionicons name="lock-closed" size={11} color={theme.subText} style={{ marginRight: 4 }} />}
                    <Text style={{ color: active && !locked ? '#fff' : theme.subText, fontSize: 13, fontWeight: '700' }}>{d} დღე</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* დედლაინი */}
        {!isUrgent && (
          <>
            <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 16 }]}>{t.deadline_label || 'დედლაინი'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder={t.deadline_placeholder || "მაგ: 25 ივნისი ან უახლოეს კვირაში"}
              placeholderTextColor="#555"
              value={deadline}
              onChangeText={setDeadline}
            />
          </>
        )}

        <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 16 }]}>{t.contact_email || 'საკონტაქტო მეილი (არ არის აუცილებელი)'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="example@gmail.com" placeholderTextColor="#555"
          keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.contact_phone || 'საკონტაქტო მობილური (არ არის აუცილებელი)'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="5XXXXXXXX" placeholderTextColor="#555"
          keyboardType="phone-pad" value={phone} onChangeText={setPhone}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>{t.publish_ad_btn || 'განცხადების გამოქვეყნება'}</Text>
            </>
          )}
        </TouchableOpacity>

      </View>

      {/* კატეგორიის მოდალი */}
      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.pickerCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>კატეგორია</Text>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerRow, { borderColor: theme.border }]}
                  onPress={() => { setCategory(c); setCategoryModalVisible(false); }}
                >
                  <Text style={[styles.pickerRowText, { color: category === c ? '#5B42F5' : theme.text }]}>{c}</Text>
                  {category === c && <Ionicons name="checkmark" size={18} color="#5B42F5" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ლოკაციის მოდალი */}
      <Modal visible={locationModalVisible} transparent animationType="fade" onRequestClose={() => setLocationModalVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setLocationModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.pickerCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>ლოკაცია</Text>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerRow, { borderColor: theme.border }]}
                  onPress={() => { setLocation(c); setLocationModalVisible(false); }}
                >
                  <Text style={[styles.pickerRowText, { color: location === c ? '#5B42F5' : theme.text }]}>{c}</Text>
                  {location === c && <Ionicons name="checkmark" size={18} color="#5B42F5" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1 },
  mainTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, marginBottom: 24, textAlign: 'center' },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4, letterSpacing: 0.5 },
  input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  textArea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  budgetMainContainer: { marginBottom: 16 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budgetInput: { flex: 1, marginBottom: 0 },
  budgetDivider: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 12 },
  agreementContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4, paddingLeft: 4 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#5B42F5', borderColor: '#5B42F5' },
  agreementText: { fontSize: 13, fontWeight: '600' },
  uploadBox: { width: '100%', height: 110, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', padding: 10 },
  uploadBoxText: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  uploadBoxSubtext: { fontSize: 11, color: '#8e8e93', marginTop: 2 },
  imagePreviewContainer: { width: '100%', height: 160, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, padding: 12, borderRadius: 12, marginTop: 16, marginBottom: 16 },
  switchTextContainer: { flex: 1, marginRight: 10 },
  switchTitle: { fontSize: 14, fontWeight: '600' },
  switchSubtitle: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  submitButton: { backgroundColor: '#5B42F5', height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  limitsBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 18 },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  durationChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },

  // dropdown-selector
  selectorField: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorText: { fontSize: 14, flex: 1 },

  // picker მოდალი
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  pickerCard: { width: '100%', maxHeight: '70%', borderRadius: 20, borderWidth: 1, padding: 16 },
  pickerTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginLeft: 4 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerRowText: { fontSize: 14, fontWeight: '600' },
});