import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  View,
} from "react-native";
import { supabase } from "../services/supabase"; // 🔌 გასწორებული იმპორტის მისამართი
import { useAuthStore } from "../store/useAuthStore";
import { THEME_PALETTES } from "../utils/bgThemes";
import { isUserOnline } from "../utils/presence";
import { msgTimeLabel, needsSeparator } from "../utils/time";
import { LanguageType, translations } from "../utils/translations"; // 🚀 შემოტანილია ენის მხარდაჭერა
import AnimatedIconButton from "./AnimatedIconButton";
import AnimatedMessageEntrance from "./AnimatedMessageEntrance";
import EmptyState from "./EmptyState";
import LocationPickerModal from "./LocationPickerModal";
import TierBadge from "./TierBadge";
import VoiceBubble from "./VoiceBubble";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SYSTEM_ID = "00000000-0000-0000-0000-000000000000";

function getLastSeenText(
  user: { last_seen?: string | null } | null | undefined,
): string {
  if (!user?.last_seen) return "";
  const diffMs = Date.now() - new Date(user.last_seen).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ბოლოს ნანახი ახლახანს";
  if (diffMin < 60) return `ბოლოს ნანახი ${diffMin} წთ წინ`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `ბოლოს ნანახი ${diffHours} სთ წინ`;
  const diffDays = Math.floor(diffHours / 24);
  return `ბოლოს ნანახი ${diffDays} დღის წინ`;
}
interface ChatViewProps {
  onOpenVacancyChat?: (id: string) => void;
  onOpenAdminChat?: (chatId: string, asAdmin?: boolean) => void;
  onConversationOpenChange?: (open: boolean) => void;
}

