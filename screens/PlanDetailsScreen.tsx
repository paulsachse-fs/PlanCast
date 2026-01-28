import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Plan, Weather } from '../App';

// Plan Details Screen
export function PlanDetails({ plan, onBack, onDelete }: { plan: Plan; onBack: () => void; onDelete: (id: string) => void }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'Rule' | 'Model'>('Rule');

  useEffect(() => {
    fetchWeather();
  }, []);

  // Fetch weather data
  const fetchWeather = async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${plan.lat}&longitude=${plan.lon}&hourly=temperature_2m,precipitation,wind_speed_10m&forecast_days=1`;
      const res = await fetch(url);
      const data = await res.json();
      // Get noon values (index 12)
      setWeather({
        temp: data.hourly.temperature_2m[12],
        rain: data.hourly.precipitation[12],
        wind: data.hourly.wind_speed_10m[12] / 3.6, // km/h to m/s
      });
    } catch {
      setError('Failed to load weather');
    }
  };

  // Calculate PDS
  const calcScore = (w: Weather, m: 'Rule' | 'Model') => {
    const rainW = m === 'Rule' ? 6 : 7.56;
    const windW = m === 'Rule' ? 4 : 1.71;
    const tempW = m === 'Rule' ? 3 : 3.73;
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

  // Convert score to guidance
  const getGuidance = (score: number) => {
    if (score <= 33) return { text: 'Keep', color: '#22c55e' };
    if (score <= 66) return { text: 'Adjust', color: '#f97316' };
    return { text: 'Reschedule', color: '#ef4444' };
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
      return `Wind (${w.wind.toFixed(1)}m/s) is the main factor.`;
    }

    if (w.temp < 10) {
      return 'Cold temperatures may be uncomfortable.';
    }
    return 'Warm temperatures may be a factor.';
  };

  const score = weather ? calcScore(weather, mode) : null;
  const guidance = score ? getGuidance(score.total) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{plan.title}</Text>
      <Text style={styles.subtitle}>{plan.date} at {plan.time}</Text>
      <Text style={styles.subtitle}>{plan.activity} · {plan.importance} importance</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!weather && !error ? <Text style={styles.loading}>Loading weather...</Text> : null}

      {weather && score && guidance && (
        <>
          {/* Weather Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Forecast (noon)</Text>
            <Text style={styles.cardText}>Temp: {weather.temp.toFixed(1)}°C</Text>
            <Text style={styles.cardText}>Rain: {weather.rain.toFixed(1)} mm</Text>
            <Text style={styles.cardText}>Wind: {weather.wind.toFixed(1)} m/s</Text>
          </View>

          {/* Score Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Plan Disruption Score</Text>
            <Text style={[styles.score, { color: guidance.color }]}>{score.total}</Text>

            <Text style={styles.cardLabel}>Breakdown</Text>
            <Text style={styles.cardText}>Rain: +{score.rain} pts · Wind: +{score.wind} pts · Temp: +{score.temp} pts</Text>

            <Text style={styles.cardLabel}>Why this score?</Text>
            <Text style={styles.explanation}>{getExplanation(weather, score)}</Text>

            {/* Guidance */}
            <View style={[styles.badge, { backgroundColor: guidance.color + '20' }]}>
              <View style={[styles.dot, { backgroundColor: guidance.color }]} />
              <Text style={[styles.badgeText, { color: guidance.color }]}>{guidance.text}</Text>
            </View>
          </View>

          {/* Mode Toggle */}
          <Text style={styles.modeLabel}>Scoring Mode</Text>
          <View style={styles.row}>
            {(['Rule', 'Model'] as const).map(m => (
              <TouchableOpacity key={m} style={[styles.seg, mode === m && styles.segActive]} onPress={() => setMode(m)}>
                <Text style={mode === m ? styles.segTextActive : styles.segText}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Delete Button */}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(plan.id)}>
        <Text style={styles.deleteBtnText}>Delete Plan</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  back: { color: '#3b82f6', fontSize: 16, marginBottom: 12, paddingHorizontal: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 4, paddingHorizontal: 8 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 2, paddingHorizontal: 8 },
  loading: { color: '#64748b', marginTop: 20 },
  error: { color: '#ef4444', marginTop: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16 },
  cardLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 8, marginBottom: 4 },
  cardText: { fontSize: 15, color: '#334155', marginBottom: 2 },
  explanation: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  score: { fontSize: 48, fontWeight: 'bold' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  modeLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 20, marginBottom: 8, paddingHorizontal: 8 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 8 },
  seg: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff' },
  segActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  segText: { color: '#475569' },
  segTextActive: { color: '#fff' },
  deleteBtn: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 'auto' },
  deleteBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 16 },
});
