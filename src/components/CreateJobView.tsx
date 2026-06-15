import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { LanguageType, translations } from '../utils/translations'; // 🚀 ენის იმპორტი

interface CreateJobViewProps {
  onSuccess: () => void;
}

export default function CreateJobView({ onSuccess }: CreateJobViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  const [userType, setUserType] = useState<'user' | 'company' | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  // საერთო ველების სთეითები
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  
  // ახალი სთეითი შეთანხმებითი ბიუჯეტისთვის
  const [isBudgetAgreed, setIsBudgetAgreed] = useState(false);

  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // მომხმარებლის (კერძო) სპეციფიკური ველები
  const [deadline, setDeadline] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // კომპანიის სპეციფიკური ველები
  const [sphere, setSphere] = useState(''); 
  const [requirements, setRequirements] = useState(''); 
  const [experience, setExperience] = useState(''); 
  const [hasInternship, setHasInternship] = useState(false); 

  useEffect(() => {
    const determineUserType = async () => {
      if (!userId) {
        setCheckingAuth(false);
        return;
      }
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (userData) {
          setUserType('user');
        } else {
          setUserType('company');
        }
      } catch (err) {
        console.log('ექაუნთის ტიპის შემოწმების ხარვეზი:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    determineUserType();
  }, [userId]);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#222227' : '#f2f2f7',
    urgentBg: isDarkMode ? '#2c1616' : '#fff5f5',
    uploadDashed: isDarkMode ? '#444' : '#ccc'
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

    let result = await ImagePicker.launchImageLibraryAsync({
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
    try {
      const blob: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function () {
          reject(new TypeError('ლოკალური ფაილის წაკითხვა ჩავარდა'));
        };
        xhr.responseType = 'blob'; 
        xhr.open('GET', uri, true);
        xhr.send(null);
      });

      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${userId}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('job_images')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (typeof blob.close === 'function') {
        blob.close();
      }

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('job_images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.log('ფოტოს სთორიჯში ატვირთვა ჩავარდა:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !location.trim()) {
      Alert.alert(t.attention || 'ყურადღება ⚠️', t.fill_required_fields || 'გთხოვთ შეავსოთ ყველა აუცილებელი ძირითადი ველი');
      return;
    }

    if (!isBudgetAgreed && (!minBudget.trim() || !maxBudget.trim())) {
      Alert.alert(t.attention || 'ყურადღება ⚠️', t.fill_budget_or_negotiable || 'გთხოვთ შეიყვანოთ ბიუჯეტი ან მონიშნეთ „ფასი შეთანხმებით“');
      return;
    }

    if (userType === 'company' && !sphere.trim()) {
      Alert.alert(t.attention || 'ყურადღება ⚠️', t.fill_sphere || 'გთხოვთ მიუთითოთ, თუ რაზეა ვაკანსია');
      return;
    }

    try {
      setLoading(true);

      let uploadedImageUrl: string | null = null;
      if (selectedImageUri) {
        uploadedImageUrl = await uploadImageToStorage(selectedImageUri);
      }

      const combinedBudget = isBudgetAgreed ? 'შეთანხმებით' : `${minBudget.trim()}₾ - ${maxBudget.trim()}₾`;

      const jobPayload: any = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        budget: combinedBudget,
        image_url: uploadedImageUrl, 
        author_id: userId,
        type: userType === 'company' ? 'company' : 'private',
        is_urgent: isUrgent, 
      };

      if (userType === 'user') {
        jobPayload.deadline = isUrgent ? '48 საათი' : (deadline.trim() || null);
        jobPayload.email = email.trim() || null;
        jobPayload.phone = phone.trim() || null;
      } 
      else if (userType === 'company') {
        jobPayload.skills = sphere.trim(); 
        jobPayload.requirements = requirements.trim() || null;
        jobPayload.experience = experience.trim() || null;
        jobPayload.has_internship = hasInternship;
      }

      const { error } = await supabase.from('jobs').insert([jobPayload]);
      if (error) throw error;

      setTitle(''); setDescription(''); setLocation(''); setSelectedImageUri(null);
      setMinBudget(''); setMaxBudget(''); setDeadline(''); setEmail('');
      setPhone(''); setSphere(''); setRequirements(''); setExperience('');
      setHasInternship(false); setIsUrgent(false); setIsBudgetAgreed(false);

      onSuccess(); 
    } catch (error: any) {
      Alert.alert(t.error || 'შეცდომა ❌', error.message || (t.upload_failed || 'განცხადება ვერ აიტვირთა'));
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#5B42F5" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        
        <Text style={[styles.mainTitle, { color: theme.text }]}>{t.new_ad_title || 'ახალი განცხადება ➕'}</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          {t.publishing_as || 'თქვენ აქვეყნებთ განცხადებას როგორც: '} <Text style={styles.accentText}>{userType === 'company' ? (t.company_txt || 'კომპანია') : (t.private_person || 'კერძო პირი')}</Text>
        </Text>

        {/* განცხადების სათაური */}
        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.ad_title_label || 'განცხადების სათაური *'}</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
          placeholder={t.ad_title_placeholder || "მაგ: ვეძებ ვიდეო მონტაჟორს პროექტისთვის"} 
          placeholderTextColor="#555"
          value={title}
          onChangeText={setTitle}
        />

        {/* ფოტო ატვირთვის ზონა */}
        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.ad_photo_label || 'განცხადების ფოტო'}</Text>
        {selectedImageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImageUri(null)}>
              <Ionicons name="close-circle" size={26} color="#ff453a" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.uploadBox, { backgroundColor: theme.inputBg, borderColor: theme.uploadDashed }]} 
            onPress={pickImage}
          >
            <Ionicons name="image-outline" size={28} color="#5B42F5" />
            <Text style={[styles.uploadBoxText, { color: theme.text }]}>{t.upload_photo_gallery || 'ატვირთეთ ფოტო გალერეიდან'}</Text>
            <Text style={styles.uploadBoxSubtext}>{t.recommended_format || 'რეკომენდირებულია 16:9 ფორმატი'}</Text>
          </TouchableOpacity>
        )}

        {/* აღწერა */}
        <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 16 }]}>{t.description_label || 'აღწერა *'}</Text>
        <TextInput 
          style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
          placeholder={t.description_placeholder || "დეტალურად აღწერეთ შესასრულებელი სამუშაო..."} 
          placeholderTextColor="#555"
          multiline={true}
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        {/* ადგილმდებარეობა */}
        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.location_label || 'ადგილმდებარეობა *'}</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
          placeholder={t.location_placeholder || "მაგ: თბილისი, საბურთალო ან დისტანციური"} 
          placeholderTextColor="#555"
          value={location}
          onChangeText={setLocation}
        />

        {/* ბიუჯეტის დიაპაზონი */}
        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.budget_range_label || 'ბიუჯეტის დიაპაზონი (₾) *'}</Text>
        <View style={styles.budgetMainContainer}>
          <View style={[styles.budgetRow, isBudgetAgreed && { opacity: 0.4 }]}>
            <TextInput 
              style={[styles.input, styles.budgetInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder={t.min_placeholder || "მინ"} 
              placeholderTextColor="#555"
              keyboardType="number-pad"
              value={minBudget}
              onChangeText={setMinBudget}
              editable={!isBudgetAgreed}
            />
            <Text style={[styles.budgetDivider, { color: theme.subText }]}>-</Text>
            <TextInput 
              style={[styles.input, styles.budgetInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder={t.max_placeholder || "მაქს"} 
              placeholderTextColor="#555"
              keyboardType="number-pad"
              value={maxBudget}
              onChangeText={setMaxBudget}
              editable={!isBudgetAgreed}
            />
          </View>

          {/* შეთანხმებითი ჩეკბოქსი */}
          <TouchableOpacity 
            style={styles.agreementContainer} 
            onPress={() => setIsBudgetAgreed(!isBudgetAgreed)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isBudgetAgreed && styles.checkboxChecked, { borderColor: theme.border }]}>
              {isBudgetAgreed && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={[styles.agreementText, { color: theme.text }]}>{t.budget_negotiable || 'ფასი შეთანხმებით'}</Text>
          </TouchableOpacity>
        </View>

        {/* სასწრაფო განცხადების გადამრთველი */}
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

        {/* ---------------- ექსკლუზიური ველები იუზერისთვის ---------------- */}
        {userType === 'user' && (
          <>
            {!isUrgent && (
              <>
                <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.deadline_label || 'დედლაინი'}</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
                  placeholder={t.deadline_placeholder || "მაგ: 25 ივნისი ან უახლოეს კვირაში"} 
                  placeholderTextColor="#555"
                  value={deadline}
                  onChangeText={setDeadline}
                />
              </>
            )}

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.contact_email || 'საკონტაქტო მეილი (არ არის აუცილებელი)'}</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder="example@gmail.com" 
              placeholderTextColor="#555"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.contact_phone || 'საკონტაქტო მობილური (არ არის აუცილებელი)'}</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder="5XXXXXXXX" 
              placeholderTextColor="#555"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </>
        )}

        {/* ---------------- ექსკლუზიური ველები კომპანიისთვის ---------------- */}
        {userType === 'company' && (
          <>
            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.sphere_label || 'რაზეა ვაკანსია (სფერო/საჭირო სქილები) *'}</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder={t.sphere_placeholder || "მაგ: React Native, Video Editing"} 
              placeholderTextColor="#555"
              value={sphere}
              onChangeText={setSphere}
            />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.company_reqs || 'კომპანიის მოთხოვნები'}</Text>
            <TextInput 
              style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder={t.company_reqs_placeholder || "ჩამოწერეთ ძირითადი მოთხოვნები კანდიდატის მიმართ..."} 
              placeholderTextColor="#555"
              multiline={true}
              numberOfLines={3}
              value={requirements}
              onChangeText={setRequirements}
            />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.experience_label || 'რა გამოცდილება უნდა ჰქონდეს'}</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder={t.experience_placeholder || "მაგ: მინიმუმ 2 წელი ამ სფეროში"} 
              placeholderTextColor="#555"
              value={experience}
              onChangeText={setExperience}
            />

            {/* სტაჟირების სვიჩი */}
            <View style={[styles.switchContainer, { borderColor: theme.border }]}>
              <View style={styles.switchTextContainer}>
                <Text style={[styles.switchTitle, { color: theme.text }]}>{t.internship_required || 'აუცილებელი სტაჟირება'}</Text>
                <Text style={[styles.switchSubtitle, { color: theme.subText }]}>{t.internship_sub || 'ითვალისწინებს თუ არა ვაკანსია საწყის სტაჟირებას'}</Text>
              </View>
              <Switch
                trackColor={{ false: '#767577', true: '#c5befb' }}
                thumbColor={hasInternship ? '#5B42F5' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setHasInternship}
                value={hasInternship}
              />
            </View>
          </>
        )}

        {/* გამოქვეყნების ღილაკი */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1 },
  mainTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, marginBottom: 24, textAlign: 'center' },
  accentText: { color: '#5B42F5', fontWeight: '700' },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4, letterSpacing: 0.5 },
  input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  textArea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  budgetMainContainer: { marginBottom: 16 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budgetInput: { flex: 1, marginBottom: 0 },
  budgetDivider: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 12 },
  agreementContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingLeft: 4 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#5B42F5', borderColor: '#5B42F5' },
  agreementText: { fontSize: 13, fontWeight: '600' },
  uploadBox: { width: '100%', height: 110, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', padding: 10 },
  uploadBoxText: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  uploadBoxSubtext: { fontSize: 11, color: '#8e8e93', marginTop: 2 },
  imagePreviewContainer: { width: '100%', height: 160, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 20 },
  switchTextContainer: { flex: 1, marginRight: 10 },
  switchTitle: { fontSize: 14, fontWeight: '600' },
  switchSubtitle: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  submitButton: { backgroundColor: '#5B42F5', height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' }
});