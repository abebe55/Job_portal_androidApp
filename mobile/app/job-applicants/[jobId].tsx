import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, ScrollView, Image, Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getJobApplications, updateApplicationStatus } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { C, S } from '../../constants/theme';

const BASE = 'http://127.0.0.1:8000';
const STATUS: any = {
  pending:  { color: '#d97706', bg: '#fef3c7', icon: 'time-outline',             label: 'Pending' },
  reviewed: { color: '#2563eb', bg: '#dbeafe', icon: 'eye-outline',              label: 'Reviewed' },
  accepted: { color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle-outline', label: 'Accepted' },
  rejected: { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline',     label: 'Rejected' },
};

function fullUrl(path: string) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ── Reusable sub-components ───────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon as any} size={13} color={C.primary} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Sec({ title, color = C.primary, children }: any) {
  return (
    <View style={s.sec}>
      <View style={[s.secHeader, { borderLeftColor: color }]}>
        <Text style={[s.secTitle, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DocItem({ label, value }: { label: string; value: string }) {
  const [imgModal, setImgModal] = useState(false);
  const url = fullUrl(value);
  const filename = value.split('/').pop() || label;
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={s.docRow}>
        <Ionicons name={isImage ? 'image-outline' : 'document-attach-outline'} size={14} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.docLabel}>{label}</Text>
          <Text style={s.docFile} numberOfLines={1}>{filename}</Text>
        </View>
        <TouchableOpacity style={s.viewBtn} onPress={() => isImage ? setImgModal(true) : Linking.openURL(url)}>
          <Text style={s.viewBtnTxt}>View</Text>
        </TouchableOpacity>
      </View>
      {isImage && (
        <TouchableOpacity onPress={() => setImgModal(true)}>
          <Image source={{ uri: url }} style={s.docThumb} resizeMode="cover" />
        </TouchableOpacity>
      )}
      <Modal visible={imgModal} transparent animationType="fade" onRequestClose={() => setImgModal(false)}>
        <TouchableOpacity style={s.imgModalBg} activeOpacity={1} onPress={() => setImgModal(false)}>
          <Image source={{ uri: url }} style={s.imgModalImg} resizeMode="contain" />
          <Text style={s.imgModalHint}>Tap to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Full CV Panel ─────────────────────────────────────────────────────────────
function CVPanel({ cv }: { cv: any }) {
  if (!cv) return <Text style={s.noCv}>No CV submitted.</Text>;

  const fullName = [cv.first_name, cv.father_name, cv.grandfather_name].filter(Boolean).join(' ') || cv.full_name;
  const photoUrl = cv.profile_photo ? fullUrl(cv.profile_photo) : null;
  const skills   = cv.technical_skills ? cv.technical_skills.split(',').map((x: string) => x.trim()).filter(Boolean) : [];
  const soft     = cv.soft_skills ? cv.soft_skills.split(',').map((x: string) => x.trim()).filter(Boolean) : [];

  let eduEntries: any[] = [];
  let expEntries: any[] = [];
  try { if (cv.education_entries) eduEntries = JSON.parse(cv.education_entries); } catch {}
  try { if (cv.experience_entries) expEntries = JSON.parse(cv.experience_entries); } catch {}

  const hasDocs = cv.degree_certificate || cv.transcript_file || cv.exit_exam_file ||
    cv.tvet_certificate || cv.experience_letter || cv.recommendation_letter ||
    cv.national_id || cv.other_document;

  return (
    <View>
      {/* Hero */}
      <View style={s.hero}>
        {photoUrl
          ? <Image source={{ uri: photoUrl }} style={s.heroPhoto} />
          : <View style={s.heroPhotoBox}><Ionicons name="person" size={28} color={C.border} /></View>
        }
        <View style={{ flex: 1 }}>
          <Text style={s.heroName}>{fullName || cv.full_name || 'N/A'}</Text>
          <Text style={s.heroRole}>{cv.skill_title || cv.skill_title_custom || cv.skill_category || 'Job Seeker'}</Text>
          {cv.skill_specialization ? <Text style={s.heroSpec}>{cv.skill_specialization}</Text> : null}
          {cv.city ? <Text style={s.heroLoc}>{cv.city}{cv.region ? `, ${cv.region}` : ''}</Text> : null}
        </View>
      </View>

      {/* Completeness */}
      {cv.objective ? (
        <View style={s.objectiveBox}>
          <Text style={s.objectiveLabel}>Professional Summary</Text>
          <Text style={s.objectiveTxt}>{cv.objective}</Text>
        </View>
      ) : null}

      {/* Contact */}
      <Sec title="Contact" color="#16a34a">
        <InfoRow icon="call-outline" label="Phone" value={cv.phone} />
        <InfoRow icon="phone-portrait-outline" label="Alt Phone" value={cv.phone_alt} />
        <InfoRow icon="mail-outline" label="Email" value={cv.email} />
        <InfoRow icon="location-outline" label="Address" value={[cv.city, cv.sub_city, cv.region].filter(Boolean).join(', ')} />
        <InfoRow icon="home-outline" label="Woreda / Kebele" value={[cv.woreda, cv.kebele].filter(Boolean).join(' / ')} />
      </Sec>

      {/* Personal */}
      <Sec title="Personal Details" color="#2563eb">
        <InfoRow icon="male-female-outline" label="Gender" value={cv.gender} />
        <InfoRow icon="heart-outline" label="Marital Status" value={cv.marital_status} />
        <InfoRow icon="calendar-outline" label="Date of Birth" value={cv.date_of_birth} />
        <InfoRow icon="flag-outline" label="Nationality" value={cv.nationality} />
        <InfoRow icon="briefcase-outline" label="Employment Status" value={cv.employment_status} />
        <InfoRow icon="accessibility-outline" label="Disability" value={cv.disability !== 'None' ? cv.disability : undefined} />
      </Sec>

      {/* Skills */}
      {(skills.length > 0 || soft.length > 0 || cv.computer_skills) && (
        <Sec title="Skills & Expertise" color="#7c3aed">
          {skills.length > 0 && (
            <View style={s.badgeRow}>
              {skills.map((sk: string, i: number) => (
                <View key={i} style={s.badge}><Text style={s.badgeTxt}>{sk}</Text></View>
              ))}
            </View>
          )}
          {soft.length > 0 && (
            <>
              <Text style={s.subLabel}>Soft Skills</Text>
              <View style={s.badgeRow}>
                {soft.map((sk: string, i: number) => (
                  <View key={i} style={[s.badge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                    <Text style={[s.badgeTxt, { color: '#16a34a' }]}>{sk}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          <InfoRow icon="laptop-outline" label="Computer Skills" value={cv.computer_skills} />
        </Sec>
      )}

      {/* Education */}
      {eduEntries.length > 0 && (
        <Sec title="Education" color="#2563eb">
          {eduEntries.map((e: any, i: number) => (
            <View key={i} style={s.entryBox}>
              <Text style={s.entryTitle}>{e.level}</Text>
              {e.field ? <Text style={s.entrySubtitle}>{e.field}</Text> : null}
              {e.institution ? <Text style={s.entryMeta}>{e.institution}</Text> : null}
              <View style={s.entryMetaRow}>
                {e.enrollment_type ? <Text style={s.entryMetaTag}>{e.enrollment_type}</Text> : null}
                {e.graduation_year ? <Text style={s.entryMetaTag}>Graduated: {e.graduation_year}</Text> : null}
                {e.gpa ? <Text style={s.entryMetaTag}>GPA: {e.gpa}/{e.gpa_scale || '4.0'}</Text> : null}
                {e.exit_exam_score ? <Text style={s.entryMetaTag}>Exit Exam: {e.exit_exam_score}%</Text> : null}
              </View>
              {e.thesis_title ? <Text style={s.entryMeta}>Thesis: {e.thesis_title}</Text> : null}
            </View>
          ))}
        </Sec>
      )}

      {/* Languages */}
      <Sec title="Languages" color="#16a34a">
        <InfoRow icon="chatbubble-outline" label="Amharic" value={cv.amharic_level || 'Native'} />
        <InfoRow icon="chatbubble-outline" label="English" value={cv.english_level} />
        <InfoRow icon="globe-outline" label="Other" value={cv.other_languages} />
      </Sec>

      {/* Experience */}
      <Sec title="Work Experience" color="#d97706">
        <InfoRow icon="checkmark-circle-outline" label="Has Experience" value={cv.has_experience ? 'Yes' : 'No'} />
        {cv.has_experience && (
          <>
            <InfoRow icon="time-outline" label="Total Years" value={cv.experience_years ? `${cv.experience_years} year(s)` : undefined} />
            {expEntries.length > 0 ? expEntries.map((e: any, i: number) => (
              <View key={i} style={s.entryBox}>
                <Text style={s.entryTitle}>{e.job_title}</Text>
                {e.company ? <Text style={s.entrySubtitle}>{e.company}{e.location ? ` — ${e.location}` : ''}</Text> : null}
                {e.start_date ? <Text style={s.entryMeta}>{e.start_date} — {e.is_current ? 'Present' : e.end_date}</Text> : null}
                {e.duties ? <Text style={s.entryDuties}>{e.duties}</Text> : null}
              </View>
            )) : cv.experience_detail ? (
              <Text style={s.entryDuties}>{cv.experience_detail}</Text>
            ) : null}
          </>
        )}
      </Sec>

      {/* Driving License */}
      {cv.driving_license && (
        <Sec title="Driving License" color="#16a34a">
          <InfoRow icon="car-outline" label="License Type" value={cv.driving_license_type} />
        </Sec>
      )}

      {/* References */}
      {(cv.reference_1 || cv.reference_2) && (
        <Sec title="References" color="#6b7280">
          <InfoRow icon="person-outline" label="Reference 1" value={cv.reference_1} />
          <InfoRow icon="person-outline" label="Reference 2" value={cv.reference_2} />
        </Sec>
      )}

      {/* Documents */}
      <Sec title="Uploaded Documents" color="#7c3aed">
        {hasDocs ? (
          <>
            {cv.degree_certificate    && <DocItem label="Degree / Diploma" value={cv.degree_certificate} />}
            {cv.transcript_file       && <DocItem label="Transcript" value={cv.transcript_file} />}
            {cv.exit_exam_file        && <DocItem label="Exit Exam Result" value={cv.exit_exam_file} />}
            {cv.tvet_certificate      && <DocItem label="TVET Certificate" value={cv.tvet_certificate} />}
            {cv.experience_letter     && <DocItem label="Experience Letter" value={cv.experience_letter} />}
            {cv.recommendation_letter && <DocItem label="Recommendation Letter" value={cv.recommendation_letter} />}
            {cv.national_id           && <DocItem label="National ID" value={cv.national_id} />}
            {cv.other_document        && <DocItem label={cv.other_document_label || 'Other Document'} value={cv.other_document} />}
          </>
        ) : (
          <Text style={s.noCv}>No documents uploaded.</Text>
        )}
      </Sec>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function JobApplicantsScreen() {
  const { jobId }               = useLocalSearchParams();
  const [apps, setApps]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [note, setNote]         = useState('');
  const [acting, setActing]     = useState(false);

  useEffect(() => {
    getJobApplications(Number(jobId))
      .then(res => { setApps(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [jobId]);

  const handleAction = async (appId: number, status: string) => {
    setActing(true);
    await updateApplicationStatus(appId, { status, employer_note: note });
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status, employer_note: note } : a));
    setActing(false); setSelected(null); setNote('');
  };

  if (loading) return (
    <View style={S.page}>
      <PageHeader title="Applicants" showBack />
      <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
    </View>
  );

  const counts = {
    total: apps.length,
    pending: apps.filter(a => a.status === 'pending').length,
    accepted: apps.filter(a => a.status === 'accepted').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <View style={S.page}>
      <PageHeader title={`Applicants (${counts.total})`} showBack />

      {/* Summary bar */}
      <View style={s.summary}>
        {[
          { label: 'Total',    value: counts.total,    color: C.primary },
          { label: 'Pending',  value: counts.pending,  color: '#d97706' },
          { label: 'Accepted', value: counts.accepted, color: '#16a34a' },
          { label: 'Rejected', value: counts.rejected, color: '#ef4444' },
        ].map(item => (
          <View key={item.label} style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={apps}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 60, paddingTop: 14, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? STATUS.pending;
          const isOpen = expanded === item.id;
          const cv = item.applicant_cv;
          const fullName = cv ? [cv.first_name, cv.father_name].filter(Boolean).join(' ') || cv.full_name : '';
          return (
            <View style={s.card}>
              {/* Applicant header row */}
              <TouchableOpacity style={s.cardTop} onPress={() => setExpanded(isOpen ? null : item.id)} activeOpacity={0.8}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{item.applicant?.username?.[0]?.toUpperCase() ?? 'U'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{fullName || item.applicant?.username}</Text>
                  <Text style={s.email}>{item.applicant?.email}</Text>
                  {cv?.city ? <Text style={s.loc}>{cv.city}{cv.region ? `, ${cv.region}` : ''}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[s.badge, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon} size={11} color={st.color} />
                    <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSub} />
                </View>
              </TouchableOpacity>

              {/* Cover letter */}
              {item.cover_letter ? (
                <View style={s.coverBox}>
                  <Text style={s.coverLabel}>Cover Letter</Text>
                  <Text style={s.coverTxt}>{item.cover_letter}</Text>
                </View>
              ) : null}

              {/* Employer note */}
              {item.employer_note ? (
                <View style={s.noteBox}>
                  <Ionicons name="chatbubble-outline" size={12} color="#92400e" />
                  <Text style={s.noteTxt}>{item.employer_note}</Text>
                </View>
              ) : null}

              {/* Full CV — expanded */}
              {isOpen && <CVPanel cv={cv} />}

              {/* Action button */}
              <TouchableOpacity style={s.actionBtn} onPress={() => { setSelected(item); setNote(item.employer_note || ''); }}>
                <Ionicons name="create-outline" size={15} color={C.primary} />
                <Text style={s.actionBtnTxt}>Update Status</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60, gap: 12 }}>
            <Ionicons name="people-outline" size={48} color={C.border} />
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>No applicants yet.</Text>
          </View>
        }
      />

      {/* Status update modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setSelected(null)} />
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Update: {selected?.applicant?.username}</Text>
          <Text style={s.modalLabel}>Note to applicant (optional)</Text>
          <TextInput
            style={s.modalInput} value={note} onChangeText={setNote}
            placeholder="e.g. We will contact you for an interview..."
            multiline numberOfLines={3} placeholderTextColor={C.textSub}
          />
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.reviewBtn} disabled={acting} onPress={() => handleAction(selected.id, 'reviewed')}>
              <Text style={s.reviewBtnTxt}>Reviewed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.acceptBtn} disabled={acting} onPress={() => handleAction(selected.id, 'accepted')}>
              {acting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.acceptBtnTxt}>Accept</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.rejectBtn} disabled={acting} onPress={() => handleAction(selected.id, 'rejected')}>
              <Text style={s.rejectBtnTxt}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  summary:       { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  summaryItem:   { flex: 1, alignItems: 'center', paddingVertical: 12 },
  summaryNum:    { fontSize: 20, fontWeight: '800' },
  summaryLabel:  { fontSize: 11, color: C.textSub, fontWeight: '700' },
  card:          { ...S.card, marginBottom: 14 },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar:        { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:     { fontSize: 20, fontWeight: '800', color: C.primary },
  name:          { fontSize: 15, fontWeight: '800', color: C.text },
  email:         { fontSize: 12, color: C.textSub, fontWeight: '600', marginTop: 1 },
  loc:           { fontSize: 11, color: C.textSub, fontWeight: '600', marginTop: 1 },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText:     { fontSize: 10, fontWeight: '800' },
  coverBox:      { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  coverLabel:    { fontSize: 11, fontWeight: '800', color: '#15803d', marginBottom: 4 },
  coverTxt:      { fontSize: 13, color: C.text, lineHeight: 18, fontWeight: '500' },
  noteBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginBottom: 10 },
  noteTxt:       { flex: 1, fontSize: 12, color: '#92400e', fontWeight: '600' },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primaryLight, padding: 11, borderRadius: 10, marginTop: 10 },
  actionBtnTxt:  { color: C.primary, fontWeight: '800', fontSize: 13 },
  // CV Panel
  noCv:          { fontSize: 13, color: C.textSub, fontStyle: 'italic', padding: 8 },
  hero:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 10 },
  heroPhoto:     { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: C.primary },
  heroPhotoBox:  { width: 60, height: 60, borderRadius: 30, backgroundColor: C.white, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  heroName:      { fontSize: 16, fontWeight: '800', color: C.text },
  heroRole:      { fontSize: 13, color: C.primary, fontWeight: '700', marginTop: 2 },
  heroSpec:      { fontSize: 12, color: C.textSub, fontWeight: '600', marginTop: 1 },
  heroLoc:       { fontSize: 11, color: C.textSub, fontWeight: '600', marginTop: 2 },
  objectiveBox:  { backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  objectiveLabel:{ fontSize: 11, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  objectiveTxt:  { fontSize: 13, color: C.text, lineHeight: 19, fontWeight: '500' },
  sec:           { backgroundColor: C.white, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(124,58,237,0.08)' },
  secHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingLeft: 8, borderLeftWidth: 3 },
  secTitle:      { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel:     { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue:     { fontSize: 13, color: C.text, fontWeight: '700', marginTop: 1 },
  badgeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  subLabel:      { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4, marginBottom: 6 },
  entryBox:      { backgroundColor: C.bg, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  entryTitle:    { fontSize: 14, fontWeight: '800', color: C.text },
  entrySubtitle: { fontSize: 13, color: C.primary, fontWeight: '700', marginTop: 2 },
  entryMeta:     { fontSize: 12, color: C.textSub, fontWeight: '600', marginTop: 2 },
  entryMetaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  entryMetaTag:  { fontSize: 11, color: C.textSub, fontWeight: '700', backgroundColor: C.white, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  entryDuties:   { fontSize: 12, color: C.text, lineHeight: 18, marginTop: 6, fontWeight: '500' },
  docRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  docLabel:      { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.3 },
  docFile:       { fontSize: 12, color: C.primary, fontWeight: '600', marginTop: 1 },
  viewBtn:       { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  viewBtnTxt:    { fontSize: 12, color: C.primary, fontWeight: '800' },
  docThumb:      { width: '100%', height: 120, borderRadius: 8, marginTop: 6, backgroundColor: C.bg },
  imgModalBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  imgModalImg:   { width: '95%', height: '80%', borderRadius: 12 },
  imgModalHint:  { color: 'rgba(255,255,255,0.6)', marginTop: 12, fontSize: 13 },
  // Modal
  modalBg:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:    { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalHandle:   { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle:    { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 16 },
  modalLabel:    { fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6 },
  modalInput:    { backgroundColor: C.bg, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalBtns:     { flexDirection: 'row', gap: 10 },
  reviewBtn:     { flex: 1, backgroundColor: '#dbeafe', borderRadius: 10, padding: 13, alignItems: 'center' },
  reviewBtnTxt:  { color: '#2563eb', fontWeight: '800', fontSize: 13 },
  acceptBtn:     { flex: 1, backgroundColor: '#16a34a', borderRadius: 10, padding: 13, alignItems: 'center' },
  acceptBtnTxt:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  rejectBtn:     { flex: 1, backgroundColor: '#ef4444', borderRadius: 10, padding: 13, alignItems: 'center' },
  rejectBtnTxt:  { color: '#fff', fontWeight: '800', fontSize: 13 },
});
