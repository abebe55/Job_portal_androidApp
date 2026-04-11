import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getJobDetail, applyJob, getMyApplications } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import { C, S } from '../../constants/theme';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const [jobRes, appsRes] = await Promise.all([
          getJobDetail(Number(id)),
          user?.role === 'jobseeker' ? getMyApplications() : Promise.resolve({ data: [] }),
        ]);
        setJob(jobRes.data);
        // Check if already applied — use job_id (direct FK) for reliable comparison
        const jobIdNum = Number(id);
        const alreadyApplied = appsRes.data.some(
          (app: any) => Number(app.job_id) === jobIdNum || Number(app.job?.id) === jobIdNum
        );
        setApplied(alreadyApplied);
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  const handleApply = async () => {
    if (applied) return;
    setApplying(true);
    setApplyError('');
    try {
      await applyJob({ job_id: Number(id), cover_letter: '' });
      setApplied(true);
    } catch (e: any) {
      const msg = e.response?.data?.non_field_errors?.[0] || e.response?.data?.detail || 'Failed to apply. Please try again.';
      if (msg.toLowerCase().includes('already')) {
        setApplied(true); // already applied — treat as success
      } else {
        setApplyError(msg);
      }
    }
    setApplying(false);
  };

  if (loading) return <View style={S.page}><PageHeader title="Job Detail" showBack /><ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} /></View>;
  if (!job) return <View style={S.page}><PageHeader title="Job Detail" showBack /><Text style={styles.notFound}>Job not found.</Text></View>;

  const JOB_TYPE_COLOR: any = { fulltime: '#22c55e', parttime: '#f59e0b', contract: '#3b82f6', internship: '#a855f7' };

  return (
    <View style={S.page}>
      <PageHeader title="Job Detail" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Title card */}
        <View style={styles.titleCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="briefcase" size={28} color={C.primary} />
          </View>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.postedBy}>Posted by {job.posted_by?.username}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.typeTag, { backgroundColor: (JOB_TYPE_COLOR[job.job_type] ?? C.primary) + '22' }]}>
              <Text style={[styles.typeTagText, { color: JOB_TYPE_COLOR[job.job_type] ?? C.primary }]}>{job.job_type}</Text>
            </View>
            <View style={styles.levelTag}><Text style={styles.levelTagText}>{job.skill_level}</Text></View>
            <View style={styles.industryTag}><Text style={styles.industryTagText}>{job.industry}</Text></View>
          </View>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={18} color={C.primary} />
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{job.location}</Text>
          </View>
          {job.salary ? (
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={18} color="#16a34a" />
              <Text style={styles.infoLabel}>Salary</Text>
              <Text style={[styles.infoValue, { color: '#16a34a' }]}>ETB {job.salary}</Text>
            </View>
          ) : null}
          {job.deadline ? (
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={C.danger} />
              <Text style={styles.infoLabel}>Deadline</Text>
              <Text style={[styles.infoValue, { color: C.danger }]}>{job.deadline}</Text>
            </View>
          ) : null}
        </View>

        {/* Expired banner — shown if deadline passed */}
        {job.deadline && new Date(job.deadline) < new Date(new Date().toDateString()) && (
          <View style={styles.expiredBanner}>
            <Ionicons name="time-outline" size={16} color="#ef4444" />
            <Text style={styles.expiredText}>⏰ This job's deadline has passed. Applications may no longer be accepted.</Text>
          </View>
        )}

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descTitle}>Job Description</Text>
          <Text style={styles.descText}>{job.description}</Text>
        </View>

        {user?.role === 'jobseeker' && (
          <View>
            {applyError ? (
              <View style={styles.applyError}>
                <Ionicons name="alert-circle-outline" size={15} color="#ef4444" />
                <Text style={styles.applyErrorText}>{applyError}</Text>
              </View>
            ) : null}
            {applied ? (
              <View style={styles.appliedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                <Text style={styles.appliedText}>Application Submitted Successfully!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.applyBtn, applying && { opacity: 0.7 }]}
                onPress={handleApply}
                disabled={applying}>
                {applying
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="send-outline" size={18} color="#fff" />
                      <Text style={styles.applyBtnText}>Apply Now</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 60, paddingTop: 14, paddingBottom: 40 },
  notFound: { textAlign: 'center', marginTop: 40, color: C.textSub },
  titleCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 12,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.07)',
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 4 },
  postedBy: { fontSize: 13, color: C.textSub, marginBottom: 12 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  typeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeTagText: { fontSize: 12, fontWeight: '600' },
  levelTag: { backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  levelTagText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  industryTag: { backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  industryTagText: { fontSize: 12, color: '#7c3aed', fontWeight: '600' },
  infoRow: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  infoItem: {
    flex: 1, backgroundColor: C.white, borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.07)',
  },
  expiredBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fca5a5' },
  expiredText:   { flex: 1, fontSize: 13, color: '#ef4444', fontWeight: '600', lineHeight: 18 },
  infoLabel: { fontSize: 10, color: C.textSub, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'center' },
  descCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.07)',
  },
  descTitle: { fontSize: 13, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  descText: { fontSize: 14, color: C.text, lineHeight: 22 },
  applyBtn: {
    backgroundColor: C.primary, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  appliedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#dcfce7', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#86efac',
  },
  appliedText: { color: '#16a34a', fontSize: 15, fontWeight: '700', flex: 1 },
  applyError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#fca5a5',
  },
  applyErrorText: { flex: 1, color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
