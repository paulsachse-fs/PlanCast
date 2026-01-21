import { View, Text, StyleSheet } from 'react-native';

// Settings Screen
export function SettingsScreen() {
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

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  segActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  segText: { color: '#333' },
  segTextActive: { color: '#fff' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
});
