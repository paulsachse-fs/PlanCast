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
    const rainW = settings.useAI ? 7.56 : 6;
    const windW = settings.useAI ? 1.71 : 4;
    const tempW = settings.useAI ? 3.73 : 3;
    const rainPts = w.rain * rainW;
    const windPts = w.wind * windW;
    const tempPts = Math.abs(w.temp - 20) * tempW;
    return {
      rain: Math.round(rainPts),
      wind: Math.round(windPts),
      temp: Math.round(tempPts),
      total: Math.min(100, Math.max(0, Math.round(rainPts + windPts + tempPts))),
    };
  };

  // Explanation of the score
  const getExplanation = (w: Weather, s: {rain: number, wind: number, temp: number}) => {
    const totalPoints = s.rain + s.wind + s.temp;

    // Low score = good weather
    if (totalPoints < 15) {
      return 'Weather conditions look favorable.';
    }

    // Find the dominant factor
    const isRainDominant = s.rain >= s.wind && s.rain >= s.temp;
    const isWindDominant = s.wind >= s.rain && s.wind >= s.temp;

    if (isRainDominant) {
      if (w.rain > 5) {
        return `Rain (${w.rain.toFixed(1)}mm) is the main concern.`;
      }
      return 'Light rain may affect plans.';
    }

    if (isWindDominant) {
      const windVal = settings.windUnit === 'kmh' ? (w.wind * 3.6).toFixed(1) : w.wind.toFixed(1);
      const windLabel = settings.windUnit === 'kmh' ? 'km/h' : 'm/s';
      return `Wind (${windVal}${windLabel}) is the main factor.`;
    }

    if (w.temp < 10) {
      return 'Cold temperatures may be uncomfortable.';
    }
    return 'Warm temperatures may be a factor.';
  };

  const score = weather ? calcScore(weather) : null;
  const t = settings.riskTolerance === 'Low' ? [25, 50] : settings.riskTolerance === 'High' ? [45, 75] : [33, 66];
  const scoreColor = score === null ? '#999' : score.total <= t[0] ? '#22c55e' : score.total <= t[1] ? '#f97316' : '#ef4444';
  const explanation = weather && score ? getExplanation(weather, score) : null;

  return (
    <View style={{ flex: 1, paddingTop: 20, paddingHorizontal: 20 }}>
      {/* Color key */}
      <View style={styles.keyColumn}>
        <View style={styles.keyItem}>
          <View style={[styles.keyDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.keyLabel}>Keep</Text>
        </View>
        <View style={styles.keyItem}>
          <View style={[styles.keyDot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.keyLabel}>Adjust</Text>
        </View>
        <View style={styles.keyItem}>
          <View style={[styles.keyDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.keyLabel}>Reschedule</Text>
        </View>
      </View>

      {/* Which PDS mode is active */}
      <Text style={styles.modeStatus}>{settings.useAI ? 'AI Results' : 'Non-AI Results'}</Text>

      {/* PDS Circle */}
      <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.pdsCircle, { borderColor: scoreColor }]}>
          <Text style={styles.pdsLabel}>PDS</Text>
          <Text style={[styles.pdsScore, { color: scoreColor }]}>{score?.total ?? '—'}</Text>
          {nextPlan && <Text style={styles.pdsSub}>{nextPlan.title}</Text>}
        </View>
        {explanation && <Text style={styles.explanation}>{explanation}</Text>}
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
  explanation: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 },
  upcomingSection: { flex: 1, backgroundColor: '#eee', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#ccc', borderBottomWidth: 0 },
  upcomingTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  planCard: { backgroundColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#999' },
  planTitle: { fontSize: 18, fontWeight: '600' },
  planSub: { color: '#666', marginTop: 4 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  addBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  modeStatus: { textAlign: 'center', color: '#666', fontSize: 13, marginTop: 10 },
  keyColumn: { position: 'absolute', top: 20, right: 20, gap: 4, zIndex: 1 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  keyDot: { width: 10, height: 10, borderRadius: 5 },
  keyLabel: { fontSize: 11, color: '#666', marginRight: 6 },
});
