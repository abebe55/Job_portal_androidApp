import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getJobs } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { C, S } from '../../constants/theme';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    setLoading(true); setSearched(true);
    try { const res = await getJobs({ search: query, location, industry }); setResults(res.data); } catch {}
    setLoading(false);
  };

  return (
    <View style={S.page}>
      <PageHeader title="Search Jobs" />
      <View style={styles.filterBox}>
        <View style={styles.inputRow}>
          <Ionicons name="search-outline" size={18} color={C.textSub} style={styles.inputIcon} />
          <TextInput style={styles.inputInner} placeholder="Job title or keyword" value={query} onChangeText={setQuery} placeholderTextColor={C.textSub} />
        </View>
        <View style={styles.inputRow}>
          <Ionicons name="location-outline" size={18} color={C.textSub} style={styles.inputIcon} />
          <TextInput style={styles.inputInner} placeholder="Location (e.g. Addis Ababa)" value={location} onChangeText={setLocation} placeholderTextColor={C.textSub} />
        </View>
        <View style={styles.inputRow}>
          <Ionicons name="business-outline" size={18} color={C.textSub} style={styles.inputIcon} />
          <TextInput style={styles.inputInner} placeholder="Industry (e.g. Technology)" value={industry} onChangeText={setIndustry} placeholderTextColor={C.textSub} />
        </View>
        <TouchableOpacity style={S.btn} onPress={handleSearch}>
          <Text style={S.btnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
        : <FlatList
            data={results}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/job/${item.id}`)}>
                <View style={styles.cardRow}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="briefcase" size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={12} color={C.textSub} />
                      <Text style={styles.meta}>{item.location} - {item.industry}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.border} />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              searched ? (
                <View style={styles.empty}>
                  <Ionicons name="search-outline" size={48} color={C.border} />
                  <Text style={styles.emptyText}>No results found.</Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Ionicons name="filter-outline" size={48} color={C.border} />
                  <Text style={styles.emptyText}>Use filters above to search jobs.</Text>
                </View>
              )
            }
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  filterBox: {
    backgroundColor: C.white,
    marginHorizontal: 60,
    marginTop: 11,
    marginBottom: 0,
    borderRadius: 14,
    padding: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.07)',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 10,
    marginBottom: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border,
  },
  inputIcon: { marginRight: 8 },
  inputInner: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.text },
  list: { paddingHorizontal: 60, paddingTop: 14, paddingBottom: 32 },
  card: { ...S.card },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  jobTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: C.textSub, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 48, gap: 12 },
  emptyText: { color: C.text, fontSize: 14, fontWeight: '700' },
});
