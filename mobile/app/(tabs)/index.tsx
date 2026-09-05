import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getJobs, getMyJobs } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import WebLayout from '../../components/WebLayout';
import { useAuth } from '../../context/AuthContext';
import { C, S, LAYOUT } from '../../constants/theme';

// ── Status badge config ───────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  draft:           { color: '#6b7280', bg: '#f3f4f6', label: 'Pending Review' },
  under_review:    { color: '#2563eb', bg: '#dbeafe', label: 'Under Review' },
  approved:        { color: '#d97706', bg: '#fef3c7', label: 'Approved — Pay Fee' },
  payment_pending: { color: '#7c3aed', bg: '#ede9fe', label: 'Payment Pending' },
  published:       { color: '#10b981', bg: '#d1fae5', label: 'Published' },
  rejected:        { color: '#ef4444', bg: '#fee2e2', label: 'Rejected' },
  closed:          { color: '#6b7280', bg: '#f3f4f6', label: 'Closed' },
};

const JOB_TYPE_COLOR: Record<string, string> = {
  fulltime: '#10b981', parttime: '#f59e0b',
  contract: '#3b82f6', internship: '#a855f7',
};

// ── Employer dashboard ────────────────────────────────────────────────────────
function EmployerHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyJobs()
      .then(r => { setMyJobs(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const published      = myJobs.filter(j => j.status === 'published').length;
  const pending        = myJobs.filter(j => ['draft','under_review','approved','payment_pending'].includes(j.status)).length;
  const totalApplicants= myJobs.reduce((s, j) => s + (j.applications?.length ?? 0), 0);

  const quickActions = [
    { icon: 'add-circle-outline',  label: t('postJob'),      path: '/post-job', color: '#2563eb', bg: '#eff6ff' },
    { icon: 'list-outline',        label: t('myPostedJobs'), path: '/my-jobs',  color: '#7c3aed', bg: '#f5f3ff' },
    { icon: 'wallet-outline',      label: t('myWallet'),     path: '/wallet',   color: '#10b981', bg: '#f0fdf4' },
    { icon: 'people-outline',      label: t('applicants'),   path: '/my-jobs',  color: '#f59e0b', bg: '#fffbeb' },
  ];

  return (
    <WebLayout title={t('employerDashboard')} subtitle={t('manageJobs')}>
    <View style={S.page}>
      <PageHeader title={t('employerDashboard')} />
      <ScrollView
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={st.welcomeCard}>
          <View style={{ flex: 1 }}>
            <Text style={st.welcomeHi}>Hello, {user?.username}</Text>
            <Text style={st.welcomeSub}>{t('manageJobs')}</Text>
          </View>
          <View style={st.welcomeIcon}>
            <Ionicons name="briefcase-outline" size={20} color={C.primary} />
          </View>
        </View>

        {/* Stats row */}
        <View style={st.statsRow}>
          {[
            { label: t('published'),  value: published,       color: '#10b981' },
            { label: t('pending'),    value: pending,         color: '#f59e0b' },
            { label: t('applicants'), value: totalApplicants, color: '#6c63ff' },
          ].map(sc => (
            <View key={sc.label} style={st.statCard}>
              <Text style={[st.statNum, { color: sc.color }]}>{loading ? '—' : sc.value}</Text>
              <Text style={st.statLabel}>{sc.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={S.sectionTitle}>{t('quickActions')}</Text>
        <View style={st.actionsGrid}>
          {quickActions.map(a => (
            <TouchableOpacity
              key={a.label}
              style={st.actionCard}
              onPress={() => router.push(a.path as any)}
            >
              <View style={[st.actionIconWrap, { backgroundColor: a.color + '15' }]}>
                <Ionicons name={a.icon as any} size={20} color={a.color} />
              </View>
              <Text style={[st.actionLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent jobs */}
        <Text style={S.sectionTitle}>{t('recentJobPosts')}</Text>
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
        ) : myJobs.length === 0 ? (
          <View style={st.emptyCard}>
            <Ionicons name="briefcase-outline" size={36} color={C.border} />
            <Text style={st.emptyTitle}>{t('noJobsPosted')}</Text>
            <TouchableOpacity style={st.postBtn} onPress={() => router.push('/post-job')}>
              <Ionicons name="add" size={14} color="#1d4ed8" />
              <Text style={st.postBtnText}>{t('postYourFirstJob')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myJobs.slice(0, 5).map(job => {
            const sc = STATUS_CFG[job.status] || STATUS_CFG.draft;
            return (
              <TouchableOpacity
                key={job.id}
                style={st.jobRow}
                onPress={() => router.push('/my-jobs')}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.jobRowTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={st.jobRowMeta}>{job.location} · {job.industry}</Text>
                </View>
                <View style={[st.statusPill, { backgroundColor: sc.bg }]}>
                  <Text style={[st.statusPillText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {myJobs.length > 5 && (
          <TouchableOpacity style={st.viewAllBtn} onPress={() => router.push('/my-jobs')}>
            <Text style={st.viewAllText}>{t('viewAllJobs')}</Text>
            <Ionicons name="arrow-forward" size={14} color={C.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
    </WebLayout>
  );
}

// ── Job seeker home ───────────────────────────────────────────────────────────
function SeekerHome() {
  const [jobs, setJobs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { t }  = useTranslation();

  const fetchJobs = async () => {
    try { const res = await getJobs(); setJobs(res.data); } catch {}
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  if (loading) return (
    <WebLayout title={t('latestJobs')} subtitle="Browse available positions">
      <View style={S.page}>
        <PageHeader title={t('latestJobs')} />
        <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
      </View>
    </WebLayout>
  );

  return (
    <WebLayout title={t('latestJobs')} subtitle="Browse available positions">
      <View style={S.page}>
        <PageHeader title={t('latestJobs')} />
        <FlatList
        data={jobs}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={S.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchJobs(); }}
            colors={[C.primary]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={st.jobCard}
            onPress={() => router.push(`/job/${item.id}`)}
            activeOpacity={0.85}
          >
            <View style={st.jobCardTop}>
              <View style={st.jobIconWrap}>
                <Ionicons name="briefcase" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.jobTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={st.jobCompany} numberOfLines={1}>{item.posted_by?.username}</Text>
              </View>
              {item.salary ? (
                <Text style={st.salary}>ETB {item.salary}</Text>
              ) : null}
            </View>

            <View style={st.jobTagsRow}>
              <View style={st.locationRow}>
                <Ionicons name="location-outline" size={12} color={C.textSub} />
                <Text style={st.locationText} numberOfLines={1}>{item.location}</Text>
              </View>
              <View style={[st.typeTag, { backgroundColor: (JOB_TYPE_COLOR[item.job_type] ?? C.primary) + '18' }]}>
                <Text style={[st.typeTagText, { color: JOB_TYPE_COLOR[item.job_type] ?? C.primary }]}>
                  {item.job_type}
                </Text>
              </View>
              <View style={st.levelTag}>
                <Text style={st.levelTagText}>{item.skill_level}</Text>
              </View>
            </View>

            {item.industry ? (
              <View style={st.industryRow}>
                <Ionicons name="business-outline" size={11} color={C.textMuted} />
                <Text style={st.industryText}>{item.industry}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="briefcase-outline" size={48} color={C.border} />
            <Text style={st.emptyTitle}>{t('noJobsAvailable')}</Text>
            <Text style={st.emptySub}>Check back later for new opportunities.</Text>
          </View>
        }
      />
      </View>
    </WebLayout>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  return user?.role === 'employer' ? <EmployerHome /> : <SeekerHome />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  // Seeker job card
  jobCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  jobCardTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  jobIconWrap:  { width: 40, height: 40, borderRadius: 10, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  jobTitle:     { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  jobCompany:   { fontSize: 13, color: C.textSub, fontWeight: '500' },
  salary:       { fontSize: 13, fontWeight: '700', color: '#10b981', flexShrink: 0 },
  jobTagsRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, minWidth: 0 },
  locationText: { fontSize: 12, color: C.textSub, fontWeight: '500', flexShrink: 1 },
  typeTag:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeTagText:  { fontSize: 11, fontWeight: '700' },
  levelTag:     { backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  levelTagText: { fontSize: 11, color: C.primary, fontWeight: '700' },
  industryRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  industryText: { fontSize: 11, color: C.textMuted },
  empty:        { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle:   { color: C.text, fontSize: 15, fontWeight: '700' },
  emptySub:     { color: C.textSub, fontSize: 13 },

  // Employer
  welcomeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  welcomeHi:    { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  welcomeSub:   { fontSize: 12, color: C.textSub },
  welcomeIcon:  { width: 36, height: 36, borderRadius: 9, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 10,
    padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  statNum:   { fontSize: 20, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 11, color: C.textSub, fontWeight: '600', textAlign: 'center' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  actionCard: {
    width: '48%', borderRadius: 10, padding: 14,
    alignItems: 'center', gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  actionIconWrap: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  actionLabel:    { fontSize: 13, fontWeight: '600', textAlign: 'center', color: C.text },

  emptyCard:  { backgroundColor: C.surface, borderRadius: 10, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#93c5fd',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4,
  },
  postBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 13 },

  jobRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: 8, padding: 10,
    marginBottom: 6, borderWidth: 1, borderColor: C.border,
  },
  jobRowTitle: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 1 },
  jobRowMeta:  { fontSize: 11, color: C.textSub },
  statusPill:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  viewAllBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  viewAllText: { color: C.primary, fontWeight: '700', fontSize: 13 },
});
