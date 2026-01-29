import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Settings } from '../App';

export function SettingsScreen({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => void }) {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Temperature Unit</Text>
      <View style={styles.row}>
        {(['C', 'F'] as const).map(u => (
          <TouchableOpacity key={u} style={[styles.seg, settings.tempUnit === u && styles.segActive]}
            onPress={() => onSave({ ...settings, tempUnit: u })}>
            <Text style={settings.tempUnit === u ? styles.segTextActive : styles.segText}>
              {u === 'C' ? '°C' : '°F'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Wind Speed Unit</Text>
      <View style={styles.row}>
        {(['ms', 'kmh'] as const).map(u => (
          <TouchableOpacity key={u} style={[styles.seg, settings.windUnit === u && styles.segActive]}
            onPress={() => onSave({ ...settings, windUnit: u })}>
            <Text style={settings.windUnit === u ? styles.segTextActive : styles.segText}>
              {u === 'ms' ? 'm/s' : 'km/h'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Risk Tolerance</Text>
      <View style={styles.row}>
        {(['Low', 'Medium', 'High'] as const).map(r => (
          <TouchableOpacity key={r} style={[styles.seg, settings.riskTolerance === r && styles.segActive]}
            onPress={() => onSave({ ...settings, riskTolerance: r })}>
            <Text style={settings.riskTolerance === r ? styles.segTextActive : styles.segText}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
});
