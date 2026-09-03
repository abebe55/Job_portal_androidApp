import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getJobs } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import WebLayout from '../../components/WebLayout';
import { C, S } from '../../constants/theme';

const JOB_TYPE_COLOR: Record<string, string> = {
  fulltime: '#10b981', parttime: '#f59e0b', contract: '#3b82f6', internship: '#a855f7',
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
    try { const res = await getJobs({ search: query, location, industry }); setResults(res.data); }
    catch {}
    setLoading(false);
  };

  const isWeb = Platform.OS === 'web';

  return (
    <WebLayout title="Search Jobs" subtitle="Find your next opportunity">
      <View style={S.page}>
        <PageHeader title="Search Jobs" />

        {/* Filter bar — single row on web, stacked on mobile */}
        <View style={[st.filterBox, isWeb && st.filterBoxWeb]}>
          <View style={[st.inputsRow, isWeb && st.inputsRowWeb]}>
            <View style={[st.inputWrap, isWeb && { flex: 1 }]}>
              <Ionicons name="search-outline" size={15} color={C.textSub} style={st.inputIcon} />
              <TextInput style={st.inputField} placeholder="Job title or keyword"
                value={query} onChangeText={setQuery}
                onSubmitEditing={handleSearch} placeholderTextColor={C.textSub} returnKeyType="search" />
              {query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={14} color={C.textMuted} /></TouchableOpacity> : null}
            </View>

            <View style={[st.inputWrap, isWeb && { flex: 1 }]}>
              <Ionicons name="location-outline" size={15} color={C.textSub} style={st.inputIcon} />
              <TextInput style={st.inputField} placeholder="Location (e.g. Addis Ababa)"
                value={location} onChangeText={setLocation}
                onSubmitEditing={handleSearch} placeholderTextColor={C.textSub} returnKeyType="search" />
              {location ? <TouchableOpacity onPress={() => setLocation('')}><Ionicons name="close-circle" size={14} color={C.textMuted} /></TouchableOpacity> : null}
            </View>

            <View style={[st.inputWrap, isWeb && { flex: 1 }]}>
              <Ionicons name="business-outline" size={15} color={C.textSub} style={st.inputIcon} />
              <TextInput style={st.inputField} placeholder="Industry (e.g. Technology)"
                value={industry} onChangeText={setIndustry}
                onSubmitEditing={handleSearch} placeholderTextColor={C.textSub} returnKeyType="search" />
              {industry ? <TouchableOpacity onPress={() => setIndustry('')}><Ionicons name="close-circle" size={14} color={C.textMuted} /></TouchableOpacity> : null}
            </View>

            {/* White bg + blue text Search button */}
            <TouchableOpacity style={st.searchBtn} onPress={handleSearch} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#1d4ed8" size="small" />
                : <><Ionicons name="search" size={15} color="#1d4ed8" /><Text style={st.searchBtnTxt}>Search</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        <FlatList
          data={results}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={st.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={st.card} onPress={() => router.push(`/job/${item.id}` as any)} activeOpacity={0.85}>
              <View style={st.cardRow}>
                <View style={st.iconWrap}>
                  <Ionicons name="briefcase" size={18} color={C.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.jobTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={st.metaRow}>
                    <Ionicons name="location-outline" size={11} color={C.textSub} />
                    <Text style={st.meta} numberOfLines={1}>{item.location} · {item.industry}</Text>
                  </View>
                </View>
                <View style={[st.typeTag, { backgroundColor: (JOB_TYPE_COLOR[item.job_type] ?? C.primary) + '18' }]}>
                  <Text style={[st.typeTagTxt, { color: JOB_TYPE_COLOR[item.job_type] ?? C.primary }]}>{item.job_type}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={st.empty}>
              <Ionicons name={searched ? 'search-outline' : 'filter-outline'} size={40} color={C.border} />
              <Text style={st.emptyTxt}>{searched ? 'No results found.' : 'Use filters above to search jobs.'}</Text>
            </View>
          }
        />
      </View>
    </WebLayout>
  );
}

const st = StyleSheet.create({
  filterBox: {
    backgroundColor: C.surface, borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  filterBoxWeb: { marginBottom: 16 },

  inputsRow:    { flexDirection: 'column', gap: 8 },
  inputsRowWeb: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 8,
    paddingHorizontal: 10, borderWidth: 1.5, borderColor: C.border,
    marginBottom: 0,
  },
  inputIcon:  { marginRight: 6 },
  inputField: { flex: 1, paddingVertical: 10, fontSize: 13, color: C.text },

  // White background + strong blue text + border — NOT solid fill
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#93c5fd',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  searchBtnTxt: { color: '#1d4ed8', fontWeight: '700', fontSize: 13 },

  list: { paddingBottom: 32 },
  card: {
    backgroundColor: C.surface, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap:   { width: 36, height: 36, borderRadius: 9, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  jobTitle:   { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta:       { color: C.textSub, fontSize: 11, flex: 1 },
  typeTag:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  typeTagTxt: { fontSize: 10, fontWeight: '700' },

  empty:    { alignItems: 'center', marginTop: 48, gap: 10 },
  emptyTxt: { color: C.textSub, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
