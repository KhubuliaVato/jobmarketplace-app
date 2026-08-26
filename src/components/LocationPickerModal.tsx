import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useAuthStore } from "../store/useAuthStore";
import { THEME_PALETTES } from "../utils/bgThemes";

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
}

const DEFAULT_LAT = 41.7151;
const DEFAULT_LNG = 44.8271;

function buildMapHtml(lat: number, lng: number) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  let marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);

  function send(lat, lng) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
  }

  marker.on('dragend', function (e) {
    const pos = marker.getLatLng();
    send(pos.lat, pos.lng);
  });

  map.on('click', function (e) {
    marker.setLatLng(e.latlng);
    send(e.latlng.lat, e.latlng.lng);
  });

  send(${lat}, ${lng});

  window.__recenter = function(lat, lng) {
    map.setView([lat, lng], 15);
    marker.setLatLng([lat, lng]);
    send(lat, lng);
  };
</script>
</body></html>`;
}

export default function LocationPickerModal({
  visible,
  onClose,
  onSelect,
}: LocationPickerModalProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
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
  };

  const webViewRef = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [loadingGps, setLoadingGps] = useState(false);

  useEffect(() => {
    if (visible) {
      setHtml(buildMapHtml(DEFAULT_LAT, DEFAULT_LNG));
      setSelected({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      goToMyLocation(true);
    } else {
      setHtml(null);
    }
  }, [visible]);

  const goToMyLocation = async (silent = false) => {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!silent) return;
      } else {
        const pos = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = pos.coords;
        setSelected({ lat: latitude, lng: longitude });
        webViewRef.current?.injectJavaScript(
          `window.__recenter && window.__recenter(${latitude}, ${longitude}); true;`,
        );
      }
    } catch {
      // ჩუმად ვჯერდებით default-ს
    } finally {
      setLoadingGps(false);
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected.lat, selected.lng);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View
          style={[
            styles.header,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            ლოკაციის გაზიარება
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.bg }]}
          >
            <Ionicons name="close" size={20} color={theme.subText} />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.hint,
            { color: theme.subText, backgroundColor: theme.cardBg },
          ]}
        >
          გადაათრიე pin ან დააჭირე რუკას ხელით, ან გამოიყენე მიმდინარე ლოკაცია
        </Text>

        <View style={{ flex: 1 }}>
          {html && (
            <WebView
              ref={webViewRef}
              source={{ html }}
              style={{ flex: 1 }}
              onMessage={(e) => {
                try {
                  const data = JSON.parse(e.nativeEvent.data);
                  setSelected({ lat: data.lat, lng: data.lng });
                } catch {}
              }}
            />
          )}

          <TouchableOpacity
            onPress={() => goToMyLocation(false)}
            style={[
              styles.gpsBtn,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            {loadingGps ? (
              <ActivityIndicator size="small" color="#5B42F5" />
            ) : (
              <Ionicons name="locate" size={20} color="#5B42F5" />
            )}
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.footer,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={[styles.cancelBtn, { borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontWeight: "600" }}>
              გაუქმება
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!selected}
            style={[styles.sendBtn, !selected && { opacity: 0.5 }]}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700" }}>გაზიარება</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "800" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    fontSize: 12.5,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  gpsBtn: {
    position: "absolute",
    bottom: 20,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#5B42F5",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
