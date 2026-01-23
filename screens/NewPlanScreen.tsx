import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert
} from 'react-native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Plan, Activity, Importance, SavedLocation } from '../App';

// New Plan Screen
export function NewPlan({ onSave, onBack, addLocation, savedLocations }: {
  onSave: (p: Plan) => void;
  onBack: () => void;
  addLocation: (name: string, lat: number, lon: number) => void;
  savedLocations: SavedLocation[];
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-03-15');
  const [time, setTime] = useState('14:00');
  const [location, setLocation] = useState({ lat: 28.6, lon: 81.3, name: '' });
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
    const loc = await Location.getCurrentPositionAsync({});
    setLocation({
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      name: 'Current Location',
    });
  };

  // Pick from saved locations
  const pickSavedLocation = () => {
    if (savedLocations.length === 0) {
      Alert.alert('No saved locations');
      return;
    }
    // Show alert with saved locations
    Alert.alert(
      'Saved Locations',
      'Pick a location',
      [
        // Turn saved locations into buttons
        ...savedLocations.map(loc => ({
          text: loc.name,
          onPress: () => setLocation({ lat: loc.lat, lon: loc.lon, name: loc.name }),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Save new plan
  const handleSave = () => {
    if (!title.trim()) return;
    // Save this location for future use (skip dupes)
    addLocation(location.name || 'Unnamed', location.lat, location.lon);
    onSave({
      id: Date.now().toString(),
      title: title.trim(),
      date,
      time,
      activity,
      importance,
      lat: location.lat,
      lon: location.lon,
      locationName: location.name || undefined,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.container}>
        <Text style={styles.title}>New Plan</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Beach Day" />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} />

      <Text style={styles.label}>Time (HH:MM)</Text>
      <TextInput style={styles.input} value={time} onChangeText={setTime} />

      <Text style={styles.label}>Location Name</Text>
      <TextInput
        style={styles.input}
        value={location.name}
        onChangeText={(text) => setLocation({ ...location, name: text })}
        placeholder="e.g., Home, Work, Gym"
      />

      <Text style={styles.label}>Address</Text>
      {/* Google Places search box*/}
      <GooglePlacesAutocomplete
        placeholder="Search for a place..."
        // When user taps result grab lat/lon
        onPress={(data, details) => {
          if (details) {
            setLocation((prev) => ({
              lat: details.geometry.location.lat,
              lon: details.geometry.location.lng,
              name: prev.name || data.description,
            }));
          }
        }}
        // API key stored in .env
        query={{ key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY, language: 'en' }}
        // gets lat/lon coordinates
        fetchDetails={true}
        textInputProps={{ autoCorrect: false, autoCapitalize: 'none' }}
        styles={{
          container: { flex: 0 },
          textInput: styles.input,
          listView: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
        }}
      />
      <View style={styles.row}>
        <TouchableOpacity onPress={useCurrentLocation} style={[styles.smallBtn, { backgroundColor: '#6b7280' }]}>
          <Text style={styles.smallBtnText}>Current Location</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickSavedLocation} style={[styles.smallBtn, { backgroundColor: '#6b7280' }]}>
          <Text style={styles.smallBtnText}>Saved Locations</Text>
        </TouchableOpacity>
      </View>
      {location.lat !== 28.6 || location.lon !== 81.3 ? (
        <Text style={{ color: '#22c55e', marginTop: 4 }}>✓ Location set ({location.lat.toFixed(2)}, {location.lon.toFixed(2)})</Text>
      ) : null}

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
      <TouchableOpacity style={styles.cancelBtn} onPress={() => {
        Alert.alert('Discard Plan?', 'Are you sure you want to discard this plan?', [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onBack },
        ]);
      }}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
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
  smallBtn: { flex: 1, backgroundColor: '#6b7280', padding: 10, borderRadius: 8, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelBtn: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
});
