/**
 * Sleep "Last night" hero: indigo night sky with sparkles, a glowing crescent moon, soft clouds and
 * wave lines, a haloed moon-and-star badge, and either the "not logged yet" message or the logged night.
 * Logged-night content is passed in as children so the screen keeps its own stats.
 */
import { LinearGradient } from "expo-linear-gradient";
import { MoonStar } from "lucide-react-native";
import { useId, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { AppText } from "./Text";
import { font, palette } from "@/lib/theme";

/** Four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;

function NightSky() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  // Both SVGs get an explicit 100% size inside a filled box: on web an SVG otherwise sizes itself from
  // its viewBox ratio and overflows the card. Waves stretch across the whole card; the moon, clouds and
  // sparkles keep their proportions and stay anchored to the right edge.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 160"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Path
          d="M0 92 C60 80 120 104 190 92 C250 82 300 70 360 76"
          stroke="#FFFFFF"
          strokeOpacity={0.12}
          strokeWidth={1.2}
          fill="none"
        />
        <Path
          d="M0 104 C70 96 140 116 210 104 C270 94 320 86 360 92 L360 160 L0 160 Z"
          fill="#1E2366"
          opacity={0.25}
        />
      </Svg>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 160"
        preserveAspectRatio="xMaxYMin meet"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.45" stopColor="#FFE9C2" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FFE9C2" stopOpacity={0} />
          </RadialGradient>
          <SvgGradient id={`${id}moon`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFF4DD" />
            <Stop offset="1" stopColor="#F2C7A8" />
          </SvgGradient>
          <SvgGradient id={`${id}cloud`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7A6EE6" />
            <Stop offset="1" stopColor="#5649C4" />
          </SvgGradient>
        </Defs>
        {/* moon */}
        <Circle cx={322} cy={22} r={46} fill={`url(#${id}glow)`} />
        <Circle cx={322} cy={20} r={27} fill={`url(#${id}moon)`} />
        <Circle cx={331} cy={13} r={24} fill="#3A3FB4" opacity={0.93} />
        {/* clouds */}
        <Path
          d="M262 110 C258 96 272 88 283 93 C287 80 304 75 314 84 C322 72 344 72 351 88 C362 88 368 98 368 110 Z"
          fill={`url(#${id}cloud)`}
          opacity={0.95}
        />
        <Path
          d="M300 118 C298 108 308 102 316 106 C320 98 332 96 338 104 C346 102 356 108 356 118 Z"
          fill="#6A5FDB"
          opacity={0.85}
        />
        {/* sparkles and dots */}
        <G fill="#FFFFFF">
          <Path d={sparkle(236, 14, 3.5)} />
          <Path d={sparkle(304, 64, 5)} />
          <Path d={sparkle(345, 34, 4.5)} />
          <Circle cx={248} cy={42} r={0.9} opacity={0.7} />
          <Circle cx={356} cy={52} r={1.1} opacity={0.7} />
          <Circle cx={284} cy={78} r={0.8} opacity={0.6} />
          <Circle cx={300} cy={56} r={0.8} opacity={0.6} />
          <Circle cx={216} cy={66} r={0.8} opacity={0.5} />
        </G>
      </Svg>
    </View>
  );
}

export function SleepHero({
  logged,
  children,
  below,
}: {
  logged: boolean;
  children?: ReactNode;
  below?: ReactNode;
}) {
  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={["#4650D2", "#3438A6", "#262A7E"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <NightSky />
      <View style={styles.row}>
        <View style={styles.halo}>
          <View style={styles.badge}>
            <MoonStar size={30} color={palette.butter[400]} strokeWidth={2.2} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.eyebrow}>LAST NIGHT</AppText>
          {children ?? (
            <>
              <AppText style={styles.title}>Not logged yet</AppText>
              <AppText style={styles.sub}>
                Log your sleep to see your nightly insights.
              </AppText>
            </>
          )}
        </View>
      </View>
      {logged ? below : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    padding: 18,
    overflow: "hidden",
    shadowColor: "#262A7E",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  halo: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(214,218,255,0.85)",
  },
  title: {
    fontFamily: font.displayBold,
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: -0.4,
    color: "#FFFFFF",
    marginTop: 4,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(225,228,255,0.88)",
    marginTop: 4,
    maxWidth: 196,
  },
});
