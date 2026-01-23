import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SavedLocation } from '../App';

// Locations Screen
export function LocationsScreen({ locations, onDelete, onEdit }: { locations: SavedLocation[]; onDelete: (id: string) => void; onEdit: (id: string, name: string) => void }) {
  // Edit/delete options when tapped
  const handlePress = (item: SavedLocation) => {
    Alert.alert(item.name || 'Location', 'What would you like to do?', [
      // Shows text input to rename location
      { text: 'Edit Name', onPress: () => Alert.prompt('Rename', 'Enter new name:', name => name && onEdit(item.id, name), 'plain-text', item.name) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Saved Locations</Text>
      <FlatList
        data={locations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handlePress(item)}>
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>{item.name || 'Unnamed'}</Text>
              <Text style={styles.planSub}>{item.lat}, {item.lon}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No saved locations yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  planCard: { backgroundColor: '#888', padding: 12, borderRadius: 8, marginBottom: 8 },
  planTitle: { fontSize: 18, fontWeight: '600' },
  planSub: { color: '#666', marginTop: 4 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
});
