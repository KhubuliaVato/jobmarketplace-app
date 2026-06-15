import { Ionicons } from '@expo/vector-icons';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface HomeFeedViewProps {
  onSelectCategory: (category: 'company' | 'private' | 'urgent' | 'following') => void;
  onOpenScroll: () => void; // ფუნქცია მომავალი სქროლის გვერდისთვის
}

export default function HomeFeedView({ onSelectCategory, onOpenScroll }: HomeFeedViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  const theme = {
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* 🚀 თარგმნილი სათაური */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.discover_categories}</Text>
      
      <View style={styles.gridContainer}>
        {/* კომპანიები */}
        <TouchableOpacity 
          style={[styles.box, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
          onPress={() => onSelectCategory('company')}
        >
          <View style={styles.imagePlaceholder}>
            <Ionicons name="business" size={28} color="#5B42F5" />
          </View>
          <Text style={[styles.boxTitle, { color: theme.text }]}>{t.companies}</Text>
        </TouchableOpacity>

        {/* კერძო შეკვეთები */}
        <TouchableOpacity 
          style={[styles.box, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          onPress={() => onSelectCategory('private')}
        >
          <View style={styles.imagePlaceholder}>
            <Ionicons name="clipboard" size={28} color="#5B42F5" />
          </View>
          <Text style={[styles.boxTitle, { color: theme.text }]}>{t.private_orders}</Text>
        </TouchableOpacity>

        {/* სქროლი */}
        <TouchableOpacity 
          style={[styles.box, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          onPress={onOpenScroll}
        >
          <View style={styles.imagePlaceholder}>
            <Ionicons name="play-circle" size={28} color="#5B42F5" />
          </View>
          <Text style={[styles.boxTitle, { color: theme.text }]}>სქროლი</Text>
        </TouchableOpacity>

        {/* გამომწერები */}
        <TouchableOpacity 
          style={[styles.box, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          onPress={() => onSelectCategory('following')}
        >
          <View style={styles.imagePlaceholder}>
            <Ionicons name="people" size={28} color="#5B42F5" />
          </View>
          <Text style={[styles.boxTitle, { color: theme.text }]}>{t.following}</Text>
        </TouchableOpacity>

        {/* სასწრაფო განცხადებები */}
        <TouchableOpacity 
          style={[styles.box, styles.urgentFullBox, { backgroundColor: isDarkMode ? '#1c1616' : '#fff5f5', borderColor: '#ff453a' }]}
          onPress={() => onSelectCategory('urgent')}
        >
          <View style={styles.urgentContentRow}>
            <View style={styles.urgentIconCircle}>
              <Ionicons name="flash" size={26} color="#fff" />
            </View>
            <View style={styles.urgentTextContainer}>
              <Text style={[styles.urgentTitle, { color: theme.text }]}>{t.urgent_orders || (t as any).orders_urgent}</Text>
              <Text style={[styles.urgentSubtitle, { color: theme.subText }]}>{t.urgent_sub}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingTop: 24, paddingBottom: 110, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  box: { width: '48%', borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, alignItems: 'center' },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  boxTitle: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  urgentFullBox: { width: '100%', alignItems: 'flex-start', paddingVertical: 16, borderWidth: 1 },
  urgentContentRow: { flexDirection: 'row', alignItems: 'center' },
  urgentIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff453a', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  urgentTextContainer: { flex: 1 },
  urgentTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  urgentSubtitle: { fontSize: 11, lineHeight: 15 },
});