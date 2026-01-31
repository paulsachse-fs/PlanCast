import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, FlatList } from 'react-native';
import * as Location from 'expo-location';
import { Plan, Settings } from '../App';

type Weather = {
  temp: number;
  rain: number;
  wind: number;
};

export function InsightsScreen({ plans, settings }: { plans: Plan[]; settings: Settings }) {
  // Filter past plans sorted by date
  const now = new Date();
  const pastPlans = plans.filter(plan => new Date(`${plan.date}T${plan.time}`) < now).sort((a, b) => b.date.localeCompare(a.date));
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<{ day: string; score: number; guidance: string; color: string }[]>([]);

  // Calculate disruption score from weather data
  const calcScore = (w: Weather) => {
    const rainW = settings.useAI ? 7.56 : 6;
    const windW = settings.useAI ? 1.71 : 4;
    const tempW = settings.useAI ? 3.73 : 3;
    const pts = w.rain * rainW + w.wind * windW + Math.abs(w.temp - 20) * tempW;
    return Math.min(100, Math.max(0, Math.round(pts)));
  };

  const getGuidance = (score: number) => {
    const t = settings.riskTolerance === 'Low' ? [25, 50] : settings.riskTolerance === 'High' ? [45, 75] : [33, 66];
    if (score <= t[0]) return { text: 'Keep', color: '#22c55e' };
    if (score <= t[1]) return { text: 'Adjust', color: '#f97316' };
    return { text: 'Reschedule', color: '#ef4444' };
  };

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied');
      return;
    }
    setLoading(true);
    const loc = await Location.getCurrentPositionAsync({});
    const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
    setLocation(coords);
    await fetchForecast(coords.lat, coords.lon);
    setLoading(false);
  };

  const fetchForecast = async (lat: number, lon: number) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m&forecast_days=5`;
      const res = await fetch(url);
      const data = await res.json();
      const noonIndices = [12, 36, 60, 84, 108];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const results: { day: string; score: number; guidance: string; color: string }[] = [];
      for (let i = 0; i < noonIndices.length; i++) {
        const idx = noonIndices[i];
        if (data.hourly.temperature_2m[idx] === undefined) continue;
        const w: Weather = {
          temp: data.hourly.temperature_2m[idx],
          rain: data.hourly.precipitation[idx],
          wind: data.hourly.wind_speed_10m[idx] / 3.6,
        };
        const score = calcScore(w);
        const g = getGuidance(score);
        // Figure out which day this is
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = dayNames[date.getDay()];

        // "Today" and "Tomorrow" label
        let label = dayName;
        if (i === 0) label = `${dayName} (Today)`;
        if (i === 1) label = `${dayName} (Tomorrow)`;

        results.push({ day: label, score, guidance: g.text, color: g.color });
      }
      setForecast(results);
    } catch {
      Alert.alert('Failed to fetch forecast');
    }
  };

  // Fetch when AI setting changes
  useEffect(() => {
    if (location) fetchForecast(location.lat, location.lon);
  }, [settings.useAI]);

  return (
    <View style={{ flex: 1, paddingTop: 20, paddingHorizontal: 20 }}>
      <Text style={styles.title}>Insights</Text>
      {/* Show which PDS mode is active */}
      <Text style={styles.modeStatus}>{settings.useAI ? 'AI Results' : 'Non-AI Results'}</Text>

      {!location && (
        <TouchableOpacity style={styles.btn} onPress={useCurrentLocation}>
          <Text style={styles.btnText}>{loading ? 'Loading...' : 'Get Current Location PDS Forecast'}</Text>
        </TouchableOpacity>
      )}

      {forecast.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.label}>5-Day Risk Trend</Text>
          {forecast.map((f, i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontWeight: '600' }}>{f.day}</Text>
                <Text style={{ color: f.color, fontWeight: '600' }}>{f.score} — {f.guidance}</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#eee', borderRadius: 4 }}>
                <View style={{ width: `${f.score}%`, height: 8, backgroundColor: f.color, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Past Plans Section */}
      <View style={styles.pastSection}>
        <Text style={styles.pastTitle}>Past Plans</Text>
        <FlatList
          data={pastPlans}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            // Pick score based on current mode toggle
            const score = settings.useAI ? item.savedModelScore : item.savedRuleScore;
            const t = settings.riskTolerance === 'Low' ? [25, 50] : settings.riskTolerance === 'High' ? [45, 75] : [33, 66];
            const scoreColor = score === undefined ? '#999' : score <= t[0] ? '#22c55e' : score <= t[1] ? '#f97316' : '#ef4444';
            return (
              <View style={styles.pastCard}>
                <View>
                  <Text style={styles.pastCardTitle}>{item.title}</Text>
                  <Text style={styles.pastCardSub}>{item.date}</Text>
                </View>
                <Text style={[styles.pastCardScore, { color: scoreColor }]}>{score ?? '—'}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No past plans yet.</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  modeStatus: { color: '#666', fontSize: 13, marginBottom: 4 },
  btn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  pastSection: { flex: 1, backgroundColor: '#eee', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#ccc', borderBottomWidth: 0 },
  pastTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  pastCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#999' },
  pastCardTitle: { fontSize: 18, fontWeight: '600' },
  pastCardSub: { color: '#666', marginTop: 4 },
  pastCardScore: { fontSize: 24, fontWeight: 'bold' },
  empty: { color: '#999', textAlign: 'center', marginTop: 20 },
});
