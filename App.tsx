import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
type Activity = 'Outdoor' | 'Indoor' | 'Commute' | 'Other';
type Importance = 'Low' | 'Medium' | 'High';
type Plan = {
  id: string;
  title: string;
  date: string;
  time: string;
  activity: Activity;
  importance: Importance;
  lat: number;
  lon: number;
};

type Weather = {
  temp: number;
  rain: number;
  wind: number;
};

// Main App
export default function App() {
  const [screen, setScreen] = useState<'list' | 'new' | 'details'>('list');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [tab, setTab] = useState<'Plans' | 'Locations' | 'Insights' | 'Settings'>('Plans');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const data = await AsyncStorage.getItem('plans');
    if (data) setPlans(JSON.parse(data));
  };

  const savePlans = async (newPlans: Plan[]) => {
    await AsyncStorage.setItem('plans', JSON.stringify(newPlans));
    setPlans(newPlans);
  };

  const addPlan = (plan: Plan) => {
    savePlans([...plans, plan]);
    setScreen('list');
  };

  const deletePlan = (id: string) => {
    savePlans(plans.filter(p => p.id !== id));
    setScreen('list');
  };

  const openDetails = (plan: Plan) => {
    setSelectedPlan(plan);
    setScreen('details');
  };

  if (tab === 'Plans') {
    if (screen === 'new') {
      return <NewPlan onSave={addPlan} onBack={() => setScreen('list')} />;
    }
    if (screen === 'details' && selectedPlan) {
      return <PlanDetails plan={selectedPlan} onBack={() => setScreen('list')} onDelete={deletePlan} />;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {tab === 'Plans' && <PlansList plans={plans} onAdd={() => setScreen('new')} onSelect={openDetails} />}
      {tab === 'Locations' && <View style={{ flex: 1 }}><Text style={styles.title}>Locations</Text></View>}
      {tab === 'Insights' && <View style={{ flex: 1 }}><Text style={styles.title}>Insights</Text></View>}
      {tab === 'Settings' && <View style={{ flex: 1 }}><Text style={styles.title}>Settings</Text></View>}

      <View style={styles.tabBar}>
        {(['Plans', 'Locations', 'Insights', 'Settings'] as const).map(t => (
          <TouchableOpacity key={t} style={styles.tabItem} onPress={() => { setTab(t); setScreen('list'); }}>
            <Text style={tab === t ? styles.tabActive : styles.tabText}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// Plans List Screen
function PlansList({ plans, onAdd, onSelect }: {
  plans: Plan[];
  onAdd: () => void;
  onSelect: (plan: Plan) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>My Plans</Text>
      {plans.length === 0 ? (
        <Text style={styles.empty}>No plans yet.</Text>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.planItem} onPress={() => onSelect(item)}>
              <Text style={styles.planTitle}>{item.title}</Text>
              <Text style={styles.planSub}>{item.date} {item.time} - {item.activity}</Text>
            </TouchableOpacity>
          )}
        />
      )}
      <TouchableOpacity style={styles.btn} onPress={onAdd}>
        <Text style={styles.btnText}>+ Add Plan</Text>
      </TouchableOpacity>
    </View>
  );
}

// New Plan Screen
function NewPlan({ onSave, onBack }: { onSave: (p: Plan) => void; onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-01-15');
  const [time, setTime] = useState('14:00');
  const [lat, setLat] = useState('52.52');
  const [lon, setLon] = useState('13.405');
  const [activity, setActivity] = useState<Activity>('Outdoor');
  const [importance, setImportance] = useState<Importance>('Medium');

  const activities: Activity[] = ['Outdoor', 'Indoor', 'Commute', 'Other'];
  const importances: Importance[] = ['Low', 'Medium', 'High'];

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: Date.now().toString(),
      title: title.trim(),
      date,
      time,
      activity,
      importance,
      lat: parseFloat(lat) || 52.52,
      lon: parseFloat(lon) || 13.405,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={onBack}><Text style={styles.back}>← Back</Text></TouchableOpacity>
      <Text style={styles.title}>New Plan</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Beach Day" />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} />

      <Text style={styles.label}>Time (HH:MM)</Text>
      <TextInput style={styles.input} value={time} onChangeText={setTime} />

      <Text style={styles.label}>Location (Lat / Lon)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={lat} onChangeText={setLat} keyboardType="numeric" />
        <TextInput style={[styles.input, { flex: 1 }]} value={lon} onChangeText={setLon} keyboardType="numeric" />
      </View>

      <Text style={styles.label}>Activity Type</Text>
      <View style={styles.row}>
        {activities.map(a => (
          <TouchableOpacity key={a} style={[styles.seg, activity === a && styles.segActive]} onPress={() => setActivity(a)}>
            <Text style={activity === a ? styles.segTextActive : styles.segText}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Importance</Text>
      <View style={styles.row}>
        {importances.map(i => (
          <TouchableOpacity key={i} style={[styles.seg, importance === i && styles.segActive]} onPress={() => setImportance(i)}>
            <Text style={importance === i ? styles.segTextActive : styles.segText}>{i}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>Save Plan</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Plan Details Screen
function PlanDetails({ plan, onBack, onDelete }: { plan: Plan; onBack: () => void; onDelete: (id: string) => void }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'Rule' | 'Model'>('Rule');

  useEffect(() => {
    fetchWeather();
  }, []);

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

  const getGuidance = (score: number) => {
    if (score <= 33) return { text: 'Keep', color: '#22c55e' };
    if (score <= 66) return { text: 'Adjust', color: '#f97316' };
    return { text: 'Reschedule', color: '#ef4444' };
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

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  segActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  segText: { color: '#333' },
  segTextActive: { color: '#fff' },
  btn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  back: { color: '#3b82f6', fontSize: 16, marginBottom: 8 },
  planItem: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  planTitle: { fontSize: 18, fontWeight: '600' },
  planSub: { color: '#666', marginTop: 4 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  score: { fontSize: 48, fontWeight: 'bold' },
  guidance: { color: '#fff', padding: 12, borderRadius: 8, textAlign: 'center', fontWeight: '600', fontSize: 18, overflow: 'hidden' },
  error: { color: '#ef4444' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', paddingVertical: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { color: '#999' },
  tabActive: { color: '#3b82f6', fontWeight: '600' },
});
