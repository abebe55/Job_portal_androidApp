import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getJobs } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { C, S } from '../../constants/theme';

const JOB_TYPE_COLOR: Record<string, string> = {
  fulltime: '#10b981', parttime: '#f59e0b',
  contract: '#3b82f6', internship: '#a855f7',
};

export default function SearchScreen() {
  const [query, setQuery]       = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [results, setResults]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    if (!query.trim() && !location.trim() && !industry.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res = await getJobs({ search: query, location, industry });
      setResults(res.data);
    } catch {}
    setLoading(false);
  };

  const clearAll = () => {
    setQuery(''); setLocation(''); setIndustry('');
    setResults([]); setSearched(false);
  };

  return (
    <View style={S.page}>
      <PageHeader title="Search Jobs" />

      {/* Filter box */}
      <View style={st.filterBox}>
        <InputField
          icon="search-outline"
          placeholder="Job title or keyword"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <InputField
          icon="location-outline"
          placeholder="Location (e.g. Addis Ababa)"
          value={location}
          onChangeText={setLocation}
          onSubmitEditing={handleSearch}
        />
        <InputField
          icon="business-outline"
          placeholder="Industry (e.g. Technology)"
          value={industry}
          onChangeText={setIndustry}
          onSubmitEditing={handleSearch}
        />
        <View style={st.filterActions}>
          <TouchableOpacity style={st.searchBtn} onPress={handleSearch} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="search" size={16} color="#fff" />
                  <Text style={st.searchBtnText}>Search</Text>
                </>
            }
          </TouchableOpacity>
          {(query || location || industry) ? (
            <TouchableOpacity style={st.clearBtn} onPress={clearAll}>
              <Ionicons name="close" size={16} color={C.textSub} />
              <Text style={st.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={S.content}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={st.card}
            onPress={() => router.push(`/job/${item.id}`)}
            activeOpacity={0.85}
          >
            <View style={st.cardRow}>
              <View style={st.iconWrap}>
                <Ionicons name="briefcase" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.jobTitle} numberOfLines={1}>{item.title}</Text>
                <View style={st.metaRow}>
                  <Ionicons name="location-outline" size={12} color={C.textSub} />
                  <Text style={st.meta} numberOfLines={1}>{item.location} · {item.industry}</Text>
                </View>
              </View>
              <View style={[st.typeTag, { backgroundColor: (JOB_TYPE_COLOR[item.job_type] ?? C.primary) + '18' }]}>
                <Text style={[st.typeTagText, { color: JOB_TYPE_COLOR[item.job_type] ?? C.primary }]}>
                  {item.job_type}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons
              name={searched ? 'search-outline' : 'filter-outline'}
              size={48}
              color={C.border}
            />
            <Text style={st.emptyTitle}>
              {searched ? 'No results found.' : 'Use filters above to search jobs.'}
            </Text>
            {searched && (query || location || industry) ? (
              <Text style={st.emptySub}>
                Try different keywords or broaden your location.
              </Text>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

function InputField({ icon, placeholder, value, onChangeText, onSubmitEditing }: {
  icon: string; placeholder: string; value: string;
  onChangeText: (v: string) => void; onSubmitEditing?: () => void;
}) {
  return (
    <View style={st.inputRow}>
      <Ionicons name={icon as any} size={17} color={C.textSub} style={st.inputIcon} />
      <TextInput
        style={st.inputInner}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholderTextColor={C.textSub}
        returnKeyType="search"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={15} color={C.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  filterBox: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 10,
    marginBottom: 10, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: C.border,
  },
  inputIcon:    { marginRight: 8 },
  inputInner:   { flex: 1, paddingVertical: 11, fontSize: 14, color: C.text },
  filterActions:{ flexDirection: 'row', gap: 10, marginTop: 2 },
  searchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
  },
  clearBtnText: { color: C.textSub, fontWeight: '600', fontSize: 14 },

  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
    shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:  { width: 40, height: 40, borderRadius: 10, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  jobTitle:  { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta:      { color: C.textSub, fontSize: 12, fontWeight: '500', flex: 1 },
  typeTag:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  typeTagText: { fontSize: 11, fontWeight: '700' },

  empty:     { alignItems: 'center', marginTop: 48, gap: 10, paddingHorizontal: 32 },
  emptyTitle:{ color: C.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptySub:  { color: C.textSub, fontSize: 13, textAlign: 'center' },
});
