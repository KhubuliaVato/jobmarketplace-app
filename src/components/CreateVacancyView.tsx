import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { THEME_PALETTES } from "../utils/bgThemes";
import {
  CATEGORIES,
  CITIES,
  DURATIONS,
  EDUCATION_LEVELS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
} from "../utils/jobConstants";
import ChipInput from "./ChipInput";
import Toast, { ToastType } from "./Toast";

interface CreateVacancyViewProps {
  onSuccess: () => void;
}

const LANG_SUGGESTIONS = [
  "ქართული",
  "ინგლისური",
  "რუსული",
  "გერმანული",
  "თურქული",
  "ფრანგული",
];
const SKILL_SUGGESTIONS = [
  "Excel",
  "გაყიდვები",
  "კომუნიკაცია",
  "მართვის მოწმობა",
  "გუნდური მუშაობა",
];
const BENEFIT_SUGGESTIONS = [
  "კვება",
  "ტრანსპორტი",
  "დაზღვევა",
  "მოქნილი გრაფიკი",
  "სწავლება",
  "ბონუსები",
];

export default function CreateVacancyView({
  onSuccess,
}: CreateVacancyViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const userId = useAuthStore((state) => state.userId);

  const [company, setCompany] = useState<any>(null);

  // ველები
  const [positionTitle, setPositionTitle] = useState("");
  const [category, setCategory] = useState("");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const [city, setCity] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  const [employmentType, setEmploymentType] = useState("");
  const [positionsCount, setPositionsCount] = useState("1");

  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [workSchedule, setWorkSchedule] = useState("");

  const [budget, setBudget] = useState("");
  const [bonus, setBonus] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [hasPromotion, setHasPromotion] = useState(false);
  const [hrName, setHrName] = useState("");
  const [hrAvatar, setHrAvatar] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [duration, setDuration] = useState(3);

  const [uploadingHr, setUploadingHr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [limits, setLimits] = useState<any>(null);

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
    inputBg: isDarkMode ? "#1c1c22" : "#f2f2f7",
    accent: "#5B42F5",
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc("my_limits").then(({ data }: any) => setLimits(data));
  }, [userId]);

  const fetchCompany = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("companies")
      .select("company_name, email, hr_phone, address")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      setCompany(data);
      setCustomLocation(data.address || "");
    }
  };

  const pickHrAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setHrAvatar(asset.uri);
      setUploadingHr(true);

      const base64 = asset.base64;
      if (!base64) throw new Error("სურათის წაკითხვა ვერ მოხერხდა");

      const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `hr_${userId}_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, decode(base64), {
          contentType: asset.mimeType || `image/${ext}`,
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setHrAvatar(data.publicUrl);
      showToast("success", "სურათი აიტვირთა", "");
    } catch (err: any) {
      setHrAvatar(null);
      showToast("error", "ატვირთვა ვერ მოხერხდა", err.message);
    } finally {
      setUploadingHr(false);
    }
  };

  const pickVacancyImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setImageUrl(asset.uri);
      setUploadingImage(true);

      const base64 = asset.base64;
      if (!base64) throw new Error("სურათის წაკითხვა ვერ მოხერხდა");

      const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `vacancy_${userId}_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("job_images")
        .upload(fileName, decode(base64), {
          contentType: asset.mimeType || `image/${ext}`,
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("job_images")
        .getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
      showToast("success", "სურათი აიტვირთა", "");
    } catch (err: any) {
      setImageUrl(null);
      showToast("error", "ატვირთვა ვერ მოხერხდა", err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const finalLocation = isRemote
    ? "დისტანციური"
    : city === "სხვა"
      ? customLocation.trim()
      : city;

  const handleSubmit = async () => {
    if (!positionTitle.trim()) {
      showToast("error", "პოზიცია აკლია", "მიუთითე რა პოზიციაზე ეძებ");
      return;
    }
    if (!category) {
      showToast("error", "კატეგორია აკლია", "აირჩიეთ კატეგორია");
      return;
    }
    if (!finalLocation) {
      showToast("error", "ლოკაცია აკლია", "მიუთითეთ ლოკაცია");
      return;
    }
    if (!description.trim()) {
      showToast("error", "აღწერა აკლია", "აღწერე რა უნდა აკეთოს");
      return;
    }
    if (!hrName.trim()) {
      showToast("error", "HR აკლია", "მიუთითე HR-ის სახელი და გვარი");
      return;
    }

    if (limits) {
      if (limits.active_jobs >= limits.max_jobs) {
        showToast(
          "error",
          "🔒 ლიმიტი ამოიწურა",
          `გაქვთ ${limits.active_jobs} აქტიური განცხადება (ლიმიტი ${limits.max_jobs}). წაშალეთ ერთი ან გადადით პრემიუმზე.`,
        );
        return;
      }
      if (duration > limits.max_duration) {
        showToast(
          "error",
          "🔒 შეზღუდვა",
          "10 და 15 დღე ხელმისაწვდომია პრემიუმ გამოწერით",
        );
        return;
      }
    }

    try {
      setSaving(true);

      const { error } = await supabase.from("jobs").insert([
        {
          type: "company",
          author_id: userId,
          title: positionTitle.trim(),
          position_title: positionTitle.trim(),
          category,
          location: finalLocation,
          is_remote: isRemote,
          employment_type: employmentType || null,
          positions_count: positionsCount ? Number(positionsCount) : 1,
          description: description.trim(),
          requirements: requirements.trim() || null,
          languages: languages.length ? languages : null,
          experience_level: experienceLevel || null,
          education_level: educationLevel || null,
          work_schedule: workSchedule.trim() || null,
          budget: budget.trim() || null,
          bonus: bonus.trim() || null,
          skills: skills.length ? skills.join(", ") : null,
          benefits: benefits.length ? benefits : null,
          has_promotion: hasPromotion,
          hr_name: hrName.trim(),
          hr_avatar: hrAvatar,
          image_url: imageUrl,
          email: company?.email || null,
          phone: company?.hr_phone || null,
          status: "active",
          expires_at: new Date(Date.now() + duration * 86400000).toISOString(),
        },
      ]);

      if (error) throw error;

      showToast("success", "ვაკანსია გამოქვეყნდა", positionTitle.trim());
      setTimeout(onSuccess, 900);
    } catch (err: any) {
      showToast("error", "ვერ გამოქვეყნდა", err.message);
    } finally {
      setSaving(false);
    }
  };

  const chip = (active: boolean) => [
    styles.miniChip,
    {
      backgroundColor: active ? theme.accent : theme.inputBg,
      borderColor: active ? theme.accent : theme.border,
    },
  ];
  const chipText = (active: boolean) => [
    styles.miniChipText,
    { color: active ? "#fff" : theme.subText },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          ახალი ვაკანსია
        </Text>
        <Text style={[styles.pageSub, { color: theme.subText }]}>
          {company?.company_name || "კომპანია"}
        </Text>

        {limits && limits.tier === "free" && (
          <View
            style={[
              styles.limitsBanner,
              { backgroundColor: theme.inputBg, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={theme.subText}
            />
            <Text
              style={{
                color: theme.subText,
                fontSize: 12.5,
                flex: 1,
                marginLeft: 8,
              }}
            >
              აქტიური განცხადება:{" "}
              <Text style={{ color: theme.text, fontWeight: "700" }}>
                {limits.active_jobs}/{limits.max_jobs}
              </Text>{" "}
              · მაქს. ვადა:{" "}
              <Text style={{ color: theme.text, fontWeight: "700" }}>
                {limits.max_duration} დღე
              </Text>
            </Text>
          </View>
        )}

        {/* სურათი */}
        <Text style={[styles.label, { color: theme.subText, marginTop: 12 }]}>
          ვაკანსიის სურათი
        </Text>
        <TouchableOpacity
          style={[
            styles.imagePicker,
            { backgroundColor: theme.inputBg, borderColor: theme.border },
          ]}
          onPress={pickVacancyImage}
          disabled={uploadingImage}
        >
          {imageUrl ? (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              {uploadingImage && (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </>
          ) : uploadingImage ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <>
              <Ionicons name="image-outline" size={28} color={theme.subText} />
              <Text style={[styles.imageHint, { color: theme.subText }]}>
                აირჩიე სურათი (16:9)
              </Text>
            </>
          )}
        </TouchableOpacity>

        {imageUrl && !uploadingImage && (
          <TouchableOpacity onPress={pickVacancyImage} style={{ marginTop: 8 }}>
            <Text
              style={{
                color: theme.accent,
                fontSize: 12.5,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              სურათის შეცვლა
            </Text>
          </TouchableOpacity>
        )}

        {/* 1. პოზიცია */}
        <Text style={[styles.label, { color: theme.subText }]}>
          1. პოზიცია *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="მაგ: გაყიდვების მენეჯერი"
          placeholderTextColor="#555"
          value={positionTitle}
          onChangeText={setPositionTitle}
        />

        {/* კატეგორია */}
        <Text style={[styles.label, { color: theme.subText }]}>
          კატეგორია *
        </Text>
        <TouchableOpacity
          style={[
            styles.selectorField,
            { backgroundColor: theme.inputBg, borderColor: theme.border },
          ]}
          onPress={() => setCategoryModalVisible(true)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.selectorText,
              { color: category ? theme.text : "#777" },
            ]}
            numberOfLines={1}
          >
            {category || "აირჩიეთ კატეგორია"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.subText} />
        </TouchableOpacity>

        {/* ლოკაცია */}
        <Text style={[styles.label, { color: theme.subText }]}>ლოკაცია *</Text>
        <TouchableOpacity
          style={[
            styles.selectorField,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
              opacity: isRemote ? 0.5 : 1,
            },
          ]}
          onPress={() => !isRemote && setCityModalVisible(true)}
          activeOpacity={0.75}
          disabled={isRemote}
        >
          <Text
            style={[styles.selectorText, { color: city ? theme.text : "#777" }]}
            numberOfLines={1}
          >
            {city || "აირჩიეთ ქალაქი"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.subText} />
        </TouchableOpacity>
        {city === "სხვა" && !isRemote && (
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderColor: theme.border,
                marginTop: 8,
              },
            ]}
            placeholder="თბილისი, ჭავჭავაძის 15"
            placeholderTextColor="#555"
            value={customLocation}
            onChangeText={setCustomLocation}
          />
        )}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsRemote(!isRemote)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              isRemote && {
                backgroundColor: theme.accent,
                borderColor: theme.accent,
              },
              { borderColor: theme.border },
            ]}
          >
            {isRemote && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: theme.text }]}>
            დისტანციური სამუშაო
          </Text>
        </TouchableOpacity>

        {/* დასაქმების ტიპი + ვაკანსიების რაოდენობა */}
        <View style={styles.row}>
          <View style={{ flex: 1.4 }}>
            <Text style={[styles.label, { color: theme.subText }]}>
              დასაქმების ტიპი
            </Text>
            <View style={styles.chipsWrap}>
              {EMPLOYMENT_TYPES.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={chip(employmentType === e)}
                  onPress={() =>
                    setEmploymentType(employmentType === e ? "" : e)
                  }
                >
                  <Text style={chipText(employmentType === e)}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        <View style={{ marginBottom: 4 }}>
          <Text style={[styles.label, { color: theme.subText }]}>
            ვაკანსიების რაოდენობა
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderColor: theme.border,
                width: 100,
              },
            ]}
            keyboardType="number-pad"
            value={positionsCount}
            onChangeText={setPositionsCount}
          />
        </View>

        {/* 2. აღწერა */}
        <Text style={[styles.label, { color: theme.subText }]}>
          2. სამუშაოს აღწერა *
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="რას აკეთებს ეს ადამიანი ყოველდღიურად..."
          placeholderTextColor="#555"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        {/* მოთხოვნები */}
        <Text style={[styles.label, { color: theme.subText }]}>მოთხოვნები</Text>
        <TextInput
          style={[
            styles.textArea,
            {
              height: 80,
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="რა გამოცდილება/თვისებები გჭირდებათ..."
          placeholderTextColor="#555"
          value={requirements}
          onChangeText={setRequirements}
          multiline
          textAlignVertical="top"
        />

        {/* გამოცდილება + განათლება */}
        <Text style={[styles.label, { color: theme.subText }]}>
          გამოცდილება
        </Text>
        <View style={styles.chipsWrap}>
          {EXPERIENCE_LEVELS.map((e) => (
            <TouchableOpacity
              key={e}
              style={chip(experienceLevel === e)}
              onPress={() => setExperienceLevel(experienceLevel === e ? "" : e)}
            >
              <Text style={chipText(experienceLevel === e)}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.subText }]}>განათლება</Text>
        <View style={styles.chipsWrap}>
          {EDUCATION_LEVELS.map((e) => (
            <TouchableOpacity
              key={e}
              style={chip(educationLevel === e)}
              onPress={() => setEducationLevel(educationLevel === e ? "" : e)}
            >
              <Text style={chipText(educationLevel === e)}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.subText }]}>
          სამუშაო გრაფიკი
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="მაგ: 10:00 - 19:00, ორშ-პარ"
          placeholderTextColor="#555"
          value={workSchedule}
          onChangeText={setWorkSchedule}
        />

        {/* 3. ენები */}
        <Text style={[styles.label, { color: theme.subText }]}>3. ენები</Text>
        <ChipInput
          value={languages}
          onChange={setLanguages}
          placeholder="ჩაწერე ენა და დააჭირე Enter"
          suggestions={LANG_SUGGESTIONS}
          isDarkMode={isDarkMode}
          accent="#00c7be"
        />

        {/* 4-5. ბიუჯეტი + პრემია */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.subText }]}>
              4. ხელფასი
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="1500 ₾"
              placeholderTextColor="#555"
              value={budget}
              onChangeText={setBudget}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.subText }]}>
              5. პრემია
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="ბონუსი"
              placeholderTextColor="#555"
              value={bonus}
              onChangeText={setBonus}
            />
          </View>
        </View>

        {/* 6. სქილები */}
        <Text style={[styles.label, { color: theme.subText }]}>
          6. საჭირო უნარები
        </Text>
        <ChipInput
          value={skills}
          onChange={setSkills}
          placeholder="ჩაწერე უნარი და დააჭირე Enter"
          suggestions={SKILL_SUGGESTIONS}
          isDarkMode={isDarkMode}
          accent="#5B42F5"
        />

        {/* 7. ბენეფიტები */}
        <Text style={[styles.label, { color: theme.subText }]}>
          7. ბენეფიტები
        </Text>
        <ChipInput
          value={benefits}
          onChange={setBenefits}
          placeholder="ჩაწერე ბენეფიტი და დააჭირე Enter"
          suggestions={BENEFIT_SUGGESTIONS}
          isDarkMode={isDarkMode}
          accent="#34c759"
        />

        {/* 8. დაწინაურება */}
        <View
          style={[
            styles.switchRow,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchTitle, { color: theme.text }]}>
              8. დაწინაურების შესაძლებლობა
            </Text>
            <Text style={[styles.switchSub, { color: theme.subText }]}>
              კარიერული ზრდა შესაძლებელია?
            </Text>
          </View>
          <Switch
            value={hasPromotion}
            onValueChange={setHasPromotion}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#fff"
          />
        </View>

        {/* 9. HR */}
        <Text style={[styles.label, { color: theme.subText }]}>
          9. HR განყოფილების უფროსი *
        </Text>
        <View
          style={[
            styles.hrBox,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.hrAvatarWrap}
            onPress={pickHrAvatar}
            disabled={uploadingHr}
          >
            {uploadingHr ? (
              <ActivityIndicator color={theme.accent} />
            ) : hrAvatar ? (
              <Image source={{ uri: hrAvatar }} style={styles.hrAvatar} />
            ) : (
              <View
                style={[
                  styles.hrAvatarEmpty,
                  { backgroundColor: theme.inputBg, borderColor: theme.border },
                ]}
              >
                <Ionicons name="camera" size={20} color={theme.subText} />
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            style={[
              styles.hrInput,
              {
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="სახელი და გვარი"
            placeholderTextColor="#555"
            value={hrName}
            onChangeText={setHrName}
          />
        </View>

        {/* ხანგრძლივობა */}
        <Text style={[styles.label, { color: theme.subText }]}>
          რამდენ ხანს იდოს
        </Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => {
            const locked = limits ? d > limits.max_duration : false;
            const active = duration === d;
            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.durationChip,
                  { borderColor: theme.border, backgroundColor: theme.inputBg },
                  active &&
                    !locked && {
                      backgroundColor: theme.accent,
                      borderColor: theme.accent,
                    },
                  locked && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (locked) {
                    showToast(
                      "error",
                      "🔒 შეზღუდვა",
                      "10 და 15 დღე ხელმისაწვდომია პრემიუმ გამოწერით",
                    );
                    return;
                  }
                  setDuration(d);
                }}
              >
                {locked && (
                  <Ionicons
                    name="lock-closed"
                    size={11}
                    color={theme.subText}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={{
                    color: active && !locked ? "#fff" : theme.subText,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {d} დღე
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* გამოქვეყნება */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.accent }]}
          onPress={handleSubmit}
          disabled={saving || uploadingHr || uploadingImage}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>ვაკანსიის გამოქვეყნება</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* კატეგორიის მოდალი */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.pickerCard,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.pickerTitle, { color: theme.text }]}>
              კატეგორია
            </Text>
            <ScrollView
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
            >
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerRow, { borderColor: theme.border }]}
                  onPress={() => {
                    setCategory(c);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerRowText,
                      { color: category === c ? theme.accent : theme.text },
                    ]}
                  >
                    {c}
                  </Text>
                  {category === c && (
                    <Ionicons name="checkmark" size={18} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ლოკაციის მოდალი */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setCityModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.pickerCard,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.pickerTitle, { color: theme.text }]}>
              ლოკაცია
            </Text>
            <ScrollView
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
            >
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerRow, { borderColor: theme.border }]}
                  onPress={() => {
                    setCity(c);
                    setCityModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerRowText,
                      { color: city === c ? theme.accent : theme.text },
                    ]}
                  >
                    {c}
                  </Text>
                  {city === c && (
                    <Ionicons name="checkmark" size={18} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 120 },
  pageTitle: { fontSize: 22, fontWeight: "800" },
  pageSub: { fontSize: 13, fontWeight: "600", marginTop: 2, marginBottom: 8 },

  label: { fontSize: 13, fontWeight: "700", marginBottom: 8, marginTop: 18 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
  },

  row: { flexDirection: "row", gap: 10 },

  selectorField: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: { fontSize: 14, flex: 1 },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingLeft: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxLabel: { fontSize: 13, fontWeight: "600" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  miniChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  miniChipText: { fontSize: 12, fontWeight: "600" },

  durationRow: { flexDirection: "row", gap: 8 },
  durationChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
  },
  switchTitle: { fontSize: 13.5, fontWeight: "700" },
  switchSub: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },

  hrBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  hrAvatarWrap: { width: 56, height: 56 },
  hrAvatar: { width: 56, height: 56, borderRadius: 28 },
  hrAvatarEmpty: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  hrInput: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },

  imagePicker: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageHint: { fontSize: 12.5, fontWeight: "600", marginTop: 8 },

  submitBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  submitText: { color: "#fff", fontSize: 15.5, fontWeight: "700" },
  limitsBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },

  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  pickerCard: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
    marginLeft: 4,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowText: { fontSize: 14, fontWeight: "600" },
});
