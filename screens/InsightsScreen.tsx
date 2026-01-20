import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as Location from 'expo-location';

type Weather = {
  temp: number;
  rain: number;
  wind: number;
};

// Shows 5 day forecast trend
export function InsightsScreen() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<{ day: string; score: number; guidance: string; color: string }[]>([]);
  const [mode, setMode] = useState<'Rule' | 'Model'>('Rule');

  // Calculate disruption score from weather data
  const calcScore = (w: Weather, m: 'Rule' | 'Model') => {
    const rainW = m === 'Rule' ? 8 : 5;
    const windW = m === 'Rule' ? 4 : 6;
    const tempW = m === 'Rule' ? 1 : 2;
    const pts = w.rain * rainW + w.wind * windW + Math.abs(w.temp - 20) * tempW;
    return Math.min(100, Math.max(0, Math.round(pts)));
  };

  const getGuidance = (score: number) => {
    if (score <= 33) return { text: 'Keep', color: '#22c55e' };
    if (score <= 66) return { text: 'Adjust', color: '#f97316' };
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
        const score = calcScore(w, mode);
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

  // Fetch when mode changes
  useEffect(() => {
    if (location) fetchForecast(location.lat, location.lon);
  }, [mode]);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.label}>Scoring Mode</Text>
      <View style={styles.row}>
        {(['Rule', 'Model'] as const).map(m => (
          <TouchableOpacity key={m} style={[styles.seg, mode === m && styles.segActive]} onPress={() => setMode(m)}>
            <Text style={mode === m ? styles.segTextActive : styles.segText}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!location && (
        <TouchableOpacity style={styles.btn} onPress={useCurrentLocation}>
          <Text style={styles.btnText}>{loading ? 'Loading...' : 'Use Current Location'}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  segActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  segText: { color: '#333' },
  segTextActive: { color: '#fff' },
  btn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
