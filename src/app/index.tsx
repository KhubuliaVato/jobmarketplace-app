import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AdminChatView from "../components/AdminChatView";
import AdminPanelView from "../components/AdminPanelView";
import CoverPickerView from "../components/CoverPickerView";
import VacancyDetailView from "../components/VacancyDetailView";
import { usePresence } from "../hooks/use-presence";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { THEME_PALETTES } from "../utils/bgThemes";

// კომპონენტების იმპორტები
import ApplicationsInboxView from "../components/ApplicationsInboxView";
import BadgeSelectView from "../components/BadgeSelectView";
import BlockedUsersView from "../components/BlockedUsersView";
import ChatView from "../components/ChatView";
import CreateJobView from "../components/CreateJobView";
import CreateVacancyView from "../components/CreateVacancyView";
import EditProfileView from "../components/EditProfileView";
import FAQView from "../components/FAQView"; // 🚀 შემოტანილია FAQ გვერდი
import HomeFeedView from "../components/HomeFeedView";
import IncomingRequestsView from "../components/IncomingRequestsView";
import LegalView from "../components/LegalView";
import LoginView from "../components/LoginView";
import MyJobsView from "../components/MyJobsView";
import PremiumView from "../components/PremiumView";
import ProfileView from "../components/ProfileView";
import RegisterView from "../components/RegisterView";
import SecuritySettingsView from "../components/SecuritySettingsView";
import SettingsView from "../components/SettingsView";
import StatsView from "../components/StatsView";
import VacancyChatView from "../components/VacancyChatView";

import CompanyJobsView from "../components/jobfeed/CompanyJobsView";
import FollowingJobsView from "../components/jobfeed/FollowingJobsView";
import PrivateJobsView from "../components/jobfeed/PrivateJobsView";
import UrgentJobsView from "../components/jobfeed/UrgentJobsView";
import SwipeJobsView from "../components/SwipeJobsView";
import { LanguageType, translations } from "../utils/translations"; // 🚀
//  შემოტანილია ენის მხარდაჭერა
import ForcePasswordView from "../components/ForcePasswordView";

// 🔧 ქვედა ნავიგაციის ღილაკი — აქტიურს capsule (icon+ტექსტი), დანარჩენს მხოლოდ icon
function NavTabButton({
  active,
  onPress,
  icon,
  iconActive,
  label,
  color,
  subColor,
}: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.85}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={[
            navStyles.pill,
            {
              backgroundColor: active ? color : "transparent",
              paddingHorizontal: active ? 16 : 11,
            },
          ]}
        >
          <Ionicons
            name={active ? iconActive : icon}
            size={20}
            color={active ? "#fff" : subColor}
          />
          {active && <Text style={navStyles.tabText}>{label}</Text>}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const navStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingVertical: 11,
    borderRadius: 999,
    overflow: "hidden",
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

