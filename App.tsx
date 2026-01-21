import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { InsightsScreen } from './screens/InsightsScreen';
import { PlansList } from './screens/PlansListScreen';
import { NewPlan } from './screens/NewPlanScreen';
import { PlanDetails } from './screens/PlanDetailsScreen';
import { LocationsScreen } from './screens/LocationsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

// Notification settings

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
export type Activity = 'Outdoor' | 'Indoor' | 'Commute' | 'Other';
export type Importance = 'Low' | 'Medium' | 'High';
export type Plan = {
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

export type Weather = {
  temp: number;
  rain: number;
  wind: number;
};

export type SavedLocation = { id: string; name: string; lat: number; lon: number };

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

  // Load saved plans
  const loadPlans = async () => {
    const data = await AsyncStorage.getItem('plans');
    if (data) setPlans(JSON.parse(data));
  };

  // Save plans
  const savePlans = async (newPlans: Plan[]) => {
    await AsyncStorage.setItem('plans', JSON.stringify(newPlans));
    setPlans(newPlans);
  };

  // Load saved locations
  const loadLocations = async () => {
    const data = await AsyncStorage.getItem('locations');
    if (data) setLocations(JSON.parse(data));
  };

  // Add a new location
  const addLocation = async (name: string, lat: number, lon: number) => {
    if (locations.some(l => l.lat === lat && l.lon === lon)) return;
    const updated = [...locations, { id: Date.now().toString(), name, lat, lon }];
    await AsyncStorage.setItem('locations', JSON.stringify(updated));
    setLocations(updated);
  };

  // Schedule reminder notifications for plan
  const scheduleReminders = async (plan: Plan) => {
    // Time to milliseconds
    const planTime = new Date(`${plan.date}T${plan.time}`).getTime();
    const now = Date.now();

    // 3 second test reminder
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Test Reminder', body: `Plan "${plan.title}" was created!` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(now + 3000) },
    });

    // 24 hours reminder to check forecast
    const t24 = planTime - 24 * 60 * 60 * 1000;
    if (t24 > now) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Plan Tomorrow', body: `Check the forecast for "${plan.title}"` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(t24) },
      });
    }

    // 2 hour reminder
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
      {tab === 'Insights' && <InsightsScreen />}
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

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', paddingVertical: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { color: '#999' },
  tabActive: { color: '#3b82f6', fontWeight: '600' },
});
