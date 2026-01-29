import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Plan, Weather, Settings } from '../App';

export function PlansList({ plans, onAdd, onSelect, settings }: {
  plans: Plan[];
  onAdd: () => void;
  onSelect: (plan: Plan) => void;
  settings: Settings;
}) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [mode, setMode] = useState<'Rule' | 'Model'>('Rule');

  // Only show future plans
  const now = new Date();
  const upcomingPlans = plans.filter(plan => new Date(`${plan.date}T${plan.time}`) >= now);
  const sortedPlans = [...upcomingPlans].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const nextPlan = sortedPlans[0];

  useEffect(() => {
    if (!nextPlan) return;
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${nextPlan.lat}&longitude=${nextPlan.lon}&hourly=temperature_2m,precipitation,wind_speed_10m&forecast_days=1`;
        const res = await fetch(url);
        const data = await res.json();
        setWeather({
          temp: data.hourly.temperature_2m[12],
          rain: data.hourly.precipitation[12],
          wind: data.hourly.wind_speed_10m[12] / 3.6,
        });
      } catch {}
    };
    fetchWeather();
  }, [nextPlan?.id]);

  // Calculate disruption score from weather data
  const calcScore = (w: Weather) => {
    const rainW = mode === 'Rule' ? 6 : 7.56;
    const windW = mode === 'Rule' ? 4 : 1.71;
    const tempW = mode === 'Rule' ? 3 : 3.73;
    const pts = w.rain * rainW + w.wind * windW + Math.abs(w.temp - 20) * tempW;
    return Math.min(100, Math.max(0, Math.round(pts)));
  };

  const score = weather ? calcScore(weather) : null;
  const t = settings.riskTolerance === 'Low' ? [25, 50] : settings.riskTolerance === 'High' ? [45, 75] : [33, 66];
  const scoreColor = score === null ? '#999' : score <= t[0] ? '#22c55e' : score <= t[1] ? '#f97316' : '#ef4444';

  return (
    <View style={{ flex: 1, paddingTop: 20, paddingHorizontal: 20 }}>
      <View style={styles.modeRow}>
        {(['Rule', 'Model'] as const).map(m => (
          <TouchableOpacity key={m} style={[styles.seg, mode === m && styles.segActive]} onPress={() => setMode(m)}>
            <Text style={mode === m ? styles.segTextActive : styles.segText}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PDS Circle */}
      <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
        <View style={styles.pdsCircle}>
          <Text style={styles.pdsLabel}>PDS</Text>
          <Text style={[styles.pdsScore, { color: scoreColor }]}>{score ?? '—'}</Text>
          {nextPlan && <Text style={styles.pdsSub}>{nextPlan.title}</Text>}
        </View>
      </View>

      {/* Upcoming Plans */}
      <View style={styles.upcomingSection}>
        <Text style={styles.upcomingTitle}>Upcoming Plans</Text>
        <FlatList
          data={sortedPlans}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.planCard} onPress={() => onSelect(item)}>
              <Text style={styles.planTitle}>{item.title}</Text>
              <Text style={styles.planSub}>{item.date} {item.time}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No plans yet.</Text>}
        />
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addBtnText}>+ Add Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pdsCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  pdsLabel: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  pdsScore: { fontSize: 64, fontWeight: 'bold' },
  pdsSub: { fontSize: 14, color: '#666', textAlign: 'center' },
  upcomingSection: { flex: 1, backgroundColor: '#eee', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#ccc', borderBottomWidth: 0 },
  upcomingTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  planCard: { backgroundColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#999' },
  planTitle: { fontSize: 18, fontWeight: '600' },
  planSub: { color: '#666', marginTop: 4 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  addBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'center' },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  segActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  segText: { color: '#333' },
  segTextActive: { color: '#fff' },
});
