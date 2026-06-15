import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface Props {
  onBack: () => void;
  onAcceptSuccess: () => void;
}

export default function IncomingRequestsView({ onBack, onAcceptSuccess }: Props) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const userId = useAuthStore((state) => state.userId);
  
  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  const [loading, setLoading] = useState(true);
  const [groupedRequests, setGroupedRequests] = useState<any[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    rowBg: isDarkMode ? '#1f1f24' : '#f9f9f9',
  };

  useEffect(() => {
    fetchIncomingRequests();
  }, [userId]);

  const fetchIncomingRequests = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // მოგვაქვს მხოლოდ რეალური سვეტები ბაზიდან
      const { data: requests, error: reqError } = await supabase
        .from('job_requests')
        .select(`
          id,
          job_id,
          applicant_id,
          status,
          created_at,
          jobs (
            title
          )
        `)
        .eq('client_id', userId)
        .eq('status', 'pending');

      if (reqError) throw reqError;

      if (!requests || requests.length === 0) {
        setGroupedRequests([]);
        return;
      }

      // 2. ვაგროვებთ უნიკალურ აპლიკანტების ID-ებს
      const applicantIds = [...new Set(requests.map(r => r.applicant_id))];

      // 3. აპლიკანტების მონაცემებს ვიღებთ პირდაპირ users ცხრილიდან
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, avatar_url, rating')
        .in('id', applicantIds);

      if (usersError) throw usersError;

      // 4. ვაჯგუფებთ მონაცემებს ვაკანსიების მიხედვით კოდის დონეზე
      const groupsMap: { [key: string]: any } = {};

      requests.forEach((req: any) => {
        const jobId = req.job_id;
        const jobTitle = req.jobs?.title || (t.active_ad_fallback || 'აქტიური განცხადება');
        
        const userDetails = usersData?.find(u => u.id === req.applicant_id);

        const enrichedRequest = {
          ...req,
          applicant_name: userDetails?.name || (t.default_user_fallback || 'მომხმარებელი'),
          avatar_url: userDetails?.avatar_url || null,
          rating: userDetails?.rating || 5.0
        };

        if (!groupsMap[jobId]) {
          groupsMap[jobId] = {
            jobId,
            jobTitle,
            requests: []
          };
        }
        groupsMap[jobId].requests.push(enrichedRequest);
      });

      setGroupedRequests(Object.values(groupsMap));
    } catch (err: any) {
      console.error('Error fetching requests:', err.message);
      Alert.alert(t.error_alert_title || 'შეცდომა', t.load_data_failed || 'მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  // მოთხოვნის დადასტურება და ჩათის შექმნა
  const handleAcceptRequest = async (request: any, jobTitle: string) => {
    try {
      const { error: updateError } = await supabase
        .from('job_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      const { error: chatError } = await supabase
        .from('chats')
        .insert([
          {
            id: request.id,
            job_id: request.job_id,
            client_id: userId,
            freelancer_id: request.applicant_id, 
            job_state: 'pending',                
            client_started: false
          }
        ]);

      if (chatError) throw chatError;

      fetchIncomingRequests();
      onAcceptSuccess();
    } catch (err: any) {
      console.error('Chat creation error:', err.message);
      Alert.alert(t.error_alert_title || 'შეცდომა', t.accept_request_failed || 'მოთხოვნის დადასტურება ვერ მოხერხდა');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      fetchIncomingRequests();
    } catch (err: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა', t.operation_failed || 'ოპერაცია ვერ შესრულდა');
    }
  };

  const toggleExpand = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#5B42F5" />
          <Text style={styles.backButtonText}>{t.back_txt || 'უკან'}</Text>
        </TouchableOpacity>
        <Text style={[styles.listTitle, { color: theme.text }]}>{t.incoming_requests || 'შემოსული მოთხოვნები'}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5B42F5" style={styles.listLoader} />
      ) : groupedRequests.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
          <Ionicons name="mail-open-outline" size={48} color={theme.subText} style={{ marginBottom: 12 }} />
          <Text style={{ color: theme.subText, textAlign: 'center', fontSize: 14, fontWeight: '500' }}>
            {t.no_requests_found || 'თქვენს განცხადებებზე ახალი მოთხოვნები არ მოიძებნა'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listScrollContent} showsVerticalScrollIndicator={false}>
          {groupedRequests.map((group) => {
            const isExpanded = expandedJobId === group.jobId;
            return (
              <View key={group.jobId} style={[styles.jobGroupCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <TouchableOpacity style={styles.jobHeader} onPress={() => toggleExpand(group.jobId)}>
                  <Text style={[styles.jobTitleText, { color: theme.text }]} numberOfLines={1}>
                    {group.jobTitle}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{group.requests.length}</Text>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.requestsList, { borderColor: theme.border }]}>
                    {group.requests.map((req: any) => (
                      <View key={req.id} style={[styles.applicantRow, { backgroundColor: theme.rowBg }]}>
                        
                        <View style={styles.applicantInfo}>
                          {req.avatar_url ? (
                            <Image source={{ uri: req.avatar_url }} style={styles.avatarImage} />
                          ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: '#5B42F5' }]}>
                              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{req.applicant_name?.charAt(0)}</Text>
                            </View>
                          )}
                          <View style={styles.textMeta}>
                            <Text style={[styles.applicantName, { color: theme.text }]} numberOfLines={1}>
                              {req.applicant_name}
                            </Text>
                            <View style={styles.ratingRow}>
                              <Ionicons name="star" size={12} color="#FFD700" />
                              <Text style={[styles.ratingText, { color: theme.subText }]}>
                                {Number(req.rating).toFixed(1)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity 
                            style={[styles.actionIconCircle, { backgroundColor: '#ff3b30' }]} 
                            onPress={() => handleRejectRequest(req.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close" size={16} color="#fff" />
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.actionIconCircle, { backgroundColor: '#34c759' }]} 
                            onPress={() => handleAcceptRequest(req, group.jobTitle)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>

                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 40, paddingBottom: 16, borderBottomWidth: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  listTitle: { fontSize: 20, fontWeight: '700' },
  listLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listScrollContent: { padding: 16, paddingBottom: 110 },
  jobGroupCard: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  jobTitleText: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: '#5B42F5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  requestsList: { borderTopWidth: 1, padding: 12, gap: 8 },
  applicantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 12 },
  applicantInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarPlaceholder: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  textMeta: { marginLeft: 10, flex: 1 },
  applicantName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingText: { fontSize: 11, marginLeft: 4, fontWeight: '600' },
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  actionIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }
});