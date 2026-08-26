import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  avatarUrl?: string;
  subtitle?: string;
}

const SCREEN_H = Dimensions.get('window').height;

const SOCIALS = [
  { name: 'WhatsApp', color: '#25D366', icon: 'whatsapp', href: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(t + ' ' + u)}` },
  { name: 'Telegram', color: '#0088cc', icon: 'telegram-plane', href: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { name: 'Facebook', color: '#1877F2', icon: 'facebook-f', href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { name: 'Twitter', color: '#000000', icon: 'twitter', href: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { name: 'LinkedIn', color: '#0A66C2', icon: 'linkedin-in', href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
] as const;

export default function ShareSheet({ visible, onClose, url, title, avatarUrl, subtitle }: ShareSheetProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
  };

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const qrCardRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setCopied(false);
      slideAnim.setValue(SCREEN_H);
      requestAnimationFrame(() => {
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }).start();
      });
    } else if (mounted) {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start(() => {
        setMounted(false);
      });
    }
  }, [visible]);

  if (!mounted) return null;

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start(() => {
      setMounted(false);
      onClose();
    });
  };

  const copy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openSocial = (href: string) => {
    Linking.openURL(href).catch(() => {});
  };

  const downloadQrCard = async () => {
    if (!qrCardRef.current?.capture) return;
    setDownloading(true);
    try {
      const uri = await qrCardRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'QR კოდის გაზიარება' });
      }
    } catch {
      // ვერ მოხერხდა — მშვიდად ვტოვებთ
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: theme.bg, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>გაზიარება</Text>
          <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: theme.cardBg }]}>
            <Ionicons name="close" size={20} color={theme.subText} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* QR — Telegram-სტილის ბარათი (თავში) */}
          <ViewShot ref={qrCardRef} options={{ format: 'png', quality: 1 }}>
            <LinearGradient
              colors={['#5B42F5', '#8B5CF6', '#12B3AA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.qrGradientCard}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.qrAvatar} />
              ) : (
                <View style={styles.qrAvatarFallback}>
                  <Ionicons name="person" size={26} color="#fff" />
                </View>
              )}

              <View style={styles.qrWhiteCard}>
                <QRCode
                  value={url}
                  size={190}
                  color="#1c1c1e"
                  backgroundColor="#ffffff"
                />
              </View>

              {!!title && <Text style={styles.qrCardTitle} numberOfLines={1}>{title}</Text>}
              {!!subtitle && <Text style={styles.qrCardSub} numberOfLines={1}>{subtitle}</Text>}
            </LinearGradient>
          </ViewShot>

          <Text style={[styles.qrHint, { color: theme.subText }]}>დაასკანერე ტელეფონით</Text>

          {/* გადმოწერის ღილაკი */}
          <TouchableOpacity
            style={[styles.downloadBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={downloadQrCard}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#5B42F5" />
            ) : (
              <>
                <Ionicons name="download-outline" size={17} color="#5B42F5" />
                <Text style={styles.downloadBtnText}>QR-ის გადმოწერა</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ლინკის კოპირება */}
          <View style={[styles.linkRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.linkText, { color: theme.subText }]} numberOfLines={1}>{url}</Text>
            <TouchableOpacity
              onPress={copy}
              style={[styles.copyBtn, { backgroundColor: copied ? '#34c759' : '#5B42F5' }]}
              activeOpacity={0.85}
            >
              <Text style={styles.copyBtnText}>{copied ? '✓' : 'კოპირება'}</Text>
            </TouchableOpacity>
          </View>

          {/* სოც-ქსელები (ბოლოში) */}
          <View style={styles.socialsRow}>
            {SOCIALS.map((s) => (
              <TouchableOpacity
                key={s.name}
                style={styles.socialItem}
                onPress={() => openSocial(s.href(url, title || ''))}
                activeOpacity={0.8}
              >
                <View style={[styles.socialCircle, { backgroundColor: s.color }]}>
                  <FontAwesome5 name={s.icon} size={20} color="#fff" solid />
                </View>
                <Text style={[styles.socialLabel, { color: theme.subText }]} numberOfLines={1}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 999,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },

  qrGradientCard: { alignItems: 'center', borderRadius: 26, paddingTop: 36, paddingBottom: 26, paddingHorizontal: 24, marginTop: 6 },
  qrAvatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 3.5, borderColor: '#fff', marginBottom: -38, zIndex: 2 },
  qrAvatarFallback: { width: 76, height: 76, borderRadius: 38, borderWidth: 3.5, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: -38, zIndex: 2 },
  qrWhiteCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 38, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 8 },
  qrCardTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 16 },
  qrCardSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 3 },
  qrHint: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 12, marginBottom: 18 },

  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  downloadBtnText: { color: '#5B42F5', fontSize: 13.5, fontWeight: '700' },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 28 },
  linkText: { flex: 1, fontSize: 13 },
  copyBtn: { paddingHorizontal: 16, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  copyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  socialsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  socialItem: { alignItems: 'center', width: 62 },
  socialCircle: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 7 },
  socialLabel: { fontSize: 11, fontWeight: '600' },
});