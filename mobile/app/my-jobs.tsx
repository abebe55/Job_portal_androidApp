import { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyJobs, deleteJob, payJobFee, confirmJobPayment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { C, S } from '../constants/theme';

const STATUS: any = {
  draft:           { color: '#6b7280', bg: '#f3f4f6', icon: 'time-outline',            label: 'Pending Review' },
  under_review:    { color: '#2563eb', bg: '#dbeafe', icon: 'eye-outline',              label: 'Under Review' },
  approved:        { color: '#d97706', bg: '#fef3c7', icon: 'checkmark-circle-outline', label: 'Approved - Pay Fee' },
  payment_pending: { color: '#7c3aed', bg: '#ede9fe', icon: 'card-outline',             label: 'Payment Pending' },
  published:       { color: '#16a34a', bg: '#dcfce7', icon: 'globe-outline',            label: 'Published' },
  rejected:        { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline',     label: 'Rejected' },
  closed:          { color: '#6b7280', bg: '#f3f4f6', icon: 'lock-closed-outline',      label: 'Closed' },
};

export default function MyJobsScreen() {
  const [jobs, setJobs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [successJob, setSuccessJob] = useState<any>(null);
  const pendingJobId            = useRef<number | null>(null);
  const pendingTxRef            = useRef<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router                  = useRouter();
  const params                  = useLocalSearchParams();

  const fetchJobs = async () => {
    try { const res = await getMyJobs(); setJobs(res.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  // Handle Chapa return: /my-jobs?tx_ref=JOB-xxx&job_id=5&chapa_return=1
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const raw = (window as any).location.href.replace(/&amp;/g, '&');
      const qIdx = raw.indexOf('?');
      if (qIdx === -1) return;
      const qs = raw.slice(qIdx + 1).split('#')[0];
      const p = new URLSearchParams(qs);
      const txRef    = p.get('tx_ref');
      const jobId    = p.get('job_id');
      const isReturn = p.get('chapa_return') === '1';
      if (isReturn && txRef && jobId) {
        (window as any).history.replaceState(null, '', '/my-jobs');
        pendingTxRef.current = txRef;
        pendingJobId.current = parseInt(jobId);
      }
    } catch {}
  }, []);

  // Once auth ready, confirm payment
  useEffect(() => {
    if (!pendingTxRef.current || !pendingJobId.current) return;
    if (authLoading || !user) return;
    const txRef = pendingTxRef.current;
    const jobId = pendingJobId.current;
    pendingTxRef.current = null;
    pendingJobId.current = null;
    confirmPayment(jobId, txRef);
  }, [authLoading, user]);

  const confirmPayment = async (jobId: number, txRef: string) => {
    setVerifying(true);
    try {
      await confirmJobPayment(jobId, { tx_ref: txRef });
      await fetchJobs();
      const job = jobs.find(j => j.id === jobId) || { title: 'Your job' };
      setSuccessJob(job);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not confirm payment. Please contact support.');
    }
    setVerifying(false);
  };

  const handlePayFee = async (job: any) => {
    setPaying(true);
    try {
      const res = await payJobFee(job.id, {
        email: user?.email || '',
        first_name: user?.username || '',
      });
      const url: string = res.data.checkout_url;
      if (Platform.OS === 'web') {
        (window as any).location.href = url;
      } else {
        const { Linking } = require('react-native');
        await Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to initiate payment');
    }
    setPaying(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Job', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteJob(id); fetchJobs();
      }},
    ]);
  };

  if (loading) return (
    <View style={S.page}>
      <PageHeader title="My Posted Jobs" showBack />
      <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
    </View>
  );

  return (
    <View style={S.page}>
      <PageHeader title="My Posted Jobs" showBack />

      {verifying && (
        <View style={styles.verifyBanner}>
          <ActivityIndicator color={C.primary} size="small" />
          <Text style={styles.verifyText}>Confirming payment and publishing job...</Text>
        </View>
      )}

      <FlatList
        data={jobs}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        onRefresh={fetchJobs}
        refreshing={loading}
        renderItem={({ item }) => {
          const st = STATUS[item.status] || STATUS.draft;
          return (
            <View style={styles.card}>
              {/* Title + status */}
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name="briefcase" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={12} color={C.textSub} />
                    <Text style={styles.meta}>{item.location} - {item.industry}</Text>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={11} color={st.color} />
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {/* Admin note */}
              {item.admin_note ? (
                <View style={styles.noteBox}>
                  <Ionicons name="chatbubble-outline" size={13} color="#92400e" />
                  <Text style={styles.noteText}>{item.admin_note}</Text>
                </View>
              ) : null}

              {/* Pay fee button — shown when approved */}
              {item.status === 'approved' && item.posting_fee && (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => handlePayFee(item)}
                  disabled={paying}
                >
                  {paying
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="card-outline" size={16} color="#fff" />
                        <Text style={styles.payBtnText}>Pay ETB {item.posting_fee} to Publish</Text>
                      </>
                  }
                </TouchableOpacity>
              )}

              {/* Published stats */}
              {item.status === 'published' && (
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="people-outline" size={14} color={C.primary} />
                    <Text style={styles.statText}>{item.applications?.length ?? 0} applicants</Text>
                  </View>
                  {item.deadline && (
                    <View style={styles.statItem}>
                      <Ionicons name="calendar-outline" size={14} color={C.textSub} />
                      <Text style={styles.statText}>Deadline: {item.deadline}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                {item.status === 'published' && (
                  <TouchableOpacity style={styles.viewBtn} onPress={() => router.push(`/job-applicants/${item.id}`)}>
                    <Ionicons name="people-outline" size={15} color={C.primary} />
                    <Text style={styles.viewBtnText}>View Applicants</Text>
                  </TouchableOpacity>
                )}
                {['draft', 'rejected'].includes(item.status) && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={15} color={C.danger} />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>No jobs posted yet.</Text>
            <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/post-job')}>
              <Text style={styles.postBtnText}>Post a Job</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Success modal */}
      <Modal visible={!!successJob} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={64} color={C.success} />
            <Text style={styles.modalTitle}>Job Published!</Text>
            <Text style={styles.modalSub}>
              {successJob?.title} is now live and visible to job seekers.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => { setSuccessJob(null); fetchJobs(); }}>
              <Text style={styles.modalBtnText}>View My Jobs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list:         { paddingHorizontal: 60, paddingTop: 14, paddingBottom: 32 },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.primaryLight, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  verifyText:   { color: C.primary, fontSize: 13, fontWeight: '600' },
  card:         { ...S.card },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  iconWrap:     { width: 42, height: 42, borderRadius: 11, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  title:        { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta:         { color: C.textSub, fontSize: 12 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { fontSize: 10, fontWeight: '700' },
  noteBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#fde68a' },
  noteText:     { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 },
  payBtn:       { backgroundColor: '#d97706', borderRadius: 10, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  payBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow:     { flexDirection: 'row', gap: 16, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  statItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText:     { fontSize: 12, color: C.primary, fontWeight: '600' },
  actions:      { flexDirection: 'row', gap: 10 },
  viewBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primaryLight, padding: 10, borderRadius: 8 },
  viewBtnText:  { color: C.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fee2e2', padding: 10, borderRadius: 8 },
  deleteBtnText:{ color: C.danger, fontWeight: '600', fontSize: 13 },
  empty:        { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText:    { color: C.textSub, fontSize: 15 },
  postBtn:      { backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  postBtnText:  { color: '#fff', fontWeight: '700' },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard:    { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, width: '100%', maxWidth: 340 },
  modalTitle:   { fontSize: 22, fontWeight: '800', color: C.text },
  modalSub:     { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  modalBtn:     { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 4 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
