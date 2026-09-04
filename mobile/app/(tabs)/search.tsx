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
    try { const r = await getJobs({ search: query, location, industry }); setResults(r.data); }
    catch {}
    setLoading(false);
  };

  return (
    <WebLayout title="Search Jobs" subtitle="Find your next opportunity">
      <View style={S.page}>
        <PageHeader title="Search Jobs" />

        {/* Filter box */}
        <View style={st.outer}>
          <View style={st.filterBox}>
            <View style={[st.row, Platform.OS === 'web' && st.rowWeb]}>
              <Field icon="search-outline"   placeholder="Job title or keyword"        value={query}    set={setQuery}    submit={handleSearch} />
              <Field icon="location-outline" placeholder="Location (e.g. Addis Ababa)" value={location} set={setLocation} submit={handleSearch} />
              <Field icon="business-outline" placeholder="Industry (e.g. Technology)"  value={industry} set={setIndustry} submit={handleSearch} />
            </View>
            <TouchableOpacity style={st.btn} onPress={handleSearch} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#1d4ed8" size="small" />
                : <><Ionicons name="search" size={15} color="#1d4ed8" /><Text style={st.btnTxt}>Search</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={i => i.id.toString()}
          contentContainerStyle={st.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={st.card} onPress={() => router.push(`/job/${item.id}` as any)} activeOpacity={0.85}>
              <View style={st.cardRow}>
                <View style={st.ico}><Ionicons name="briefcase" size={18} color={C.primary} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.title} numberOfLines={1}>{item.title}</Text>
                  <View style={st.meta}><Ionicons name="location-outline" size={11} color={C.textSub} /><Text style={st.metaTxt} numberOfLines={1}>{item.location} · {item.industry}</Text></View>
                </View>
                <View style={[st.tag, { backgroundColor: (JOB_TYPE_COLOR[item.job_type] ?? C.primary) + '18' }]}>
                  <Text style={[st.tagTxt, { color: JOB_TYPE_COLOR[item.job_type] ?? C.primary }]}>{item.job_type}</Text>
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

function Field({ icon, placeholder, value, set, submit }: { icon: string; placeholder: string; value: string; set: (v: string) => void; submit?: () => void }) {
  return (
    <View style={st.field}>
      <Ionicons name={icon as any} size={15} color={C.textSub} style={{ marginRight: 6 }} />
      <TextInput style={st.fieldInput} placeholder={placeholder} value={value} onChangeText={set}
        onSubmitEditing={submit} placeholderTextColor={C.textSub} returnKeyType="search" />
      {value ? <TouchableOpacity onPress={() => set('')}><Ionicons name="close-circle" size={14} color={C.textMuted} /></TouchableOpacity> : null}
    </View>
  );
}

const st = StyleSheet.create({
  outer:      { paddingHorizontal: 16, paddingTop: 14 },
  filterBox:  { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  row:        { flexDirection: 'column', gap: 8, marginBottom: 10 },
  rowWeb:     { flexDirection: 'row', gap: 8 },
  field:      { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1.5, borderColor: C.border, minHeight: 42 },
  fieldInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: C.text },
  btn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#93c5fd', borderRadius: 8, paddingVertical: 11 },
  btnTxt:     { color: '#1d4ed8', fontWeight: '700', fontSize: 13 },
  list:       { paddingHorizontal: 16, paddingBottom: 32 },
  card:       { backgroundColor: C.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ico:        { width: 36, height: 36, borderRadius: 9, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  title:      { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaTxt:    { color: C.textSub, fontSize: 11, flex: 1 },
  tag:        { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  tagTxt:     { fontSize: 10, fontWeight: '700' },
  empty:      { alignItems: 'center', marginTop: 48, gap: 10, paddingHorizontal: 16 },
  emptyTxt:   { color: C.textSub, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
