import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  locationName?: string;
};

type Weather = {
  temp: number;
  rain: number;
  wind: number;
};

type SavedLocation = { id: string; name: string; lat: number; lon: number };

// Main App
export default function App() {
  const [screen, setScreen] = useState<'list' | 'new' | 'details'>('list');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [tab, setTab] = useState<'Plans' | 'Locations' | 'Insights' | 'Settings'>('Plans');
  const [locations, setLocations] = useState<SavedLocation[]>([]);

  useEffect(() => {
    loadPlans();
    loadLocations();
    Notifications.requestPermissionsAsync();
  }, []);

  const loadPlans = async () => {
    const data = await AsyncStorage.getItem('plans');
    if (data) setPlans(JSON.parse(data));
  };

  const savePlans = async (newPlans: Plan[]) => {
    await AsyncStorage.setItem('plans', JSON.stringify(newPlans));
    setPlans(newPlans);
  };

  const loadLocations = async () => {
    const data = await AsyncStorage.getItem('locations');
    if (data) setLocations(JSON.parse(data));
  };

  const addLocation = async (name: string, lat: number, lon: number) => {
    if (locations.some(l => l.lat === lat && l.lon === lon)) return;
    const updated = [...locations, { id: Date.now().toString(), name, lat, lon }];
    await AsyncStorage.setItem('locations', JSON.stringify(updated));
    setLocations(updated);
  };

  const scheduleReminders = async (plan: Plan) => {
    const planTime = new Date(`${plan.date}T${plan.time}`).getTime();
    const now = Date.now();

    // 24 hours before
    const t24 = planTime - 24 * 60 * 60 * 1000;
    if (t24 > now) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Plan Tomorrow', body: `Check the forecast for "${plan.title}"` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(t24) },
      });
    }

    // 2 hours before
    const t2 = planTime - 2 * 60 * 60 * 1000;
    if (t2 > now) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Plan Soon', body: `"${plan.title}" is in 2 hours. Review the PDS!` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(t2) },
      });
    }
  };

  const addPlan = async (plan: Plan) => {
    savePlans([...plans, plan]);
    await scheduleReminders(plan);
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
      return <NewPlan onSave={addPlan} onBack={() => setScreen('list')} addLocation={addLocation} />;
    }
    if (screen === 'details' && selectedPlan) {
      return <PlanDetails plan={selectedPlan} onBack={() => setScreen('list')} onDelete={deletePlan} />;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {tab === 'Plans' && <PlansList plans={plans} onAdd={() => setScreen('new')} onSelect={openDetails} />}
      {tab === 'Locations' && <LocationsScreen locations={locations} />}
      {tab === 'Insights' && <View style={{ flex: 1 }}><Text style={styles.title}>Insights</Text></View>}
      {tab === 'Settings' && <SettingsScreen />}

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

// New Plan Screen
function NewPlan({ onSave, onBack, addLocation }: {
  onSave: (p: Plan) => void;
  onBack: () => void;
  addLocation: (name: string, lat: number, lon: number) => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-03-15');
  const [time, setTime] = useState('14:00');
  const [lat, setLat] = useState('28.6');
  const [lon, setLon] = useState('81.3');
  const [locationName, setLocationName] = useState('');
  const [activity, setActivity] = useState<Activity>('Outdoor');
  const [importance, setImportance] = useState<Importance>('Medium');

  const activities: Activity[] = ['Outdoor', 'Indoor', 'Commute', 'Other'];
  const importances: Importance[] = ['Low', 'Medium', 'High'];

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    setLat(location.coords.latitude.toFixed(4));
    setLon(location.coords.longitude.toFixed(4));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const parsedLat = parseFloat(lat) || 28.6;
    const parsedLon = parseFloat(lon) || 81.3;
    addLocation(locationName.trim() || 'Unnamed', parsedLat, parsedLon);
    onSave({
      id: Date.now().toString(),
      title: title.trim(),
      date,
      time,
      activity,
      importance,
      lat: parsedLat,
      lon: parsedLon,
      locationName: locationName.trim() || undefined,
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

      <Text style={styles.label}>Location Name (optional)</Text>
      <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g., Central Park" />

      <Text style={styles.label}>Location (Lat / Lon)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={lat} onChangeText={setLat} keyboardType="numeric" />
        <TextInput style={[styles.input, { flex: 1 }]} value={lon} onChangeText={setLon} keyboardType="numeric" />
      </View>
      <TouchableOpacity onPress={useCurrentLocation} style={[styles.btn, { marginTop: 8 }]}>
        <Text style={styles.btnText}>Use Current Location</Text>
      </TouchableOpacity>

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

// Locations Screen
function LocationsScreen({ locations }: { locations: SavedLocation[] }) {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Saved Locations</Text>
      <FlatList
        data={locations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>{item.name || 'Unnamed'}</Text>
            <Text style={styles.planSub}>{item.lat}, {item.lon}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No saved locations yet.</Text>}
      />
    </View>
  );
}

// Settings Screen
function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Temperature Unit</Text>
      <View style={styles.row}>
        <View style={[styles.seg, styles.segActive]}><Text style={styles.segTextActive}>°C</Text></View>
        <View style={styles.seg}><Text style={styles.segText}>°F</Text></View>
      </View>

      <Text style={styles.label}>Wind Speed Unit</Text>
      <View style={styles.row}>
        <View style={[styles.seg, styles.segActive]}><Text style={styles.segTextActive}>m/s</Text></View>
        <View style={styles.seg}><Text style={styles.segText}>km/h</Text></View>
      </View>

      <Text style={styles.label}>Risk Tolerance</Text>
      <View style={styles.row}>
        <View style={styles.seg}><Text style={styles.segText}>Low</Text></View>
        <View style={[styles.seg, styles.segActive]}><Text style={styles.segTextActive}>Medium</Text></View>
        <View style={styles.seg}><Text style={styles.segText}>High</Text></View>
      </View>

      <View style={styles.divider} />

      <Text style={{ color: '#999', fontStyle: 'italic' }}>
        Settings functionality coming soon.
      </Text>
    </View>
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
  // PDS Circle styles
  pdsCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  pdsLabel: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  pdsScore: { fontSize: 64, fontWeight: 'bold' },
  pdsSub: { fontSize: 14, color: '#666', textAlign: 'center' },
  // Upcoming plans section styles
  upcomingSection: { flex: 1, backgroundColor: '#eee', borderRadius: 16, padding: 16, marginTop: 16 },
  upcomingTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  planCard: { backgroundColor: '#888', padding: 12, borderRadius: 8, marginBottom: 8 },
  addBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '600' },
});
