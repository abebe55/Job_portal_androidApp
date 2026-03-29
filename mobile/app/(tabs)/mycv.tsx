import { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Animated, TextInput, Linking, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getCV, updateCV } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { C, S } from '../../constants/theme';

const BASE = 'http://127.0.0.1:8000';

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ visible, type, message }: { visible: boolean; type: 'success' | 'error'; message: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[ts.wrap, type === 'success' ? ts.success : ts.error, { opacity }]}>
      <Ionicons name={type === 'success' ? 'checkmark-circle' : 'close-circle'} size={20} color="#fff" />
      <Text style={ts.txt}>{message}</Text>
    </Animated.View>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={ir.row}>
      <Ionicons name={icon as any} size={15} color={C.primary} style={ir.icon} />
      <View style={{ flex: 1 }}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value}</Text>
      </View>
    </View>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function Card({ title, icon, color = C.primary, children }: any) {
  return (
    <View style={cd.wrap}>
      <View style={[cd.header, { borderLeftColor: color }]}>
        <Ionicons name={icon} size={15} color={color} />
        <Text style={[cd.title, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Skill Badge ───────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[bd.wrap, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[bd.txt, { color }]}>{label}</Text>
    </View>
  );
}

// ── Document Row ──────────────────────────────────────────────────────────────
function DocRow({ label, value }: { label: string; value: string }) {
  const [imgModal, setImgModal] = useState(false);
  const filename = value.split('/').pop() || label;
  // Build full URL — value may be a relative path like /media/cv/...
  const fullUrl = value.startsWith('http') ? value : `${BASE}${value.startsWith('/') ? '' : '/'}${value}`;
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Ionicons name={isImage ? 'image-outline' : 'document-attach-outline'} size={15} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
          <Text style={{ fontSize: 12, color: C.textSub, marginTop: 1 }} numberOfLines={1}>{filename}</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
          onPress={() => isImage ? setImgModal(true) : Linking.openURL(fullUrl)}
        >
          <Text style={{ fontSize: 12, color: C.primary, fontWeight: '700' }}>View</Text>
        </TouchableOpacity>
      </View>

      {/* Inline image preview for images */}
      {isImage && (
        <TouchableOpacity onPress={() => setImgModal(true)} activeOpacity={0.85}>
          <Image
            source={{ uri: fullUrl }}
            style={{ width: '100%', height: 140, borderRadius: 10, marginTop: 6, backgroundColor: C.bg }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* Full-screen image modal */}
      {isImage && (
        <Modal visible={imgModal} transparent animationType="fade" onRequestClose={() => setImgModal(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1} onPress={() => setImgModal(false)}>
            <Image source={{ uri: fullUrl }} style={{ width: '95%', height: '80%', borderRadius: 12 }} resizeMode="contain" />
            <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 12, fontSize: 13 }}>Tap anywhere to close</Text>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}


// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MyCVScreen() {
  const router = useRouter();
  const [cv, setCv]           = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editSkill, setEditSkill] = useState(false);
  const [newSkill, setNewSkill]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType]       = useState<'success' | 'error'>('success');
  const [toastMsg, setToastMsg]         = useState('');

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToastType(type); setToastMsg(msg); setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
    setTimeout(() => setToastVisible(false), 3000);
  };

  useEffect(() => {
    getCV()
      .then(res => { setCv(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    setSaving(true);
    try {
      const current = cv.technical_skills ? cv.technical_skills + ', ' + newSkill.trim() : newSkill.trim();
      const form = new FormData();
      form.append('technical_skills', current);
      const res = await updateCV(form);
      setCv(res.data);
      setNewSkill('');
      setEditSkill(false);
      showToast('success', 'Skill added successfully!');
    } catch { showToast('error', 'Failed to add skill.'); }
    setSaving(false);
  };

  if (loading) return (
    <View style={S.page}>
      <PageHeader title="My CV" />
      <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
    </View>
  );

  if (!cv || (!cv.first_name && !cv.full_name)) return (
    <View style={S.page}>
      <PageHeader title="My CV" />
      <View style={st.empty}>
        <Ionicons name="document-text-outline" size={56} color={C.border} />
        <Text style={st.emptyTitle}>No CV Created Yet</Text>
        <Text style={st.emptySub}>Build your CV to start applying for jobs.</Text>
        <TouchableOpacity style={st.buildBtn} onPress={() => router.push('/(tabs)/cv')}>
          <Ionicons name="create-outline" size={17} color="#fff" />
          <Text style={st.buildBtnTxt}>Create My CV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const fullName = [cv.first_name, cv.father_name, cv.grandfather_name].filter(Boolean).join(' ') || cv.full_name;
  const profilePhotoUrl = cv.profile_photo
    ? (cv.profile_photo.startsWith('http') ? cv.profile_photo : `${BASE}${cv.profile_photo.startsWith('/') ? '' : '/'}${cv.profile_photo}`)
    : null;
  const skills = cv.technical_skills ? cv.technical_skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const softSkills = cv.soft_skills ? cv.soft_skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const completeness = [cv.first_name, cv.phone, cv.skill_category, cv.city, cv.education_entries !== '[]'].filter(Boolean).length;
  const completePct = Math.round((completeness / 5) * 100);

  return (
    <View style={S.page}>
      <PageHeader title="My CV" />
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile Hero ── */}
        <View style={st.hero}>
          {profilePhotoUrl
            ? <Image source={{ uri: profilePhotoUrl }} style={st.avatar} />
            : <View style={st.avatarBox}><Ionicons name="person" size={36} color={C.border} /></View>
          }
          <View style={{ flex: 1 }}>
            <Text style={st.heroName}>{fullName}</Text>
            <Text style={st.heroRole}>{cv.skill_title || cv.skill_title_custom || cv.skill_category || 'Job Seeker'}</Text>
            {cv.city ? (
              <View style={st.heroLoc}>
                <Ionicons name="location-outline" size={12} color={C.textSub} />
                <Text style={st.heroLocTxt}>{cv.city}{cv.region ? `, ${cv.region}` : ''}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={st.editBtn} onPress={() => router.push('/(tabs)/cv')}>
            <Ionicons name="create-outline" size={16} color={C.primary} />
            <Text style={st.editBtnTxt}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Completeness ── */}
        <View style={st.progressCard}>
          <View style={st.progressTop}>
            <Text style={st.progressLabel}>CV Completeness</Text>
            <Text style={[st.progressPct, { color: completePct >= 80 ? C.success : completePct >= 50 ? C.warning : C.danger }]}>{completePct}%</Text>
          </View>
          <View style={st.progressBar}>
            <View style={[st.progressFill, { width: `${completePct}%` as any, backgroundColor: completePct >= 80 ? C.success : completePct >= 50 ? C.warning : C.danger }]} />
          </View>
          {completePct < 100 && <Text style={st.progressHint}>Complete your CV to improve your chances of getting hired.</Text>}
        </View>

        {/* ── Contact ── */}
        <Card title="Contact Information" icon="call-outline" color="#16a34a">
          <InfoRow icon="call-outline" label="Phone" value={cv.phone} />
          <InfoRow icon="phone-portrait-outline" label="Alt Phone" value={cv.phone_alt} />
          <InfoRow icon="phone-portrait-outline" label="Alt Phone 2" value={cv.phone_alt2} />
          <InfoRow icon="mail-outline" label="Email" value={cv.email} />
          <InfoRow icon="location-outline" label="Address" value={[cv.city, cv.sub_city, cv.region].filter(Boolean).join(', ')} />
        </Card>

        {/* ── Personal ── */}
        <Card title="Personal Details" icon="person-outline" color="#2563eb">
          <InfoRow icon="male-female-outline" label="Gender" value={cv.gender} />
          <InfoRow icon="heart-outline" label="Marital Status" value={cv.marital_status} />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={cv.date_of_birth} />
          <InfoRow icon="flag-outline" label="Nationality" value={cv.nationality} />
          {cv.full_name_am ? <InfoRow icon="text-outline" label="Amharic Name" value={cv.full_name_am} /> : null}
        </Card>

        {/* ── Address ── */}
        {(cv.woreda || cv.kebele || cv.house_number || cv.sub_city) && (
          <Card title="Address Details" icon="location-outline" color="#d97706">
            <InfoRow icon="map-outline" label="Region" value={cv.region} />
            <InfoRow icon="business-outline" label="City" value={cv.city} />
            <InfoRow icon="navigate-outline" label="Sub-City" value={cv.sub_city} />
            <InfoRow icon="grid-outline" label="Woreda" value={cv.woreda} />
            <InfoRow icon="home-outline" label="Kebele" value={cv.kebele} />
            <InfoRow icon="key-outline" label="House Number" value={cv.house_number} />
          </Card>
        )}

        {/* ── Skill & Profession ── */}
        <Card title="Skill & Profession" icon="star-outline" color="#7c3aed">
          <InfoRow icon="briefcase-outline" label="Skill Category" value={cv.skill_category} />
          <InfoRow icon="ribbon-outline" label="Job Title" value={cv.skill_title || cv.skill_title_custom} />
          <InfoRow icon="school-outline" label="Specialization / Subject" value={cv.skill_specialization} />
          {cv.objective ? (
            <View style={st.objectiveBox}>
              <Text style={st.objectiveLabel}>Professional Summary</Text>
              <Text style={st.objectiveTxt}>{cv.objective}</Text>
            </View>
          ) : null}
        </Card>

        {/* ── Technical Skills ── */}
        <Card title="Skills & Expertise" icon="construct-outline" color="#7c3aed">
          {skills.length > 0 && (
            <>
              <Text style={st.subLabel}>Technical Skills</Text>
              <View style={st.badgeRow}>
                {skills.map((s: string, i: number) => <Badge key={i} label={s} color={C.primary} />)}
              </View>
            </>
          )}
          {softSkills.length > 0 && (
            <>
              <Text style={st.subLabel}>Soft Skills</Text>
              <View style={st.badgeRow}>
                {softSkills.map((s: string, i: number) => <Badge key={i} label={s} color="#16a34a" />)}
              </View>
            </>
          )}
          {cv.computer_skills ? <InfoRow icon="laptop-outline" label="Computer Skills" value={cv.computer_skills} /> : null}

          {/* Add skill */}
          {editSkill ? (
            <View style={st.addSkillRow}>
              <TextInput style={st.addSkillInput} value={newSkill} onChangeText={setNewSkill}
                placeholder="e.g. Python, AutoCAD, Excel..." placeholderTextColor={C.textSub} autoFocus />
              <TouchableOpacity style={st.addSkillSave} onPress={addSkill} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.addSkillSaveTxt}>Add</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={st.addSkillCancel} onPress={() => { setEditSkill(false); setNewSkill(''); }}>
                <Ionicons name="close" size={16} color={C.textSub} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={st.addSkillBtn} onPress={() => setEditSkill(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={st.addSkillBtnTxt}>Add New Skill</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* ── Education ── */}
        {cv.education_entries && cv.education_entries !== '[]' && (() => {
          try {
            const entries = JSON.parse(cv.education_entries);
            if (!entries.length) return null;
            return (
              <Card title="Education" icon="school-outline" color="#2563eb">
                {entries.map((e: any, i: number) => (
                  <View key={i} style={st.eduEntry}>
                    <Text style={st.eduLevel}>{e.level}</Text>
                    {e.field ? <Text style={st.eduField}>{e.field}</Text> : null}
                    {e.institution ? <Text style={st.eduInst}>{e.institution}</Text> : null}
                    <View style={st.eduMeta}>
                      {e.enrollment_type ? <Text style={st.eduMetaTxt}>{e.enrollment_type}</Text> : null}
                      {e.graduation_year ? <Text style={st.eduMetaTxt}>Graduated: {e.graduation_year}</Text> : null}
                      {e.gpa ? <Text style={st.eduMetaTxt}>GPA: {e.gpa}</Text> : null}
                      {e.exit_exam_score ? <Text style={st.eduMetaTxt}>Exit Exam: {e.exit_exam_score}%</Text> : null}
                    </View>
                  </View>
                ))}
              </Card>
            );
          } catch { return null; }
        })()}

        {/* ── Languages ── */}
        <Card title="Languages" icon="language-outline" color="#16a34a">
          <InfoRow icon="chatbubble-outline" label="Amharic" value={cv.amharic_level || 'Native'} />
          <InfoRow icon="chatbubble-outline" label="English" value={cv.english_level} />
          {cv.other_languages ? <InfoRow icon="globe-outline" label="Other Languages" value={cv.other_languages} /> : null}
        </Card>

        {/* ── Experience ── */}
        <Card title="Work Experience" icon="briefcase-outline" color="#d97706">
          <InfoRow icon="checkmark-circle-outline" label="Has Experience" value={cv.has_experience ? 'Yes' : 'No'} />
          {cv.has_experience && (() => {
            try {
              const entries = cv.experience_entries ? JSON.parse(cv.experience_entries) : [];
              if (entries.length > 0) return (
                <>
                  <InfoRow icon="time-outline" label="Total Years" value={cv.experience_years ? `${cv.experience_years} year(s)` : undefined} />
                  {entries.map((e: any, i: number) => (
                    <View key={i} style={st.eduEntry}>
                      <Text style={st.eduLevel}>{e.job_title}</Text>
                      {e.company ? <Text style={st.eduField}>{e.company}{e.location ? ` — ${e.location}` : ''}</Text> : null}
                      <View style={st.eduMeta}>
                        {e.start_date ? <Text style={st.eduMetaTxt}>{e.start_date} — {e.is_current ? 'Present' : e.end_date}</Text> : null}
                      </View>
                      {e.duties ? <Text style={st.expDetail}>{e.duties}</Text> : null}
                    </View>
                  ))}
                </>
              );
            } catch {}
            // fallback to legacy text
            if (cv.experience_detail) return (
              <>
                <InfoRow icon="time-outline" label="Years of Experience" value={cv.experience_years ? `${cv.experience_years} year(s)` : undefined} />
                <Text style={st.expDetail}>{cv.experience_detail}</Text>
              </>
            );
            return null;
          })()}
        </Card>

        {/* ── Driving License ── */}
        {(cv.driving_license || cv.driving_license_type) && (
          <Card title="Driving License" icon="car-outline" color="#16a34a">
            <InfoRow icon="checkmark-circle-outline" label="Has License" value={cv.driving_license ? 'Yes' : 'No'} />
            <InfoRow icon="ribbon-outline" label="License Type" value={cv.driving_license_type} />
          </Card>
        )}

        {/* ── References ── */}
        {(cv.reference_1 || cv.reference_2) && (
          <Card title="References" icon="people-outline" color="#6b7280">
            <InfoRow icon="person-outline" label="Reference 1" value={cv.reference_1} />
            <InfoRow icon="person-outline" label="Reference 2" value={cv.reference_2} />
          </Card>
        )}

        {/* ── Documents ── */}
        <Card title="Uploaded Documents" icon="documents-outline" color="#7c3aed">
          {(cv.degree_certificate || cv.transcript_file || cv.exit_exam_file || cv.tvet_certificate ||
            cv.experience_letter || cv.recommendation_letter || cv.national_id || cv.other_document) ? (
            <>
              {cv.degree_certificate    && <DocRow label="Degree / Diploma Certificate" value={cv.degree_certificate} />}
              {cv.transcript_file       && <DocRow label="Official Transcript" value={cv.transcript_file} />}
              {cv.exit_exam_file        && <DocRow label="Exit Exam Result" value={cv.exit_exam_file} />}
              {cv.tvet_certificate      && <DocRow label="TVET Certificate / COC" value={cv.tvet_certificate} />}
              {cv.experience_letter     && <DocRow label="Experience Letter" value={cv.experience_letter} />}
              {cv.recommendation_letter && <DocRow label="Recommendation Letter" value={cv.recommendation_letter} />}
              {cv.national_id           && <DocRow label="National ID" value={cv.national_id} />}
              {cv.other_document        && <DocRow label={cv.other_document_label || 'Other Document'} value={cv.other_document} />}
            </>
          ) : (
            <Text style={{ fontSize: 13, color: C.textSub, fontStyle: 'italic', paddingVertical: 6 }}>No documents uploaded yet. Go to Create CV to upload your documents.</Text>
          )}
        </Card>

        {/* ── Update CTA ── */}
        <TouchableOpacity style={st.updateBtn} onPress={() => router.push('/(tabs)/cv')}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={st.updateBtnTxt}>Update My CV</Text>
        </TouchableOpacity>

      </ScrollView>
      <Toast visible={toastVisible} type={toastType} message={toastMsg} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  scroll:        { paddingHorizontal: 60, paddingTop: 14, paddingBottom: 48 },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: C.text },
  emptySub:      { fontSize: 14, color: C.textSub, textAlign: 'center' },
  buildBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, marginTop: 8 },
  buildBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  hero:          { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)', shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  avatar:        { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: C.primary },
  avatarBox:     { width: 72, height: 72, borderRadius: 36, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  heroName:      { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 2 },
  heroRole:      { fontSize: 13, color: C.primary, fontWeight: '600', marginBottom: 4 },
  heroLoc:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroLocTxt:    { fontSize: 12, color: C.textSub },
  editBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  editBtnTxt:    { color: C.primary, fontWeight: '700', fontSize: 13 },
  progressCard:  { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  progressTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  progressPct:   { fontSize: 14, fontWeight: '800' },
  progressBar:   { height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill:  { height: 8, borderRadius: 4 },
  progressHint:  { fontSize: 11, color: C.textSub },
  badgeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  subLabel:      { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 6 },
  addSkillRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addSkillInput: { flex: 1, backgroundColor: C.bg, borderRadius: 9, padding: 10, fontSize: 13, color: C.text, borderWidth: 1, borderColor: C.border },
  addSkillSave:  { backgroundColor: C.primary, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10 },
  addSkillSaveTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addSkillCancel:{ padding: 8 },
  addSkillBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 8 },
  addSkillBtnTxt:{ color: C.primary, fontWeight: '700', fontSize: 13 },
  eduEntry:      { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10, marginBottom: 10 },
  eduLevel:      { fontSize: 14, fontWeight: '700', color: C.text },
  eduField:      { fontSize: 13, color: C.primary, fontWeight: '600', marginTop: 2 },
  eduInst:       { fontSize: 12, color: C.textSub, marginTop: 2 },
  eduMeta:       { flexDirection: 'row', gap: 12, marginTop: 4 },
  eduMetaTxt:    { fontSize: 11, color: C.textSub, fontWeight: '600' },
  expDetail:     { fontSize: 13, color: C.text, lineHeight: 20, marginTop: 8 },
  objectiveBox:  { backgroundColor: C.bg, borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: C.border },
  objectiveLabel:{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  objectiveTxt:  { fontSize: 13, color: C.text, lineHeight: 20 },
  updateBtn:     { backgroundColor: C.primary, borderRadius: 13, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  updateBtnTxt:  { color: '#fff', fontSize: 15, fontWeight: '800' },
});

const ir = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border },
  icon:  { marginTop: 2 },
  label: { fontSize: 11, color: C.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { fontSize: 14, color: C.text, fontWeight: '700', marginTop: 1 },
});

const cd = StyleSheet.create({
  wrap:   { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: 'rgba(124,58,237,0.07)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12, paddingLeft: 8, borderLeftWidth: 3 },
  title:  { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});

const bd = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  txt:  { fontSize: 12, fontWeight: '700' },
});

const ts = StyleSheet.create({
  wrap:    { position: 'absolute', bottom: 24, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 10, zIndex: 999 },
  success: { backgroundColor: '#16a34a' },
  error:   { backgroundColor: '#dc2626' },
  txt:     { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
});