export default function HomeScreen() {
  const userId = useAuthStore((state) => state.userId);
  usePresence(); // 🔧 online/offline სტატუსის მართვა
  const userName = useAuthStore((state) => state.userName);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  const mustChangePassword = useAuthStore((state) => state.mustChangePassword);
  const userRole = useAuthStore((state) => state.userRole);
  const setMustChangePassword = useAuthStore(
    (state) => state.setMustChangePassword,
  );
  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || "ka";

  // 🚀 დაზღვეულია any-ით, რათა მკაცრმა TypeScript-მა აღარ გამოიტანოს ერორები კომპილაციისას
  const t: any = translations[language as LanguageType] || translations.ka;

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const openSearch = () => {
    setShowSearch(true);
    setIsSearchFocused(true);
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
    setTimeout(() => searchInputRef.current?.focus(), 120);
  };

  const closeSearch = () => {
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowSearch(false);
      setIsSearchFocused(false);
      setSearchQuery("");
      setSearchedUsers([]);
    });
  };
  const [activeTab, setActiveTab] = useState("home");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [selectedCategory, setSelectedCategory] = useState<
    "company" | "private" | "urgent" | "following" | null
  >(null);

  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(
    null,
  );

  // იუზერების ძებნისა და ისტორიისთვის
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [inspectJob, setInspectJob] = useState<any>(null);
  const [adminChatId, setAdminChatId] = useState<string | null>(null);
  const [legalTab, setLegalTab] = useState<"terms" | "privacy">("terms");

  const openAdminChat = async (targetUserId: string) => {
    const { data, error } = await supabase.rpc("admin_open_chat", {
      p_user_id: targetUserId,
    });
    if (!error && data) {
      setAdminChatId(data);
      setActiveTab("admin_chat");
    }
  };

  const openJobById = async (jobId: string) => {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (data) setInspectJob(data);
  };
  const [vacancyChatId, setVacancyChatId] = useState<string | null>(null);
  const [chatConversationOpen, setChatConversationOpen] = useState(false);
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
    searchBg: isDarkMode ? "#222227" : "#e5e5ea",
    inputText: isDarkMode ? "#fff" : "#000",
  };

  useEffect(() => {
    if (userId) {
      fetchCurrentUserAvatar();
    } else {
      setCurrentUserAvatar(null);
    }
  }, [userId, activeTab]);

  const fetchCurrentUserAvatar = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      if (data && data.avatar_url) {
        setCurrentUserAvatar(data.avatar_url);
      }
    } catch (err) {
      console.log("ავატარის ჩატვირთვის შეცდომა ჰედერისთვის:", err);
    }
  };

  const handleUserSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchedUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, avatar_url, sphere")
        .ilike("name", `%${text}%`)
        .limit(10);

      if (!error && data) {
        setSearchedUsers(data);
      }
    } catch (err) {
      console.log("ძებნის შეცდომა:", err);
    }
  };

  const handleSelectUser = (user: any) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((u) => u.id !== user.id);
      return [user, ...filtered].slice(0, 6);
    });

    setSearchQuery("");
    setSearchedUsers([]);
    setIsSearchFocused(false);

    setInspectUserId(user.id);
    setActiveTab("profile_inspect");
  };

  const handleRemoveRecent = (id: string) => {
    setRecentSearches((prev) => prev.filter((u) => u.id !== id));
  };

  const renderHeaderContent = () => {
    if (activeTab === "auth")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            {authMode === "login"
              ? t.auth_mode_login || "ავტორიზაცია"
              : t.auth_mode_register || "რეგისტრაცია"}
          </Text>
        </View>
      );
    if (
      activeTab === "category_view" ||
      activeTab === "faq" ||
      activeTab === "legal"
    )
      return null;
    if (activeTab === "create")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            {t.add_ad_header || "განცხადების დამატება"}
          </Text>
        </View>
      );
    if (activeTab === "settings")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            {t.settings || "პარამეტრები"}
          </Text>
        </View>
      );
    if (activeTab === "security_settings")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            {t.security_header || "უსაფრთხოება"}
          </Text>
        </View>
      );
    if (activeTab === "blocked_users")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            დაბლოკილები
          </Text>
        </View>
      );
    if (activeTab === "badge_select")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            ჩემი ბეიჯები
          </Text>
        </View>
      );
    if (activeTab === "edit_profile")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            {t.edit_profile || "პროფილის შეცვლა"}
          </Text>
        </View>
      );
    if (activeTab === "profile" || activeTab === "profile_inspect")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            {activeTab === "profile"
              ? t.my_profile_header || "ჩემი პროფილი"
              : t.user_profile_header || "მომხმარებლის პროფილი"}
          </Text>
        </View>
      );
    if (activeTab === "incoming_requests")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            {t.incoming_requests || "შემოსული მოთხოვნები"}
          </Text>
        </View>
      );
    if (activeTab === "admin_chat" || activeTab === "admin_chat_user")
      return null;
    if (activeTab === "legal")
      return (
        <View style={styles.textPushedHeaderRow}>
          <Text style={[styles.headerStaticTitle, { color: theme.text }]}>
            {legalTab === "terms"
              ? t.terms_header || "პირობები"
              : t.privacy_header || "კონფიდენციალურობა"}
          </Text>
        </View>
      );

    return (
      <>
        <View style={[styles.topRow, { minHeight: 44 }]}>
          {!showSearch && (
            <>
              <View style={styles.logoRow}>
                <Image
                  source={require("../../assets/images/adaptive_foreground.png")}
                  style={styles.logoIconBox}
                  resizeMode="contain"
                />
                <Text style={[styles.logoText, { color: theme.text }]}>
                  Free<Text style={styles.logoAccent}>Job</Text>
                </Text>
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <TouchableOpacity
                  onPress={openSearch}
                  style={[
                    styles.searchTriggerBtn,
                    { backgroundColor: theme.searchBg },
                  ]}
                >
                  <Ionicons name="search" size={22} color={theme.subText} />
                </TouchableOpacity>

                {userId && (
                  <View style={styles.profileContainer}>
                    {currentUserAvatar ? (
                      <Image
                        source={{ uri: currentUserAvatar }}
                        style={styles.topHeaderAvatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.topHeaderAvatar,
                          {
                            backgroundColor: "#5B42F5",
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <Ionicons name="person" size={16} color="#fff" />
                      </View>
                    )}
                    <Text
                      style={[styles.usernameText, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {userName || t.default_user_fallback || "მომხმარებელი"}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {showSearch && (
            <Animated.View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.searchBg,
                  flex: 1,
                  opacity: searchAnim,
                  transform: [
                    {
                      translateY: searchAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={22}
                color={theme.subText}
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: theme.inputText }]}
                placeholder={
                  t.search_user_placeholder || "მოძებნე მომხმარებელი..."
                }
                placeholderTextColor={isDarkMode ? "#666" : "#999"}
                value={searchQuery}
                onChangeText={handleUserSearch}
              />
              <TouchableOpacity
                onPress={closeSearch}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color={theme.subText} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </>
    );
  };

  const renderMainContent = () => {
    // 🔧 თუ პაროლის შეცვლა სავალდებულოა — სხვა არაფერი ჩანს
    if (userId && mustChangePassword) {
      return <ForcePasswordView onDone={() => setMustChangePassword(false)} />;
    }
    if (activeTab === "vacancy_chat" && vacancyChatId) {
      return (
        <VacancyChatView
          chatId={vacancyChatId}
          onBack={() => setActiveTab("chat")}
        />
      );
    }

    // ... დანარჩენი (რაც უკვე იყო)
    if (isSearchFocused && activeTab === "home") {
      return (
        <ScrollView
          style={[styles.searchResultsWrapper, { backgroundColor: theme.bg }]}
          keyboardShouldPersistTaps="handled"
        >
          {searchQuery.trim().length > 0 ? (
            searchedUsers.length > 0 ? (
              searchedUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userRow,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => handleSelectUser(user)}
                >
                  {user.avatar_url ? (
                    <Image
                      source={{ uri: user.avatar_url }}
                      style={styles.searchRowAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.searchRowAvatar,
                        {
                          backgroundColor: "#5B42F5",
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Ionicons name="person" size={16} color="#fff" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchRowName, { color: theme.text }]}>
                      {user.name}
                    </Text>
                    <Text style={{ color: theme.subText, fontSize: 11 }}>
                      {user.sphere || t.specialist || "სპეციალისტი"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.subText}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.searchStateText, { color: theme.subText }]}>
                {t.no_users_found || "მომხმარებელი ვერ მოიძებნა"}
              </Text>
            )
          ) : (
            <View style={{ paddingHorizontal: 4 }}>
              <Text style={[styles.recentSearchTitle, { color: theme.text }]}>
                {t.recent_searched_users || "ბოლო დასერჩილი იუზერები"}
              </Text>
              {recentSearches.length > 0 ? (
                recentSearches.map((user) => (
                  <View
                    key={user.id}
                    style={[
                      styles.userRow,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.border,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                      onPress={() => handleSelectUser(user)}
                    >
                      {user.avatar_url ? (
                        <Image
                          source={{ uri: user.avatar_url }}
                          style={styles.searchRowAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.searchRowAvatar,
                            {
                              backgroundColor: "#5B42F5",
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          <Ionicons name="person" size={16} color="#fff" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.searchRowName, { color: theme.text }]}
                        >
                          {user.name}
                        </Text>
                        <Text style={{ color: theme.subText, fontSize: 11 }}>
                          {user.sphere || t.specialist || "სპეციალისტი"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 6 }}
                      onPress={() => handleRemoveRecent(user.id)}
                    >
                      <Ionicons name="close" size={16} color={theme.subText} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text
                  style={[
                    styles.searchStateText,
                    { color: theme.subText, marginTop: 10 },
                  ]}
                >
                  {t.search_history_empty || "ძებნის ისტორია ცარიელია"}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      );
    }

    if (activeTab === "auth") {
      return (
        <View style={styles.authFlex}>
          {authMode === "login" ? (
            <LoginView
              onSuccess={() => setActiveTab("profile")}
              onSwitchToRegister={() => setAuthMode("register")}
            />
          ) : (
            <RegisterView
              onSuccess={() => setActiveTab("profile")}
              onSwitchToLogin={() => setAuthMode("login")}
            />
          )}
          <TouchableOpacity
            style={styles.authGlobalCancel}
            onPress={() => setActiveTab("home")}
          >
            <Text style={{ color: theme.subText, fontWeight: "500" }}>
              {t.cancel || "გაუქმება"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (activeTab === "admin_panel") {
      return (
        <AdminPanelView
          onBack={() => setActiveTab("settings")}
          onOpenProfile={(uid: string) => {
            setInspectUserId(uid);
            setActiveTab("profile_inspect");
          }}
          onOpenJob={openJobById}
        />
      );
    }
    if (activeTab === "cover_picker") {
      return <CoverPickerView onBack={() => setActiveTab("settings")} />;
    }
    if (activeTab === "category_view" && selectedCategory) {
      if (selectedCategory === "company")
        return (
          <CompanyJobsView
            onBack={() => {
              setSelectedCategory(null);
              setActiveTab("home");
            }}
          />
        );
      if (selectedCategory === "private")
        return (
          <PrivateJobsView
            onBack={() => {
              setSelectedCategory(null);
              setActiveTab("home");
            }}
          />
        );
      if (selectedCategory === "urgent")
        return (
          <UrgentJobsView
            onBack={() => {
              setSelectedCategory(null);
              setActiveTab("home");
            }}
          />
        );
      if (selectedCategory === "following")
        return (
          <FollowingJobsView
            onBack={() => {
              setSelectedCategory(null);
              setActiveTab("home");
            }}
          />
        );
    }

    if (activeTab === "create") {
      if (!userId) {
        return (
          <View style={styles.unauthorizedContainer}>
            <View style={styles.lockIconCircle}>
              <Ionicons name="lock-closed" size={32} color="#5B42F5" />
            </View>
            <Text style={[styles.unauthorizedTitle, { color: theme.text }]}>
              {t.auth_required_title || "ავტორიზაცია აუცილებელია 🔒"}
            </Text>
            <Text
              style={[styles.unauthorizedSubtitle, { color: theme.subText }]}
            >
              {t.auth_required_subtitle ||
                "განცხადების განსათავსებლად გთხოვთ ჯერ გაიაროთ ავტორიზაცია ან დარეგისტრირდეთ სისტემაში"}
            </Text>
            <TouchableOpacity
              style={styles.unauthorizedButton}
              onPress={() => {
                setAuthMode("login");
                setActiveTab("auth");
              }}
            >
              <Text style={styles.unauthorizedButtonText}>
                {t.login_register_btn || "შესვლა / რეგისტრაცია"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }
      return userRole === "company" ? (
        <CreateVacancyView onSuccess={() => setActiveTab("home")} />
      ) : (
        <CreateJobView onSuccess={() => setActiveTab("home")} />
      );
    }

    // 🚀 გადაეცემა onNavigateToFAQ ფუნქციაც, რომელიც გადართავს ტაბს
    if (activeTab === "settings") {
      return (
        <SettingsView
          onEditProfile={() => setActiveTab("edit_profile")}
          onNavigateToSecurity={() => setActiveTab("security_settings")}
          onNavigateToFAQ={() => setActiveTab("faq")}
          onNavigateToLegal={(tab: "terms" | "privacy") => {
            setLegalTab(tab);
            setActiveTab("legal");
          }}
          onNavigateToAdmin={() => setActiveTab("admin_panel")}
          onNavigateToCover={() => setActiveTab("cover_picker")}
          onNavigateToPremium={() => setActiveTab("premium")}
          onNavigateToStats={() => setActiveTab("stats")}
          onNavigateToMyJobs={() => setActiveTab("my_jobs")}
          onNavigateToBlocked={() => setActiveTab("blocked_users")}
        />
      );
    }

    if (activeTab === "admin_chat" && adminChatId) {
      return (
        <AdminChatView
          chatId={adminChatId}
          isAdmin={true}
          onBack={() => setActiveTab("profile_inspect")}
        />
      );
    }

    if (activeTab === "admin_chat_user" && adminChatId) {
      return (
        <AdminChatView
          chatId={adminChatId}
          isAdmin={false}
          onBack={() => setActiveTab("chat")}
        />
      );
    }
    if (activeTab === "security_settings")
      return <SecuritySettingsView onBack={() => setActiveTab("settings")} />;
    if (activeTab === "blocked_users")
      return <BlockedUsersView onBack={() => setActiveTab("settings")} />;
    if (activeTab === "badge_select")
      return <BadgeSelectView onBack={() => setActiveTab("profile")} />;
    if (activeTab === "edit_profile")
      return <EditProfileView onBack={() => setActiveTab("settings")} />;
    if (activeTab === "premium")
      return <PremiumView onBack={() => setActiveTab("settings")} />;
    if (activeTab === "stats")
      return <StatsView onBack={() => setActiveTab("settings")} />;
    if (activeTab === "my_jobs")
      return (
        <MyJobsView
          onBack={() => setActiveTab("settings")}
          onOpenApplications={() => setActiveTab("incoming_requests")}
        />
      );
    if (activeTab === "legal")
      return (
        <LegalView
          initialTab={legalTab}
          onBack={() => setActiveTab("settings")}
        />
      );

    // 🚀 ახალი: FAQView-ს რენდერი და უკან დაბრუნება სეთინგებში
    if (activeTab === "faq")
      return <FAQView onBack={() => setActiveTab("settings")} />;

    if (activeTab === "profile")
      return (
        <ProfileView
          onNavigateToRequests={() => setActiveTab("incoming_requests")}
          onNavigateToBadges={() => setActiveTab("badge_select")}
          onNavigateToProfile={(uid) => {
            setInspectUserId(uid);
            setActiveTab("profile_inspect");
          }}
        />
      );
    if (activeTab === "profile_inspect" && inspectUserId) {
      return (
        <ProfileView
          onNavigateToRequests={() => setActiveTab("incoming_requests")}
          targetUserId={inspectUserId}
          onOpenAdminChat={openAdminChat}
          onNavigateToProfile={(uid) => setInspectUserId(uid)}
        />
      );
    }

    if (activeTab === "incoming_requests") {
      if (userRole === "company") {
        return (
          <ApplicationsInboxView
            onBack={() => setActiveTab("profile")}
            onOpenChat={(id) => {
              setVacancyChatId(id);
              setActiveTab("vacancy_chat");
            }}
          />
        );
      }
      return (
        <IncomingRequestsView
          onBack={() => setActiveTab("profile")}
          onAcceptSuccess={() => setActiveTab("chat")}
        />
      );
    }

    if (activeTab === "vacancy_chat" && vacancyChatId) {
      return (
        <VacancyChatView
          chatId={vacancyChatId}
          onBack={() => setActiveTab("incoming_requests")}
        />
      );
    }

    if (activeTab === "chat") {
      return (
        <ChatView
          onOpenVacancyChat={(id: string) => {
            setVacancyChatId(id);
            setActiveTab("vacancy_chat");
          }}
          onOpenAdminChat={(chatId: string, asAdmin?: boolean) => {
            setAdminChatId(chatId);
            setActiveTab(asAdmin ? "admin_chat" : "admin_chat_user");
          }}
          onConversationOpenChange={setChatConversationOpen}
        />
      );
    }
    if (activeTab === "swipe")
      return <SwipeJobsView onBack={() => setActiveTab("home")} />;

    return (
      <HomeFeedView
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setActiveTab("category_view");
        }}
        onOpenScroll={() => setActiveTab("swipe")}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.cardBg}
        translucent={true}
      />

      {activeTab !== "chat" &&
        activeTab !== "swipe" &&
        activeTab !== "vacancy_chat" &&
        !(activeTab === "incoming_requests" && userRole === "company") &&
        !(userId && mustChangePassword) && (
          <SafeAreaView
            style={[
              styles.headerWrapper,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <View style={styles.header}>{renderHeaderContent()}</View>
          </SafeAreaView>
        )}

      {renderMainContent()}

      {/* ფუტერი — swipe რეჟიმში იმალება ფოკუსისთვის */}
      {activeTab !== "swipe" &&
        !(activeTab === "chat" && chatConversationOpen) &&
        !(userId && mustChangePassword) && (
          <View
            style={[
              styles.footer,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <NavTabButton
              active={activeTab === "home" || activeTab === "category_view"}
              onPress={() => {
                setSelectedCategory(null);
                setInspectUserId(null);
                setActiveTab("home");
                setIsSearchFocused(false);
              }}
              icon="home-outline"
              iconActive="home"
              color="#5B42F5"
              subColor={theme.subText}
              label={t.nav_home || "მთავარი"}
            />

            {userId && (
              <NavTabButton
                active={activeTab === "chat"}
                onPress={() => {
                  setInspectUserId(null);
                  setActiveTab("chat");
                  setIsSearchFocused(false);
                }}
                icon="chatbubble-ellipses-outline"
                iconActive="chatbubble-ellipses"
                color="#5B42F5"
                subColor={theme.subText}
                label={t.nav_chat || "ჩათი"}
              />
            )}

            <NavTabButton
              active={
                activeTab === "profile" ||
                activeTab === "profile_inspect" ||
                activeTab === "auth" ||
                activeTab === "edit_profile" ||
                activeTab === "incoming_requests" ||
                activeTab === "security_settings"
              }
              onPress={() => {
                setInspectUserId(null);
                setIsSearchFocused(false);
                setAuthMode("login");
                setActiveTab(userId ? "profile" : "auth");
              }}
              icon="person-outline"
              iconActive="person"
              color="#5B42F5"
              subColor={theme.subText}
              label={t.nav_profile || "პროფილი"}
            />

            {userId && (
              <NavTabButton
                active={activeTab === "create"}
                onPress={() => {
                  setInspectUserId(null);
                  setIsSearchFocused(false);
                  setActiveTab("create");
                }}
                icon="add-circle-outline"
                iconActive="add-circle"
                color="#5B42F5"
                subColor={theme.subText}
                label={t.nav_add || "დამატება"}
              />
            )}

            {/* 🚀 ფუტერის ხატულა განათდება მაშინაც, როცა აქტიურია სეთინგები ან თავად FAQ გვერდი */}
            <NavTabButton
              active={activeTab === "settings" || activeTab === "faq"}
              onPress={() => {
                setInspectUserId(null);
                setIsSearchFocused(false);
                setActiveTab("settings");
              }}
              icon="settings-outline"
              iconActive="settings"
              color="#5B42F5"
              subColor={theme.subText}
              label={t.nav_settings || "სეთინგები"}
            />
          </View>
        )}

      {inspectJob && (
        <VacancyDetailView
          job={inspectJob}
          visible={!!inspectJob}
          onClose={() => setInspectJob(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: {
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  textPushedHeaderRow: {
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: Platform.OS === "ios" ? 20 : 25,
    paddingBottom: 5,
    marginBottom: 5,
  },
  headerStaticTitle: { fontSize: 22, fontWeight: "bold" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  searchTriggerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { fontSize: 24, fontWeight: "bold", letterSpacing: 0.5 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIconBox: { width: 42, height: 42 },
  logoAccent: { color: "#5B42F5" },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: "rgba(91, 66, 245, 0.10)",
  },
  topHeaderAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 9,
    borderWidth: 2,
    borderColor: "#5B42F5",
  },
  usernameText: { fontSize: 15, fontWeight: "700", maxWidth: 150 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  searchIcon: { marginRight: 9 },
  searchInput: { flex: 1, fontSize: 15.5, height: "100%" },
  searchResultsWrapper: { flex: 1, padding: 16 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchRowAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12 },
  searchRowName: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  searchStateText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 13,
    fontWeight: "500",
  },
  recentSearchTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.3,
    opacity: 0.8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    marginHorizontal: 2,
  },
  tabButtonActive: { backgroundColor: "rgba(91, 66, 245, 0.12)" },
  tabText: { fontSize: 11, fontWeight: "600", marginTop: 3 },
  tabTextActive: { color: "#5B42F5", fontWeight: "700" },
  raisedTabWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 76,
  },
  raisedGlowRing: {
    position: "absolute",
    top: -22,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#5B42F5",
    opacity: 0.25,
  },
  raisedTabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#5B42F5",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: -22,
    shadowColor: "#5B42F5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  raisedTabText: { position: "absolute", bottom: 20 },
  authFlex: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  authGlobalCancel: { alignItems: "center", marginTop: 14, paddingVertical: 4 },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(91, 66, 245, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  unauthorizedTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  unauthorizedSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  unauthorizedButton: {
    backgroundColor: "#5B42F5",
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  unauthorizedButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
