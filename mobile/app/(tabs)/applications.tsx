import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyApplications } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { C, S } from '../../constants/theme';

const STATUS: any = {
  pending:  { color: '#d97706', bg: '#fef3c7', icon: 'time-outline',            label: 'Pending Review',    desc: 'Your application is waiting for the employer to review.' },
  reviewed: { color: '#2563eb', bg: '#dbeafe', icon: 'eye-outline',             label: 'Reviewed',          desc: 'The employer has reviewed your application.' },
  accepted: { color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle-outline', label: 'Accepted',         desc: 'Congratulations! The employer has accepted your application.' },
  rejected: { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline',    label: 'Not Selected',      desc: 'The employer has decided not to proceed with your application.' },
};

export default function ApplicationsScreen() {
  const [apps, setApps]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getMyApplications()
      .then(res => { setApps(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <View style={S.page}>
      <PageHeader title="My Applications" />
      <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
    </View>
  );

  return (
    <View style={S.page}>
      <PageHeader title="My Applications" />
      <FlatList
        data={apps}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const s = STATUS[item.status] ?? STATUS.pending;
          const isOpen = expanded === item.id;
          return (
            <TouchableOpacity style={styles.card} onPress={() => setExpanded(isOpen ? null : item.id)} activeOpacity={0.85}>
              {/* Header */}
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name="briefcase" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{item.job?.title}</Text>
                  <View style={styles.locRow}>
                    <Ionicons name="location-outline" size={12} color={C.textSub} />
                    <Text style={styles.location}>{item.job?.location} - {item.job?.industry}</Text>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={11} color={s.color} />
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressRow}>
                {['pending', 'reviewed', 'accepted'].map((step, i) => {
                  const steps = ['pending', 'reviewed', 'accepted', 'rejected'];
                  const currentIdx = steps.indexOf(item.status);
                  const stepIdx = ['pending', 'reviewed', 'accepted'].indexOf(step);
                  const done = item.status === 'rejected'
                    ? stepIdx === 0
                    : stepIdx <= currentIdx;
                  return (
                    <View key={step} style={styles.progressStep}>
                      <View style={[styles.progressDot, done && styles.progressDotDone,
                        item.status === step && styles.progressDotActive]} />
                      <Text style={[styles.progressLabel, done && { color: C.primary }]}>
                        {step.charAt(0).toUpperCase() + step.slice(1)}
                      </Text>
                      {i < 2 && <View style={[styles.progressLine, done && styles.progressLineDone]} />}
                    </View>
                  );
                })}
              </View>

              {/* Expanded detail */}
              {isOpen && (
                <View style={styles.detail}>
                  <Text style={styles.detailDesc}>{s.desc}</Text>
                  {item.employer_note ? (
                    <View style={styles.noteBox}>
                      <Ionicons name="chatbubble-outline" size={13} color="#92400e" />
                      <Text style={styles.noteText}>{item.employer_note}</Text>
                    </View>
                  ) : null}
                  <View style={styles.footer}>
                    <Ionicons name="calendar-outline" size={12} color={C.textSub} />
                    <Text style={styles.date}>Applied: {new Date(item.applied_at).toLocaleDateString()}</Text>
                    {item.status_updated_at && (
                      <>
                        <Text style={styles.date}> · </Text>
                        <Text style={styles.date}>Updated: {new Date(item.status_updated_at).toLocaleDateString()}</Text>
                      </>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>No applications yet.</Text>
            <Text style={styles.emptySub}>Browse jobs and apply to get started.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list:          { paddingHorizontal: 60, paddingTop: 14, paddingBottom: 32 },
  card:          { ...S.card },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  iconWrap:      { width: 42, height: 42, borderRadius: 11, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  jobTitle:      { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  locRow:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location:      { color: C.textSub, fontSize: 12 },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText:     { fontSize: 10, fontWeight: '700' },
  // Progress
  progressRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  progressStep:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border, borderWidth: 1.5, borderColor: C.border },
  progressDotActive: { backgroundColor: C.primary, borderColor: C.primary },
  progressDotDone:   { backgroundColor: C.success, borderColor: C.success },
  progressLabel: { fontSize: 9, color: C.textSub, marginLeft: 4, fontWeight: '600' },
  progressLine:  { flex: 1, height: 2, backgroundColor: C.border, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: C.success },
  // Detail
  detail:        { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 4 },
  detailDesc:    { fontSize: 13, color: C.textSub, lineHeight: 18, marginBottom: 8 },
  noteBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#fde68a' },
  noteText:      { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 },
  footer:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date:          { color: C.textSub, fontSize: 11 },
  empty:         { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText:     { color: C.text, fontSize: 15, fontWeight: '600' },
  emptySub:      { color: C.textSub, fontSize: 13 },
});
