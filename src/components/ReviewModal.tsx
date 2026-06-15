import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface ReviewModalProps {
  visible: boolean;
  jobId: string;
  chatId: string;
  revieweeId: string; // ვისაც ვაფასებთ (მეორე იუზერის ID)
  jobTitle: string;   // ვაკანსიის სათაური კონტექსტისთვის
  onSuccess: () => void;
}

export default function ReviewModal({ visible, jobId, chatId, revieweeId, jobTitle, onSuccess }: ReviewModalProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const userId = useAuthStore((state) => state.userId);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0); // 1-5 ვარსკვლავი
  const [loading, setLoading] = useState(false);

  const theme = {
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#1f1f24' : '#f2f2f7',
    modalBackdrop: 'rgba(0, 0, 0, 0.85)', // უფრო მუქი ბექდროპი, რადგან სავალდებულოა
  };

  // 🚀 ანდროიდის ფიზიკური Back ღილაკის დაბლოკვა, სანამ მოდალი ღიაა
  useEffect(() => {
    if (visible) {
      const backAction = () => {
        Alert.alert(t.attention_with_emoji || 'ყურადღება ⚠️', t.back_button_blocked || 'სანამ შეფასებას არ შეავსებთ, აპლიკაციაში დაბრუნებას ვერ შეძლებთ.');
        return true; // აბრუნებს true-ს, რაც ნიშნავს რომ ღილაკის ქმედება დაბლოკილია
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [visible]);

  const handleSubmitReview = async () => {
    if (!title.trim()) {
      Alert.alert(t.attention_title || 'ყურადღება', t.review_title_required || 'გთხოვთ მიუთითოთ შეფასების სათაური');
      return;
    }
    if (!description.trim()) {
      Alert.alert(t.attention_title || 'ყურადღება', t.review_desc_required || 'გთხოვთ ჩაწეროთ მოკლე აღწერა');
      return;
    }
    if (rating === 0) {
      Alert.alert(t.attention_title || 'ყურადღება', t.review_rating_required || 'გთხოვთ აირჩიოთ რეიტინგი 1-დან 5 ვარსკვლავამდე');
      return;
    }

    try {
      setLoading(true);
      Keyboard.dismiss();

      // შეფასების უსაფრთხო ჩაწერა Supabase-ის ცხრილში: reviews
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert([
          {
            job_id: jobId,
            chat_id: chatId,
            reviewer_id: userId,
            reviewee_id: revieweeId,
            title: title.trim(),
            description: description.trim(),
            rating: rating,
            created_at: new Date().toISOString()
          }
        ]);

      if (reviewError) throw reviewError;

      // 🚀 რეიტინგის ავტომატური გადათვლა მომხმარებლის პროფილისთვის
      const { data: allReviews, error: calcError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId);

      if (!calcError && allReviews && allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / allReviews.length;

        // ვაახლებთ მომხმარებლის საშუალო რეიტინგს users ცხრილში
        await supabase
          .from('users')
          .update({ rating: avgRating })
          .eq('id', revieweeId);
      }

      // სთეითების გასუფთავება ხელახალი გამოყენებისთვის
      setTitle('');
      setDescription('');
      setRating(0);
      
      onSuccess(); // გადავცემთ მშობელ კომპონენტს, რომ დახუროს მოდალი
    } catch (error: any) {
      Alert.alert(t.error || 'შეცდომა ❌', error.message || (t.review_save_error || 'შეფასების შენახვა ვერ მოხერხდა'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        Alert.alert(t.attention_with_emoji || 'ყურადღება ⚠️', t.review_process_finish_req || 'გთხოვთ დაასრულოთ შეფასების პროცესი.');
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalBackdrop }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            
            {/* ჰედერი */}
            <View style={styles.modalHeader}>
              <View style={styles.starCircle}>
                <Ionicons name="star" size={28} color="#FFD700" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t.job_done_title || 'საქმე დასრულდა! 🎉'}</Text>
              <Text style={[styles.modalSubtitle, { color: theme.subText }]}>
                {t.rate_partner_sub || 'გთხოვთ შეაფასოთ პარტნიორი ვაკანსიისთვის:'}{"\n"}
                <Text style={styles.jobHighlight}>"{jobTitle}"</Text>
              </Text>
            </View>

            {/* ვარსკვლავების რეიტინგი */}
            <View style={styles.starsWrapper}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.6}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* სათაურის ინპუტი */}
            <Text style={[styles.inputLabel, { color: theme.text }]}>{t.title_label || 'სათაური'}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, height: 46 }]}
              placeholder={t.review_title_ph || "მაგ: საუკეთესო შესრულება, პროფესიონალი..."}
              placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
              value={title}
              onChangeText={setTitle}
            />

            {/* აღწერის ინპუტი */}
            <Text style={[styles.inputLabel, { color: theme.text }]}>{t.desc_label || 'აღწერა'}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder={t.review_desc_ph || "დაწერეთ თქვენი შთაბეჭდილება დეტალურად..."}
              placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
              multiline={true}
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />

            {/* გაგზავნის ღილაკი */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmitReview}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={16} color="#fff" />
                  <Text style={styles.submitButtonText}>{t.send_review_btn || 'შეფასების გაგზავნა'}</Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  starCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  jobHighlight: {
    fontWeight: '700',
    color: '#5B42F5',
  },
  starsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  starButton: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 4,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B42F5',
    borderRadius: 14,
    height: 48,
    marginTop: 6,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#a395f9',
    opacity: 0.8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});