import { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Modal, Platform, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyJobs, deleteJob, payJobFee, confirmJobPayment, confirmExtendPayment, requestDeadlineExtend, payExtendFee } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import ChapaWebView from '../components/ChapaWebView';
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
  const [paying, setPaying]     = useState<number | null>(null); // job id being paid
  const [verifying, setVerifying] = useState(false);
  const [successJob, setSuccessJob] = useState<any>(null);
  const [successType, setSuccessType] = useState<'published' | 'extended'>('published');
  const [chapaUrl, setChapaUrl] = useState<string | null>(null);
  const [chapaJob, setChapaJob] = useState<any>(null);
  const [chapaIsExtend, setChapaIsExtend] = useState(false);
  const [extendModal, setExtendModal] = useState<any>(null);
  const [extendDate, setExtendDate] = useState('');
  const [showExtendDatePicker, setShowExtendDatePicker] = useState(false);
  const today = new Date();
  const [extPickerYear, setExtPickerYear]   = useState(today.getFullYear());
  const [extPickerMonth, setExtPickerMonth] = useState(today.getMonth() + 1);
  const [extPickerDay, setExtPickerDay]     = useState(today.getDate());
  const pendingJobId            = useRef<number | null>(null);
  const pendingTxRef            = useRef<string | null>(null);
  const pendingIsExtend         = useRef<boolean>(false);
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
      const isExtend = p.get('extend') === '1';
      if (isReturn && txRef && jobId) {
        (window as any).history.replaceState(null, '', '/my-jobs');
        pendingTxRef.current   = txRef;
        pendingJobId.current   = parseInt(jobId);
        pendingIsExtend.current = isExtend;
      }
    } catch {}
  }, []);

  // Once auth ready, confirm payment
  useEffect(() => {
    if (!pendingTxRef.current || !pendingJobId.current) return;
    if (authLoading || !user) return;
    const txRef    = pendingTxRef.current;
    const jobId    = pendingJobId.current;
    const isExtend = pendingIsExtend.current;
    pendingTxRef.current    = null;
    pendingJobId.current    = null;
    pendingIsExtend.current = false;
    confirmPayment(jobId, txRef, isExtend);
  }, [authLoading, user, pendingTxRef.current]);

  const confirmPayment = async (jobId: number, txRef: string, isExtend = false) => {
    setVerifying(true);
    try {
      if (!isExtend) {
        // Job posting payment — call confirm endpoint
        await confirmJobPayment(jobId, { tx_ref: txRef });
      }
      // For extensions, backend already auto-approved via return URL — just refresh
      await fetchJobs();
      const res = await (await import('../services/api')).getMyJobs();
      const job = res.data.find((j: any) => j.id === jobId) || { title: 'Your job' };
      setSuccessType(isExtend ? 'extended' : 'published');
      setSuccessJob(job);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not confirm payment. Please contact support.');
    }
    setVerifying(false);
  };

  const handlePayFee = async (job: any) => {
    setPaying(job.id);
    try {
      const res = await payJobFee(job.id, {
        email: user?.email || '',
        first_name: user?.username || '',
      });
      const url: string = res.data.checkout_url;
      if (Platform.OS === 'web') {
        (window as any).location.href = url;
      } else {
        setChapaJob(job);
        setChapaIsExtend(false);  // job posting payment
        setChapaUrl(url);
      }
    } catch (e: any) {
      Alert.alert('Payment Error', e?.response?.data?.error || 'Failed to initiate payment. Please try again.');
    }
    setPaying(null);
  };

  const handleChapaComplete = async (txRef: string | null) => {
    setChapaUrl(null);
    setVerifying(true);
    const isExtend = chapaIsExtend;
    const job = chapaJob;
    setChapaJob(null);
    setChapaIsExtend(false);

    if (isExtend) {
      // Extension payment — call confirm-extend to verify with Chapa directly
      // (Chapa callback can't reach localhost in development)
      try {
        const confirmRes = await confirmExtendPayment(job?.id, { tx_ref: txRef });
        await fetchJobs();
        const res = await getMyJobs();
        const updated = res.data.find((j: any) => j.id === job?.id) || job;
        setSuccessType('extended');
        setSuccessJob(updated);
      } catch (e: any) {
        await fetchJobs();
        Alert.alert('Error', e?.response?.data?.error || 'Could not confirm extension payment.');
      }
    } else {
      // Job posting payment — poll for published status
      let published = false;
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 1500));
        try {
          const res = await getMyJobs();
          setJobs(res.data);
          const updated = res.data.find((j: any) => j.id === job?.id);
          if (updated?.status === 'published') {
            published = true;
            setSuccessType('published');
            setSuccessJob(updated);
            break;
          }
        } catch {}
      }
      if (!published && txRef && job) {
        try {
          await confirmJobPayment(job.id, { tx_ref: txRef });
          await fetchJobs();
          const refreshed = await getMyJobs();
          const updated = refreshed.data.find((j: any) => j.id === job.id);
          if (updated?.status === 'published') {
            setSuccessType('published');
            setSuccessJob(updated);
          }
        } catch {}
      }
      if (!published) await fetchJobs();
    }

    setVerifying(false);
  };

  const isExpired = (job: any) => {
    if (!job.deadline) return false;
    return new Date(job.deadline) < new Date(new Date().toDateString());
  };

  const handleRequestExtend = async () => {
    if (!extendModal || !extendDate) return;
    try {
      await requestDeadlineExtend(extendModal.id, { new_deadline: extendDate });
      Alert.alert('Request Sent', 'Your deadline extension request has been submitted. Admin will review and set the fee.');
      setExtendModal(null);
      setExtendDate('');
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to submit request');
    }
  };
  const handlePayExtend = async (job: any) => {
    setPaying(job.id);
    try {
      const res = await payExtendFee(job.id, { email: user?.email || '', first_name: user?.username || '' });
      const url: string = res.data.checkout_url;
      if (Platform.OS === 'web') {
        (window as any).location.href = url;
      } else {
        setChapaJob(job);
        setChapaIsExtend(true);  // mark as extension payment
        setChapaUrl(url);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to initiate payment');
    }
    setPaying(null);
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
          <Text style={styles.verifyText}>Verifying payment... please wait</Text>
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

              {/* Expired badge */}
              {isExpired(item) && (
                <View style={styles.expiredBanner}>
                  <Ionicons name="time-outline" size={14} color="#ef4444" />
                  <Text style={styles.expiredText}>⏰ Deadline Reached — Job is no longer visible to seekers</Text>
                </View>
              )}

              {/* Extension request status */}
              {item.extend_status && item.extend_status !== 'none' && (
                <View style={[styles.noteBox, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
                  <Ionicons name="calendar-outline" size={13} color="#0369a1" />
                  <Text style={[styles.noteText, { color: '#0369a1' }]}>
                    Extension: {item.extend_status === 'pending' ? 'Requested — waiting for admin to set fee' :
                      item.extend_status === 'fee_set' ? `Fee set: ETB ${item.extend_fee} — tap to pay` :
                      item.extend_status === 'paid' ? `✓ Extended to ${item.extend_new_deadline}` :
                      item.extend_status === 'approved' ? `✓ Extended to ${item.extend_new_deadline}` :
                      item.extend_status === 'rejected' ? '✕ Extension rejected by admin' : item.extend_status}
                  </Text>
                </View>
              )}

              {/* Pay fee button — shown when approved or payment_pending (retry) */}
              {['approved', 'payment_pending'].includes(item.status) && item.posting_fee && (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => handlePayFee(item)}
                  disabled={paying === item.id}
                >
                  {paying === item.id
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
                  {(item.deadline || item.extend_new_deadline) && (
                    <View style={styles.statItem}>
                      <Ionicons name="calendar-outline" size={14} color={C.textSub} />
                      <Text style={styles.statText}>
                        Deadline: {item.deadline || item.extend_new_deadline}
                      </Text>
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
                {['published', 'closed'].includes(item.status) &&
                  !['pending', 'fee_set', 'paid'].includes(item.extend_status || '') && (
                  <TouchableOpacity style={styles.extendBtn}
                    onPress={() => {
                      setExtendModal(item);
                      setExtendDate('');
                      // Reset picker to tomorrow
                      const tomorrow = new Date(Date.now() + 86400000);
                      setExtPickerYear(tomorrow.getFullYear());
                      setExtPickerMonth(tomorrow.getMonth() + 1);
                      setExtPickerDay(tomorrow.getDate());
                    }}>
                    <Ionicons name="calendar-outline" size={15} color="#0369a1" />
                    <Text style={styles.extendBtnText}>Extend Deadline</Text>
                  </TouchableOpacity>
                )}
                {/* Pay extension fee */}
                {item.extend_status === 'fee_set' && (
                  <TouchableOpacity style={styles.payBtn} onPress={() => handlePayExtend(item)} disabled={paying === item.id}>
                    {paying === item.id ? <ActivityIndicator color="#fff" size="small" /> : <>
                      <Ionicons name="card-outline" size={15} color="#fff" />
                      <Text style={styles.payBtnText}>Pay ETB {item.extend_fee} to Extend</Text>
                    </>}
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

      {/* Chapa WebView modal */}
      <Modal visible={!!chapaUrl} animationType="slide" onRequestClose={() => handleChapaComplete(null)}>
        {chapaUrl && (
          <ChapaWebView
            url={chapaUrl}
            onComplete={handleChapaComplete}
            onCancel={() => handleChapaComplete(null)}
          />
        )}
      </Modal>

      {/* Extend deadline modal */}
      <Modal visible={!!extendModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Ionicons name="calendar-outline" size={48} color="#0369a1" />
            <Text style={styles.modalTitle}>Extend Deadline</Text>
            <Text style={styles.modalSub}>
              Request a new deadline for "{extendModal?.title}". Admin will review and set the extension fee.
            </Text>
            <View style={{ width: '100%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6 }}>
                New Deadline <Text style={{ color: C.danger }}>*</Text>
              </Text>
              {Platform.OS === 'web' ? (
                <View style={{ backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12 }}>
                  <input
                    type="date"
                    value={extendDate}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    onChange={e => setExtendDate(e.target.value)}
                    style={{
                      border: 'none', outline: 'none', background: 'transparent',
                      fontSize: 14, color: extendDate ? C.text : C.textSub,
                      width: '100%', fontFamily: 'inherit',
                    }}
                  />
                </View>
              ) : (
                // Native: tap to open date picker
                <TouchableOpacity
                  style={{ backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => setShowExtendDatePicker(true)}>
                  <Text style={{ fontSize: 14, color: extendDate ? C.text : C.textSub }}>
                    {extendDate || 'Tap to select new deadline'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={C.primary} />
                </TouchableOpacity>
              )}
              {extendDate ? (
                <Text style={{ fontSize: 11, color: '#0369a1', marginTop: 4, fontWeight: '600' }}>
                  📅 New deadline: {extendDate}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#0369a1', opacity: extendDate ? 1 : 0.5 }]}
              onPress={handleRequestExtend}
              disabled={!extendDate}>
              <Text style={styles.modalBtnText}>Submit Extension Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 10 }} onPress={() => { setExtendModal(null); setExtendDate(''); }}>
              <Text style={{ color: C.textSub, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Native date picker for extend deadline */}
      {showExtendDatePicker && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1} onPress={() => setShowExtendDatePicker(false)}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: 300 }}
              onStartShouldSetResponder={() => true}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 16, textAlign: 'center' }}>
                Select New Deadline
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6 }}>Year</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {[2026, 2027, 2028, 2029, 2030].map(y => (
                  <TouchableOpacity key={y}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: extPickerYear === y ? C.primary : C.bg, borderWidth: 1, borderColor: extPickerYear === y ? C.primary : C.border }}
                    onPress={() => setExtPickerYear(y)}>
                    <Text style={{ color: extPickerYear === y ? '#fff' : C.text, fontWeight: '700' }}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6 }}>Month</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                  <TouchableOpacity key={m}
                    style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: extPickerMonth === i+1 ? C.primary : C.bg, borderWidth: 1, borderColor: extPickerMonth === i+1 ? C.primary : C.border }}
                    onPress={() => setExtPickerMonth(i+1)}>
                    <Text style={{ color: extPickerMonth === i+1 ? '#fff' : C.text, fontWeight: '600', fontSize: 12 }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6 }}>Day</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <TouchableOpacity key={d}
                    style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: extPickerDay === d ? C.primary : C.bg, borderWidth: 1, borderColor: extPickerDay === d ? C.primary : C.border, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setExtPickerDay(d)}>
                    <Text style={{ color: extPickerDay === d ? '#fff' : C.text, fontWeight: '600', fontSize: 12 }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={{ backgroundColor: '#0369a1', borderRadius: 10, padding: 13, alignItems: 'center' }}
                onPress={() => {
                  const mm = String(extPickerMonth).padStart(2, '0');
                  const dd = String(extPickerDay).padStart(2, '0');
                  setExtendDate(`${extPickerYear}-${mm}-${dd}`);
                  setShowExtendDatePicker(false);
                }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Success modal */}
      <Modal visible={!!successJob} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Ionicons
              name={successType === 'extended' ? 'calendar-outline' : 'checkmark-circle'}
              size={64}
              color={successType === 'extended' ? '#0369a1' : C.success}
            />
            <Text style={styles.modalTitle}>
              {successType === 'extended' ? 'Deadline Extended!' : 'Job Published!'}
            </Text>
            <Text style={styles.modalSub}>
              {successType === 'extended'
                ? `The deadline for "${successJob?.title}" has been extended successfully. Your job remains live.`
                : `${successJob?.title} is now live and visible to job seekers.`
              }
            </Text>
            <TouchableOpacity style={[styles.modalBtn, successType === 'extended' && { backgroundColor: '#0369a1' }]}
              onPress={() => { setSuccessJob(null); fetchJobs(); }}>
              <Text style={styles.modalBtnText}>View My Jobs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list:         { paddingHorizontal: Platform.OS === 'web' ? 60 : 12, paddingTop: 14, paddingBottom: 32 },
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
  extendBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#e0f2fe', padding: 10, borderRadius: 8 },
  extendBtnText:{ color: '#0369a1', fontWeight: '600', fontSize: 13 },
  expiredBanner:{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#fca5a5' },
  expiredText:  { flex: 1, fontSize: 12, color: '#ef4444', fontWeight: '600', lineHeight: 16 },
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
