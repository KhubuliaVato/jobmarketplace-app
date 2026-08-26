import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Print from "expo-print";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { buildResumeHtml } from "../utils/resumeTemplates";
import ReportModal from "./ReportModal";
import Toast, { ToastType } from "./Toast";

interface VacancyDetailViewProps {
  job: any;
  visible: boolean;
  onClose: () => void;
}

export default function VacancyDetailView({
  job,
  visible,
  onClose,
}: VacancyDetailViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);
  const userRole = useAuthStore((state) => state.userRole);
  const resumeUrl = useAuthStore((state) => state.resumeUrl);
  const resumeName = useAuthStore((state) => state.resumeName);
  const setResume = useAuthStore((state) => state.setResume);

  const [applied, setApplied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [sendingProfile, setSendingProfile] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);

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

  const theme = {
    bg: isDarkMode ? "#0d0d11" : "#f5f5f7",
    cardBg: isDarkMode ? "#16161a" : "#ffffff",
    text: isDarkMode ? "#fff" : "#1c1c1e",
    subText: isDarkMode ? "#666" : "#8e8e93",
    border: isDarkMode ? "#222227" : "#e5e5ea",
    chipBg: isDarkMode ? "#1c1c22" : "#f2f2f7",
    accent: "#5B42F5",
    green: "#34c759",
  };

  useEffect(() => {
    if (visible && job?.id) {
      checkApplied();
      checkReported();
    }
  }, [visible, job?.id]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }: any) => setMyProfile(data));
  }, [userId]);

  const checkReported = async () => {
    if (!userId || !job?.id) return;
    const { data } = await supabase.rpc("did_i_report", {
      p_target_type: "job",
      p_target_id: job.id,
    });
    setAlreadyReported(data === true);
  };

  const checkApplied = async () => {
    if (!userId) {
      setChecking(false);
      return;
    }
    try {
      setChecking(true);
      const { data } = await supabase
        .from("job_applications")
        .select("id")
        .eq("job_id", job.id)
        .eq("applicant_id", userId)
        .maybeSingle();
      setApplied(!!data);
    } catch {
      setApplied(false);
    } finally {
      setChecking(false);
    }
  };

  // CV-ის ატვირთვა (base64 — საიმედო მეთოდი)
  const uploadCv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      showToast("info", "URI", asset.uri);

      const resp = await fetch(asset.uri);
      const bytes = new Uint8Array(await resp.arrayBuffer());

      const ext = asset.name.split(".").pop()?.toLowerCase() || "pdf";
      const storagePath = `${userId}/cv_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("resumes")
        .upload(storagePath, bytes, {
          contentType: asset.mimeType || "application/pdf",
          upsert: true,
        });

      if (error) throw error;

      setResume(storagePath, asset.name);
      showToast("success", "CV აიტვირთა", asset.name);
    } catch (err: any) {
      showToast("error", "ატვირთვა ვერ მოხერხდა", err.message);
    } finally {
      setUploadingCv(false);
    }
  };

  const handleApply = async () => {
    if (!userId) {
      showToast("error", "ავტორიზაცია საჭიროა", "ჯერ შედი სისტემაში");
      return;
    }
    if (userRole === "company") {
      showToast(
        "info",
        "კომპანიას არ შეუძლია",
        "CV-ს მხოლოდ მაძიებელი აგზავნის",
      );
      return;
    }
    if (!resumeUrl) {
      showToast("error", "CV არ გაქვს", "ჯერ ატვირთე CV");
      return;
    }

    try {
      setSending(true);

      const { error } = await supabase.from("job_applications").insert([
        {
          job_id: job.id,
          job_title: job.position_title || job.title,
          applicant_id: userId,
          applicant_name: userName,
          company_id: job.author_id,
          resume_url: resumeUrl,
          resume_name: resumeName,
        },
      ]);

      if (error && error.code !== "23505") throw error;

      setApplied(true);
      showToast("success", "CV გაიგზავნა", "კომპანია განიხილავს");
    } catch (err: any) {
      showToast("error", "ვერ გაიგზავნა", err.message);
    } finally {
      setSending(false);
    }
  };

  // 🚀 პროფილიდან ავტომატური CV შექმნა და გაგზავნა
  const sendProfilePDF = async () => {
    if (!userId || !myProfile) return;
    if (userRole === "company") {
      showToast(
        "info",
        "კომპანიას არ შეუძლია",
        "CV-ს მხოლოდ მაძიებელი აგზავნის",
      );
      return;
    }

    setSendingProfile(true);
    try {
      const html = buildResumeHtml(myProfile, "minimal");
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const resp = await fetch(uri);
      const bytes = new Uint8Array(await resp.arrayBuffer());

      const storagePath = `${userId}/cv_profile_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, bytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const cvName = `${myProfile.name || "CV"} — FreeJob პროფილი.pdf`;
      setResume(storagePath, cvName);

      const { error: appError } = await supabase
        .from("job_applications")
        .insert([
          {
            job_id: job.id,
            job_title: job.position_title || job.title,
            applicant_id: userId,
            applicant_name: userName,
            company_id: job.author_id,
            resume_url: storagePath,
            resume_name: cvName,
          },
        ]);
      if (appError && appError.code !== "23505") throw appError;

      setApplied(true);
      showToast("success", "CV გაიგზავნა", "პროფილიდან წარმატებით შეიქმნა");
    } catch (err: any) {
      showToast("error", "ვერ შეიქმნა CV", err.message);
    } finally {
      setSendingProfile(false);
    }
  };

  if (!job) return null;

  const skills: string[] = job.skills
    ? String(job.skills)
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  const languages: string[] = job.languages || [];
  const benefits: string[] = job.benefits || [];

  const companyName = job.company?.name || "კომპანია";
  const companyAvatar = job.company?.avatar_url;

  const Section = ({ icon, title, children }: any) => (
    <View
      style={[
        styles.section,
        { backgroundColor: theme.cardBg, borderColor: theme.border },
      ]}
    >
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={16} color={theme.accent} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  const Chips = ({ items, color }: { items: string[]; color: string }) => (
    <View style={styles.chipsWrap}>
      {items.map((s, i) => (
        <View
          key={i}
          style={[
            styles.chip,
            { backgroundColor: color + "18", borderColor: color + "40" },
          ]}
        >
          <Text style={[styles.chipText, { color }]}>{s}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <Toast
          visible={toast.visible}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />

        {/* ჰედერი */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>უკან</Text>
          </TouchableOpacity>

          {userId && job?.author_id !== userId && (
            <TouchableOpacity
              onPress={() => !alreadyReported && setReportOpen(true)}
              style={{ padding: 6 }}
              disabled={alreadyReported}
            >
              <Ionicons
                name={alreadyReported ? "flag" : "flag-outline"}
                size={20}
                color={alreadyReported ? "#ff9500" : theme.subText}
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* სურათი */}
          {job.image_url ? (
            <Image
              source={{ uri: job.image_url }}
              style={styles.heroBanner}
              resizeMode="cover"
            />
          ) : null}

          {/* პოზიცია + კომპანია */}
          <View
            style={[
              styles.heroCard,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <View style={styles.heroTop}>
              {companyAvatar ? (
                <Image
                  source={{ uri: companyAvatar }}
                  style={styles.heroLogo}
                />
              ) : (
                <View
                  style={[
                    styles.heroLogoEmpty,
                    { backgroundColor: "rgba(91,66,245,0.12)" },
                  ]}
                >
                  <Ionicons name="business" size={26} color={theme.accent} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroPosition, { color: theme.text }]}>
                  {job.position_title || job.title}
                </Text>
                <Text style={[styles.heroCompany, { color: theme.subText }]}>
                  {companyName}
                </Text>
              </View>
            </View>

            <View style={styles.heroMeta}>
              {job.budget ? (
                <View
                  style={[
                    styles.heroPill,
                    { backgroundColor: "rgba(52,199,89,0.12)" },
                  ]}
                >
                  <Ionicons name="cash" size={14} color={theme.green} />
                  <Text style={[styles.heroPillText, { color: theme.green }]}>
                    {job.budget}
                  </Text>
                </View>
              ) : null}

              {job.bonus ? (
                <View
                  style={[
                    styles.heroPill,
                    { backgroundColor: "rgba(255,149,0,0.12)" },
                  ]}
                >
                  <Ionicons name="gift" size={14} color="#ff9500" />
                  <Text style={[styles.heroPillText, { color: "#ff9500" }]}>
                    {job.bonus}
                  </Text>
                </View>
              ) : null}

              {job.has_promotion ? (
                <View
                  style={[
                    styles.heroPill,
                    { backgroundColor: "rgba(91,66,245,0.12)" },
                  ]}
                >
                  <Ionicons name="trending-up" size={14} color={theme.accent} />
                  <Text style={[styles.heroPillText, { color: theme.accent }]}>
                    დაწინაურება
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* აღწერა */}
          {job.description ? (
            <Section icon="document-text-outline" title="სამუშაოს აღწერა">
              <Text style={[styles.bodyText, { color: theme.subText }]}>
                {job.description}
              </Text>
            </Section>
          ) : null}

          {/* უნარები */}
          {skills.length > 0 && (
            <Section icon="construct-outline" title="საჭირო უნარები">
              <Chips items={skills} color={theme.accent} />
            </Section>
          )}

          {/* ენები */}
          {languages.length > 0 && (
            <Section icon="language-outline" title="ენები">
              <Chips items={languages} color="#00c7be" />
            </Section>
          )}

          {/* ბენეფიტები */}
          {benefits.length > 0 && (
            <Section icon="gift-outline" title="ბენეფიტები">
              <Chips items={benefits} color={theme.green} />
            </Section>
          )}

          {/* მისამართი */}
          {job.location ? (
            <Section icon="location-outline" title="მისამართი">
              <Text style={[styles.bodyText, { color: theme.subText }]}>
                {job.location}
              </Text>
            </Section>
          ) : null}

          {/* HR */}
          {job.hr_name ? (
            <Section icon="person-outline" title="საკონტაქტო პირი">
              <View style={styles.hrRow}>
                {job.hr_avatar ? (
                  <Image
                    source={{ uri: job.hr_avatar }}
                    style={styles.hrAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.hrAvatarEmpty,
                      { backgroundColor: theme.chipBg },
                    ]}
                  >
                    <Ionicons name="person" size={20} color={theme.subText} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hrName, { color: theme.text }]}>
                    {job.hr_name}
                  </Text>
                  <Text style={[styles.hrRole, { color: theme.subText }]}>
                    HR განყოფილება
                  </Text>
                </View>
              </View>
            </Section>
          ) : null}

          {/* CV */}
          <View
            style={[
              styles.cvBox,
              {
                backgroundColor: theme.cardBg,
                borderColor: resumeUrl ? theme.green : theme.border,
              },
            ]}
          >
            <Ionicons
              name={resumeUrl ? "document-attach" : "cloud-upload-outline"}
              size={22}
              color={resumeUrl ? theme.green : theme.subText}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.cvTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {resumeUrl ? resumeName || "CV ატვირთულია" : "CV არ გაქვს"}
              </Text>
              <Text style={[styles.cvSub, { color: theme.subText }]}>
                {resumeUrl ? "შეგიძლია შეცვალო" : "ატვირთე PDF ან Word"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.cvBtn, { backgroundColor: theme.chipBg }]}
              onPress={uploadCv}
              disabled={uploadingCv}
            >
              {uploadingCv ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Text style={[styles.cvBtnText, { color: theme.accent }]}>
                  {resumeUrl ? "შეცვლა" : "ატვირთვა"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {userRole !== "company" && !applied && (
            <>
              <View style={styles.dividerRow}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.border },
                  ]}
                />
                <Text style={[styles.dividerText, { color: theme.subText }]}>
                  ან
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.border },
                  ]}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.profileCvBtn,
                  { backgroundColor: theme.chipBg, borderColor: theme.border },
                ]}
                onPress={sendProfilePDF}
                disabled={sendingProfile || !myProfile}
              >
                {sendingProfile ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <Ionicons
                      name="person-circle-outline"
                      size={17}
                      color={theme.accent}
                    />
                    <Text
                      style={[styles.profileCvText, { color: theme.accent }]}
                    >
                      პროფილიდან CV შექმნა
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* გაგზავნა */}
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
          ]}
        >
          {checking ? (
            <ActivityIndicator color={theme.accent} />
          ) : applied ? (
            <View
              style={[
                styles.appliedBox,
                { backgroundColor: "rgba(52,199,89,0.12)" },
              ]}
            >
              <Ionicons name="checkmark-circle" size={19} color={theme.green} />
              <Text style={[styles.appliedText, { color: theme.green }]}>
                CV გაგზავნილია
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.applyBtn,
                { backgroundColor: resumeUrl ? theme.accent : theme.chipBg },
              ]}
              onPress={handleApply}
              disabled={sending || uploadingCv}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={17}
                    color={resumeUrl ? "#fff" : theme.subText}
                  />
                  <Text
                    style={[
                      styles.applyText,
                      { color: resumeUrl ? "#fff" : theme.subText },
                    ]}
                  >
                    CV-ის გაგზავნა
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {job?.id && (
          <ReportModal
            visible={reportOpen}
            onClose={() => setReportOpen(false)}
            targetType="job"
            targetId={job.id}
            onDone={() => {
              setAlreadyReported(true);
              showToast("success", "გმადლობთ", "საჩივარი მიღებულია");
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 14, fontWeight: "600" },

  scroll: { padding: 16, paddingBottom: 30 },

  heroBanner: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    marginBottom: 12,
  },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroLogo: { width: 58, height: 58, borderRadius: 16 },
  heroLogoEmpty: {
    width: 58,
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  heroPosition: { fontSize: 19, fontWeight: "800" },
  heroCompany: { fontSize: 13, fontWeight: "600", marginTop: 3 },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
  },
  heroPillText: { fontSize: 12.5, fontWeight: "700" },

  section: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
  bodyText: { fontSize: 13.5, lineHeight: 20, fontWeight: "500" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: "700" },

  hrRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  hrAvatar: { width: 46, height: 46, borderRadius: 23 },
  hrAvatarEmpty: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  hrName: { fontSize: 14.5, fontWeight: "700" },
  hrRole: { fontSize: 12, fontWeight: "500", marginTop: 2 },

  cvBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 4,
  },
  cvTitle: { fontSize: 13.5, fontWeight: "700" },
  cvSub: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },
  cvBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  cvBtnText: { fontSize: 12.5, fontWeight: "700" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: "600" },
  profileCvBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  profileCvText: { fontSize: 13.5, fontWeight: "700" },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  applyText: { fontSize: 15, fontWeight: "700" },
  appliedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  appliedText: { fontSize: 15, fontWeight: "700" },
});
