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
    const rainW = m === 'Rule' ? 8 : 5;
    const windW = m === 'Rule' ? 4 : 6;
    const tempW = m === 'Rule' ? 1 : 2;
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
      <TouchableOpacity onPress={onBack}><Text style={styles.back}>← Back</Text></TouchableOpacity>
      <Text style={styles.title}>{plan.title}</Text>
      <Text style={styles.planSub}>{plan.date} {plan.time}</Text>
      <Text style={styles.planSub}>{plan.activity} - {plan.importance} importance</Text>
      <Text style={styles.planSub}>Location: {plan.lat}, {plan.lon}</Text>

      <View style={styles.divider} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!weather && !error ? <Text>Loading weather...</Text> : null}

      {weather && score && guidance && (
        <>
          <Text style={styles.label}>Forecast (noon)</Text>
          <Text>Temp: {weather.temp.toFixed(1)}°C</Text>
          <Text>Rain: {weather.rain.toFixed(1)} mm</Text>
          <Text>Wind: {weather.wind.toFixed(1)} m/s</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Scoring Mode</Text>
          <View style={styles.row}>
            {(['Rule', 'Model'] as const).map(m => (
              <TouchableOpacity key={m} style={[styles.seg, mode === m && styles.segActive]} onPress={() => setMode(m)}>
                <Text style={mode === m ? styles.segTextActive : styles.segText}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Plan Disruption Score</Text>
          <Text style={[styles.score, { color: guidance.color }]}>{score.total}</Text>

          <Text style={styles.label}>Breakdown</Text>
          <Text>Rain: +{score.rain} pts</Text>
          <Text>Wind: +{score.wind} pts</Text>
          <Text>Temp: +{score.temp} pts</Text>

          <Text style={styles.label}>Why this score?</Text>
          <Text style={{ color: '#666', marginBottom: 8 }}>{getExplanation(weather, score)}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Guidance</Text>
          <Text style={[styles.guidance, { backgroundColor: guidance.color }]}>{guidance.text}</Text>
        </>
      )}

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444', marginTop: 20 }]} onPress={() => onDelete(plan.id)}>
        <Text style={styles.btnText}>Delete Plan</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  segActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  segText: { color: '#333' },
  segTextActive: { color: '#fff' },
  btn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  back: { color: '#3b82f6', fontSize: 16, marginBottom: 8 },
  planSub: { color: '#666', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  score: { fontSize: 48, fontWeight: 'bold' },
  guidance: { color: '#fff', padding: 12, borderRadius: 8, textAlign: 'center', fontWeight: '600', fontSize: 18, overflow: 'hidden' },
  error: { color: '#ef4444' },
});
