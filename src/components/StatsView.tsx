import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';

interface StatsViewProps {
  onBack: () => void;
}

export default function StatsView({ onBack }: StatsViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  const [stats, setStats] = useState<any>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    card: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
  };

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      try {
        const [statsRes, tierRes] = await Promise.all([
          supabase.rpc('my_stats'),
          supabase.rpc('my_tier'),
        ]);
        setStats(statsRes.data);
        setTier(typeof tierRes.data === 'string' ? tierRes.data : (tierRes.data?.tier ?? null));
      } catch (e) {
        console.error('stats fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color="#8B5CF6" size="large" />
      </View>
    );
  }

  if (tier !== 'pro') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <TouchableOpacity style={styles.backButtonRow} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#5B42F5" />
          <Text style={styles.backButtonText}>პარამეტრებში დაბრუნება</Text>
        </TouchableOpacity>
        <View style={styles.lockedWrap}>
          <View style={styles.lockedIconCircle}>
            <Ionicons name="rocket" size={34} color="#fff" />
          </View>
          <Text style={[styles.lockedTitle, { color: theme.text }]}>სტატისტიკა</Text>
          <Text style={[styles.lockedSub, { color: theme.subText }]}>სტატისტიკა მხოლოდ Pro გამომწერებისთვისაა</Text>
        </View>
      </View>
    );
  }

  const s = stats?.summary || {};
  const jobs: any[] = stats?.jobs || [];
  const trend = stats?.trend || {};
  const typeBreakdown = stats?.type_breakdown || {};
  const appStatuses = stats?.app_statuses || {};
  const topSkills: any[] = stats?.top_skills || [];
  const hourlyViews: any[] = stats?.hourly_views || [];

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const viewsMap: Record<string, number> = {};
  (stats?.daily_views || []).forEach((r: any) => { viewsMap[r.date?.slice(0, 10)] = Number(r.views); });
  const appsMap: Record<string, number> = {};
  (stats?.daily_apps || []).forEach((r: any) => { appsMap[r.date?.slice(0, 10)] = Number(r.apps); });

  // gifted-charts დღეს ყველა წერტილს არ აჩვენებს კარგად — ვიღებთ ყოველ მე-3 დღეს ლეიბლისთვის
  const lineData = last30.map((d, i) => ({
    value: viewsMap[d] || 0,
    label: i % 5 === 0 ? d.slice(5) : '',
  }));
  const barData = last30.map((d, i) => ({
    value: appsMap[d] || 0,
    label: i % 5 === 0 ? d.slice(5) : '',
    frontColor: '#3B82F6',
  }));

  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    value: hourlyViews.find((r: any) => r.hour === h)?.views || 0,
    label: h % 4 === 0 ? `${h}` : '',
    frontColor: '#8B5CF6',
  }));
  const peakHour = hourlyData.reduce((a, b) => (b.value > a.value ? b : a), hourlyData[0]);
  const peakHourIndex = hourlyData.findIndex((h) => h === peakHour);

  const trendViews = trend.views_14 > 0
    ? Math.round(((trend.views_7 - trend.views_14) / trend.views_14) * 100)
    : trend.views_7 > 0 ? 100 : 0;
  const trendApps = trend.apps_14 > 0
    ? Math.round(((trend.apps_7 - trend.apps_14) / trend.apps_14) * 100)
    : trend.apps_7 > 0 ? 100 : 0;

  const totalViews30 = last30.reduce((a, d) => a + (viewsMap[d] || 0), 0);
  const bestJob = [...jobs].sort((a, b) => b.views - a.views)[0];

  const pieData = [
    { value: Number(typeBreakdown.company || 0), color: '#6B54F7', text: 'კომპანია' },
    { value: Number(typeBreakdown.private || 0), color: '#12B3AA', text: 'კერძო' },
  ];
  const appPieData = [
    { value: Number(appStatuses.pending || 0), color: '#f5a623', text: 'განხილვაში' },
    { value: Number(appStatuses.accepted || 0), color: '#37B562', text: 'მიღებული' },
    { value: Number(appStatuses.rejected || 0), color: '#D9463A', text: 'უარყოფილი' },
  ];

  const exportCSV = async () => {
    const rows = [
      ['სახელი', 'ნახვა', 'CV', 'შენახული', 'Bump'],
      ...jobs.map((j: any) => [j.title, j.views, j.applications, j.saves, j.bumps]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    try {
      await Share.share({ message: csv, title: 'FreeJob სტატისტიკა' });
    } catch {}
  };

  const StatCard = ({ label, value, icon, color, sub, trendVal }: any) => (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.statTop}>
        <View style={[styles.statIconCircle, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {trendVal !== undefined && (
          <View style={[styles.trendPill, { backgroundColor: trendVal >= 0 ? '#37B56218' : '#D9463A18' }]}>
            <Text style={{ color: trendVal >= 0 ? '#37B562' : '#D9463A', fontSize: 11, fontWeight: '700' }}>
              {trendVal >= 0 ? '↑' : '↓'} {Math.abs(trendVal)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value ?? 0}</Text>
      <Text style={[styles.statLabel, { color: theme.subText }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color }]}>{sub}</Text> : null}
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      <TouchableOpacity style={styles.backButtonRow} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color="#5B42F5" />
        <Text style={styles.backButtonText}>პარამეტრებში დაბრუნება</Text>
      </TouchableOpacity>

      {/* სათაური */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>სტატისტიკა</Text>
          <View style={styles.proBadge}>
            <Ionicons name="rocket" size={11} color="#8B5CF6" />
            <Text style={styles.proBadgeText}>Pro</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.csvBtn, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={exportCSV}>
          <Ionicons name="download-outline" size={15} color={theme.text} />
          <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}>CSV</Text>
        </TouchableOpacity>
      </View>

      {/* summary cards */}
      <View style={styles.statsGrid}>
        <StatCard label="ნახვა სულ" value={s.total_views} color="#12B3AA" trendVal={trendViews} sub={`${trend.views_7 || 0} ბოლო 7 დღეში`} icon="eye-outline" />
        <StatCard label="CV / განაცხადი" value={s.total_apps} color="#3B82F6" trendVal={trendApps} sub={`${trend.apps_7 || 0} ბოლო 7 დღეში`} icon="document-text-outline" />
        <StatCard label="შენახული" value={s.total_saves} color="#f5a623" icon="bookmark-outline" />
        <StatCard label="განცხადება" value={s.total_jobs} color="#6B54F7" sub={`${s.active_jobs} აქტიური`} icon="briefcase-outline" />
        <StatCard label="გამომდევნე" value={s.followers} color="#EC4899" icon="people-outline" />
        <StatCard label="პიკი" value={peakHour?.value > 0 ? `${peakHourIndex}:00` : '—'} color="#8B5CF6" sub={peakHour?.value > 0 ? `${peakHour.value} ნახვა` : 'მონაცემი არ არის'} icon="time-outline" />
      </View>

      {/* ნახვების ხაზოვანი გრაფიკი */}
      <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={[styles.chartTitle, { color: theme.text }]}>ნახვები — ბოლო 30 დღე</Text>
            <Text style={[styles.chartSub, { color: theme.subText }]}>სულ {totalViews30}</Text>
          </View>
          <View style={[styles.trendPill, { backgroundColor: trendViews >= 0 ? '#37B56218' : '#D9463A18' }]}>
            <Text style={{ color: trendViews >= 0 ? '#37B562' : '#D9463A', fontSize: 11, fontWeight: '700' }}>
              {trendViews >= 0 ? '↑' : '↓'} {Math.abs(trendViews)}%
            </Text>
          </View>
        </View>
        <LineChart
          data={lineData}
          height={160}
          width={280}
          color="#12B3AA"
          thickness={2.5}
          hideDataPoints
          curved
          yAxisTextStyle={{ color: theme.subText, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: theme.subText, fontSize: 9 }}
          rulesColor={theme.border}
          xAxisColor={theme.border}
          yAxisColor={theme.border}
          noOfSections={3}
          initialSpacing={0}
        />
      </View>

      {/* განაცხადების ბარ-ჩარტი */}
      <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>განაცხადები — ბოლო 30 დღე</Text>
        <Text style={[styles.chartSub, { color: theme.subText, marginBottom: 14 }]}>სულ {s.total_apps}</Text>
        <BarChart
          data={barData}
          height={130}
          width={280}
          barWidth={5}
          spacing={4}
          roundedTop
          yAxisTextStyle={{ color: theme.subText, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: theme.subText, fontSize: 9 }}
          rulesColor={theme.border}
          xAxisColor={theme.border}
          yAxisColor={theme.border}
          noOfSections={3}
          initialSpacing={0}
        />
      </View>

      {/* საათობრივი აქტივობა */}
      <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>საათობრივი აქტივობა</Text>
        <Text style={[styles.chartSub, { color: theme.subText, marginBottom: 14 }]}>
          პიკი: {peakHour?.value > 0 ? `${peakHourIndex}:00 (${peakHour.value} ნახვა)` : 'მონაცემი არ არის'}
        </Text>
        <BarChart
          data={hourlyData}
          height={110}
          width={280}
          barWidth={7}
          spacing={3}
          roundedTop
          yAxisTextStyle={{ color: theme.subText, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: theme.subText, fontSize: 9 }}
          rulesColor={theme.border}
          xAxisColor={theme.border}
          yAxisColor={theme.border}
          noOfSections={3}
          initialSpacing={0}
        />
      </View>

      {/* pie charts */}
      <View style={styles.pieRow}>
        <View style={[styles.pieCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.chartTitle, { color: theme.text, marginBottom: 14 }]}>განცხადებების ტიპი</Text>
          <View style={styles.pieContentRow}>
            <PieChart data={pieData} radius={45} innerRadius={28} donut />
            <View style={{ marginLeft: 12 }}>
              {pieData.map((e) => (
                <View key={e.text} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: e.color }]} />
                  <Text style={{ color: theme.subText, fontSize: 12 }}>{e.text}</Text>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>{e.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.pieCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.chartTitle, { color: theme.text, marginBottom: 14 }]}>CV-ების სტატუსი</Text>
          <View style={styles.pieContentRow}>
            <PieChart data={appPieData} radius={45} innerRadius={28} donut />
            <View style={{ marginLeft: 12 }}>
              {appPieData.map((e) => (
                <View key={e.text} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: e.color }]} />
                  <Text style={{ color: theme.subText, fontSize: 12 }}>{e.text}</Text>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>{e.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* top skills */}
      {topSkills.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.chartTitle, { color: theme.text, marginBottom: 14 }]}>პოპულარული სქილები შენს განცხადებებში</Text>
          {topSkills.map((sk: any, i: number) => {
            const max = topSkills[0]?.count || 1;
            const pct = Math.round((sk.count / max) * 100);
            return (
              <View key={sk.skill} style={{ marginBottom: 10 }}>
                <View style={styles.skillRow}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{sk.skill}</Text>
                  <Text style={{ color: theme.subText, fontSize: 12 }}>{sk.count}</Text>
                </View>
                <View style={[styles.skillTrack, { backgroundColor: theme.bg }]}>
                  <View style={[styles.skillFill, { width: `${pct}%`, backgroundColor: `hsl(${260 - i * 20}, 70%, 60%)` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* საუკეთესო ვაკანსია */}
      {bestJob && (
        <View style={[styles.bestJobCard, { borderColor: '#f5a62340' }]}>
          <View style={styles.bestJobIcon}><Text style={{ fontSize: 22 }}>🏆</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bestJobLabel}>ყველაზე პოპულარული</Text>
            <Text style={[styles.bestJobTitle, { color: theme.text }]} numberOfLines={1}>{bestJob.title}</Text>
            <Text style={{ color: theme.subText, fontSize: 12.5 }}>
              {bestJob.views} ნახვა · {bestJob.applications} CV · {bestJob.saves} შენახული
            </Text>
          </View>
        </View>
      )}

      {/* ვაკანსიების სია */}
      {jobs.length > 0 && (
        <View style={[styles.jobsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.jobsHeaderRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>ყველა განცხადება</Text>
            <Text style={{ color: theme.subText, fontSize: 12.5 }}>{jobs.length} სულ</Text>
          </View>
          {jobs.map((j: any, i: number) => (
            <TouchableOpacity
              key={j.id}
              style={[styles.jobRow, { borderTopColor: theme.border, borderTopWidth: i === 0 ? 0 : 1 }]}
              onPress={() => setActiveJobId(activeJobId === j.id ? null : j.id)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.jobTitle, { color: theme.text }]} numberOfLines={1}>{j.title}</Text>
                <Text style={{ color: theme.subText, fontSize: 11.5, marginTop: 2 }}>
                  {new Date(j.created_at).toLocaleDateString('ka-GE')}
                  {j.status === 'hidden' ? ' · დამალული' : ''}
                </Text>
              </View>
              <View style={styles.jobStatsRow}>
                {[
                  { v: j.views, l: 'ნახვა', c: '#12B3AA' },
                  { v: j.applications, l: 'CV', c: '#3B82F6' },
                  { v: j.saves, l: 'შენახ', c: '#f5a623' },
                  { v: j.bumps, l: 'bump', c: '#8B5CF6' },
                ].map(({ v, l, c }) => (
                  <View key={l} style={{ alignItems: 'center', minWidth: 32 }}>
                    <Text style={{ color: c, fontSize: 13, fontWeight: '800' }}>{v}</Text>
                    <Text style={{ color: theme.subText, fontSize: 9 }}>{l}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 130 },

  backButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 4 },
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 8 },

  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginTop: -60 },
  lockedIconCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  lockedTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  lockedSub: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(139,92,246,0.15)' },
  proBadgeText: { color: '#8B5CF6', fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
  csvBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, borderWidth: 1 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', borderRadius: 16, borderWidth: 1, padding: 14 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  statIconCircle: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  trendPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statSub: { fontSize: 10.5, marginTop: 3, fontWeight: '600' },

  chartCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartTitle: { fontSize: 14.5, fontWeight: '700' },
  chartSub: { fontSize: 12, marginTop: 2 },

  pieRow: { gap: 12, marginBottom: 14 },
  pieCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  pieContentRow: { flexDirection: 'row', alignItems: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },

  skillRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  skillTrack: { height: 7, borderRadius: 4 },
  skillFill: { height: 7, borderRadius: 4 },

  bestJobCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14, backgroundColor: 'rgba(245,166,35,0.06)' },
  bestJobIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(245,166,35,0.15)', justifyContent: 'center', alignItems: 'center' },
  bestJobLabel: { fontSize: 10.5, fontWeight: '800', color: '#f5a623', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  bestJobTitle: { fontSize: 14.5, fontWeight: '700' },

  jobsCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  jobsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  jobRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  jobTitle: { fontSize: 13.5, fontWeight: '700' },
  jobStatsRow: { flexDirection: 'row', gap: 14 },
});