import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';
import { LanguageType, translations } from '../utils/translations';

interface FAQViewProps {
  onBack: () => void;
}

export default function FAQView({ onBack }: FAQViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const language = useAuthStore((state: any) => state.language) || 'ka';

  // 🚀 დაზღვეულია any-ით მკაცრი ტიპიზაციის ერორების გამოსარიცხად
  const t: any = translations[language as LanguageType] || translations.ka;

  // აკორდეონისთვის გახსნილი კითხვის ინდექსის სთეითი
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
    accent: '#5B42F5'
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const faqList = t.faq_data || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* ჰედერი */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={theme.accent} />
          <Text style={[styles.backButtonText, { color: theme.accent }]}>{t.faq_back || 'უკან'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t.faq_title || 'ხშირად დასმული კითხვები 🤔'}</Text>
      </View>

      {/* კითხვების სია */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {faqList.map((item: any, index: number) => {
          const isExpanded = expandedIndex === index;
          return (
            <View 
              key={index} 
              style={[styles.faqCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            >
              <TouchableOpacity 
                style={styles.questionRow} 
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.questionText, { color: theme.text }]}>{item.q}</Text>
                <Ionicons 
                  name={isExpanded ? "chevron-up-circle" : "chevron-down-circle"} 
                  size={20} 
                  color={isExpanded ? theme.accent : theme.subText} 
                />
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={[styles.answerContainer, { borderTopColor: theme.border }]}>
                  <Text style={[styles.answerText, { color: isDarkMode ? '#d1d1d6' : '#3a3a3c' }]}>
                    {item.a}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: 16, paddingTop: 12, marginBottom: 14 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButtonText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  title: { fontSize: 20, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 110, paddingTop: 4 },
  faqCard: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden', elevation: 1 },
  questionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, gap: 10 },
  questionText: { fontSize: 14, fontWeight: '700', flex: 1, lineHeight: 20 },
  answerContainer: { padding: 16, borderTopWidth: 1, backgroundColor: 'rgba(91, 66, 245, 0.02)' },
  answerText: { fontSize: 13, lineHeight: 20, fontWeight: '500' }
});