import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { LanguageType, translations } from '../../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა
import JobCard from '../JobCard';

interface Props { onBack: () => void; }
type SortOption = 'date_desc' | 'date_asc' | 'budget_asc' | 'budget_desc';

export default function UrgentJobsView({ onBack }: Props) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  
  // 🚀 დაზღვეულია any-ით ტიპიზაციის ერორების გამოსარიცხად
  const t: any = translations[language as LanguageType] || translations.ka;

  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const mockUrgentJobs = [
    { id: 'urg_1', title: 'სასწრაფოდ მესაჭიროება ავტო-ელექტრიკი / ჟეშტიანჩიკი 🚗', description: 'გზაზე გამიჩერდა მანქანა, დენი სრულად გაქრა. მესაჭიროება ხელოსანი ადგილზე მოსვლით რაც შეიძლება სწრაფად!', location: 'თბილისი, საბურთალო', budget: 150, deadline: 'უახლოეს 2 საათში', skills: 'ავტო ელექტრიკა, ხელოსანი', is_urgent: true, type: 'private' },
    { id: 'urg_2', title: 'გამისკდა წყლის შლანგი, მესაჭიროება სანტექნიკი! 🚰', description: 'ტუალეტში შლანგი გამისკდა და წყალი გადაკეტილი მაქვს, სასწრაფოდ მჭირდება ხელოსანი მილის შესაცვლელად.', location: 'თბილისი, გლდანი', budget: 80, deadline: 'სასწრაფოდ დღესვე', skills: 'სანტექნიკა, ხელოსანი', is_urgent: true, type: 'private' }
  ];

  useEffect(() => {
    const fetchUrgentJobs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('jobs').select('*').eq('is_urgent', true);
        if (error) throw error;
        setJobs(data && data.length > 0 ? data : mockUrgentJobs);
      } catch (err) {
        console.log('სასწრაფო განცხადებების ჩატვირთვის ხარვეზი:', err);
        setJobs(mockUrgentJobs);
      } finally {
        setLoading(false);
      }
    };
    fetchUrgentJobs();
  }, []);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    searchBg: isDarkMode ? '#222227' : '#e5e5ea',
    alertBg: isDarkMode ? '#2c1616' : '#fff5f5',
    alertText: '#ff453a'
  };

  const getNumericBudget = (budget: any) => {
    if (!budget) return 0;
    if (typeof budget === 'number') return budget;
    const match = String(budget).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const getJobTime = (job: any) => {
    if (job.created_at) return new Date(job.created_at).getTime();
    return parseInt(job.id.replace('urg_', ''), 10) || 0;
  };

  const getProcessedJobs = () => {
    let filtered = jobs.filter(j => j.is_urgent === true && j.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return filtered.sort((a, b) => {
      if (sortBy === 'date_desc') return getJobTime(b) - getJobTime(a);
      if (sortBy === 'date_asc') return getJobTime(a) - getJobTime(b);
      if (sortBy === 'budget_asc') return getNumericBudget(a.budget) - getNumericBudget(b.budget);
      if (sortBy === 'budget_desc') return getNumericBudget(b.budget) - getNumericBudget(b.budget);
      return 0;
    });
  };

  const processedJobs = getProcessedJobs();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#ff453a" />
          <Text style={[styles.backButtonText, { color: '#ff453a' }]}>{t.nav_home || 'მთავარი'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t.urgent_jobs_view_title || 'სასწრაფო განცხადებები ⚡'}</Text>
      </View>

      <View style={[styles.urgentAlertBox, { backgroundColor: theme.alertBg, borderColor: theme.alertText }]}>
        <Ionicons name="time-outline" size={18} color={theme.alertText} />
        <Text style={[styles.urgentAlertText, { color: theme.alertText }]}>
          {t.urgent_alert_box_text || 'ყურადღება: მოცემულ სექციაში განთავსებული საჩქარო განცხადებები 48 საათში ავტომატურად იშლება სისტემიდან!'}
        </Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.searchBg }]}>
        <Ionicons name="search-outline" size={18} color={theme.subText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t.urgent_search_placeholder || "სასწრაფო ძებნა..."}
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* სორტირების მენიუ სასწრაფოებისთვის */}
      <View style={styles.sortWrapper}>
        <TouchableOpacity style={[styles.sortTrigger, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setIsSortOpen(!isSortOpen)}>
          <View style={styles.sortTriggerLeft}>
            <Ionicons name="swap-vertical" size={16} color="#ff453a" />
            <Text style={[styles.sortTriggerText, { color: theme.text }]}>
              {t.sort_label || 'სორტირება:'} {
                sortBy === 'date_desc' ? (t.sort_newest || 'ახალი თავში') :
                sortBy === 'date_asc' ? (t.sort_oldest || 'უძველესი თავში') :
                sortBy === 'budget_asc' ? (t.sort_budget_asc_text || 'ბიუჯეტი: ზრდადობით') : (t.sort_budget_desc_text || 'ბიუჯეტი: კლებადობით')
              }
            </Text>
          </View>
          <Ionicons name={isSortOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.subText} />
        </TouchableOpacity>

        {isSortOpen && (
          <View style={[styles.sortDropdown, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortBy('date_desc'); setIsSortOpen(false); }}>
              <Ionicons name="time" size={16} color={sortBy === 'date_desc' ? '#ff453a' : theme.subText} />
              <Text style={[styles.sortOptionText, { color: theme.text }, sortBy === 'date_desc' && { color: '#ff453a', fontWeight: '700' }]}>{t.sort_date_desc_full || 'თარიღის კლებადობით (ახალი თავში)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortBy('date_asc'); setIsSortOpen(false); }}>
              <Ionicons name="time-outline" size={16} color={sortBy === 'date_asc' ? '#ff453a' : theme.subText} />
              <Text style={[styles.sortOptionText, { color: theme.text }, sortBy === 'date_asc' && { color: '#ff453a', fontWeight: '700' }]}>{t.sort_date_asc_full || 'თარიღის ზრდადობით (უძველესი თავში)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortBy('budget_asc'); setIsSortOpen(false); }}>
              <Ionicons name="trending-up" size={16} color={sortBy === 'budget_asc' ? '#ff453a' : theme.subText} />
              <Text style={[styles.sortOptionText, { color: theme.text }, sortBy === 'budget_asc' && { color: '#ff453a', fontWeight: '700' }]}>{t.sort_budget_asc_full || 'ბიუჯეტის ზრდადობით (დაბლიდან მაღლა)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortBy('budget_desc'); setIsSortOpen(false); }}>
              <Ionicons name="trending-down" size={16} color={sortBy === 'budget_desc' ? '#ff453a' : theme.subText} />
              <Text style={[styles.sortOptionText, { color: theme.text }, sortBy === 'budget_desc' && { color: '#ff453a', fontWeight: '700' }]}>{t.sort_budget_desc_full || 'ბიუჯეტის კლებადობით (მაღლიდან დაბლა)'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ff453a" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {processedJobs.length > 0 ? (
            processedJobs.map(job => <JobCard key={job.id} job={job} />)
          ) : (
            <Text style={[styles.emptyText, { color: theme.subText }]}>{t.no_urgent_jobs_found || 'სასწრაფო შეკვეთები ამ დროისთვის არ არის'}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: 16, paddingTop: 12, marginBottom: 14 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButtonText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  title: { fontSize: 20, fontWeight: '700' },
  urgentAlertBox: { flexDirection: 'row', padding: 12, borderRadius: 12, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, alignItems: 'center' },
  urgentAlertText: { flex: 1, fontSize: 12, fontWeight: '600', marginLeft: 8, lineHeight: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, marginHorizontal: 16, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  sortWrapper: { marginHorizontal: 16, marginBottom: 14, zIndex: 50 },
  sortTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1 },
  sortTriggerLeft: { flexDirection: 'row', alignItems: 'center' },
  sortTriggerText: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
  sortDropdown: { marginTop: 6, borderRadius: 12, borderWidth: 1, padding: 6, position: 'absolute', top: 40, left: 0, right: 0, elevation: 4, zIndex: 100 },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8 },
  sortOptionText: { fontSize: 13, fontWeight: '500', marginLeft: 10 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 110 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13, fontWeight: '500' }
});