export default function ChatView({
  onOpenVacancyChat,
  onOpenAdminChat,
  onConversationOpenChange,
}: ChatViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || "ka";
  const t: any = translations[language as LanguageType] || translations.ka;
  const [chats, setChats] = useState<any[]>([]);
  const [vacancyChats, setVacancyChats] = useState<any[]>([]);
  const [adminChat, setAdminChat] = useState<any>(null);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // შეწყვეტის მოდალის სთეითები
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // პარტნიორის შეფასების სისტემის სთეითები
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewDetails, setReviewDetails] = useState("");
  const [reviewStars, setReviewStars] = useState(5);
  const [hasReviewedPartner, setHasReviewedPartner] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const messageInputRef = useRef<TextInput>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<any>(null);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.6)).current;
  const menuTranslateY = useRef(new Animated.Value(50)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const rowsAnim = useRef(new Animated.Value(0)).current;
  const sendPopAnim = useRef(new Animated.Value(1)).current;
  const emojiScales = useRef(
    ["❤️", "😂", "👍", "😮", "😢", "🔥"].map(() => new Animated.Value(0)),
  ).current;

  const playMenuEntrance = () => {
    overlayAnim.setValue(0);
    menuScale.setValue(0.6);
    menuTranslateY.setValue(50);
    menuOpacity.setValue(0);
    rowsAnim.setValue(0);
    emojiScales.forEach((v) => v.setValue(0));

    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.spring(menuScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 11,
      }),
      Animated.spring(menuTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 9,
      }),
      Animated.timing(menuOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.stagger(
      45,
      emojiScales.map((v) =>
        Animated.spring(v, {
          toValue: 1,
          useNativeDriver: true,
          speed: 22,
          bounciness: 18,
        }),
      ),
    ).start();

    Animated.timing(rowsAnim, {
      toValue: 1,
      duration: 260,
      delay: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeActionMenu = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(menuScale, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setActionMenuFor(null));
  };
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

  const chanRef = useRef<any>(null);
  const typingTimer = useRef<any>(null);
  const typingOff = useRef<any>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  const micSendAnim = useRef(new Animated.Value(0)).current; // 0 = mic, 1 = send
  useEffect(() => {
    Animated.spring(micSendAnim, {
      toValue: typedMessage.trim() ? 1 : 0,
      useNativeDriver: true,
      speed: 26,
      bounciness: 6,
    }).start();
  }, [typedMessage]);

  const [manualIconsExpanded, setManualIconsExpanded] = useState(false);
  const showFooterIcons = !typedMessage.trim() || manualIconsExpanded;
  const prevShowIconsRef = useRef(showFooterIcons);
  useEffect(() => {
    if (prevShowIconsRef.current !== showFooterIcons) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          220,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
      prevShowIconsRef.current = showFooterIcons;
    }
  }, [showFooterIcons]);

  const recordingSlideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(recordingSlideAnim, {
      toValue: recorderState.isRecording ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [recorderState.isRecording]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!recorderState.isRecording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [recorderState.isRecording]);

  const waveBars = useRef(
    Array.from({ length: 22 }, () => new Animated.Value(0.3)),
  ).current;
  const waveLoopsRef = useRef<any[]>([]);
  useEffect(() => {
    if (!recorderState.isRecording) {
      waveLoopsRef.current.forEach((l) => l.stop());
      waveBars.forEach((v) => v.setValue(0.3));
      return;
    }
    waveLoopsRef.current = waveBars.map((v, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 260 + Math.random() * 260,
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 0.2 + Math.random() * 0.3,
            duration: 260 + Math.random() * 260,
            useNativeDriver: false,
          }),
        ]),
      );
      setTimeout(() => loop.start(), i * 30);
      return loop;
    });
    return () => waveLoopsRef.current.forEach((l) => l.stop());
  }, [recorderState.isRecording]);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      }
    })();
  }, []);

  const startRecording = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "ნებართვა უარყოფილია",
        "მიკროფონზე წვდომა საჭიროა ხმოვანი შეტყობინებისთვის",
      );
      return;
    }
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const cancelRecording = async () => {
    await audioRecorder.stop();
  };

  const stopAndSendRecording = async () => {
    await audioRecorder.stop();
    const uri = audioRecorder.uri;
    if (uri) await sendVoiceMessage(uri);
  };

  const sendVoiceMessage = async (uri: string) => {
    if (!userId || !selectedChat) return;
    setUploadingVoice(true);
    try {
      const blob: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function () {
          reject(new TypeError("ხმის ფაილის წაკითხვა ჩავარდა"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });

      const ext = uri.split(".").pop() || "m4a";
      const fileName = `${selectedChat.id}/${userId}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("chat-files")
        .upload(fileName, blob, { contentType: `audio/${ext}`, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("chat-files")
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            chat_id: selectedChat.id,
            sender_id: userId,
            text: null,
            file_url: pub.publicUrl,
            file_name: "ხმოვანი შეტყობინება",
            file_type: `audio/${ext}`,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    } catch (err: any) {
      Alert.alert(
        "შეცდომა",
        err.message || "ხმოვანი შეტყობინება ვერ გაიგზავნა",
      );
    } finally {
      setUploadingVoice(false);
    }
  };

  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);

  const sendLocationMessage = async (lat: number, lng: number) => {
    if (!userId || !selectedChat) return;
    setLocationPickerVisible(false);
    setSendingLocation(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            chat_id: selectedChat.id,
            sender_id: userId,
            text: `LOCATION:${lat}:${lng}`,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    } catch (err: any) {
      Alert.alert("შეცდომა", err.message || "ლოკაცია ვერ გაიგზავნა");
    } finally {
      setSendingLocation(false);
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const pickAndSendImage = async () => {
    if (!userId || !selectedChat) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "ნებართვა უარყოფილია",
        "გალერეაზე წვდომა საჭიროა სურათის გასაზიარებლად",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingImage(true);
    try {
      const base64 = asset.base64;
      if (!base64) throw new Error("სურათის წაკითხვა ვერ მოხერხდა");

      const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${selectedChat.id}/${userId}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("chat-files")
        .upload(fileName, decode(base64), {
          contentType: asset.mimeType || `image/${ext}`,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("chat-files")
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            chat_id: selectedChat.id,
            sender_id: userId,
            text: null,
            file_url: pub.publicUrl,
            file_name: "სურათი",
            file_type: asset.mimeType || `image/${ext}`,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    } catch (err: any) {
      Alert.alert("შეცდომა", err.message || "სურათი ვერ აიტვირთა");
    } finally {
      setUploadingImage(false);
    }
  };

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || "noir";
  const palette = isDarkMode
    ? THEME_PALETTES[bgTheme] || THEME_PALETTES.noir
    : null;
  const theme = {
    bg: palette ? palette.bg : "#f5f5f7",
    cardBg: palette ? palette.card : "#ffffff",
    text: isDarkMode ? "#fff" : "#1c1c1e",
    subText: isDarkMode ? "#8a8a92" : "#8e8e93",
    border: palette ? palette.border : "#e5e5ea",
    inputText: isDarkMode ? "#fff" : "#000",
    inputBg: isDarkMode ? "#222227" : "#f2f2f7",
    chatIncoming: isDarkMode ? "#222227" : "#e5e5ea",
    systemBg: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
  };

  useEffect(() => {
    fetchChats();
    fetchVacancyChats();
    fetchAdminChat();
  }, [userId]);

  const [isAdminViewer, setIsAdminViewer] = useState(false);
  const [adminOpenChats, setAdminOpenChats] = useState<any[]>([]);
  const [adminArchived, setAdminArchived] = useState<any[]>([]);
  const [adminSection, setAdminSection] = useState<"chats" | "archive">(
    "chats",
  );

  const fetchAdminChat = async () => {
    if (!userId) {
      setAdminChat(null);
      setAdminOpenChats([]);
      setIsAdminViewer(false);
      return;
    }

    // ადმინია?
    const { data: me } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const admin = me?.role === "admin";
    setIsAdminViewer(admin);

    if (admin) {
      const { data } = await supabase.rpc("admin_list_open_chats");
      setAdminOpenChats(data || []);
      const { data: arch } = await supabase.rpc("admin_list_archived_chats");
      setAdminArchived(arch || []);
      setAdminChat(null);
    } else {
      const { data } = await supabase.rpc("my_admin_chat");
      const chat = Array.isArray(data) ? data[0] : data;
      setAdminChat(chat || null);
    }
  };
  const fetchVacancyChats = async () => {
    if (!userId) {
      setVacancyChats([]);
      return;
    }
    try {
      const { data: vcs } = await supabase
        .from("vacancy_chats")
        .select("*")
        .order("created_at", { ascending: false });

      if (!vcs || vcs.length === 0) {
        setVacancyChats([]);
        return;
      }

      const jobIds = vcs.map((c: any) => c.job_id).filter(Boolean);
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, position_title")
        .in("id", jobIds);

      setVacancyChats(
        vcs.map((c: any) => {
          const j = jobsData?.find((x: any) => x.id === c.job_id);
          return {
            ...c,
            job_title: j?.position_title || j?.title || t.vc_vacancy_fallback,
          };
        }),
      );
    } catch {
      setVacancyChats([]);
    }
  };

  const fetchChats = async () => {
    // 🔧 logout-ის მერe: userId აღარ არის — ვასუფთავ და ვაჩერ ლოდინგს
    if (!userId) {
      setChats([]);
      setLoadingChats(false);
      return;
    }
    setLoadingChats(true);

    try {
      const { data: chatsData, error } = await supabase
        .from("chats")
        .select("*")
        .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!chatsData || chatsData.length === 0) {
        setChats([]);
        setLoadingChats(false);
        return;
      }

      let filteredChats = chatsData.filter((c) => c.job_state !== "cancelled");

      const completedJobIds = filteredChats
        .filter((c) => c.job_state === "completed")
        .map((c) => c.job_id)
        .filter(Boolean);

      if (completedJobIds.length > 0) {
        const { data: writtenReviews } = await supabase
          .from("reviews")
          .select("job_id")
          .in("job_id", completedJobIds)
          .eq("reviewer_id", userId)
          .eq("is_negative_cancel", false); // 🔧 თანმიმდევრულობა checkIfReviewed-თან

        if (writtenReviews && writtenReviews.length > 0) {
          const reviewedIds = writtenReviews.map((r) => r.job_id);
          filteredChats = filteredChats.filter(
            (c) =>
              !(c.job_state === "completed" && reviewedIds.includes(c.job_id)),
          );
        }
      }

      if (filteredChats.length === 0) {
        setChats([]);
        setLoadingChats(false);
        return;
      }

      const partnerIds = filteredChats.map((c) =>
        c.client_id === userId ? c.freelancer_id : c.client_id,
      );
      const jobIds = filteredChats.map((c) => c.job_id).filter(Boolean);

      // 🚀 დაემატა user_status სვეტი ჩათის პარტნიორისთვის
      const { data: usersData } = await supabase
        .from("profiles")
        .select(
          "id, name, avatar_url, user_status, last_seen, rating, tier, is_verified_company",
        ) // 🔧 last_seen, rating, tier, is_verified_company დაემატა
        .in("id", partnerIds);

      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title")
        .in("id", jobIds);

      const enrichedChats = filteredChats.map((chat) => {
        const partnerId =
          chat.client_id === userId ? chat.freelancer_id : chat.client_id;
        const partnerUser = usersData?.find((u) => u.id === partnerId);
        const relatedJob = jobsData?.find((j) => j.id === chat.job_id);

        return {
          ...chat,
          partner_name: partnerUser?.name || "მომხმარებელი",
          partner_avatar: partnerUser?.avatar_url || null,
          user_status: partnerUser?.user_status || "offline",
          last_seen: partnerUser?.last_seen || null, // 🔧
          partner_rating: partnerUser?.rating ?? null,
          partner_tier: partnerUser?.tier || null,
          partner_verified: partnerUser?.is_verified_company || false,
          job_title: relatedJob?.title || "სამუშაო შეკვეთა",
        };
      });

      setChats(enrichedChats);
    } catch (err: any) {
      console.error("Error fetching chats:", err.message);
      Alert.alert(
        "DEBUG fetchChats შეცდომა",
        err.message || JSON.stringify(err),
      );
    } finally {
      setLoadingChats(false);
    }
  };

  // 🚀 ონლაინ სტატუსის რეალთაიმ განახლება ჩათის პარტნიორებისთვის
  useEffect(() => {
    if (chats.length === 0) return;

    const partnerIds = chats.map((c) =>
      c.client_id === userId ? c.freelancer_id : c.client_id,
    );

    const statusChannel = supabase
      .channel("chat-partners-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        (payload: any) => {
          if (partnerIds.includes(payload.new.id)) {
            setChats((prevChats) =>
              prevChats.map((chat) => {
                const partnerId =
                  chat.client_id === userId
                    ? chat.freelancer_id
                    : chat.client_id;
                if (partnerId === payload.new.id) {
                  return { ...chat, user_status: payload.new.user_status };
                }
                return chat;
              }),
            );

            setSelectedChat((prev: any) => {
              if (prev) {
                const activePartnerId =
                  prev.client_id === userId
                    ? prev.freelancer_id
                    : prev.client_id;
                if (activePartnerId === payload.new.id) {
                  return { ...prev, user_status: payload.new.user_status };
                }
              }
              return prev;
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [chats.length]);

  useEffect(() => {
    onConversationOpenChange?.(!!selectedChat);
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    fetchMessages(selectedChat.id);
    checkIfReviewed();
    setReplyTo(null);

    const messageChannel = supabase
      .channel(`room-${selectedChat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${selectedChat.id}`,
        },
        (payload: any) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            const filtered = prev.filter(
              (m) =>
                !(
                  m.isOptimistic &&
                  m.text === payload.new.text &&
                  m.sender_id === payload.new.sender_id
                ),
            );
            return [...filtered, payload.new];
          });
          setTimeout(
            () => scrollViewRef.current?.scrollToEnd({ animated: true }),
            100,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
          filter: `id=eq.${selectedChat.id}`,
        },
        (payload: any) => {
          setSelectedChat((current: any) => {
            if (!current) return null;
            return { ...current, ...payload.new };
          });
          setChats((prev) =>
            prev.map((c) =>
              c.id === payload.new.id ? { ...c, ...payload.new } : c,
            ),
          );
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (!userId || payload.user_id === userId) return;
        setPartnerTyping(true);
        clearTimeout(typingOff.current);
        typingOff.current = setTimeout(() => setPartnerTyping(false), 3000);
      })
      .subscribe();

    chanRef.current = messageChannel;

    return () => {
      clearTimeout(typingOff.current);
      supabase.removeChannel(messageChannel);
    };
  }, [selectedChat?.id]);

  const notifyTyping = () => {
    if (typingTimer.current) return;
    chanRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId },
    });
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null;
    }, 1500);
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const checkIfReviewed = async () => {
    if (!selectedChat) return;
    const partnerId =
      selectedChat.client_id === userId
        ? selectedChat.freelancer_id
        : selectedChat.client_id;
    try {
      const { data } = await supabase
        .from("reviews")
        .select("id")
        .eq("job_id", selectedChat.job_id)
        .eq("target_id", partnerId)
        .eq("reviewer_name", userName || "") // 🔧 მხოლოდ ჩემ მიერ დაწერილი
        .eq("is_negative_cancel", false); // 🔧 cancel-ჩანაწერი არ ჩაითვალოს

      setHasReviewedPartner(!!data && data.length > 0);
    } catch (err) {
      setHasReviewedPartner(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      const ordered = (data || []).slice().reverse();
      setMessages(ordered);
      setHasMore((data || []).length === PAGE_SIZE);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: false }),
        200,
      );

      if (ordered.length > 0) {
        const { data: reacts } = await supabase
          .from("message_reactions")
          .select("*")
          .in(
            "message_id",
            ordered.map((m: any) => m.id),
          );
        const grouped: Record<string, any[]> = {};
        (reacts || []).forEach((r: any) => {
          if (!grouped[r.message_id]) grouped[r.message_id] = [];
          grouped[r.message_id].push(r);
        });
        setReactions(grouped);
      } else {
        setReactions({});
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore || !selectedChat || messages.length === 0)
      return;
    setLoadingMore(true);
    try {
      const oldest = messages[0].created_at;
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", selectedChat.id)
        .lt("created_at", oldest)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const older = (data || []).slice().reverse();
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
      }
      setHasMore((data || []).length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    setActionMenuFor(null);
    const myExisting = (reactions[messageId] || []).find(
      (r) => r.user_id === userId,
    );

    if (myExisting) {
      await supabase.from("message_reactions").delete().eq("id", myExisting.id);
      setReactions((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(
          (r) => r.id !== myExisting.id,
        ),
      }));
      if (myExisting.emoji === emoji) return;
    }

    const { data } = await supabase
      .from("message_reactions")
      .insert([{ message_id: messageId, user_id: userId, emoji }])
      .select()
      .single();
    if (data)
      setReactions((prev) => ({
        ...prev,
        [messageId]: [
          ...(prev[messageId] || []).filter((r) => r.user_id !== userId),
          data,
        ],
      }));
  };

  const deleteMessage = async (messageId: string) => {
    setActionMenuFor(null);
    const { error } = await supabase
      .from("messages")
      .update({ text: null, is_deleted: true })
      .eq("id", messageId);
    if (error) {
      Alert.alert("შეცდომა", error.message);
      return;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, text: null, is_deleted: true } : m,
      ),
    );
  };

  const startEdit = (m: any) => {
    setActionMenuFor(null);
    setEditingId(m.id);
    setEditText(m.text || "");
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    const { error } = await supabase
      .from("messages")
      .update({ text: editText.trim(), is_edited: true })
      .eq("id", editingId);
    if (error) {
      Alert.alert("შეცდომა", error.message);
      return;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingId
          ? { ...m, text: editText.trim(), is_edited: true }
          : m,
      ),
    );
    setEditingId(null);
    setEditText("");
  };

  const handleSendMessage = async () => {
    if (!typedMessage.trim() || !selectedChat) return;
    const msgText = typedMessage;
    const replyId = replyTo?.id || null;
    setTypedMessage("");
    setReplyTo(null);

    sendPopAnim.setValue(0.6);
    Animated.spring(sendPopAnim, {
      toValue: 1,
      friction: 4,
      tension: 160,
      useNativeDriver: true,
    }).start();

    const tempId = "temp-" + Date.now();
    const optimisticMsg = {
      id: tempId,
      chat_id: selectedChat.id,
      sender_id: userId,
      text: msgText,
      reply_to: replyId,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );

    try {
      const { error } = await supabase.from("messages").insert([
        {
          chat_id: selectedChat.id,
          sender_id: userId,
          text: msgText,
          reply_to: replyId,
        },
      ]);

      if (error) throw error;
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("შეცდომა", "მესიჯი ვერ გაიგზავნა.");
    }
  };

  const isClient = selectedChat?.client_id === userId;

  const handleStartJob = async () => {
    if (!selectedChat) return;

    const updateData = isClient
      ? { client_started: true }
      : { worker_started: true };
    const shouldStartFully = isClient
      ? selectedChat.worker_started
      : selectedChat.client_started;
    const finalState = shouldStartFully
      ? { ...updateData, job_state: "started" }
      : updateData;

    const { error } = await supabase
      .from("chats")
      .update(finalState)
      .eq("id", selectedChat.id);

    if (error) {
      Alert.alert("შეცდომა", error.message);
      return;
    }

    await supabase.from("messages").insert([
      {
        chat_id: selectedChat.id,
        sender_id: "00000000-0000-0000-0000-000000000000",
        text: shouldStartFully
          ? `⚡ საქმე ოფიციალურად დაიწყო!`
          : `📌 ${userName}-მა დაადასტურა საქმის დაწყება.`,
      },
    ]);
  };

  const handleCompleteJob = async () => {
    if (!selectedChat) return;

    const updateData = isClient
      ? { client_completed: true }
      : { worker_completed: true };
    const shouldCompleteFully = isClient
      ? selectedChat.worker_completed
      : selectedChat.client_completed;
    const finalState = shouldCompleteFully
      ? { ...updateData, job_state: "completed" }
      : updateData;

    const { error } = await supabase
      .from("chats")
      .update(finalState)
      .eq("id", selectedChat.id);

    if (error) {
      Alert.alert("შეცდომა", error.message);
      return;
    }

    await supabase.from("messages").insert([
      {
        chat_id: selectedChat.id,
        sender_id: "00000000-0000-0000-0000-000000000000",
        text: shouldCompleteFully
          ? `🎉 პროექტი წარმატებით დასრულდა!`
          : `📌 ${userName}-მა მოითხოვა საქმის დასრულება.`,
      },
    ]);
  };

  const handleCancelJob = async () => {
    if (!cancelReason.trim() || !selectedChat) {
      Alert.alert("ყურადღება ⚠️", "გთხოვთ ჩაწეროთ შეწყვეტის მიზეზი");
      return;
    }

    try {
      const { error: chatError } = await supabase
        .from("chats")
        .update({ job_state: "cancelled" })
        .eq("id", selectedChat.id);

      if (chatError) throw chatError;

      const { error: reviewError } = await supabase.from("reviews").insert([
        {
          job_id: selectedChat.job_id,
          job_title: selectedChat.job_title,
          reviewer_name: userName || "მომხმარებელი",
          target_name: selectedChat.partner_name,
          review_title: "დროზე ადრე შეწყვეტა",
          review_details: cancelReason,
          stars: 0,
          is_negative_cancel: true,
          target_id: userId,
        },
      ]);

      if (reviewError) throw reviewError;

      await supabase.from("messages").insert([
        {
          chat_id: selectedChat.id,
          sender_id: "00000000-0000-0000-0000-000000000000",
          text: `❌ საქმე დროზე ადრე შეწყდა ${userName}-ის მიერ. მიზეზი: ${cancelReason}`,
        },
      ]);

      setIsCancelModalVisible(false);
      setCancelReason("");
      setSelectedChat(null);
      fetchChats();
      Alert.alert("შეწყვეტილია", "სამუშაო პროცესი დროზე ადრე შეწყდა.");
    } catch (err: any) {
      Alert.alert("შეცდომა", err.message || "ოპერაცია ვერ შესრულდა");
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewTitle.trim() || !reviewDetails.trim() || !selectedChat) {
      Alert.alert("ყურადღება ⚠️", "გთხოვთ შეავსოთ ყველა ველი");
      return;
    }

    const partnerId =
      selectedChat.client_id === userId
        ? selectedChat.freelancer_id
        : selectedChat.client_id;

    try {
      setIsSubmittingReview(true);

      const { error: insertError } = await supabase.from("reviews").insert([
        {
          job_id: selectedChat.job_id,
          job_title: selectedChat.job_title,
          reviewer_name: userName || "მომხმარებელი",
          target_name: selectedChat.partner_name,
          review_title: reviewTitle,
          review_details: reviewDetails,
          reviewer_id: userId,
          stars: reviewStars,
          is_negative_cancel: false,
          target_id: partnerId,
        },
      ]);

      if (insertError) throw insertError;

      // რეიტინგს ბაზის trigger ითვლის (recalc_rating)

      setHasReviewedPartner(true);
      setIsReviewModalVisible(false);
      setReviewTitle("");
      setReviewDetails("");
      setSelectedChat(null);
      fetchChats();
    } catch (err: any) {
      Alert.alert(
        "შეცდომა ❌",
        err.message || "შეფასების შენახვა ვერ მოხერხდა",
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    return () => {
      onConversationOpenChange?.(false);
    };
  }, []);

  const hasIStarted = isClient
    ? selectedChat?.client_started
    : selectedChat?.worker_started;
  const hasICompleted = isClient
    ? selectedChat?.client_completed
    : selectedChat?.worker_completed;

  const workflowStateColor =
    selectedChat?.job_state === "started"
      ? "#0EA5E9"
      : selectedChat?.job_state === "completed"
        ? "#22C55E"
        : selectedChat?.job_state === "cancelled"
          ? "#FF3B30"
          : "#5B42F5";

  const workflowStateIcon =
    selectedChat?.job_state === "started"
      ? "flash-outline"
      : selectedChat?.job_state === "completed"
        ? "checkmark-circle-outline"
        : selectedChat?.job_state === "cancelled"
          ? "close-circle-outline"
          : "hourglass-outline";

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SafeAreaView
        style={[
          styles.headerWrapper,
          { backgroundColor: theme.cardBg, borderColor: theme.border },
        ]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.textPushedHeaderRow,
              { flexDirection: "row", alignItems: "center" },
            ]}
          >
            {selectedChat && (
              <AnimatedIconButton
                onPress={() => setSelectedChat(null)}
                style={{ marginRight: 12, marginTop: 4 }}
              >
                <Ionicons name="arrow-back" size={24} color="#5B42F5" />
              </AnimatedIconButton>
            )}

            {/* 🚀 შიდა ჩათის ჰედერის ავატარი სტატუსის გლოუთი */}
            {selectedChat && (
              <View
                style={{ position: "relative", marginRight: 10, marginTop: 4 }}
              >
                {selectedChat.partner_avatar ? (
                  <Image
                    source={{ uri: selectedChat.partner_avatar }}
                    style={[
                      styles.headerAvatar,
                      { marginRight: 0, marginTop: 0 },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.headerAvatar,
                      {
                        marginRight: 0,
                        marginTop: 0,
                        backgroundColor: "#5B42F5",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                      {selectedChat.partner_name?.charAt(0)}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.chatHeaderGlowDot,
                    {
                      backgroundColor: isUserOnline(selectedChat)
                        ? "#4CD964"
                        : "#FF3B30",
                      borderColor: theme.cardBg,
                      shadowColor: isUserOnline(selectedChat)
                        ? "#4CD964"
                        : "#FF3B30",
                    },
                  ]}
                />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Text
                  style={[
                    styles.headerStaticTitle,
                    { color: theme.text, fontSize: 20 },
                  ]}
                  numberOfLines={1}
                >
                  {selectedChat
                    ? selectedChat.partner_name
                    : t.chats_header || "მიმოწერები"}
                </Text>
                {selectedChat?.partner_verified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#3B82F6"
                    style={{ marginLeft: 5 }}
                  />
                )}
              </View>

              {selectedChat && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  {selectedChat.partner_rating !== null &&
                    selectedChat.partner_rating !== undefined && (
                      <View style={styles.headerRatingPill}>
                        <Ionicons name="star" size={11} color="#f5a623" />
                        <Text style={styles.headerRatingText}>
                          {Number(selectedChat.partner_rating).toFixed(1)}
                        </Text>
                      </View>
                    )}

                  {(selectedChat.partner_tier === "pro" ||
                    selectedChat.partner_tier === "premium" ||
                    selectedChat.partner_verified) && (
                    <TierBadge
                      tier={selectedChat.partner_tier}
                      verified={selectedChat.partner_verified}
                      compact
                    />
                  )}

                  <Text
                    style={{
                      color: theme.subText,
                      fontSize: 11.5,
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                  >
                    {isUserOnline(selectedChat)
                      ? t.online_now || "ონლაინ"
                      : getLastSeenText(selectedChat) ||
                        t.offline ||
                        "ხაზგარეშე"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>

      {selectedChat ? (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View
            style={[
              styles.workflowContainer,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: workflowStateColor + "1F",
                  borderColor: workflowStateColor + "40",
                },
              ]}
            >
              <Ionicons
                name={workflowStateIcon as any}
                size={14}
                color={workflowStateColor}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.statusPillText, { color: workflowStateColor }]}
                numberOfLines={1}
              >
                {(!selectedChat.job_state ||
                  selectedChat.job_state === "pending") &&
                  (t.status_pending || "შეთანხმების ეტაპი")}
                {selectedChat.job_state === "started" &&
                  (t.status_started || "მიმდინარეობს")}
                {selectedChat.job_state === "completed" &&
                  (t.status_completed || "დასრულებული")}
                {selectedChat.job_state === "cancelled" &&
                  (t.status_cancelled || "შეწყვეტილია")}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {(!selectedChat.job_state ||
                selectedChat.job_state === "pending") && (
                <AnimatedIconButton
                  style={[
                    styles.actionButton,
                    { backgroundColor: "#5B42F5", shadowColor: "#5B42F5" },
                    hasIStarted && styles.disabledButton,
                  ]}
                  onPress={handleStartJob}
                  disabled={hasIStarted}
                >
                  <Text style={styles.actionButtonText}>
                    {hasIStarted
                      ? t.waiting || "მოლოდინი..."
                      : t.start_btn || "დაწყება"}
                  </Text>
                </AnimatedIconButton>
              )}

              {selectedChat.job_state === "started" && (
                <AnimatedIconButton
                  style={[
                    styles.actionButton,
                    { backgroundColor: "#22C55E", shadowColor: "#22C55E" },
                    hasICompleted && styles.disabledButton,
                  ]}
                  onPress={handleCompleteJob}
                  disabled={hasICompleted}
                >
                  <Text style={styles.actionButtonText}>
                    {hasICompleted
                      ? t.waiting || "მოლოდინი..."
                      : t.complete_btn || "დასრულება"}
                  </Text>
                </AnimatedIconButton>
              )}

              {selectedChat.job_state === "completed" &&
                !hasReviewedPartner && (
                  <AnimatedIconButton
                    style={[
                      styles.actionButton,
                      { backgroundColor: "#F59E0B", shadowColor: "#F59E0B" },
                    ]}
                    onPress={() => setIsReviewModalVisible(true)}
                  >
                    <Text style={styles.actionButtonText}>
                      {t.review_star_btn || "შეფასება"}
                    </Text>
                  </AnimatedIconButton>
                )}

              {selectedChat.job_state !== "completed" &&
                selectedChat.job_state !== "cancelled" && (
                  <AnimatedIconButton
                    style={[
                      styles.actionButton,
                      { backgroundColor: "#FF3B30", shadowColor: "#FF3B30" },
                    ]}
                    onPress={() => setIsCancelModalVisible(true)}
                  >
                    <Text style={styles.actionButtonText}>
                      {t.cancel_cross_btn || "შეწყვეტა"}
                    </Text>
                  </AnimatedIconButton>
                )}
            </View>
          </View>

          {loadingMessages ? (
            <ActivityIndicator
              size="large"
              color="#5B42F5"
              style={{ flex: 1 }}
            />
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "flex-end",
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 100,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onTouchStart={() => Keyboard.dismiss()}
              scrollEventThrottle={100}
              onScroll={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } =
                  e.nativeEvent;
                if (contentOffset.y < 60) loadOlderMessages();
                const distanceFromBottom =
                  contentSize.height -
                  contentOffset.y -
                  layoutMeasurement.height;
                setShowScrollDown(distanceFromBottom > 300);
              }}
            >
              {loadingMore && (
                <View style={{ alignItems: "center", marginBottom: 10 }}>
                  <ActivityIndicator size="small" color="#5B42F5" />
                </View>
              )}
              {messages.map((msg: any, i: number) => {
                const showTime = needsSeparator(
                  messages[i - 1]?.created_at,
                  msg.created_at,
                );

                if (msg.sender_id === SYSTEM_ID) {
                  return (
                    <View key={msg.id}>
                      {showTime && (
                        <View style={styles.timeSeparatorRow}>
                          <Text
                            style={[
                              styles.timeSeparatorText,
                              {
                                backgroundColor: theme.cardBg,
                                color: theme.subText,
                              },
                            ]}
                          >
                            {msgTimeLabel(msg.created_at)}
                          </Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.systemMessageContainer,
                          {
                            backgroundColor: theme.systemBg,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            textAlign: "center",
                            color: isDarkMode ? "#aaa" : "#555",
                          }}
                        >
                          {msg.text}
                        </Text>
                      </View>
                    </View>
                  );
                }

                const isMe = msg.sender_id === userId;
                const originalReply = msg.reply_to
                  ? messages.find((m) => m.id === msg.reply_to)
                  : null;
                const isImage =
                  msg.file_url && msg.file_type?.startsWith("image/");
                const isVoice =
                  msg.file_url && msg.file_type?.startsWith("audio/");
                const isFile = msg.file_url && !isImage && !isVoice;

                return (
                  <View key={msg.id}>
                    {showTime && (
                      <View style={styles.timeSeparatorRow}>
                        <Text
                          style={[
                            styles.timeSeparatorText,
                            {
                              backgroundColor: theme.cardBg,
                              color: theme.subText,
                            },
                          ]}
                        >
                          {msgTimeLabel(msg.created_at)}
                        </Text>
                      </View>
                    )}
                    <AnimatedMessageEntrance>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onLongPress={() =>
                          !msg.is_deleted && setActionMenuFor(msg)
                        }
                        style={{
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "82%",
                          marginBottom: 4,
                        }}
                      >
                        {msg.is_deleted ? (
                          <View
                            style={[
                              styles.deletedBubble,
                              { borderColor: theme.border },
                            ]}
                          >
                            <Text
                              style={{
                                color: theme.subText,
                                fontSize: 13,
                                fontStyle: "italic",
                              }}
                            >
                              შეტყობინება წაშლილია
                            </Text>
                          </View>
                        ) : typeof msg.text === "string" &&
                          /^LOCATION:-?\d+\.?\d*:-?\d+\.?\d*$/.test(
                            msg.text,
                          ) ? (
                          (() => {
                            const [, lat, lng] = msg.text.split(":");
                            return (
                              <TouchableOpacity
                                onPress={() =>
                                  Linking.openURL(
                                    `https://www.google.com/maps?q=${lat},${lng}`,
                                  )
                                }
                                activeOpacity={0.85}
                                style={[
                                  styles.locationCard,
                                  { borderColor: theme.border },
                                ]}
                              >
                                <View style={styles.locationMapPlaceholder}>
                                  <Ionicons
                                    name="location"
                                    size={32}
                                    color="#5B42F5"
                                  />
                                </View>
                                <View
                                  style={[
                                    styles.locationFooter,
                                    { backgroundColor: theme.cardBg },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: theme.text,
                                      fontSize: 13,
                                      fontWeight: "700",
                                    }}
                                  >
                                    📍 ლოკაცია
                                  </Text>
                                  <Text
                                    style={{
                                      color: "#5B42F5",
                                      fontSize: 11,
                                      fontWeight: "700",
                                    }}
                                  >
                                    რუკაზე ნახვა →
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })()
                        ) : isVoice ? (
                          <VoiceBubble
                            uri={msg.file_url}
                            mine={isMe}
                            incomingBg={theme.chatIncoming}
                            textColor={theme.text}
                          />
                        ) : isImage ? (
                          <TouchableOpacity
                            onPress={() => setPreviewImage(msg.file_url)}
                            activeOpacity={0.9}
                          >
                            <Image
                              source={{ uri: msg.file_url }}
                              style={styles.imageBubble}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : isFile ? (
                          <View
                            style={[
                              styles.fileBubble,
                              {
                                backgroundColor: isMe
                                  ? "#5B42F5"
                                  : theme.chatIncoming,
                              },
                            ]}
                          >
                            <Ionicons
                              name="document-text"
                              size={22}
                              color={isMe ? "#fff" : theme.text}
                            />
                            <Text
                              style={{
                                color: isMe ? "#fff" : theme.text,
                                fontSize: 13,
                                fontWeight: "600",
                                flexShrink: 1,
                              }}
                              numberOfLines={1}
                            >
                              {msg.file_name || "ფაილი"}
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.msgBubble,
                              isMe
                                ? {
                                    backgroundColor: "#5B42F5",
                                    borderBottomRightRadius: 5,
                                  }
                                : {
                                    backgroundColor: theme.chatIncoming,
                                    borderBottomLeftRadius: 5,
                                  },
                            ]}
                          >
                            {originalReply && (
                              <View
                                style={[
                                  styles.replyQuote,
                                  {
                                    borderLeftColor: isMe
                                      ? "rgba(255,255,255,0.7)"
                                      : "#5B42F5",
                                    backgroundColor: isMe
                                      ? "rgba(255,255,255,0.14)"
                                      : theme.bg,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: isMe ? "#fff" : "#5B42F5",
                                    marginBottom: 2,
                                  }}
                                >
                                  {originalReply.sender_id === userId
                                    ? "შენ"
                                    : selectedChat?.partner_name ||
                                      "მომხმარებელი"}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: isMe
                                      ? "rgba(255,255,255,0.85)"
                                      : theme.subText,
                                  }}
                                  numberOfLines={1}
                                >
                                  {originalReply.is_deleted
                                    ? "წაშლილია"
                                    : originalReply.text ||
                                      (originalReply.file_url
                                        ? "📎 ფაილი"
                                        : "")}
                                </Text>
                              </View>
                            )}
                            {editingId === msg.id ? (
                              <View style={{ minWidth: 180 }}>
                                <TextInput
                                  autoFocus
                                  value={editText}
                                  onChangeText={setEditText}
                                  style={{
                                    color: isMe ? "#fff" : theme.text,
                                    fontSize: 14,
                                    padding: 0,
                                    minWidth: 150,
                                  }}
                                />
                                <View
                                  style={{
                                    flexDirection: "row",
                                    gap: 12,
                                    marginTop: 8,
                                  }}
                                >
                                  <TouchableOpacity
                                    onPress={() => setEditingId(null)}
                                  >
                                    <Text
                                      style={{
                                        color: isMe
                                          ? "rgba(255,255,255,0.8)"
                                          : theme.subText,
                                        fontSize: 12,
                                        fontWeight: "700",
                                      }}
                                    >
                                      გაუქმება
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={saveEdit}>
                                    <Text
                                      style={{
                                        color: isMe ? "#fff" : "#5B42F5",
                                        fontSize: 12,
                                        fontWeight: "700",
                                      }}
                                    >
                                      შენახვა
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ) : (
                              <Text
                                style={{
                                  color: isMe ? "#fff" : theme.text,
                                  fontSize: 14,
                                  lineHeight: 19,
                                }}
                              >
                                {msg.text}
                                {msg.is_edited && (
                                  <Text style={{ fontSize: 10, opacity: 0.6 }}>
                                    {" "}
                                    (რედაქტ.)
                                  </Text>
                                )}
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    </AnimatedMessageEntrance>

                    {(reactions[msg.id] || []).length > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 5,
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          marginBottom: 10,
                        }}
                      >
                        {Object.entries(
                          (reactions[msg.id] || []).reduce(
                            (acc: Record<string, number>, r: any) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            },
                            {},
                          ),
                        ).map(([emoji, count]) => {
                          const mineReacted = (reactions[msg.id] || []).some(
                            (r) => r.user_id === userId && r.emoji === emoji,
                          );
                          return (
                            <TouchableOpacity
                              key={emoji}
                              onPress={() => toggleReaction(msg.id, emoji)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 3,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 12,
                                borderWidth: 1,
                                backgroundColor: mineReacted
                                  ? "rgba(91,66,245,0.14)"
                                  : theme.cardBg,
                                borderColor: mineReacted
                                  ? "#5B42F5"
                                  : theme.border,
                              }}
                            >
                              <Text style={{ fontSize: 12 }}>{emoji}</Text>
                              {count > 1 && (
                                <Text
                                  style={{ fontSize: 10, color: theme.subText }}
                                >
                                  {count}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
              {partnerTyping && (
                <View
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 4,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 4,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 16,
                      backgroundColor: theme.chatIncoming,
                    }}
                  >
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {showScrollDown && !!selectedChat && (
            <AnimatedIconButton
              onPress={scrollToBottom}
              style={[
                styles.scrollDownBtn,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
              ]}
            >
              <Ionicons name="chevron-down" size={20} color={theme.text} />
            </AnimatedIconButton>
          )}

          {replyTo && (
            <View
              style={[
                styles.replyPreviewBar,
                { backgroundColor: theme.bg, borderColor: theme.border },
              ]}
            >
              <View
                style={{
                  width: 3,
                  height: 32,
                  borderRadius: 2,
                  backgroundColor: "#5B42F5",
                  marginRight: 10,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "700",
                    color: "#5B42F5",
                  }}
                >
                  პასუხი
                </Text>
                <Text
                  style={{ fontSize: 13, color: theme.subText }}
                  numberOfLines={1}
                >
                  {replyTo.text || (replyTo.file_url ? "📎 ფაილი" : "")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyTo(null)}
                style={{ padding: 6 }}
              >
                <Ionicons name="close" size={16} color={theme.subText} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBarWrap}>
            <View
              style={[
                styles.inputBar,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  shadowColor: isDarkMode ? "#000" : "#333",
                },
              ]}
            >
              {recorderState.isRecording ? (
                <Animated.View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    opacity: recordingSlideAnim,
                    transform: [
                      {
                        scale: recordingSlideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.92, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <AnimatedIconButton
                    onPress={cancelRecording}
                    style={styles.recCancelBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                  </AnimatedIconButton>

                  <View
                    style={[
                      styles.recIndicator,
                      {
                        backgroundColor: theme.bg,
                        borderColor: "rgba(255,59,48,0.25)",
                      },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.recDot,
                        { transform: [{ scale: pulseAnim }] },
                      ]}
                    />
                    <View style={styles.recWaveRow}>
                      {waveBars.map((v, i) => (
                        <Animated.View
                          key={i}
                          style={{
                            width: 2.5,
                            marginHorizontal: 1,
                            borderRadius: 2,
                            backgroundColor: "#34c759",
                            height: v.interpolate({
                              inputRange: [0, 1],
                              outputRange: [3, 20],
                            }),
                          }}
                        />
                      ))}
                    </View>
                    <Text
                      style={{
                        color: "#34c759",
                        fontSize: 12.5,
                        fontWeight: "800",
                        marginLeft: 6,
                      }}
                    >
                      {Math.floor((recorderState.durationMillis || 0) / 60000)}:
                      {String(
                        Math.floor(
                          ((recorderState.durationMillis || 0) / 1000) % 60,
                        ),
                      ).padStart(2, "0")}
                    </Text>
                  </View>

                  <AnimatedIconButton
                    onPress={stopAndSendRecording}
                    disabled={uploadingVoice}
                    style={styles.sendButton}
                  >
                    {uploadingVoice ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </AnimatedIconButton>
                </Animated.View>
              ) : (
                <>
                  {!showFooterIcons && (
                    <AnimatedIconButton
                      onPress={() => setManualIconsExpanded(true)}
                      style={styles.locationBtn}
                    >
                      <Ionicons name="add" size={22} color="#ffffff" />
                    </AnimatedIconButton>
                  )}

                  {showFooterIcons && (
                    <View style={{ flexDirection: "row" }}>
                      <AnimatedIconButton
                        onPress={pickAndSendImage}
                        disabled={uploadingImage}
                        style={styles.locationBtn}
                      >
                        {uploadingImage ? (
                          <ActivityIndicator size="small" color="#5B42F5" />
                        ) : (
                          <Ionicons
                            name="image-outline"
                            size={23}
                            color="#ffffff"
                          />
                        )}
                      </AnimatedIconButton>

                      <AnimatedIconButton
                        onPress={() => setLocationPickerVisible(true)}
                        disabled={sendingLocation}
                        style={styles.locationBtn}
                      >
                        {sendingLocation ? (
                          <ActivityIndicator size="small" color="#5B42F5" />
                        ) : (
                          <Ionicons
                            name="location-outline"
                            size={23}
                            color="#ffffff"
                          />
                        )}
                      </AnimatedIconButton>

                      <AnimatedIconButton
                        onPress={startRecording}
                        style={styles.locationBtn}
                      >
                        <Ionicons
                          name="mic-outline"
                          size={23}
                          color="#ffffff"
                        />
                      </AnimatedIconButton>
                    </View>
                  )}

                  <TextInput
                    ref={messageInputRef}
                    style={[styles.input, { color: theme.inputText }]}
                    placeholder={t.message_placeholder || "შეტყობინება..."}
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                    value={typedMessage}
                    onChangeText={(txt) => {
                      setTypedMessage(txt);
                      notifyTyping();
                      if (manualIconsExpanded) setManualIconsExpanded(false);
                    }}
                    multiline
                  />

                  <AnimatedIconButton
                    onPress={handleSendMessage}
                    disabled={!typedMessage.trim()}
                    style={styles.sendButton}
                  >
                    <Animated.View
                      style={{ transform: [{ scale: sendPopAnim }] }}
                    >
                      <Ionicons name="send" size={16} color="#fff" />
                    </Animated.View>
                  </AnimatedIconButton>
                </>
              )}
            </View>
          </View>

          <LocationPickerModal
            visible={locationPickerVisible}
            onClose={() => setLocationPickerVisible(false)}
            onSelect={sendLocationMessage}
          />

          {/* სურათის სრულეკრანიანი გადახედვა */}
          <Modal
            visible={!!previewImage}
            transparent
            animationType="fade"
            onRequestClose={() => setPreviewImage(null)}
          >
            <TouchableOpacity
              style={styles.imagePreviewOverlay}
              activeOpacity={1}
              onPress={() => setPreviewImage(null)}
            >
              {previewImage && (
                <Image
                  source={{ uri: previewImage }}
                  style={styles.imagePreviewFull}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={styles.imagePreviewClose}
                onPress={() => setPreviewImage(null)}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {/* Reply/React/Edit/Delete action მენიუ (გრძელი დაჭერით) */}
          <Modal
            visible={!!actionMenuFor}
            transparent
            animationType="none"
            onShow={playMenuEntrance}
            onRequestClose={closeActionMenu}
          >
            <TouchableWithoutFeedback onPress={closeActionMenu}>
              <Animated.View
                style={[styles.actionMenuOverlay, { opacity: overlayAnim }]}
              >
                <TouchableWithoutFeedback>
                  <Animated.View
                    style={[
                      styles.actionMenuCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.border,
                        opacity: menuOpacity,
                        transform: [
                          { scale: menuScale },
                          { translateY: menuTranslateY },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.actionMenuEmojiRow}>
                      {REACTION_EMOJIS.map((emoji, idx) => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() =>
                            actionMenuFor &&
                            toggleReaction(actionMenuFor.id, emoji)
                          }
                        >
                          <Animated.Text
                            style={{
                              fontSize: 28,
                              transform: [
                                { scale: emojiScales[idx] },
                                {
                                  rotate: emojiScales[idx].interpolate({
                                    inputRange: [0, 0.5, 0.8, 1],
                                    outputRange: [
                                      "0deg",
                                      "-18deg",
                                      "8deg",
                                      "0deg",
                                    ],
                                    extrapolate: "clamp",
                                  }),
                                },
                              ],
                            }}
                          >
                            {emoji}
                          </Animated.Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Animated.View
                      style={{
                        opacity: rowsAnim,
                        transform: [
                          {
                            translateY: rowsAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [16, 0],
                            }),
                          },
                        ],
                      }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.actionMenuRow,
                          { borderTopColor: theme.border },
                        ]}
                        onPress={() => {
                          setReplyTo(actionMenuFor);
                          closeActionMenu();
                          setTimeout(
                            () => messageInputRef.current?.focus(),
                            260,
                          );
                        }}
                      >
                        <Ionicons
                          name="arrow-undo-outline"
                          size={18}
                          color={theme.text}
                        />
                        <Text
                          style={[
                            styles.actionMenuRowText,
                            { color: theme.text },
                          ]}
                        >
                          პასუხი
                        </Text>
                      </TouchableOpacity>

                      {actionMenuFor?.sender_id === userId &&
                        !actionMenuFor?.file_url && (
                          <TouchableOpacity
                            style={[
                              styles.actionMenuRow,
                              { borderTopColor: theme.border },
                            ]}
                            onPress={() => {
                              startEdit(actionMenuFor);
                              closeActionMenu();
                            }}
                          >
                            <Ionicons
                              name="create-outline"
                              size={18}
                              color={theme.text}
                            />
                            <Text
                              style={[
                                styles.actionMenuRowText,
                                { color: theme.text },
                              ]}
                            >
                              რედაქტირება
                            </Text>
                          </TouchableOpacity>
                        )}

                      {actionMenuFor?.sender_id === userId && (
                        <TouchableOpacity
                          style={[
                            styles.actionMenuRow,
                            { borderTopColor: theme.border },
                          ]}
                          onPress={() => {
                            deleteMessage(actionMenuFor.id);
                            closeActionMenu();
                          }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#ff3b30"
                          />
                          <Text
                            style={[
                              styles.actionMenuRowText,
                              { color: "#ff3b30" },
                            ]}
                          >
                            წაშლა
                          </Text>
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  </Animated.View>
                </TouchableWithoutFeedback>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* შეწყვეტის მიზეზის მოდალი */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={isCancelModalVisible}
            onRequestClose={() => setIsCancelModalVisible(false)}
          >
            <View
              style={[
                styles.modalOverlay,
                { backgroundColor: "rgba(0,0,0,0.65)" },
              ]}
            >
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t.cancel_modal_title || "საქმის დროზე ადრე შეწყვეტა"}
                </Text>
                <Text
                  style={{
                    color: theme.subText,
                    fontSize: 12,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  {t.cancel_modal_subtitle ||
                    "გთხოვთ მიუთითოთ მიზეზი, თუ რატომ წყვეტთ სამუშაო ხელშეკრულებას:"}
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.bg,
                      color: theme.inputText,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder={
                    t.cancel_reason_placeholder ||
                    "ჩაწერეთ კონკრეტული მიზეზი..."
                  }
                  placeholderTextColor="#666"
                  multiline={true}
                  numberOfLines={4}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 20,
                    width: "100%",
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      { borderColor: theme.border, borderWidth: 1 },
                    ]}
                    onPress={() => {
                      setIsCancelModalVisible(false);
                      setCancelReason("");
                    }}
                  >
                    <Text style={{ color: theme.subText, fontWeight: "600" }}>
                      {t.cancel || "გაუქმება"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#ff3b30" }]}
                    onPress={handleCancelJob}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                      {t.cancel_btn || "შეწყვეტა"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* შეფასების მოდალი */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={isReviewModalVisible}
            onRequestClose={() => setIsReviewModalVisible(false)}
          >
            <View
              style={[
                styles.modalOverlay,
                { backgroundColor: "rgba(0,0,0,0.65)" },
              ]}
            >
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.text, fontSize: 18, marginBottom: 4 },
                  ]}
                >
                  {t.review_modal_title || "პარტნიორის შეფასება ⭐"}
                </Text>
                <Text
                  style={{
                    color: theme.subText,
                    fontSize: 12,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  {t.review_modal_subtitle ||
                    "გთხოვთ შეაფასოთ მუშაობის ხარისხი და კომუნიკაცია"}
                </Text>

                <View
                  style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setReviewStars(star)}
                    >
                      <Ionicons
                        name={star <= reviewStars ? "star" : "star-outline"}
                        size={32}
                        color="#FFD700"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[
                    styles.singleLineInput,
                    {
                      backgroundColor: theme.bg,
                      color: theme.inputText,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder={
                    t.review_title_placeholder ||
                    "შეფასების სათაური (მაგ: საუკეთესო პარტნიორი)"
                  }
                  placeholderTextColor="#666"
                  value={reviewTitle}
                  onChangeText={setReviewTitle}
                />

                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.bg,
                      color: theme.inputText,
                      borderColor: theme.border,
                      marginTop: 12,
                    },
                  ]}
                  placeholder={
                    t.review_details_placeholder || "დაწერეთ დეტალური აღწერა..."
                  }
                  placeholderTextColor="#666"
                  multiline={true}
                  numberOfLines={4}
                  value={reviewDetails}
                  onChangeText={setReviewDetails}
                />

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 24,
                    width: "100%",
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      { borderColor: theme.border, borderWidth: 1 },
                    ]}
                    onPress={() => {
                      setIsReviewModalVisible(false);
                    }}
                    disabled={isSubmittingReview}
                  >
                    <Text style={{ color: theme.subText, fontWeight: "600" }}>
                      {t.later_btn || "მოგვიანებით"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#5B42F5" }]}
                    onPress={handleSubmitReview}
                    disabled={isSubmittingReview}
                  >
                    {isSubmittingReview ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        {t.send_btn || "გაგზავნა"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {loadingChats ? (
            <ActivityIndicator
              size="small"
              color="#5B42F5"
              style={{ marginTop: 20 }}
            />
          ) : chats.length === 0 &&
            vacancyChats.length === 0 &&
            !adminChat &&
            adminOpenChats.length === 0 &&
            adminArchived.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title={t.no_chats || "მიმოწერები არ არის"}
              subtitle="როცა ვინმეს დაუკავშირდები, აქ გამოჩნდება"
            />
          ) : (
            <>
              {adminChat && (
                <TouchableOpacity
                  style={[
                    styles.chatRow,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: "#ff3b30",
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() =>
                    onOpenAdminChat && onOpenAdminChat(adminChat.chat_id)
                  }
                >
                  <View
                    style={[styles.chatAvatar, { backgroundColor: "#ff3b30" }]}
                  >
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  </View>
                  <View style={styles.chatMeta}>
                    <Text
                      style={[styles.chatName, { color: "#ff3b30" }]}
                      numberOfLines={1}
                    >
                      ადმინისტრაცია
                    </Text>
                    <Text style={styles.chatJobTitle} numberOfLines={1}>
                      {adminChat.status === "closed"
                        ? "დახურული მიმოწერა"
                        : "⚠️ ოფიციალური შეტყობინება"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {isAdminViewer && (
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: theme.inputBg,
                    borderRadius: 12,
                    padding: 4,
                    gap: 4,
                    marginBottom: 14,
                  }}
                >
                  <TouchableOpacity
                    style={[
                      {
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 9,
                        alignItems: "center",
                      },
                      adminSection === "chats" && {
                        backgroundColor: "#ff3b30",
                      },
                    ]}
                    onPress={() => setAdminSection("chats")}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color:
                          adminSection === "chats" ? "#fff" : theme.subText,
                      }}
                    >
                      ჩათები ({adminOpenChats.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      {
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 9,
                        alignItems: "center",
                      },
                      adminSection === "archive" && {
                        backgroundColor: "#ff3b30",
                      },
                    ]}
                    onPress={() => setAdminSection("archive")}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color:
                          adminSection === "archive" ? "#fff" : theme.subText,
                      }}
                    >
                      არქივი ({adminArchived.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {isAdminViewer &&
                adminSection === "chats" &&
                adminOpenChats.map((ac) => (
                  <TouchableOpacity
                    key={ac.chat_id}
                    style={[
                      styles.chatRow,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: "#ff3b30",
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() =>
                      onOpenAdminChat && onOpenAdminChat(ac.chat_id, true)
                    }
                  >
                    <View
                      style={[
                        styles.chatAvatar,
                        { backgroundColor: "#ff3b30" },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={20}
                        color="#fff"
                      />
                    </View>
                    <View style={styles.chatMeta}>
                      <Text
                        style={[styles.chatName, { color: "#ff3b30" }]}
                        numberOfLines={1}
                      >
                        {ac.user_name}
                      </Text>
                      <Text style={styles.chatJobTitle} numberOfLines={1}>
                        {ac.last_message || "ახალი მიმოწერა"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

              {isAdminViewer &&
                adminSection === "archive" &&
                adminArchived.map((ac) => (
                  <TouchableOpacity
                    key={ac.chat_id}
                    style={[
                      styles.chatRow,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.border,
                        opacity: 0.75,
                      },
                    ]}
                    onPress={() =>
                      onOpenAdminChat && onOpenAdminChat(ac.chat_id, true)
                    }
                  >
                    <View
                      style={[
                        styles.chatAvatar,
                        { backgroundColor: theme.subText },
                      ]}
                    >
                      <Ionicons name="archive" size={18} color="#fff" />
                    </View>
                    <View style={styles.chatMeta}>
                      <Text
                        style={[styles.chatName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {ac.user_name}
                      </Text>
                      <Text style={styles.chatJobTitle} numberOfLines={1}>
                        დახურული · {ac.last_message || ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              {vacancyChats.map((vc) => (
                <TouchableOpacity
                  key={vc.id}
                  style={[
                    styles.chatRow,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => onOpenVacancyChat && onOpenVacancyChat(vc.id)}
                >
                  <View
                    style={[styles.chatAvatar, { backgroundColor: "#5B42F5" }]}
                  >
                    <Ionicons name="briefcase" size={20} color="#fff" />
                  </View>
                  <View style={styles.chatMeta}>
                    <Text
                      style={[styles.chatName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {vc.job_title}
                    </Text>
                    <Text style={styles.chatJobTitle} numberOfLines={1}>
                      {vc.status === "closed"
                        ? t.vc_closed_group
                        : t.vc_group_chat}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {chats.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  style={[
                    styles.chatRow,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setSelectedChat(chat)}
                >
                  {/* 🚀 გარეთა ჩათის სიის ავატარი სტატუსის გლოუთი */}
                  <View style={{ position: "relative" }}>
                    <View
                      style={[
                        styles.chatAvatar,
                        { backgroundColor: "#5B42F5", overflow: "hidden" },
                      ]}
                    >
                      {chat.partner_avatar ? (
                        <Image
                          source={{ uri: chat.partner_avatar }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarLetter}>
                          {chat.partner_name?.charAt(0)}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.chatListGlowDot,
                        {
                          backgroundColor: isUserOnline(chat)
                            ? "#4CD964"
                            : "#FF3B30",
                          borderColor: theme.cardBg,
                          shadowColor: isUserOnline(chat)
                            ? "#4CD964"
                            : "#FF3B30",
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.chatMeta}>
                    <Text style={[styles.chatName, { color: theme.text }]}>
                      {chat.partner_name}
                    </Text>
                    <Text style={styles.chatJobTitle} numberOfLines={1}>
                      {chat.job_state === "started" &&
                        (t.prefix_started || "⚡ მიმდინარე: ")}
                      {chat.job_state === "cancelled" &&
                        (t.prefix_cancelled || "შეწყვეტილი: ")}
                      {chat.job_state === "completed" &&
                        (t.prefix_completed || "დასრულებული: ")}
                      {chat.job_title}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: {
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "android" ? 35 : 0,
  },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  textPushedHeaderRow: { flexDirection: "row", alignItems: "center" },
  headerStaticTitle: { fontSize: 22, fontWeight: "bold" },
  headerRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(245,166,35,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.3)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerRatingText: { color: "#f5a623", fontSize: 11.5, fontWeight: "800" },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    marginTop: 4,
  },

  // 🚀 ჩათის სიისა და ჰედერის ონლაინ/ოფლაინ გლოუ წერტილების სტილები
  chatHeaderGlowDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  chatListGlowDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },

  workflowContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    marginRight: 10,
    flexShrink: 1,
  },

  statusPillText: {
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  actionButton: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#5B42F5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: "#a395f9",
    opacity: 0.7,
    elevation: 0,
    shadowOpacity: 0,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarLetter: { color: "#fff", fontSize: 16, fontWeight: "700" },
  chatMeta: { flex: 1, marginLeft: 12 },
  chatName: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  chatJobTitle: { fontSize: 12, color: "#5B42F5", fontWeight: "600" },
  inputBarWrap: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 16,
    left: 12,
    right: 12,
  },
  inputBar: {
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 52,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14.5,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5B42F5",
    justifyContent: "center",
    alignItems: "center",
  },
  crossfadeWrap: { width: 40, height: 40, marginLeft: 4 },
  crossfadeIcon: { position: "absolute", top: 0, left: 0 },

  // ახალი bubble/reply/image style-ები
  timeSeparatorRow: { alignItems: "center", marginVertical: 14 },
  timeSeparatorText: {
    fontSize: 11,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  replyQuote: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingLeft: 9,
    paddingRight: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  imageBubble: { width: 220, height: 220, borderRadius: 16 },
  fileBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    maxWidth: 240,
  },
  deletedBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  replyPreviewBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 84 : 70,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewFull: { width: "100%", height: "80%" },
  imagePreviewClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  systemMessageContainer: {
    alignSelf: "center",
    marginVertical: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    maxWidth: "85%",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  singleLineInput: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalInput: {
    width: "100%",
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  modalButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  actionMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  actionMenuCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  actionMenuEmojiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  actionMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  actionMenuRowText: { fontSize: 14, fontWeight: "600" },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8a8a92",
  },
  scrollDownBtn: {
    position: "absolute",
    bottom: 130,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  recCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  recIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
    marginHorizontal: 8,
    borderWidth: 1,
  },
  recWaveRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 22,
    marginLeft: 10,
    flex: 1,
    overflow: "hidden",
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34c759" },
  locationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  locationCard: {
    width: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  locationMapPlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: "rgba(91,66,245,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
