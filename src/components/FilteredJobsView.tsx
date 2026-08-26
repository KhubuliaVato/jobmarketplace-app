import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import JobCard from './JobCard';

interface FilteredJobsViewProps {
  category: 'company' | 'private' | 'urgent' | 'following';
  onBack: () => void;
}

export default function FilteredJobsView({ category, onBack }: FilteredJobsViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  
  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // სატესტო მონაცემები რეალური ვიზუალის მომენტალურად სანახავად
  const mockJobs = [
    { id: '1', title: 'ვეძებ ვიდეო მონტაჟორს იუთუბისთვის', description: 'გვესაჭიროება გამოცდილი მემონტაჟე გრძელვადიანი თანამშრომლობისთვის. კვირაში 2 ვიდეო, ეფექტებითა და ხმის დიზაინით.', location: 'თბილისი', budget: 350, deadline: '20.06.2026', skills: 'Premiere Pro, After Effects', is_urgent: false, type: 'private', author_id: 'user_123' },
    { id: '2', title: 'სასწრაფოდ ხელოსანი / სანტექნიკი', description: 'სველი წერტილიდან წყალი გადმოდის, მილებია გამოსაცვლელი სასწრაფოდ უახლოეს საათებში!', location: 'ბათუმი', budget: 120, deadline: 'დღესვე', skills: 'სანტექნიკა, ხელოსანი', is_urgent: true, type: 'private', author_id: 'user_456' },
    { id: '3', title: 'React Native დეველოპერი მობილურისთვის', description: 'სტარტაპ კომპანია ეძებს ფრონტენდ დეველოპერს IPove აპლიკაციის ახალი მოდულების ასაწყობად.', location: 'თბილისი', budget: 2500, deadline: '01.07.2026', skills: 'React Native, Supabase, TypeScript', is_urgent: false, type: 'company', author_id: '99999999-9999-9999-9999-999999999999' }
  ];

  // 🚀 კატეგორიების კონფიგურატორი დინამიური სამენოვანი სათაურებით
  const config = {
    company: { title: t.company_vacancies || 'კომპანიების ვაკანსიები', icon: 'business', color: '#5B42F5' },
    private: { title: t.private_orders || 'კერძო შეკვეთები', icon: 'clipboard', color: '#5B42F5' },
    urgent: { title: t.urgent_orders || 'სასწრაფო განცხადებები ⚡', icon: 'flash', color: '#ff453a' },
    following: { title: t.following_feed || 'გამოწერილების ფიდი', icon: 'people', color: '#5B42F5' },
  }[category];

  const loadCategoryJobs = async () => {
    try {
      setLoading(true);
      let query = supabase.from('jobs').select('*').or('status.is.null,status.eq.active');

      // 1. ფილტრაცია კატეგორიის მიხედვით
      if (category === 'company') query = query.eq('type', 'company');
      if (category === 'private') query = query.eq('type', 'private');
      if (category === 'urgent') query = query.eq('is_urgent', true);
      
      // 2. ჭკვიანი ფილტრაცია გამომწერებისთვის
      if (category === 'following') {
        if (!userId) {
          setJobs([]); // სტუმარს არ ჰყავს გამოწერილები
          setLoading(false);
          return;
        }
        // ჯერ ვიღებთ იმ იუზერების ID-ებს, ვინც გამოწერილი გვყავს follows ცხრილიდან
        const { data: followedData } = await supabase
          .from('follows')
          .select('followed_id')
          .eq('follower_id', userId);

        const followedIds = followedData?.map(f => f.followed_id) || [];
        
        if (followedIds.length > 0) {
          query = query.in('author_id', followedIds);
        } else {
          setJobs([]); // თუ არავინ გვყავს გამოწერილი
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // თუ ბაზა ცარიელია, ვიყენებთ ლოკალურ სატესტო მონაცემებს
      if (data && data.length > 0) {
        const { data: blk } = await supabase.rpc('my_blocked_ids');
        const bset = new Set((blk || []).map((b: any) => b));
        setJobs((data || []).filter((j: any) => !bset.has(j.author_id)));
      } else {
        // სატესტო ფილტრაცია იდენტური ლოგიკით
        const filteredMock = mockJobs.filter(j => {
          if (category === 'company') return j.type === 'company';
          if (category === 'private') return j.type === 'private';
          if (category === 'urgent') return j.is_urgent === true;
          if (category === 'following') return j.author_id === '99999999-9999-9999-9999-999999999999'; // დაამთხვიოს სატესტო გამოწერილ კომპანიას
          return true;
        });
        setJobs(filteredMock);
      }
    } catch (err) {
      console.log('შეცდომა, ჩაირთო მოკ მონაცემები:', err);
      setJobs(mockJobs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryJobs();
  }, [category]);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    searchBg: isDarkMode ? '#222227' : '#e5e5ea',
  };

  // ლოკალური ძებნა მიმდინარე გვერდზე
  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* ზედა პანელი და სათაური */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#5B42F5" />
          <Text style={styles.backButtonText}>{t.nav_home || 'მთავარი'}</Text>
        </TouchableOpacity>
        
        <View style={styles.titleBlock}>
          <View style={[styles.iconCircle, { backgroundColor: config.color + '15' }]}>
            <Ionicons name={config.icon as any} size={20} color={config.color} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{config.title}</Text>
        </View>
      </View>

      {/* ლოკალური სერჩის ველი */}
      <View style={[styles.searchContainer, { backgroundColor: theme.searchBg }]}>
        <Ionicons name="search-outline" size={18} color={theme.subText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t.search_in_category || "მოძებნე ამ კატეგორიაში..."}
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* განცხადებების სია */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#5B42F5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.subText }]}>{t.no_ads_in_category || 'განცხადებები ამ კატეგორიაში ვერ მოიძებნა'}</Text>
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
  titleBlock: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, marginHorizontal: 16, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 110 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13, fontWeight: '500' }
});