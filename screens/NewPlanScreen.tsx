import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert
} from 'react-native';
import * as Location from 'expo-location';
import { Plan, Activity, Importance } from '../App';

// New Plan Screen
export function NewPlan({ onSave, onBack, addLocation }: {
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

  // Get users current GPS coordinates
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

  // save new plan
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
});
