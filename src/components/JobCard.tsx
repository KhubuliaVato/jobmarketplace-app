import { Feather, Ionicons } from '@expo/vector-icons'; // შემოვიტანეთ Feather იკონკები ისრებისთვის
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase'; // 🚀 შემოვიტანეთ Supabase ბაზასთან დასაკავშირებლად
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface JobCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    location: string;
    budget: any; 
    deadline: string;
    skills: string;
    image_url?: string;
    is_urgent?: boolean;
    created_at?: string;
    client_id?: string;
    user_id?: string;
    author_id?: string;
  };
}

export default function JobCard({ job }: JobCardProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  // დავამატეთ მიმდინარე იუზერისა და ვაკანსიის ავტორის იდენტიფიცირება
  const currentUserId = useAuthStore((state) => state.userId);
  const jobOwnerId = job.client_id || job.user_id || job.author_id;
  const isOwner = currentUserId === jobOwnerId;

  // რეპორტის მოდალის სთეითები
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // ახალი სთეითი მოთხოვნის გაგზავნის ლოდინგისთვის
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // სთეითი აღწერის გაშლა/აკეცვისთვის
  const [isExpanded, setIsExpanded] = useState(false);

  // დეფოლტ ფოტო
  const defaultImage = 'https://www.cws.com/sites/default/files/styles/cover_medium_1500_x_/public/2024-01/Buerojob%20CWS%20Fire%20Safety%20n.png.webp?itok=ZXL95j-s';
  const [imageSrc, setImageSrc] = useState(job.image_url ? { uri: job.image_url } : { uri: defaultImage });

  const theme = {
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    tagBg: isDarkMode ? '#222227' : '#f2f2f7',
    urgentBg: isDarkMode ? '#2c1616' : '#fff5f5',
    urgentBorder: '#ff453a',
    modalBackdrop: 'rgba(0, 0, 0, 0.65)',
    inputBg: isDarkMode ? '#1f1f24' : '#f2f2f7',
    budgetBg: isDarkMode ? '#1e1b4b' : '#eeebff' 
  };

  const formatBudget = () => {
    if (!job.budget || job.budget === 'შეთანხმებით') return t.budget_negotiable;
    const budgetStr = String(job.budget).trim();
    if (budgetStr.includes('₾')) {
      return budgetStr;
    }
    return `${budgetStr} ₾`;
  };

  const renderSkills = () => {
    if (!job.skills) return null;
    return job.skills.split(',').map((skill, index) => (
      <View key={index} style={[styles.skillBadge, { backgroundColor: theme.tagBg }]}>
        <Text style={[styles.skillText, { color: theme.text }]}>{skill.trim()}</Text>
      </View>
    ));
  };

  // რეალური მოთხოვნის გაგზავნის ფუნქცია Supabase ბაზაში
  const handleJobRequest = async () => {
    if (!currentUserId) {
      Alert.alert('ავტორიზაცია 🔒', 'მოთხოვნის გასაგზავნად გთხოვთ ჯერ გაიაროთ ავტორიზაცია პროფილის გვერდიდან.');
      return;
    }

    try {
      setIsSendingRequest(true);

      const { data: existing, error: checkError } = await supabase
        .from('job_requests')
        .select('id')
        .eq('job_id', job.id)
        .eq('applicant_id', currentUserId);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        Alert.alert('ინფორმაცია 📝', 'თქვენ უკვე გამოგზავნილი გაქვთ განაცხადი ამ ვაკანსიაზე.');
        return;
      }

      if (!jobOwnerId) {
        throw new Error('ვაკანსიის ავტორის იდენტიფიცირება ვერ მოხერხდა.');
      }

      const { error: insertError } = await supabase
        .from('job_requests')
        .insert([
          {
            job_id: job.id,
            applicant_id: currentUserId,
            client_id: jobOwnerId,
            status: 'pending'
          }
        ]);

      if (insertError) throw insertError;

    } catch (error: any) {
      Alert.alert('შეცდომა ❌', error.message || 'მოთხოვნის გაგზავნა ვერ მოხერხდა');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('ყურადღება', 'გთხოვთ მიუთითოთ რეპორტის მიზეზი');
      return;
    }
    try {
      setIsReporting(true);
      Keyboard.dismiss();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsReportModalVisible(false);
      setReportReason('');
      Alert.alert('გმადლობთ ხელშეწყობისთვის 🛡️', 'განცხადება გადაგზავნილია ადმინისტრაციასთან მოდერაციაზე.');
    } catch (error) {
      Alert.alert('შეცდომა', 'ოპერაცია ვერ შესრულდა');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <View style={[
      styles.card, 
      { backgroundColor: theme.cardBg, borderColor: theme.border },
      job.is_urgent && { backgroundColor: theme.urgentBg, borderColor: theme.urgentBorder }
    ]}>
      
      {/* 1. სურათის ბლოკი */}
      <View style={styles.imageContainer}>
        <Image 
          source={imageSrc} 
          style={styles.jobImage} 
          onError={() => setImageSrc({ uri: defaultImage })} 
        />
        {job.is_urgent && (
          <View style={styles.urgentBadge}>
            <Ionicons name="flash" size={12} color="#fff" />
            <Text style={styles.urgentBadgeText}>{t.urgent_badge}</Text>
          </View>
        )}
      </View>

      {/* 2. სათაური */}
      <Text style={[styles.title, { color: theme.text }]}>{job.title}</Text>

      {/* 3. საინფორმაციო ზოლი: ბიუჯეტი, ლოკაცია, დედლაინი */}
      <View style={styles.infoGrid}>
        <View style={[styles.budgetBadge, { backgroundColor: theme.budgetBg }]}>
          <Ionicons name="wallet" size={14} color="#5B42F5" />
          <Text style={styles.budgetText}>{formatBudget()}</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={14} color="#5B42F5" />
          <Text style={[styles.infoText, { color: theme.subText }]}>
            {job.location || t.tbilisi}
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={14} color="#ff9500" />
          <Text style={[styles.infoText, { color: theme.subText }]}>
            {t.deadline}: {job.deadline || t.deadline_none}
          </Text>
        </View>
      </View>

      {/* 4. აღწერა */}
      <Text 
        style={[styles.description, { color: theme.text }]} 
        numberOfLines={isExpanded ? undefined : 3}
      >
        {job.description}
      </Text>

      {/* 🚀 განახლებული გადამრთველი ღილაკი თარგმანით */}
      {job.description && job.description.length > 100 && (
        <TouchableOpacity 
          style={styles.expandToggle} 
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandToggleText}>
            {isExpanded ? t.expand_less : t.expand_more}{' '}
            <Feather 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={13} 
              color="#5B42F5" 
              style={styles.expandToggleIcon}
            />
          </Text>
        </TouchableOpacity>
      )}

      {/* 5. სქილები */}
      <View style={styles.skillsContainer}>
        {renderSkills()}
      </View>

      {/* 6. ღილაკები */}
      <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.reportButton, { borderColor: isDarkMode ? '#3a1c1c' : '#ffe5ea' }]} 
          onPress={() => setIsReportModalVisible(true)}
        >
          <Ionicons name="flag-outline" size={16} color="#ff453a" />
          <Text style={styles.reportButtonText}>{t.report}</Text>
        </TouchableOpacity>

        {!isOwner && (
          <TouchableOpacity 
            style={styles.requestButton} 
            onPress={handleJobRequest}
            disabled={isSendingRequest}
          >
            {isSendingRequest ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#fff" />
                <Text style={styles.requestButtonText}>{t.request}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* რეპორტის მოდალი */}
      <Modal animationType="fade" transparent={true} visible={isReportModalVisible} onRequestClose={() => setIsReportModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalBackdrop }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.warningIconCircle}>
                <Ionicons name="warning-outline" size={24} color="#ff453a" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t.report}</Text>
              <Text style={[styles.modalSubtitle, { color: theme.subText }]}>გთხოვთ დაგვიწეროთ, თუ რატომ არღვევს მოცემული ვაკანსია წესებს</Text>
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="ჩაწერეთ მიზეზი (მაგ: სპამი, ყალბი განცხადება...)"
              placeholderTextColor="#555"
              multiline={true}
              numberOfLines={4}
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton, { borderColor: theme.border }]} onPress={() => { setIsReportModalVisible(false); setReportReason(''); }} disabled={isReporting}>
                <Text style={[styles.modalCancelText, { color: theme.subText }]}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSubmitButton]} onPress={submitReport} disabled={isReporting}>
                {isReporting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>გაგზავნა</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, padding: 18, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  imageContainer: { width: '100%', height: 150, borderRadius: 16, overflow: 'hidden', marginBottom: 14, position: 'relative' },
  jobImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  orderBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#ff453a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  urgentBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#ff453a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  urgentBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4 },
  title: { fontSize: 18, fontWeight: '700', lineHeight: 25, marginBottom: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 14, gap: 12 },
  budgetBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  budgetText: { fontSize: 13, fontWeight: '700', color: '#5B42F5', marginLeft: 5 },
  infoItem: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 12, marginLeft: 5, fontWeight: '500' },
  description: { fontSize: 14, lineHeight: 22, marginBottom: 4 },
  expandToggle: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 12, marginBottom: 12 },
  expandToggleText: { color: '#5B42F5', fontSize: 12, fontWeight: '700', flexDirection: 'row', alignItems: 'center' },
  expandToggleIcon: { marginLeft: 3 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -2 },
  skillBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, margin: 3 },
  skillText: { fontSize: 11, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 14, marginTop: 2 },
  reportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 40 },
  reportButtonText: { color: '#ff453a', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  requestButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B42F5', borderRadius: 12, paddingHorizontal: 20, height: 40, flex: 1, marginLeft: 12 },
  requestButtonText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', padding: 24, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 18 },
  warningIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
  modalInput: { height: 90, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 14, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flex: 1 },
  modalCancelButton: { borderWidth: 1, marginRight: 10 },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSubmitButton: { backgroundColor: '#ff453a', marginLeft: 10 },
  modalSubmitText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});