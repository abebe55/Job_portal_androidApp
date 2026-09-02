import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyApplications } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import WebLayout from '../../components/WebLayout';
import { C, S } from '../../constants/theme';

const STATUS: Record<string, { color: string; bg: string; icon: string; label: string; desc: string }> = {
  pending:  {
    color: '#d97706', bg: '#fef3c7',
    icon: 'time-outline', label: 'Pending Review',
    desc: 'Your application is waiting for the employer to review.',
  },
  reviewed: {
    color: '#2563eb', bg: '#dbeafe',
    icon: 'eye-outline', label: 'Reviewed',
    desc: 'The employer has reviewed your application.',
  },
  accepted: {
    color: '#10b981', bg: '#d1fae5',
    icon: 'checkmark-circle-outline', label: 'Accepted',
    desc: 'Congratulations! The employer has accepted your application.',
  },
  rejected: {
    color: '#ef4444', bg: '#fee2e2',
    icon: 'close-circle-outline', label: 'Not Selected',
    desc: 'The employer has decided not to proceed with your application.',
  },
};

const STEPS = ['pending', 'reviewed', 'accepted'] as const;

export default function ApplicationsScreen() {
  const [apps, setApps]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getMyApplications()
      .then(res => { setApps(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <WebLayout title="My Applications" subtitle="Track your job applications">
      <View style={S.page}>
        <PageHeader title="My Applications" />
        <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
      </View>
    </WebLayout>
  );

  return (
    <WebLayout title="My Applications" subtitle="Track your job applications">
    <View style={S.page}>
      <PageHeader title="My Applications" />
      <FlatList
        data={apps}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={S.content}
        renderItem={({ item }) => {
          const sc     = STATUS[item.status] ?? STATUS.pending;
          const isOpen = expanded === item.id;
          const statusIdx = ['pending','reviewed','accepted','rejected'].indexOf(item.status);

          return (
            <TouchableOpacity
              style={st.card}
              onPress={() => setExpanded(isOpen ? null : item.id)}
              activeOpacity={0.85}
            >
              {/* Header */}
              <View style={st.cardTop}>
                <View style={[st.iconWrap, { backgroundColor: sc.bg }]}>
                  <Ionicons name={sc.icon as any} size={20} color={sc.color} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.jobTitle} numberOfLines={1}>{item.job?.title}</Text>
                  <View style={st.locRow}>
                    <Ionicons name="location-outline" size={12} color={C.textSub} />
                    <Text style={st.location} numberOfLines={1}>
                      {item.job?.location}{item.job?.industry ? ` · ${item.job.industry}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[st.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[st.badgeText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={14} color={C.textMuted}
                  />
                </View>
              </View>

              {/* Progress tracker */}
              <View style={st.progressWrap}>
                {STEPS.map((step, i) => {
                  const stepIdx = STEPS.indexOf(step);
                  const done  = item.status === 'rejected'
                    ? stepIdx === 0
                    : stepIdx <= statusIdx;
                  const active = item.status === step;
                  return (
                    <View key={step} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{ alignItems: 'center', gap: 3 }}>
                        <View style={[
                          st.dot,
                          done  && { backgroundColor: C.success, borderColor: C.success },
                          active && { backgroundColor: C.primary, borderColor: C.primary },
                        ]} />
                        <Text style={[st.dotLabel, done && { color: C.success }, active && { color: C.primary }]}>
                          {step.charAt(0).toUpperCase() + step.slice(1)}
                        </Text>
                      </View>
                      {i < STEPS.length - 1 && (
                        <View style={[st.line, done && { backgroundColor: C.success }]} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Expanded detail */}
              {isOpen && (
                <View style={st.detail}>
                  <Text style={st.detailDesc}>{sc.desc}</Text>
                  {item.employer_note ? (
                    <View style={st.noteBox}>
                      <Ionicons name="chatbubble-outline" size={13} color="#92400e" />
                      <Text style={st.noteText}>{item.employer_note}</Text>
                    </View>
                  ) : null}
                  <View style={st.footer}>
                    <Ionicons name="calendar-outline" size={12} color={C.textSub} />
                    <Text style={st.date}>
                      Applied {new Date(item.applied_at).toLocaleDateString()}
                    </Text>
                    {item.status_updated_at && (
                      <Text style={st.date}>
                        {' '}· Updated {new Date(item.status_updated_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="document-outline" size={48} color={C.border} />
            <Text style={st.emptyTitle}>No applications yet.</Text>
            <Text style={st.emptySub}>Browse jobs and apply to get started.</Text>
          </View>
        }
      />
    </View>
    </WebLayout>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
    shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  iconWrap:  { width: 42, height: 42, borderRadius: 11, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  jobTitle:  { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location:  { color: C.textSub, fontSize: 12, flex: 1 },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  progressWrap: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingHorizontal: 4 },
  dot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border, borderWidth: 1.5, borderColor: C.border },
  dotLabel:  { fontSize: 9, color: C.textSub, fontWeight: '600', textAlign: 'center', width: 50, flexShrink: 0 },
  line:      { flex: 1, height: 2, backgroundColor: C.border, marginHorizontal: 4, marginBottom: 14 },

  detail:    { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 8 },
  detailDesc:{ fontSize: 13, color: C.textSub, lineHeight: 19, marginBottom: 10 },
  noteBox:   {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 8, padding: 10,
    marginBottom: 10, borderWidth: 1, borderColor: '#fde68a',
  },
  noteText:  { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 },
  footer:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date:      { color: C.textSub, fontSize: 11 },

  empty:     { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle:{ color: C.text, fontSize: 15, fontWeight: '700' },
  emptySub:  { color: C.textSub, fontSize: 13 },
});
