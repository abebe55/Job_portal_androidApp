import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getJobs, getMyJobs } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { C, S } from '../../constants/theme';

// ── Employer dashboard home ───────────────────────────────────────────────────
function EmployerHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyJobs().then(r => { setMyJobs(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const published = myJobs.filter(j => j.status === 'published').length;
  const pending   = myJobs.filter(j => ['draft', 'under_review', 'approved', 'payment_pending'].includes(j.status)).length;
  const totalApplicants = myJobs.reduce((s, j) => s + (j.applications?.length ?? 0), 0);

  const quickActions = [
    { icon: 'add-circle-outline',  label: t('postJob'),       path: '/post-job',  color: '#2563eb' },
    { icon: 'list-outline',        label: t('myPostedJobs'),  path: '/my-jobs',   color: '#7c3aed' },
    { icon: 'wallet-outline',      label: t('myWallet'),      path: '/wallet',    color: '#16a34a' },
    { icon: 'people-outline',      label: t('applicants'),    path: '/my-jobs',   color: '#d97706' },
  ];

  const STATUS_LABELS: any = {
    draft:           { color: '#6b7280', bg: '#f3f4f6', label: t('pendingReview') },
    under_review:    { color: '#2563eb', bg: '#dbeafe', label: t('underReview') },
    approved:        { color: '#d97706', bg: '#fef3c7', label: t('approvedPayFee') },
    payment_pending: { color: '#7c3aed', bg: '#ede9fe', label: t('paymentPending') },
    published:       { color: '#16a34a', bg: '#dcfce7', label: t('jobPublishedStatus') },
    rejected:        { color: '#ef4444', bg: '#fee2e2', label: t('rejected') },
  };

  return (
    <View style={S.page}>
      <PageHeader title={t('employerDashboard')} />
      <ScrollView contentContainerStyle={styles.empScroll} showsVerticalScrollIndicator={false}>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeHi}>{t('hello')}, {user?.username}</Text>
            <Text style={styles.welcomeSub}>{t('manageJobs')}</Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Ionicons name="business" size={28} color="#2563eb" />
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: t('published'),  value: published,       color: '#16a34a' },
            { label: t('pending'),    value: pending,         color: '#d97706' },
            { label: t('applicants'), value: totalApplicants, color: '#7c3aed' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statNum, { color: s.color }]}>{loading ? '—' : s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
        <View style={styles.actionsGrid}>
          <View style={styles.actionsRow}>
            {quickActions.slice(0, 2).map(a => (
              <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => router.push(a.path as any)}>
                <View style={styles.actionIcon}>
                  <Ionicons name={a.icon as any} size={24} color={a.color} />
                </View>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actionsRow}>
            {quickActions.slice(2, 4).map(a => (
              <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => router.push(a.path as any)}>
                <View style={styles.actionIcon}>
                  <Ionicons name={a.icon as any} size={24} color={a.color} />
                </View>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('recentJobPosts')}</Text>
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
        ) : myJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="briefcase-outline" size={36} color={C.border} />
            <Text style={styles.emptyText}>{t('noJobsPosted')}</Text>
            <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/post-job')}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.postBtnText}>{t('postYourFirstJob')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myJobs.slice(0, 5).map(job => {
            const st = STATUS_LABELS[job.status] || STATUS_LABELS.draft;
            return (
              <TouchableOpacity key={job.id} style={styles.jobRow} onPress={() => router.push('/my-jobs')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobRowTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={styles.jobRowMeta}>{job.location} · {job.industry}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusPillText, { color: st.color }]}>{st.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {myJobs.length > 5 && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/my-jobs')}>
            <Text style={styles.viewAllText}>{t('viewAllJobs')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── Job seeker home ───────────────────────────────────────────────────────────
function SeekerHome() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const fetchJobs = async () => {
    try { const res = await getJobs(); setJobs(res.data); } catch {}
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  if (loading) return (
    <View style={S.page}>
      <PageHeader title={t('latestJobs')} />
      <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
    </View>
  );

  const JOB_TYPE_COLOR: any = { fulltime: '#22c55e', parttime: '#f59e0b', contract: '#3b82f6', internship: '#a855f7' };

  return (
    <View style={S.page}>
      <PageHeader title={t('latestJobs')} />
      <FlatList
        data={jobs}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs(); }} colors={[C.primary]} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/job/${item.id}`)}>
            <View style={styles.cardTop}>
              <View style={styles.iconWrap}>
                <Ionicons name="briefcase" size={22} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.company}>{item.posted_by?.username}</Text>
              </View>
              {item.salary ? <Text style={styles.salary}>ETB {item.salary}</Text> : null}
            </View>
            <View style={styles.tagsRow}>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={C.textSub} />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
              <View style={[styles.typeTag, { backgroundColor: (JOB_TYPE_COLOR[item.job_type] ?? C.primary) + '22' }]}>
                <Text style={[styles.typeTagText, { color: JOB_TYPE_COLOR[item.job_type] ?? C.primary }]}>{item.job_type}</Text>
              </View>
              <View style={styles.levelTag}>
                <Text style={styles.levelTagText}>{item.skill_level}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>{t('noJobsAvailable')}</Text>
          </View>
        }
      />
    </View>
  );
}

// ── Root: pick based on role ──────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  return user?.role === 'employer' ? <EmployerHome /> : <SeekerHome />;
}

const styles = StyleSheet.create({
  // Seeker
  list:         { paddingHorizontal: 60, paddingTop: 14, paddingBottom: 32 },
  card:         { ...S.card },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  iconWrap:     { width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  jobTitle:     { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  company:      { fontSize: 13, color: C.textSub, fontWeight: '600' },
  salary:       { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  tagsRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 12, color: C.textSub, fontWeight: '600' },
  typeTag:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeTagText:  { fontSize: 11, fontWeight: '700' },
  levelTag:     { backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  levelTagText: { fontSize: 11, color: C.primary, fontWeight: '700' },
  empty:        { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText:    { color: C.text, fontSize: 15, fontWeight: '700' },

  // Employer
  empScroll:    { paddingHorizontal: 60, paddingTop: 14, paddingBottom: 40 },
  welcomeCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)', shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  welcomeLeft:  { flex: 1 },
  welcomeHi:    { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 2 },
  welcomeSub:   { fontSize: 12, color: C.textSub, fontWeight: '600' },
  welcomeIcon:  { width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:     { flex: 1, backgroundColor: C.white, borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: 'rgba(124,58,237,0.07)' },
  statNum:      { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel:    { fontSize: 11, color: C.textSub, fontWeight: '700' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  actionsGrid:  { flexDirection: 'column', gap: 10, marginBottom: 18 },
  actionsRow:   { flexDirection: 'row', gap: 10 },
  actionCard:   { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, backgroundColor: '#ffffff', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.13, shadowRadius: 14, elevation: 6, borderWidth: 1, borderColor: 'rgba(124,58,237,0.08)' },
  actionIcon:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f3ff' },
  actionLabel:  { fontSize: 13, fontWeight: '800', textAlign: 'center', color: C.text },
  emptyCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border },
  postBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  postBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  jobRow:       { ...S.card, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  jobRowTitle:  { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  jobRowMeta:   { fontSize: 12, color: C.textSub },
  statusPill:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText:{ fontSize: 11, fontWeight: '700' },
  viewAllBtn:   { alignItems: 'center', paddingVertical: 12 },
  viewAllText:  { color: C.primary, fontWeight: '700', fontSize: 14 },
});
