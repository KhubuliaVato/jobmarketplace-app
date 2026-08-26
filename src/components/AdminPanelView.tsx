import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { ADMIN_BADGES, getBadge } from '../utils/badges';
import AdminModerationTab from './AdminModerationTab';
import Toast, { ToastType } from './Toast';

interface AdminPanelViewProps {
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
  onOpenJob?: (jobId: string) => void;
}

const LINK_OPTIONS = [
  { key: 'none', label: 'არაფერი' },
  { key: 'category', label: 'კატეგორია' },
  { key: 'url', label: 'ლინკი' },
];

const CATEGORY_OPTIONS = [
  { key: 'company', label: 'კომპანიები' },
  { key: 'private', label: 'კერძო' },
  { key: 'urgent', label: 'სასწრაფო' },
  { key: 'following', label: 'გამომწერები' },
  { key: 'swipe', label: 'სქროლი' },
];

export default function AdminPanelView({ onBack, onOpenProfile, onOpenJob }: AdminPanelViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const userId = useAuthStore((state) => state.userId);

const [tab, setTab] = useState<'requests' | 'banner' | 'badges' | 'moderation'>('requests');
  // ბეიჯები
  const [companies, setCompanies] = useState<any[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [pickedCompany, setPickedCompany] = useState<any>(null);
  const [companyBadges, setCompanyBadges] = useState<string[]>([]);
  const [badgeBusy, setBadgeBusy] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; title: string; message?: string }>({
    visible: false, type: 'success', title: '',
  });

  const showToast = (type: ToastType, title: string, message?: string) => {
    setToast({ visible: true, type, title, message });
  };

  // Confirm მოდალი
  const [confirm, setConfirm] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    danger: boolean;
    onConfirm: () => void;
  } | null>(null);

  const askConfirm = (
    title: string,
    message: string,
    confirmText: string,
    danger: boolean,
    onConfirm: () => void
  ) => {
    setConfirm({ visible: true, title, message, confirmText, danger, onConfirm });
  };

  // მოთხოვნები
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  // ბანერი
  const [banner, setBanner] = useState<any>(null);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [linkType, setLinkType] = useState('none');
  const [linkValue, setLinkValue] = useState('');

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
    green: '#34c759',
    red: '#ff3b30',
    accent: '#5B42F5',
  };

  useEffect(() => {
    fetchRequests();
    fetchBanner();
    fetchCompanies();
  }, []);

  // ---------- ბეიჯები ----------
  const fetchCompanies = async () => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('id, company_name, email')
        .order('company_name', { ascending: true });
      setCompanies(data || []);
    } catch {
      setCompanies([]);
    }
  };

  const pickCompany = async (comp: any) => {
    setPickedCompany(comp);
    try {
      const { data } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', comp.id);
      setCompanyBadges((data || []).map((b: any) => b.badge_id));
    } catch {
      setCompanyBadges([]);
    }
  };

  const toggleCompanyBadge = async (badgeId: string) => {
    if (!pickedCompany || badgeBusy) return;
    const has = companyBadges.includes(badgeId);

    try {
      setBadgeBusy(badgeId);
      const fn = has ? 'admin_revoke_badge' : 'admin_grant_badge';
      const { error } = await supabase.rpc(fn, {
        p_user: pickedCompany.id,
        p_badge: badgeId,
      });
      if (error) throw error;

      setCompanyBadges(prev =>
        has ? prev.filter(b => b !== badgeId) : [...prev, badgeId]
      );

      const bName = getBadge(badgeId)?.name || badgeId;
      showToast(
        has ? 'info' : 'success',
        has ? 'ბეიჯი მოხსნილია' : 'ბეიჯი მინიჭებულია',
        `${bName} — ${pickedCompany.company_name}`
      );
    } catch (err: any) {
      showToast('error', 'ვერ მოხერხდა', err.message);
    } finally {
      setBadgeBusy(null);
    }
  };

  // ---------- მოთხოვნები ----------
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      showToast('error', 'ჩატვირთვა ვერ მოხერხდა', err.message);
    } finally {
      setLoading(false);
    }
  };

  const doApprove = async (req: any) => {
    try {
      setActingId(req.id);
      const { data, error } = await supabase.functions.invoke('approve-company', {
        body: { requestId: req.id }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRequests(prev => prev.filter(r => r.id !== req.id));
      showToast('success', 'ანგარიში შეიქმნა', `პაროლი გაიგზავნა: ${req.email}`);
    } catch (err: any) {
      showToast('error', 'დადასტურება ვერ მოხერხდა', err.message);
    } finally {
      setActingId(null);
    }
  };

  const doReject = async (req: any) => {
    try {
      setActingId(req.id);
      const { error } = await supabase
        .from('company_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: userId })
        .eq('id', req.id);
      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== req.id));
      showToast('info', 'მოთხოვნა უარყოფილია', req.company_name);
    } catch (err: any) {
      showToast('error', 'ვერ მოხერხდა', err.message);
    } finally {
      setActingId(null);
    }
  };

  // ---------- ბანერი ----------
  const fetchBanner = async () => {
    try {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setBanner(data);
        setImageUrl(data.image_url);
        setTitle(data.title || '');
        setSubtitle(data.subtitle || '');
        setLinkType(data.link_type || 'none');
        setLinkValue(data.link_value || '');
      }
    } catch {
      setBanner(null);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setImageUrl(asset.uri);
      setUploading(true);

      const base64 = asset.base64;
      if (!base64) throw new Error('სურათის წაკითხვა ვერ მოხერხდა');

      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `banner_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, decode(base64), {
          contentType: asset.mimeType || `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(fileName);
      setImageUrl(urlData.publicUrl);

      showToast('success', 'სურათი აიტვირთა', 'ახლა შეინახე ბანერი');
    } catch (err: any) {
      showToast('error', 'ატვირთვა ვერ მოხერხდა', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!imageUrl) {
      showToast('error', 'სურათი აკლია', 'ჯერ ატვირთე სურათი');
      return;
    }
    if (linkType === 'url' && !linkValue.trim().startsWith('http')) {
      showToast('error', 'არასწორი ლინკი', 'უნდა იწყებოდეს http:// ან https://');
      return;
    }
    if (linkType === 'category' && !linkValue) {
      showToast('error', 'კატეგორია აკლია', 'აირჩიე კატეგორია');
      return;
    }

    try {
      setBannerLoading(true);

      const payload = {
        image_url: imageUrl,
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        link_type: linkType,
        link_value: linkType === 'none' ? null : linkValue.trim(),
        is_active: true,
        updated_by: userId,
      };

      if (banner) {
        const { error } = await supabase.from('banners').update(payload).eq('id', banner.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('banners').insert([payload]).select().single();
        if (error) throw error;
        setBanner(data);
      }

      showToast('success', 'ბანერი შენახულია', 'ცვლილება ჩანს მთავარ ეკრანზე');
      fetchBanner();
    } catch (err: any) {
      showToast('error', 'შენახვა ვერ მოხერხდა', err.message);
    } finally {
      setBannerLoading(false);
    }
  };

  const doToggleActive = async () => {
    if (!banner) return;
    try {
      const newState = !banner.is_active;
      const { error } = await supabase.from('banners').update({ is_active: newState }).eq('id', banner.id);
      if (error) throw error;

      setBanner({ ...banner, is_active: newState });
      showToast(
        newState ? 'success' : 'info',
        newState ? 'ბანერი ჩართულია' : 'ბანერი გამორთულია',
        newState ? 'ჩანს მთავარ ეკრანზე' : 'დამალულია მომხმარებლებისგან'
      );
    } catch (err: any) {
      showToast('error', 'ვერ მოხერხდა', err.message);
    }
  };

  const doDeleteBanner = async () => {
    if (!banner) return;
    try {
      const { error } = await supabase.from('banners').delete().eq('id', banner.id);
      if (error) throw error;

      setBanner(null);
      setImageUrl(null);
      setTitle('');
      setSubtitle('');
      setLinkType('none');
      setLinkValue('');

      showToast('info', 'ბანერი წაშლილია', '');
    } catch (err: any) {
      showToast('error', 'წაშლა ვერ მოხერხდა', err.message);
    }
  };

  // ---------- რენდერი ----------
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* Confirm მოდალი */}
      <Modal visible={!!confirm?.visible} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[
              styles.modalIcon,
              { backgroundColor: (confirm?.danger ? theme.red : theme.green) + '1a' }
            ]}>
              <Ionicons
                name={confirm?.danger ? 'alert-circle' : 'checkmark-circle'}
                size={30}
                color={confirm?.danger ? theme.red : theme.green}
              />
            </View>

            <Text style={[styles.modalTitle, { color: theme.text }]}>{confirm?.title}</Text>
            <Text style={[styles.modalMessage, { color: theme.subText }]}>{confirm?.message}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.inputBg }]}
                onPress={() => setConfirm(null)}
              >
                <Text style={[styles.modalBtnText, { color: theme.subText }]}>გაუქმება</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: confirm?.danger ? theme.red : theme.green }]}
                onPress={() => {
                  const fn = confirm?.onConfirm;
                  setConfirm(null);
                  fn?.();
                }}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{confirm?.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ჰედერი */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>უკან</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>ადმინ პანელი</Text>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'requests' && { backgroundColor: theme.accent }]}
            onPress={() => setTab('requests')}
          >
            <Text style={[styles.tabText, { color: tab === 'requests' ? '#fff' : theme.subText }]}>
              მოთხოვნები {requests.length > 0 ? `(${requests.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'banner' && { backgroundColor: theme.accent }]}
            onPress={() => setTab('banner')}
          >
            <Text style={[styles.tabText, { color: tab === 'banner' ? '#fff' : theme.subText }]}>ბანერი</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'badges' && { backgroundColor: theme.accent }]}
            onPress={() => setTab('badges')}
          >
            <Text style={[styles.tabText, { color: tab === 'badges' ? '#fff' : theme.subText }]}>ბეიჯები</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'moderation' && { backgroundColor: theme.accent }]}
            onPress={() => setTab('moderation')}
          >
            <Text style={[styles.tabText, { color: tab === 'moderation' ? '#fff' : theme.subText }]}>მოდერაცია</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- მოთხოვნები ---------- */}
      {tab === 'requests' && (
        loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={theme.subText} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>ახალი მოთხოვნები არ არის</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {requests.map((req) => (
              <View key={req.id} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={[styles.companyName, { color: theme.text }]}>{req.company_name}</Text>

                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={15} color={theme.subText} />
                  <Text style={[styles.infoText, { color: theme.subText }]}>{req.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={15} color={theme.subText} />
                  <Text style={[styles.infoText, { color: theme.subText }]}>{req.hr_phone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={15} color={theme.subText} />
                  <Text style={[styles.infoText, { color: theme.subText }]}>{req.address}</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.red + '18' }]}
                    onPress={() => askConfirm(
                      'უარყოფა',
                      `უარყო "${req.company_name}"-ის მოთხოვნა?`,
                      'უარყოფა',
                      true,
                      () => doReject(req)
                    )}
                    disabled={actingId === req.id}
                  >
                    <Text style={[styles.actionText, { color: theme.red }]}>უარყოფა</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.green + '18' }]}
                    onPress={() => askConfirm(
                      'დადასტურება',
                      `ანგარიში შეიქმნება და პაროლი გაიგზავნება მეილზე: ${req.email}`,
                      'დადასტურება',
                      false,
                      () => doApprove(req)
                    )}
                    disabled={actingId === req.id}
                  >
                    {actingId === req.id
                      ? <ActivityIndicator size="small" color={theme.green} />
                      : <Text style={[styles.actionText, { color: theme.green }]}>დადასტურება ✓</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )
      )}

      {/* ---------- ბანერი ---------- */}
      {tab === 'banner' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>

            <Text style={[styles.label, { color: theme.subText }]}>სურათი (16:9 რეკომენდებული)</Text>
            <TouchableOpacity
              style={[styles.imagePicker, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              onPress={handlePickImage}
              disabled={uploading}
            >
              {imageUrl ? (
                <>
                  <Image source={{ uri: imageUrl }} style={styles.preview} resizeMode="cover" />
                  {uploading && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator color="#fff" size="large" />
                      <Text style={styles.uploadText}>იტვირთება...</Text>
                    </View>
                  )}
                </>
              ) : uploading ? (
                <ActivityIndicator color={theme.accent} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color={theme.subText} />
                  <Text style={[styles.pickerText, { color: theme.subText }]}>აირჩიე სურათი</Text>
                </>
              )}
            </TouchableOpacity>

            {imageUrl && !uploading && (
              <TouchableOpacity onPress={handlePickImage} style={{ marginBottom: 4, marginTop: 10 }}>
                <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                  სურათის შეცვლა
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { color: theme.subText }]}>სათაური (არასავალდებულო)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="მაგ: გილოცავთ დამოუკიდებლობის დღეს!"
              placeholderTextColor="#555"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: theme.subText }]}>ქვესათაური (არასავალდებულო)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="მოკლე აღწერა..."
              placeholderTextColor="#555"
              value={subtitle}
              onChangeText={setSubtitle}
            />

            <Text style={[styles.label, { color: theme.subText }]}>დაჭერისას</Text>
            <View style={styles.chipRow}>
              {LINK_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.inputBg, borderColor: theme.border },
                    linkType === opt.key && { backgroundColor: theme.accent, borderColor: theme.accent }
                  ]}
                  onPress={() => { setLinkType(opt.key); setLinkValue(''); }}
                >
                  <Text style={[styles.chipText, { color: linkType === opt.key ? '#fff' : theme.subText }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {linkType === 'category' && (
              <>
                <Text style={[styles.label, { color: theme.subText }]}>რომელი კატეგორია?</Text>
                <View style={styles.chipRow}>
                  {CATEGORY_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.chip,
                        { backgroundColor: theme.inputBg, borderColor: theme.border },
                        linkValue === opt.key && { backgroundColor: theme.accent, borderColor: theme.accent }
                      ]}
                      onPress={() => setLinkValue(opt.key)}
                    >
                      <Text style={[styles.chipText, { color: linkValue === opt.key ? '#fff' : theme.subText }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {linkType === 'url' && (
              <>
                <Text style={[styles.label, { color: theme.subText }]}>ლინკი</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="https://freejob.ge/news"
                  placeholderTextColor="#555"
                  value={linkValue}
                  onChangeText={setLinkValue}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.accent }]}
              onPress={handleSaveBanner}
              disabled={bannerLoading || uploading}
            >
              {bannerLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>შენახვა</Text>}
            </TouchableOpacity>

            {banner && (
              <View style={styles.bottomRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: banner.is_active ? theme.green + '18' : theme.subText + '18' }]}
                  onPress={doToggleActive}
                >
                  <Ionicons
                    name={banner.is_active ? 'eye' : 'eye-off'}
                    size={16}
                    color={banner.is_active ? theme.green : theme.subText}
                  />
                  <Text style={[styles.smallBtnText, { color: banner.is_active ? theme.green : theme.subText }]}>
                    {banner.is_active ? 'ჩართულია' : 'გამორთულია'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: theme.red + '18' }]}
                  onPress={() => askConfirm('ბანერის წაშლა', 'ბანერი სამუდამოდ წაიშლება', 'წაშლა', true, doDeleteBanner)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.red} />
                  <Text style={[styles.smallBtnText, { color: theme.red }]}>წაშლა</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ---------- ბეიჯები ---------- */}
      {tab === 'badges' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {!pickedCompany ? (
            <>
              <Text style={[styles.label, { color: theme.subText, marginTop: 0 }]}>აირჩიე კომპანია</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
                placeholder="ძებნა სახელით..."
                placeholderTextColor="#555"
                value={companySearch}
                onChangeText={setCompanySearch}
              />

              {companies
                .filter(c =>
                  !companySearch.trim() ||
                  (c.company_name || '').toLowerCase().includes(companySearch.toLowerCase())
                )
                .map(comp => (
                  <TouchableOpacity
                    key={comp.id}
                    style={[styles.companyRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    onPress={() => pickCompany(comp)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.companyIcon, { backgroundColor: theme.accent + '1a' }]}>
                      <Ionicons name="business" size={18} color={theme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.companyRowName, { color: theme.text }]} numberOfLines={1}>
                        {comp.company_name}
                      </Text>
                      <Text style={[styles.companyRowMail, { color: theme.subText }]} numberOfLines={1}>
                        {comp.email}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.subText} />
                  </TouchableOpacity>
                ))}

              {companies.length === 0 && (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: theme.subText }]}>კომპანიები არ არის</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* არჩეული კომპანია */}
              <TouchableOpacity
                style={[styles.pickedBar, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
                onPress={() => { setPickedCompany(null); setCompanyBadges([]); }}
              >
                <Ionicons name="arrow-back" size={18} color={theme.accent} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.companyRowName, { color: theme.text }]} numberOfLines={1}>
                    {pickedCompany.company_name}
                  </Text>
                  <Text style={[styles.companyRowMail, { color: theme.subText }]} numberOfLines={1}>
                    {pickedCompany.email}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.subText }]}>ბეიჯების მინიჭება</Text>

              {ADMIN_BADGES.map(b => {
                const has = companyBadges.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.badgeRow,
                      { backgroundColor: theme.cardBg, borderColor: has ? theme.green : theme.border }
                    ]}
                    onPress={() => toggleCompanyBadge(b.id)}
                    disabled={badgeBusy === b.id}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={b.image}
                      style={[styles.badgeRowImg, !has && { opacity: 0.4 }]}
                      resizeMode="contain"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.badgeRowName, { color: theme.text }]}>{b.name}</Text>
                      <Text style={[styles.badgeRowDesc, { color: theme.subText }]} numberOfLines={1}>
                        {b.description}
                      </Text>
                    </View>

                    {badgeBusy === b.id ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <View style={[
                        styles.badgeToggle,
                        { backgroundColor: has ? theme.green : theme.inputBg }
                      ]}>
                        <Ionicons
                          name={has ? 'checkmark' : 'add'}
                          size={16}
                          color={has ? '#fff' : theme.subText}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {tab === 'moderation' && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <AdminModerationTab showToast={showToast} onOpenProfile={onOpenProfile} onOpenJob={onOpenJob} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14, borderBottomWidth: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backText: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 14 },

  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
  scrollContent: { padding: 16, paddingBottom: 60 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  companyName: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 13, fontWeight: '500', flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 14, fontWeight: '700' },

  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { height: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },

  imagePicker: { width: '100%', height: 160, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  uploadText: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 10 },
  pickerText: { fontSize: 13, fontWeight: '500', marginTop: 8 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },

  saveBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  bottomRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10 },
  smallBtnText: { fontSize: 13, fontWeight: '700' },

  // ბეიჯები
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  companyIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  companyRowName: { fontSize: 14, fontWeight: '700' },
  companyRowMail: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  pickedBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  badgeRowImg: { width: 44, height: 44 },
  badgeRowName: { fontSize: 14, fontWeight: '700' },
  badgeRowDesc: { fontSize: 11.5, fontWeight: '500', marginTop: 2 },
  badgeToggle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  // Confirm მოდალი
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalCard: { width: '100%', borderRadius: 22, borderWidth: 1, padding: 24, alignItems: 'center' },
  modalIcon: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 13.5, lineHeight: 19, textAlign: 'center', marginBottom: 22 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtn: { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});