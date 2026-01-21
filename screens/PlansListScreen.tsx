import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Plan, Weather } from '../App';

// Plans List Screen
export function PlansList({ plans, onAdd, onSelect }: {
  plans: Plan[];
  onAdd: () => void;
  onSelect: (plan: Plan) => void;
}) {
  const [weather, setWeather] = useState<Weather | null>(null);

  // Sort plans by date and get next
  const sortedPlans = [...plans].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
  );
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
    const pts = w.rain * 8 + w.wind * 4 + Math.abs(w.temp - 20);
    return Math.min(100, Math.max(0, Math.round(pts)));
  };

  const score = weather ? calcScore(weather) : null;
  const scoreColor = score === null ? '#999' : score <= 33 ? '#22c55e' : score <= 66 ? '#f97316' : '#ef4444';

  return (
    <View style={{ flex: 1 }}>
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
  upcomingSection: { flex: 1, backgroundColor: '#eee', borderRadius: 16, padding: 16, marginTop: 16 },
  upcomingTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  planCard: { backgroundColor: '#888', padding: 12, borderRadius: 8, marginBottom: 8 },
  planTitle: { fontSize: 18, fontWeight: '600' },
  planSub: { color: '#666', marginTop: 4 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  addBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '600' },
});
