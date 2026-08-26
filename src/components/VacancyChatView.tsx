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
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
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
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { msgTimeLabel } from "../utils/time";
import { LanguageType, translations } from "../utils/translations";
import AnimatedIconButton from "./AnimatedIconButton";
import AnimatedMessageEntrance from "./AnimatedMessageEntrance";
import LocationPickerModal from "./LocationPickerModal";
import Toast, { ToastType } from "./Toast";
import VoiceBubble from "./VoiceBubble";

interface Props {
  chatId: string;
  onBack: () => void;
}

export default function VacancyChatView({ chatId, onBack }: Props) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);

  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const sendPopAnim = useRef(new Animated.Value(1)).current;

  const chanRef = useRef<any>(null);
  const typingTimer = useRef<any>(null);
  const typingOff = useRef<any>(null);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);

  const messageInputRef = useRef<TextInput>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 30;
  const skipAutoScrollRef = useRef(false);
  const [actionMenuFor, setActionMenuFor] = useState<any>(null);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

  // ხმოვანი შეტყობინებები
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingSlideAnim = useRef(new Animated.Value(0)).current;
  const waveBars = useRef(
    Array.from({ length: 22 }, () => new Animated.Value(0.3)),
  ).current;
  const waveLoopsRef = useRef<any[]>([]);

  useEffect(() => {
    Animated.timing(recordingSlideAnim, {
      toValue: recorderState.isRecording ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [recorderState.isRecording]);

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
      showToast(
        "error",
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
    if (!userId) return;
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
      const fileName = `${chatId}/${userId}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("chat-files")
        .upload(fileName, blob, {
          contentType: `audio/${ext}`,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("chat-files")
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("vacancy_messages")
        .insert([
          {
            chat_id: chatId,
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
    } catch (err: any) {
      showToast(
        "error",
        "ვერ გაიგზავნა",
        err.message || "ხმოვანი შეტყობინება ვერ გაიგზავნა",
      );
    } finally {
      setUploadingVoice(false);
    }
  };

  // ლოკაციის გაზიარება
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);

  const sendLocationMessage = async (lat: number, lng: number) => {
    if (!userId) return;
    setLocationPickerVisible(false);
    setSendingLocation(true);
    try {
      const { data, error } = await supabase
        .from("vacancy_messages")
        .insert([
          {
            chat_id: chatId,
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
    } catch (err: any) {
      showToast(
        "error",
        "ვერ გაიგზავნა",
        err.message || "ლოკაცია ვერ გაიგზავნა",
      );
    } finally {
      setSendingLocation(false);
    }
  };

  // სურათის გაზიარება
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const pickAndSendImage = async () => {
    if (!userId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast(
        "error",
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
      const fileName = `${chatId}/${userId}_${Date.now()}.${ext}`;

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
        .from("vacancy_messages")
        .insert([
          {
            chat_id: chatId,
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
    } catch (err: any) {
      showToast("error", "ვერ აიტვირთა", err.message || "სურათი ვერ აიტვირთა");
    } finally {
      setUploadingImage(false);
    }
  };

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.6)).current;
  const menuTranslateY = useRef(new Animated.Value(50)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const rowsAnim = useRef(new Animated.Value(0)).current;
  const emojiScales = useRef(
    REACTION_EMOJIS.map(() => new Animated.Value(0)),
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

  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // შეფასება
  const [reviewFor, setReviewFor] = useState<any>(null); // ვის ვაფასებთ
  const [stars, setStars] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reviewed, setReviewed] = useState<string[]>([]); // ვინც უკვე შევაფასეთ

  const listRef = useRef<FlatList>(null);

  const [toast, setToast] = useState<{
    visible: boolean;
    type: ToastType;
    title: string;
    message?: string;
  }>({
    visible: false,
    type: "success",
    title: "",
  });
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToast({ visible: true, type, title, message });
  };

  const language = useAuthStore((state: any) => state.language) || "ka";
  const t: any = translations[language as LanguageType] || translations.ka;

  const theme = {
    bg: isDarkMode ? "#0d0d11" : "#f5f5f7",
    cardBg: isDarkMode ? "#16161a" : "#ffffff",
    text: isDarkMode ? "#fff" : "#1c1c1e",
    subText: isDarkMode ? "#666" : "#8e8e93",
    border: isDarkMode ? "#222227" : "#e5e5ea",
    inputBg: isDarkMode ? "#1c1c22" : "#f2f2f7",
    accent: "#5B42F5",
    green: "#34c759",
    red: "#ff3b30",
  };

  const isCompany = chat?.company_id === userId;
  const isClosed = chat?.status === "closed";

  useEffect(() => {
    loadAll();

    const sub = supabase
      .channel(`vacancy_chat_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vacancy_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as any).id)
              ? prev
              : [...prev, payload.new],
          );
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (!userId || payload.user_id === userId) return;
        setTypingUserId(payload.user_id);
        clearTimeout(typingOff.current);
        typingOff.current = setTimeout(() => setTypingUserId(null), 3000);
      })
      .subscribe();

    chanRef.current = sub;

    return () => {
      clearTimeout(typingOff.current);
      supabase.removeChannel(sub);
    };
  }, [chatId]);

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

  const loadAll = async () => {
    try {
      setLoading(true);

      // ჩატი
      const { data: c, error } = await supabase
        .from("vacancy_chats")
        .select("*")
        .eq("id", chatId)
        .single();
      if (error) throw error;
      setChat(c);

      // ვაკანსია
      const { data: j } = await supabase
        .from("jobs")
        .select("id, title, position_title")
        .eq("id", c.job_id)
        .maybeSingle();
      setJob(j);

      // კომპანია
      const { data: comp } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("id", c.company_id)
        .maybeSingle();
      setCompany(comp);

      // მონაწილეები
      const { data: mems } = await supabase
        .from("vacancy_chat_members")
        .select("user_id")
        .eq("chat_id", chatId);

      const ids = (mems || []).map((m: any) => m.user_id);
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", ids);
        setMembers(profs || []);
      } else {
        setMembers([]);
      }

      // შეტყობინებები
      const { data: msgsDesc } = await supabase
        .from("vacancy_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const msgs = (msgsDesc || []).slice().reverse();
      setMessages(msgs);
      setHasMore((msgsDesc || []).length === PAGE_SIZE);

      if (msgs.length > 0) {
        const { data: reacts } = await supabase
          .from("vacancy_message_reactions")
          .select("*")
          .in(
            "message_id",
            msgs.map((m: any) => m.id),
          );
        const grouped: Record<string, any[]> = {};
        (reacts || []).forEach((r: any) => {
          if (!grouped[r.message_id]) grouped[r.message_id] = [];
          grouped[r.message_id].push(r);
        });
        setReactions(grouped);
      }

      // ვინც უკვე შევაფასეთ
      const { data: revs } = await supabase
        .from("reviews")
        .select("target_id")
        .eq("job_id", c.job_id)
        .eq("reviewer_id", userId);
      setReviewed((revs || []).map((r: any) => r.target_id));
    } catch (err: any) {
      showToast("error", "ვერ ჩაიტვირთა", err.message);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending || isClosed) return;

    const replyId = replyTo?.id || null;

    try {
      setSending(true);
      setText("");
      setReplyTo(null);

      sendPopAnim.setValue(0.6);
      Animated.spring(sendPopAnim, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: true,
      }).start();

      const { data, error } = await supabase
        .from("vacancy_messages")
        .insert([
          {
            chat_id: chatId,
            sender_id: userId,
            text: body,
            reply_to: replyId,
          },
        ])
        .select()
        .single();
      if (error) throw error;

      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
    } catch (err: any) {
      showToast("error", "ვერ გაიგზავნა", err.message);
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    skipAutoScrollRef.current = true;
    try {
      const oldest = messages[0].created_at;
      const { data } = await supabase
        .from("vacancy_messages")
        .select("*")
        .eq("chat_id", chatId)
        .lt("created_at", oldest)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const older = (data || []).slice().reverse();
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);

        const { data: reacts } = await supabase
          .from("vacancy_message_reactions")
          .select("*")
          .in(
            "message_id",
            older.map((m: any) => m.id),
          );
        if (reacts && reacts.length > 0) {
          setReactions((prev) => {
            const grouped = { ...prev };
            reacts.forEach((r: any) => {
              if (!grouped[r.message_id]) grouped[r.message_id] = [];
              grouped[r.message_id] = [...grouped[r.message_id], r];
            });
            return grouped;
          });
        }
      }
      setHasMore((data || []).length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
      setTimeout(() => {
        skipAutoScrollRef.current = false;
      }, 300);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    setActionMenuFor(null);
    const myExisting = (reactions[messageId] || []).find(
      (r) => r.user_id === userId,
    );

    if (myExisting) {
      await supabase
        .from("vacancy_message_reactions")
        .delete()
        .eq("id", myExisting.id);
      setReactions((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(
          (r) => r.id !== myExisting.id,
        ),
      }));
      if (myExisting.emoji === emoji) return;
    }

    const { data } = await supabase
      .from("vacancy_message_reactions")
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
      .from("vacancy_messages")
      .update({ text: null, is_deleted: true })
      .eq("id", messageId);
    if (error) {
      showToast("error", "ვერ წაიშალა", error.message);
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
      .from("vacancy_messages")
      .update({ text: editText.trim(), is_edited: true })
      .eq("id", editingId);
    if (error) {
      showToast("error", "ვერ შეინახა", error.message);
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
  };

  const closeChat = async () => {
    try {
      setClosing(true);
      const { error } = await supabase
        .from("vacancy_chats")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", chatId);
      if (error) throw error;

      setChat({ ...chat, status: "closed" });
      setConfirmClose(false);
      showToast("success", "ჩატი დაიხურა", "ახლა შეგიძლია შეფასებების დაწერა");
    } catch (err: any) {
      showToast("error", "ვერ დაიხურა", err.message);
    } finally {
      setClosing(false);
    }
  };

  const openReview = (person: any) => {
    setShowRatePanel(false);
    setReviewFor(person);
    setStars(5);
    setReviewTitle("");
    setReviewText("");
  };

  const submitReview = async () => {
    if (!reviewFor || !job) return;
    if (!reviewTitle.trim()) {
      showToast("error", "სათაური აკლია", "");
      return;
    }

    try {
      setSavingReview(true);

      const { error } = await supabase.from("reviews").insert([
        {
          job_id: job.id,
          job_title: job.position_title || job.title,
          reviewer_id: userId,
          reviewer_name: userName,
          target_id: reviewFor.id,
          target_name: reviewFor.name,
          review_title: reviewTitle.trim(),
          review_details: reviewText.trim(),
          stars,
          is_negative_cancel: false,
        },
      ]);
      if (error) throw error;

      setReviewed((prev) => [...prev, reviewFor.id]);
      showToast("success", "შეფასება დაიწერა", reviewFor.name);
      setReviewFor(null);
    } catch (err: any) {
      showToast("error", "ვერ დაიწერა", err.message);
    } finally {
      setSavingReview(false);
    }
  };

  // ვის შეიძლება შეაფასო
  const reviewTargets = isCompany ? members : company ? [company] : [];
  const [showRatePanel, setShowRatePanel] = useState(false);
  const senderName = (id: string) => {
    if (id === chat?.company_id) return company?.name || "კომპანია";
    return members.find((m) => m.id === id)?.name || "მონაწილე";
  };

  const senderAvatar = (id: string) => {
    if (id === chat?.company_id) return company?.avatar_url;
    return members.find((m) => m.id === id)?.avatar_url;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* ---------- ჰედერი ---------- */}
      <SafeAreaView
        style={[
          styles.header,
          { backgroundColor: theme.cardBg, borderColor: theme.border },
        ]}
      >
        <View style={styles.headerTop}>
          <AnimatedIconButton onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.accent} />
          </AnimatedIconButton>

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.headerTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {job?.position_title || job?.title || t.vc_vacancy_fallback}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 3,
                gap: 6,
              }}
            >
              <Text
                style={[
                  styles.headerSub,
                  { color: theme.subText, marginTop: 0 },
                ]}
              >
                {members.length} {t.vc_candidates}
              </Text>
              <View
                style={[
                  styles.vacancyStatusPill,
                  {
                    backgroundColor:
                      (isClosed ? theme.red : theme.green) + "1F",
                    borderColor: (isClosed ? theme.red : theme.green) + "40",
                  },
                ]}
              >
                <Ionicons
                  name={isClosed ? "lock-closed" : "radio-button-on"}
                  size={9}
                  color={isClosed ? theme.red : theme.green}
                />
                <Text
                  style={[
                    styles.vacancyStatusPillText,
                    { color: isClosed ? theme.red : theme.green },
                  ]}
                >
                  {isClosed
                    ? t.vc_closed_suffix || "დახურულია"
                    : t.vc_active_label || "აქტიური"}
                </Text>
              </View>
            </View>
          </View>

          {isCompany && !isClosed && (
            <AnimatedIconButton
              style={[
                styles.closeBtn,
                {
                  backgroundColor: "rgba(255,59,48,0.12)",
                  shadowColor: theme.red,
                },
              ]}
              onPress={() => setConfirmClose(true)}
            >
              <Ionicons name="lock-closed" size={16} color={theme.red} />
            </AnimatedIconButton>
          )}

          {isClosed && (
            <AnimatedIconButton
              style={[
                styles.closeBtn,
                {
                  backgroundColor: "rgba(255,204,0,0.15)",
                  shadowColor: "#ffcc00",
                },
              ]}
              onPress={() => setShowRatePanel(true)}
            >
              <Ionicons name="star" size={16} color="#ffcc00" />
            </AnimatedIconButton>
          )}
        </View>

        {/* მონაწილეები */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.memberStrip}
        >
          {company && (
            <View style={styles.memberChip}>
              {company.avatar_url ? (
                <Image
                  source={{ uri: company.avatar_url }}
                  style={styles.memberAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.memberAvatarEmpty,
                    { backgroundColor: "rgba(91,66,245,0.15)" },
                  ]}
                >
                  <Ionicons name="business" size={14} color={theme.accent} />
                </View>
              )}
              <Text
                style={[styles.memberName, { color: theme.subText }]}
                numberOfLines={1}
              >
                {company.name}
              </Text>
            </View>
          )}

          {members.map((m) => (
            <View key={m.id} style={styles.memberChip}>
              {m.avatar_url ? (
                <Image
                  source={{ uri: m.avatar_url }}
                  style={[styles.memberAvatar, { borderColor: theme.border }]}
                />
              ) : (
                <View
                  style={[
                    styles.memberAvatarEmpty,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name="person" size={13} color={theme.subText} />
                </View>
              )}
              <Text
                style={[styles.memberName, { color: theme.subText }]}
                numberOfLines={1}
              >
                {m.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* ---------- შეტყობინებები ---------- */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.msgList}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        scrollEventThrottle={100}
        onScroll={(e) => {
          if (e.nativeEvent.contentOffset.y < 60) loadOlderMessages();
        }}
        onContentSizeChange={() => {
          if (skipAutoScrollRef.current) return;
          listRef.current?.scrollToEnd({ animated: true });
        }}
        ListHeaderComponent={
          loadingMore ? (
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyMsg}>
            <Ionicons
              name="chatbubbles-outline"
              size={38}
              color={theme.subText}
            />
            <Text style={[styles.emptyMsgText, { color: theme.subText }]}>
              {isCompany ? t.vc_empty_company : t.vc_empty_worker}
            </Text>
          </View>
        }
        ListFooterComponent={
          typingUserId ? (
            <View style={styles.msgRow}>
              {senderAvatar(typingUserId) ? (
                <Image
                  source={{ uri: senderAvatar(typingUserId) }}
                  style={[styles.msgAvatar, { borderColor: theme.border }]}
                />
              ) : (
                <View
                  style={[
                    styles.msgAvatarEmpty,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      typingUserId === chat?.company_id ? "business" : "person"
                    }
                    size={13}
                    color={theme.subText}
                  />
                </View>
              )}
              <View
                style={[
                  styles.typingBubble,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.typingName,
                    {
                      color:
                        typingUserId === chat?.company_id
                          ? theme.accent
                          : theme.subText,
                    },
                  ]}
                >
                  {senderName(typingUserId)}
                </Text>
                <View style={styles.typingDotsRow}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === userId;
          const fromCompany = item.sender_id === chat?.company_id;
          const originalReply = item.reply_to
            ? messages.find((m) => m.id === item.reply_to)
            : null;

          return (
            <AnimatedMessageEntrance>
              <View
                style={[styles.msgRow, mine && { justifyContent: "flex-end" }]}
              >
                {!mine &&
                  (senderAvatar(item.sender_id) ? (
                    <Image
                      source={{ uri: senderAvatar(item.sender_id) }}
                      style={[styles.msgAvatar, { borderColor: theme.border }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.msgAvatarEmpty,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={fromCompany ? "business" : "person"}
                        size={13}
                        color={theme.subText}
                      />
                    </View>
                  ))}

                <View style={{ maxWidth: "75%" }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={() =>
                      !item.is_deleted && !isClosed && setActionMenuFor(item)
                    }
                  >
                    {item.is_deleted ? (
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
                    ) : (
                      <View
                        style={[
                          styles.bubble,
                          { shadowColor: mine ? theme.accent : "#000" },
                          mine
                            ? {
                                backgroundColor: theme.accent,
                                borderBottomRightRadius: 4,
                              }
                            : {
                                backgroundColor: theme.cardBg,
                                borderBottomLeftRadius: 4,
                                borderWidth: 1,
                                borderColor: theme.border,
                              },
                        ]}
                      >
                        {!mine && (
                          <Text
                            style={[
                              styles.bubbleName,
                              {
                                color: fromCompany
                                  ? theme.accent
                                  : theme.subText,
                              },
                            ]}
                          >
                            {senderName(item.sender_id)}
                          </Text>
                        )}

                        {originalReply && (
                          <View
                            style={[
                              styles.replyQuote,
                              {
                                borderLeftColor: mine
                                  ? "rgba(255,255,255,0.7)"
                                  : theme.accent,
                                backgroundColor: mine
                                  ? "rgba(255,255,255,0.14)"
                                  : theme.bg,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: mine ? "#fff" : theme.accent,
                                marginBottom: 2,
                              }}
                            >
                              {originalReply.sender_id === userId
                                ? "შენ"
                                : senderName(originalReply.sender_id)}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: mine
                                  ? "rgba(255,255,255,0.85)"
                                  : theme.subText,
                              }}
                              numberOfLines={1}
                            >
                              {originalReply.is_deleted
                                ? "წაშლილია"
                                : originalReply.text ||
                                  (originalReply.file_url ? "📎 ფაილი" : "")}
                            </Text>
                          </View>
                        )}

                        {typeof item.text === "string" &&
                        /^LOCATION:-?\d+\.?\d*:-?\d+\.?\d*$/.test(item.text) ? (
                          (() => {
                            const [, lat, lng] = item.text.split(":");
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
                                    color={theme.accent}
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
                                    ლოკაცია
                                  </Text>
                                  <Text
                                    style={{
                                      color: theme.accent,
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
                        ) : item.file_url &&
                          item.file_type?.startsWith("audio/") ? (
                          <VoiceBubble
                            uri={item.file_url}
                            mine={mine}
                            incomingBg={theme.cardBg}
                            textColor={theme.text}
                          />
                        ) : item.file_url &&
                          item.file_type?.startsWith("image/") ? (
                          <TouchableOpacity
                            onPress={() => setPreviewImage(item.file_url)}
                            activeOpacity={0.9}
                          >
                            <Image
                              source={{ uri: item.file_url }}
                              style={styles.imageBubble}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : editingId === item.id ? (
                          <View style={{ minWidth: 160 }}>
                            <TextInput
                              autoFocus
                              value={editText}
                              onChangeText={setEditText}
                              style={{
                                color: mine ? "#fff" : theme.text,
                                fontSize: 14,
                                padding: 0,
                                minWidth: 140,
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
                                    color: mine
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
                                    color: mine ? "#fff" : theme.accent,
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
                            style={[
                              styles.bubbleText,
                              { color: mine ? "#fff" : theme.text },
                            ]}
                          >
                            {item.text}
                            {item.is_edited && (
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

                  {!item.is_deleted && (
                    <Text
                      style={[
                        styles.bubbleTime,
                        {
                          color: theme.subText,
                          textAlign: mine ? "right" : "left",
                        },
                      ]}
                    >
                      {msgTimeLabel(item.created_at)}
                    </Text>
                  )}

                  {(reactions[item.id] || []).length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 5,
                        alignSelf: mine ? "flex-end" : "flex-start",
                        marginTop: 4,
                      }}
                    >
                      {Object.entries(
                        (reactions[item.id] || []).reduce(
                          (acc: Record<string, number>, r: any) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          },
                          {},
                        ),
                      ).map(([emoji, count]) => {
                        const mineReacted = (reactions[item.id] || []).some(
                          (r) => r.user_id === userId && r.emoji === emoji,
                        );
                        return (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() => toggleReaction(item.id, emoji)}
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
                                ? theme.accent
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
              </View>
            </AnimatedMessageEntrance>
          );
        }}
      />

      {/* ---------- ქვედა ნაწილი ---------- */}
      {isClosed ? (
        <Modal
          visible={showRatePanel}
          transparent
          statusBarTranslucent
          animationType="slide"
          onRequestClose={() => setShowRatePanel(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
            activeOpacity={1}
            onPress={() => setShowRatePanel(false)}
          />
          <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
            <View
              style={[styles.sheetHandle, { backgroundColor: theme.border }]}
            />

            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {isCompany ? t.vc_rate_candidates : t.vc_rate_company}
            </Text>
            <Text style={[styles.sheetSub, { color: theme.subText }]}>
              {t.vc_rate_pick}
            </Text>

            <ScrollView style={{ maxHeight: 320, marginTop: 14 }}>
              {reviewTargets.map((p) => {
                const done = reviewed.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.rateRow, { borderColor: theme.border }]}
                    onPress={() => !done && openReview(p)}
                    disabled={done}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ratePillText, { color: theme.green }]}>
                      {t.vc_rated}
                    </Text>
                    {p.avatar_url ? (
                      <Image
                        source={{ uri: p.avatar_url }}
                        style={styles.rateAvatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.rateAvatar,
                          {
                            backgroundColor: theme.inputBg,
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <Ionicons
                          name="person"
                          size={18}
                          color={theme.subText}
                        />
                      </View>
                    )}

                    <Text
                      style={[styles.rateName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>

                    {done ? (
                      <View
                        style={[
                          styles.ratePill,
                          { backgroundColor: "rgba(52,199,89,0.12)" },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={15}
                          color={theme.green}
                        />
                        <Text
                          style={[styles.ratePillText, { color: theme.green }]}
                        >
                          შეფასდა
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.ratePill,
                          { backgroundColor: "rgba(255,204,0,0.15)" },
                        ]}
                      >
                        <Ionicons name="star" size={15} color="#ffcc00" />
                        <Text
                          style={[styles.ratePillText, { color: "#c99a00" }]}
                        >
                          {t.vc_rate_btn}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.sheetClose, { backgroundColor: theme.inputBg }]}
              onPress={() => setShowRatePanel(false)}
            >
              <Text style={[styles.sheetCloseText, { color: theme.subText }]}>
                {t.vc_close}
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      ) : (
        <>
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
                  backgroundColor: theme.accent,
                  marginRight: 10,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "700",
                    color: theme.accent,
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

          <View
            style={[
              styles.inputBar,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
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
                  <Ionicons name="trash-outline" size={20} color={theme.red} />
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
                  style={[styles.sendBtn, { backgroundColor: theme.accent }]}
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
                <AnimatedIconButton
                  onPress={pickAndSendImage}
                  disabled={uploadingImage}
                  style={[styles.attachBtn, { backgroundColor: theme.inputBg }]}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <Ionicons
                      name="image-outline"
                      size={20}
                      color={theme.accent}
                    />
                  )}
                </AnimatedIconButton>

                <AnimatedIconButton
                  onPress={() => setLocationPickerVisible(true)}
                  disabled={sendingLocation}
                  style={[styles.attachBtn, { backgroundColor: theme.inputBg }]}
                >
                  {sendingLocation ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={theme.accent}
                    />
                  )}
                </AnimatedIconButton>

                <AnimatedIconButton
                  onPress={startRecording}
                  style={[styles.attachBtn, { backgroundColor: theme.inputBg }]}
                >
                  <Ionicons name="mic-outline" size={20} color={theme.accent} />
                </AnimatedIconButton>

                <TextInput
                  ref={messageInputRef}
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, color: theme.text },
                  ]}
                  placeholder={t.vc_write_placeholder}
                  placeholderTextColor="#555"
                  value={text}
                  onChangeText={(val) => {
                    setText(val);
                    notifyTyping();
                  }}
                  multiline
                />
                <AnimatedIconButton
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: text.trim()
                        ? theme.accent
                        : theme.inputBg,
                    },
                  ]}
                  onPress={send}
                  disabled={!text.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Animated.View
                      style={{ transform: [{ scale: sendPopAnim }] }}
                    >
                      <Ionicons
                        name="send"
                        size={18}
                        color={text.trim() ? "#fff" : theme.subText}
                      />
                    </Animated.View>
                  )}
                </AnimatedIconButton>
              </>
            )}
          </View>

          <LocationPickerModal
            visible={locationPickerVisible}
            onClose={() => setLocationPickerVisible(false)}
            onSelect={sendLocationMessage}
          />

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
        </>
      )}

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
                        actionMenuFor && toggleReaction(actionMenuFor.id, emoji)
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
                                outputRange: ["0deg", "-18deg", "8deg", "0deg"],
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
                      setTimeout(() => messageInputRef.current?.focus(), 260);
                    }}
                  >
                    <Ionicons
                      name="arrow-undo-outline"
                      size={18}
                      color={theme.text}
                    />
                    <Text
                      style={[styles.actionMenuRowText, { color: theme.text }]}
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
                        style={[styles.actionMenuRowText, { color: "#ff3b30" }]}
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

      {/* ---------- ჩატის დახურვის დადასტურება ---------- */}
      <Modal
        visible={confirmClose}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmClose(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.modalIcon,
                { backgroundColor: "rgba(255,59,48,0.12)" },
              ]}
            >
              <Ionicons name="lock-closed" size={28} color={theme.red} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              ჩატის დახურვა
            </Text>
            <Text style={[styles.modalMsg, { color: theme.subText }]}>
              დახურვის შემდეგ წერა შეუძლებელი იქნება.{"\n"}ორივე მხარე შეძლებს
              შეფასების დაწერას.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.inputBg }]}
                onPress={() => setConfirmClose(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.subText }]}>
                  გაუქმება
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.red }]}
                onPress={closeChat}
                disabled={closing}
              >
                {closing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    დახურვა
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- შეფასების ფანჯარა ---------- */}
      <Modal
        visible={!!reviewFor}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewFor(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.reviewCard,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {reviewFor?.name}
            </Text>

            {/* ვარსკვლავები */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStars(s)}
                  hitSlop={4}
                >
                  <Ionicons
                    name={s <= stars ? "star" : "star-outline"}
                    size={32}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[
                styles.reviewInput,
                {
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="სათაური *"
              placeholderTextColor="#555"
              value={reviewTitle}
              onChangeText={setReviewTitle}
            />

            <TextInput
              style={[
                styles.reviewArea,
                {
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="დეტალები (არასავალდებულო)"
              placeholderTextColor="#555"
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.inputBg }]}
                onPress={() => setReviewFor(null)}
              >
                <Text style={[styles.modalBtnText, { color: theme.subText }]}>
                  გაუქმება
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}
                onPress={submitReview}
                disabled={savingReview}
              >
                {savingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    გაგზავნა
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 95,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800" },
  sheetSub: { fontSize: 12.5, marginTop: 4 },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rateAvatar: { width: 40, height: 40, borderRadius: 20 },
  rateName: { flex: 1, fontSize: 14.5, fontWeight: "700" },
  ratePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ratePillText: { fontSize: 12, fontWeight: "700" },
  sheetClose: {
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  sheetCloseText: { fontSize: 14, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16.5, fontWeight: "800" },
  headerSub: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  vacancyStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  vacancyStatusPillText: { fontSize: 10, fontWeight: "800" },

  memberStrip: { marginTop: 12 },
  memberChip: { alignItems: "center", marginRight: 16, width: 56 },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "rgba(91,66,245,0.35)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  memberAvatarEmpty: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(91,66,245,0.35)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  memberName: {
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },

  msgList: { padding: 14, paddingBottom: 20, flexGrow: 1 },
  emptyMsg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingTop: 60,
  },
  emptyMsgText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  msgAvatarEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleName: { fontSize: 11, fontWeight: "800", marginBottom: 3 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTime: { fontSize: 10, fontWeight: "600", marginTop: 3 },
  replyQuote: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  deletedBubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
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
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  typingName: { fontSize: 12, fontWeight: "700" },
  typingDotsRow: { flexDirection: "row", gap: 4 },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8a8a92",
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 88,
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
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
  imageBubble: { width: 200, height: 200, borderRadius: 14 },
  locationCard: {
    width: 200,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  locationMapPlaceholder: {
    width: "100%",
    height: 100,
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

  bottomBar: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 26,
    borderTopWidth: 1,
  },
  closedTitle: { fontSize: 14, fontWeight: "800" },
  reviewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    marginRight: 8,
    maxWidth: 160,
  },
  reviewChipText: { fontSize: 12.5, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  modalMsg: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 18 },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnText: { fontSize: 14, fontWeight: "700" },

  reviewCard: { width: "100%", borderRadius: 22, borderWidth: 1, padding: 22 },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 18,
  },
  reviewInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  reviewArea: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
  },
});
