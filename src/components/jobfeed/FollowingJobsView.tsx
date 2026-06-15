import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { LanguageType, translations } from '../../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა
import JobCard from '../JobCard';

interface Props { onBack: () => void; }
type SortOption = 'date_desc' | 'date_asc' | 'budget_asc' | 'budget_desc';

export default function FollowingJobsView({ onBack }: Props) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  
  // 🚀 დაზღვეულია any-ით ტიპიზაციის ერორების გამოსარიცხად
  const t: any = translations[language as LanguageType] || translations.ka;

  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // სორტირების ახალი სთეითები
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    const fetchFollowingJobs = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const { data: followedData } = await supabase.from('follows').select('followed_id').eq('follower_id', userId);
        const followedIds = followedData?.map(f => f.followed_id) || [];

        if (followedIds.length > 0) {
          const { data, error } = await supabase.from('jobs').select('*').in('author_id', followedIds);
          if (error) throw error;
          setJobs(data || []);
        } else {
          setJobs([]);
        }
      } catch (err) {
        console.log('გამოწერილების ფიდის შეცდომა:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowingJobs();
  }, [userId]);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    searchBg: isDarkMode ? '#222227' : '#e5e5ea',
  };

  // ბიუჯეტიდან ციფრის ამოღების ჭკვიანი ფუნქცია
  const getNumericBudget = (budget: any) => {
    if (!budget) return 0;
    if (typeof budget === 'number') return budget;
    const match = String(budget).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // დროის გარდაქმნა სორტირებისთვის
  const getJobTime = (job: any) => {
    if (job.created_at) return new Date(job.created_at).getTime();
    return parseInt(job.id, 10) || 0;
  };

  // ფილტრაციისა და სორტირების გაერთიანებული ლოგიკა
  const getProcessedJobs = () => {
    let filtered = jobs.filter(j => j.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return filtered.sort((a, b) => {
      if (sortBy === 'date_desc') return getJobTime(b) - getJobTime(a);
      if (sortBy === 'date_asc') return getJobTime(a) - getJobTime(b);
      if (sortBy === 'budget_asc') return getNumericBudget(a.budget) - getNumericBudget(b.budget);
      if (sortBy === 'budget_desc') return getNumericBudget(b.budget) - getNumericBudget(a.budget);
      return 0;
    });
  };

  const processedJobs = getProcessedJobs();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#5B42F5" />
          <Text style={styles.backButtonText}>{t.nav_home || 'მთავარი'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t.following_jobs_title || 'გამოწერილების ფიდი 👥'}</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.searchBg }]}>
        <Ionicons name="search-outline" size={18} color={theme.subText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t.search_following_job_placeholder || "მოძებნე გამოწერილებში..."}
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ================= სორტირების ინტერაქტიული პანელი ================= */}
      <View style={styles.sortWrapper}>
        <TouchableOpacity 
          style={[styles.sortTrigger, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
          onPress={() => setIsSortOpen(!isSortOpen)}
        >
          <View style={styles.sortTriggerLeft}>
            <Ionicons name="swap-vertical" size={16} color="#5B42F5" />
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
              <Ionicons name="time" size={16} color={sortBy === 'date_desc' ? '#5B42F5' : theme.subText} />
              <Text style={[styles.sortOptionText, { color: theme.text }, sortBy === 'date_desc' && styles.activeSortText]}>{t.sort_date_desc_full || 'თარიღის კლებადობით (ახალი თავში)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortBy('date_asc'); setIsSortOpen(false); }}>
              <Ionicons name="time-outline" size={16} color={sortBy === 'date_asc' ? '#5B42F5' : theme.subText} />
              <Text style={[styles.sortOptionText, { color: theme.text }, sortBy === 'date_asc' && styles.activeSortText]}>{t.sort_date_asc_full || 'თარიღის ზრდადობით (უძველესი თავში)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortBy('budget_asc'); setIsSortOpen(false); }}>
              <Ionicons name="trending-up" size={16} color={sortBy === 'budget_asc' ? '#5B42F5' : theme.subText} />
              <Text style={[styles.sortOptionText, { color: theme.text }, sortBy === 'budget_asc' && styles.activeSortText]}>{t.sort_budget_asc_full || 'ბიუჯეტის ზრდადობით (დაბლიდან მაღლა)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortBy('budget_desc'); setIsSortOpen(false); }}>
              <Ionicons name="trending-down" size={16} color={sortBy === 'budget_desc' ? '#5B42F5' : theme.subText} />
              <Text style={[styles.sortOptionText, { color: theme.text }, sortBy === 'budget_desc' && styles.activeSortText]}>{t.sort_budget_desc_full || 'ბიუჯეტის კლებადობით (მაღლიდან დაბლა)'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5B42F5" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {processedJobs.length > 0 ? (
            processedJobs.map(job => <JobCard key={job.id} job={job} />)
          ) : (
            <Text style={[styles.emptyText, { color: theme.subText }]}>{t.no_following_jobs_found || 'გამოწერილების განცხადებები არ მოიძებნა'}</Text>
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
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  title: { fontSize: 20, fontWeight: '700' },
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
  activeSortText: { color: '#5B42F5', fontWeight: '700' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 110 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13, fontWeight: '500' }
});