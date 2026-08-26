import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface VoiceBubbleProps {
  uri: string;
  mine: boolean;
  incomingBg: string;
  textColor: string;
}

// წინასწარგანსაზღვრული ბარების სიმაღლეები — waveform-ის სტატიკური "ფორმა" (web-ის ანალოგიით)
const BAR_HEIGHTS = [
  40, 65, 30, 80, 55, 90, 35, 70, 45, 60, 25, 85, 50, 75, 40, 65, 30, 80, 55,
  90, 35, 70, 45, 60, 25,
];

export default function VoiceBubble({
  uri,
  mine,
  incomingBg,
  textColor,
}: VoiceBubbleProps) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish) player.seekTo(0);
      player.play();
    }
  };

  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;
  const progressBars = duration
    ? (currentTime / duration) * BAR_HEIGHTS.length
    : 0;

  const displaySeconds =
    status.playing || currentTime > 0 ? currentTime : duration;
  const mm = Math.floor(displaySeconds / 60);
  const ss = String(Math.floor(displaySeconds % 60)).padStart(2, "0");

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: mine ? "#5B42F5" : incomingBg },
      ]}
    >
      <TouchableOpacity
        onPress={toggle}
        style={[
          styles.playBtn,
          {
            backgroundColor: mine
              ? "rgba(255,255,255,0.22)"
              : "rgba(91,66,245,0.14)",
          },
        ]}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={16}
          color={mine ? "#fff" : "#5B42F5"}
          style={!status.playing ? { marginLeft: 2 } : undefined}
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <View style={styles.barsRow}>
          {BAR_HEIGHTS.map((h, i) => {
            const filled = i < progressBars;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  borderRadius: 2,
                  marginHorizontal: 1,
                  height: `${h}%` as any,
                  backgroundColor: mine
                    ? filled
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.35)"
                    : filled
                      ? "#5B42F5"
                      : "rgba(142,142,147,0.35)",
                }}
              />
            );
          })}
        </View>
        <Text
          style={{
            fontSize: 11,
            marginTop: 5,
            color: mine ? "#fff" : textColor,
            opacity: 0.8,
          }}
        >
          {mm}:{ss}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    width: 230,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  barsRow: { flexDirection: "row", alignItems: "flex-end", height: 24 },
});
