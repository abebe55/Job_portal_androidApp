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

function Toast({ visible, type, message }: { visible: boolean; type: 'success'|'error'; message: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[ts.wrap, type === 'success' ? ts.success : ts.error, { opacity }]}>
      <Ionicons name={type === 'success' ? 'checkmark-circle' : 'close-circle'} size={18} color="#fff" />
      <Text style={ts.txt}>{message}</Text>
    </Animated.View>
  );
}

// Full-width section card
function Sec({ title, icon, color = C.primary, children }: any) {
  return (
    <View style={[sc.wrap, { borderTopColor: color }]}>
      <View style={sc.head}>
        <Ionicons name={icon} size={15} color={color} />
        <Text style={[sc.title, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// Half-width section card (for 2-col layout)
function HalfSec({ title, icon, color = C.primary, children }: any) {
  return (
    <View style={[hsc.wrap, { borderTopColor: color }]}>
      <View style={hsc.head}>
        <Ionicons name={icon} size={13} color={color} />
        <Text style={[hsc.title, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// Info field: label above, value below
function F({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <Text style={f.value} numberOfLines={3}>{value}</Text>
    </View>
  );
}

// Chip badge
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[ch.wrap, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[ch.txt, { color }]}>{label}</Text>
    </View>
  );
}

// Document row
function DocRow({ label, value }: { label: string; value: string }) {
  const [imgModal, setImgModal] = useState(false);
  const filename = value.split('/').pop() || label;
  const fullUrl = value.startsWith('http') ? value : `${BASE}${value.startsWith('/') ? '' : '/'}${value}`;
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);
  return (
    <>
      <View style={dc.row}>
        <Ionicons name={isImage ? 'image-outline' : 'document-outline'} size={14} color={C.primary} />
        <Text style={dc.label} numberOfLines={1}>{label}</Text>
        <TouchableOpacity onPress={() => isImage ? setImgModal(true) : Linking.openURL(fullUrl)}>
          <Text style={dc.view}>View</Text>
        </TouchableOpacity>
      </View>
      {isImage && (
        <Modal visible={imgModal} transparent animationType="fade" onRequestClose={() => setImgModal(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1} onPress={() => setImgModal(false)}>
            <Image source={{ uri: fullUrl }} style={{ width: '95%', height: '80%', borderRadius: 12 }} resizeMode="contain" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 10, fontSize: 13 }}>Tap to close</Text>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

export default function MyCVScreen() {
  const router = useRouter();
  const [cv, setCv]           = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editSkill, setEditSkill] = useState(false);
  const [newSkill, setNewSkill]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType]       = useState<'success'|'error'>('success');
  const [toastMsg, setToastMsg]         = useState('');

  const showToast = (type: 'success'|'error', msg: string) => {
    setToastType(type); setToastMsg(msg); setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
    setTimeout(() => setToastVisible(false), 3000);
  };

  useEffect(() => {
    getCV().then(r => { setCv(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    setSaving(true);
    try {
      const cur = cv.technical_skills ? cv.technical_skills + ', ' + newSkill.trim() : newSkill.trim();
      const form = new FormData(); form.append('technical_skills', cur);
      const res = await updateCV(form);
      setCv(res.data); setNewSkill(''); setEditSkill(false);
      showToast('success', 'Skill added!');
    } catch { showToast('error', 'Failed.'); }
    setSaving(false);
  };

  if (loading) return <View style={S.page}><PageHeader title="My CV" /><ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} /></View>;

  if (!cv || (!cv.first_name && !cv.full_name)) return (
    <View style={S.page}>
      <PageHeader title="My CV" />
      <View style={st.empty}>
        <Ionicons name="document-text-outline" size={56} color={C.border} />
        <Text style={st.emptyTitle}>No CV Yet</Text>
        <Text style={st.emptySub}>Build your CV to start applying for jobs.</Text>
        <TouchableOpacity style={st.buildBtn} onPress={() => router.push('/(tabs)/cv')}>
          <Ionicons name="create-outline" size={17} color="#fff" />
          <Text style={st.buildBtnTxt}>Create My CV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const fullName = [cv.first_name, cv.father_name, cv.grandfather_name].filter(Boolean).join(' ') || cv.full_name;
  const photoUrl = cv.profile_photo
    ? (cv.profile_photo.startsWith('http') ? cv.profile_photo : `${BASE}${cv.profile_photo.startsWith('/') ? '' : '/'}${cv.profile_photo}`)
    : null;
  const skills     = cv.technical_skills ? cv.technical_skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const softSkills = cv.soft_skills      ? cv.soft_skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const pct = Math.round(([cv.first_name, cv.phone, cv.skill_category, cv.city, cv.education_entries !== '[]'].filter(Boolean).length / 5) * 100);

  let eduList: any[] = [], expList: any[] = [], langList: any[] = [];
  try { if (cv.education_entries)  eduList  = JSON.parse(cv.education_entries);  } catch {}
  try { if (cv.experience_entries) expList  = JSON.parse(cv.experience_entries); } catch {}
  try { if (cv.other_languages)    langList = JSON.parse(cv.other_languages);    } catch {}

  const LANG_COLOR: any = { 'Native':'#16a34a','Excellent':'#2563eb','Very Good':'#7c3aed','Good':'#d97706','Fair':'#6b7280','Basic':'#9ca3af' };

  return (
    <View style={[S.page, { backgroundColor: '#f3f4f6' }]}>
      <PageHeader title="My CV" />
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={st.hero}>
          {photoUrl
            ? <Image source={{ uri: photoUrl }} style={st.avatar} />
            : <View style={st.avatarBox}><Ionicons name="person" size={34} color={C.border} /></View>
          }
          <View style={{ flex: 1 }}>
            <Text style={st.heroName}>{fullName}</Text>
            <Text style={st.heroRole}>{cv.skill_title || cv.skill_title_custom || cv.skill_category || 'Job Seeker'}</Text>
            {cv.city ? <Text style={st.heroMeta}><Ionicons name="location-outline" size={13} color={C.textSub} /> {cv.city}{cv.region ? `, ${cv.region}` : ''}</Text> : null}
            {cv.phone ? <Text style={st.heroMeta}><Ionicons name="call-outline" size={13} color={C.textSub} /> {cv.phone}</Text> : null}
            {cv.email ? <Text style={st.heroMeta}><Ionicons name="mail-outline" size={13} color={C.textSub} /> {cv.email}</Text> : null}
          </View>
          <TouchableOpacity style={st.editBtn} onPress={() => router.push('/(tabs)/cv')}>
            <Ionicons name="create-outline" size={16} color={C.primary} />
            <Text style={st.editBtnTxt}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Progress ── */}
        <View style={st.progCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={st.progLabel}>CV Completeness</Text>
            <Text style={[st.progPct, { color: pct >= 80 ? C.success : pct >= 50 ? '#d97706' : C.danger }]}>{pct}%</Text>
          </View>
          <View style={st.progBar}>
            <View style={[st.progFill, { width: `${pct}%` as any, backgroundColor: pct >= 80 ? C.success : pct >= 50 ? '#d97706' : C.danger }]} />
          </View>
          {pct < 100 && <Text style={st.progHint}>Add more details to improve your chances of getting hired.</Text>}
        </View>

        {/* ── Personal + Contact side by side ── */}
        <View style={st.twoCol}>
          <HalfSec title="Personal" icon="person-outline" color="#2563eb">
            <F label="Gender"      value={cv.gender} />
            <F label="Marital"     value={cv.marital_status} />
            <F label="Date of Birth" value={cv.date_of_birth} />
            <F label="Nationality" value={cv.nationality} />
            {cv.full_name_am ? <F label="Amharic Name" value={cv.full_name_am} /> : null}
            {cv.disability && cv.disability !== 'None' ? <F label="Disability" value={cv.disability} /> : null}
          </HalfSec>
          <HalfSec title="Contact" icon="call-outline" color="#16a34a">
            <F label="Phone"    value={cv.phone} />
            {cv.phone_alt  ? <F label="Alt Phone"  value={cv.phone_alt}  /> : null}
            {cv.phone_alt2 ? <F label="Alt Phone 2" value={cv.phone_alt2} /> : null}
            <F label="Email"   value={cv.email} />
            <F label="City"    value={cv.city} />
            <F label="Region"  value={cv.region} />
            {cv.sub_city ? <F label="Sub-City" value={cv.sub_city} /> : null}
            {cv.woreda   ? <F label="Woreda"   value={cv.woreda}   /> : null}
          </HalfSec>
        </View>

        {/* ── Skill & Profession ── */}
        <Sec title="Skill & Profession" icon="star-outline" color="#7c3aed">
          <View style={st.twoCol}>
            <View style={{ flex: 1 }}>
              <F label="Category"     value={cv.skill_category} />
              <F label="Role / Title" value={cv.skill_title || cv.skill_title_custom} />
            </View>
            <View style={{ flex: 1 }}>
              <F label="Specialization" value={cv.skill_specialization} />
              <F label="Status"         value={cv.employment_status} />
            </View>
          </View>
          {cv.objective ? (
            <View style={st.summaryBox}>
              <Text style={st.summaryLabel}>Professional Summary</Text>
              <Text style={st.summaryTxt}>{cv.objective}</Text>
            </View>
          ) : null}
        </Sec>

        {/* ── Skills ── */}
        {(skills.length > 0 || softSkills.length > 0 || cv.computer_skills) && (
          <Sec title="Skills & Expertise" icon="construct-outline" color="#7c3aed">
            {skills.length > 0 && (
              <><Text style={st.chipLabel}>Technical Skills</Text>
              <View style={st.chipRow}>{skills.map((s: string, i: number) => <Chip key={i} label={s} color={C.primary} />)}</View></>
            )}
            {softSkills.length > 0 && (
              <><Text style={st.chipLabel}>Soft Skills</Text>
              <View style={st.chipRow}>{softSkills.map((s: string, i: number) => <Chip key={i} label={s} color="#16a34a" />)}</View></>
            )}
            {cv.computer_skills ? <><Text style={st.chipLabel}>Computer Skills</Text><Text style={st.plainTxt}>{cv.computer_skills}</Text></> : null}
            {editSkill ? (
              <View style={st.addRow}>
                <TextInput style={st.addInput} value={newSkill} onChangeText={setNewSkill}
                  placeholder="e.g. Python, AutoCAD..." placeholderTextColor={C.textSub} autoFocus />
                <TouchableOpacity style={st.addSave} onPress={addSkill} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.addSaveTxt}>Add</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditSkill(false); setNewSkill(''); }} style={{ padding: 6 }}>
                  <Ionicons name="close" size={16} color={C.textSub} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={st.addSkillBtn} onPress={() => setEditSkill(true)}>
                <Ionicons name="add-circle-outline" size={15} color={C.primary} />
                <Text style={st.addSkillBtnTxt}>Add New Skill</Text>
              </TouchableOpacity>
            )}
          </Sec>
        )}

        {/* ── Education ── */}
        {eduList.length > 0 && (
          <Sec title="Education" icon="school-outline" color="#2563eb">
            {eduList.map((e: any, i: number) => (
              <View key={i} style={[st.entry, i < eduList.length - 1 && st.entryDiv]}>
                <View style={st.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.entryTitle}>{e.level}</Text>
                    {e.field ? <Text style={st.entrySub}>{e.field}</Text> : null}
                    {e.institution ? <Text style={st.entryMeta}>{e.institution}</Text> : null}
                    {e.enrollment_type ? <Text style={st.entryMeta}>{e.enrollment_type}</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    {e.graduation_year ? <F label="Graduated" value={e.graduation_year} /> : null}
                    {e.gpa ? <F label="GPA" value={`${e.gpa} / ${e.gpa_scale || '4.0'}`} /> : null}
                    {e.exit_exam_score ? <F label="Exit Exam" value={`${e.exit_exam_score}%`} /> : null}
                  </View>
                </View>
              </View>
            ))}
          </Sec>
        )}

        {/* ── Languages ── */}
        {langList.length > 0 && (
          <Sec title="Languages" icon="language-outline" color="#16a34a">
            <View style={st.twoCol}>
              {langList.map((lang: any, i: number) => (
                <View key={i} style={st.langCard}>
                  <View style={st.langHead}>
                    <Text style={st.langName}>{lang.name || '—'}</Text>
                    {lang.native && <View style={st.nativePill}><Text style={st.nativeTxt}>Native</Text></View>}
                  </View>
                  {(['reading','writing','speaking','listening'] as const).map(sk => {
                    const val = lang[sk];
                    const col = val ? (LANG_COLOR[val] || '#6b7280') : C.textSub;
                    const ICONS: any = { reading:'📖', writing:'✏️', speaking:'🗣️', listening:'👂' };
                    return (
                      <View key={sk} style={st.langRow}>
                        <Text style={st.langIcon}>{ICONS[sk]}</Text>
                        <Text style={st.langLbl}>{sk.charAt(0).toUpperCase() + sk.slice(1)}</Text>
                        <Text style={[st.langVal, { color: col }]}>{val || '—'}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </Sec>
        )}

        {/* ── Experience ── */}
        {cv.has_experience && expList.length > 0 && (
          <Sec title="Work Experience" icon="briefcase-outline" color="#d97706">
            {cv.experience_years ? <Text style={st.expYears}>Total: {cv.experience_years} year(s)</Text> : null}
            {expList.map((e: any, i: number) => (
              <View key={i} style={[st.entry, i < expList.length - 1 && st.entryDiv]}>
                <View style={st.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.entryTitle}>{e.job_title}</Text>
                    {e.company  ? <Text style={st.entrySub}>{e.company}</Text> : null}
                    {e.location ? <Text style={st.entryMeta}>{e.location}</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    {e.start_date ? <F label="Period" value={`${e.start_date} — ${e.is_current ? 'Present' : e.end_date}`} /> : null}
                  </View>
                </View>
                {e.duties ? <Text style={st.entryDetail}>{e.duties}</Text> : null}
              </View>
            ))}
          </Sec>
        )}

        {/* ── Driving + References side by side ── */}
        {(cv.driving_license || cv.reference_1 || cv.reference_2) && (
          <View style={st.twoCol}>
            {cv.driving_license && (
              <HalfSec title="Driving License" icon="car-outline" color="#16a34a">
                <F label="Has License" value="Yes" />
                {cv.driving_license_type ? <F label="Type" value={cv.driving_license_type} /> : null}
              </HalfSec>
            )}
            {(cv.reference_1 || cv.reference_2) && (
              <HalfSec title="References" icon="people-outline" color="#6b7280">
                {cv.reference_1 ? <F label="Ref 1" value={cv.reference_1} /> : null}
                {cv.reference_2 ? <F label="Ref 2" value={cv.reference_2} /> : null}
              </HalfSec>
            )}
          </View>
        )}

        {/* ── Documents ── */}
        {(cv.degree_certificate || cv.transcript_file || cv.exit_exam_file || cv.tvet_certificate ||
          cv.experience_letter || cv.recommendation_letter || cv.national_id || cv.other_document) && (
          <Sec title="Uploaded Documents" icon="documents-outline" color="#7c3aed">
            <View style={st.twoCol}>
              <View style={{ flex: 1 }}>
                {cv.degree_certificate    && <DocRow label="Degree / Diploma"  value={cv.degree_certificate} />}
                {cv.transcript_file       && <DocRow label="Transcript"         value={cv.transcript_file} />}
                {cv.exit_exam_file        && <DocRow label="Exit Exam"          value={cv.exit_exam_file} />}
                {cv.tvet_certificate      && <DocRow label="TVET / COC"         value={cv.tvet_certificate} />}
              </View>
              <View style={{ flex: 1 }}>
                {cv.experience_letter     && <DocRow label="Experience Letter"  value={cv.experience_letter} />}
                {cv.recommendation_letter && <DocRow label="Recommendation"     value={cv.recommendation_letter} />}
                {cv.national_id           && <DocRow label="National ID"        value={cv.national_id} />}
                {cv.other_document        && <DocRow label={cv.other_document_label || 'Other'} value={cv.other_document} />}
              </View>
            </View>
          </Sec>
        )}

        <TouchableOpacity style={st.updateBtn} onPress={() => router.push('/(tabs)/cv')}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={st.updateBtnTxt}>Update My CV</Text>
        </TouchableOpacity>

      </ScrollView>
      <Toast visible={toastVisible} type={toastType} message={toastMsg} />
    </View>
  );
}

const st = StyleSheet.create({
  scroll:        { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48, backgroundColor: '#f3f4f6' },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle:    { fontSize: 20, fontWeight: '700', color: C.text },
  emptySub:      { fontSize: 15, color: C.textSub, textAlign: 'center' },
  buildBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, marginTop: 8 },
  buildBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  hero:          { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  avatar:        { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: C.primary },
  avatarBox:     { width: 72, height: 72, borderRadius: 36, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  heroName:      { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 2 },
  heroRole:      { fontSize: 14, color: C.primary, fontWeight: '600', marginBottom: 4 },
  heroMeta:      { fontSize: 13, color: C.textSub, marginBottom: 2 },
  editBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  editBtnTxt:    { color: C.primary, fontWeight: '700', fontSize: 13 },
  progCard:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  progLabel:     { fontSize: 14, fontWeight: '700', color: C.text },
  progPct:       { fontSize: 15, fontWeight: '800' },
  progBar:       { height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progFill:      { height: 8, borderRadius: 4 },
  progHint:      { fontSize: 13, color: C.textSub, marginTop: 2 },
  twoCol:        { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  summaryBox:    { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginTop: 10 },
  summaryLabel:  { fontSize: 12, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 },
  summaryTxt:    { fontSize: 14, color: C.text, lineHeight: 21 },
  chipLabel:     { fontSize: 12, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8, marginBottom: 5 },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 },
  plainTxt:      { fontSize: 14, color: C.text, lineHeight: 20, marginBottom: 4 },
  addRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addInput:      { flex: 1, backgroundColor: C.bg, borderRadius: 9, padding: 10, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  addSave:       { backgroundColor: C.primary, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10 },
  addSaveTxt:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  addSkillBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 4 },
  addSkillBtnTxt:{ color: C.primary, fontWeight: '700', fontSize: 14 },
  entry:         { paddingVertical: 10 },
  entryDiv:      { borderBottomWidth: 1, borderBottomColor: C.border },
  entryTitle:    { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  entrySub:      { fontSize: 14, color: C.primary, fontWeight: '600', marginBottom: 2 },
  entryMeta:     { fontSize: 13, color: C.textSub, marginBottom: 1 },
  entryDetail:   { fontSize: 13, color: C.text, lineHeight: 19, marginTop: 6 },
  expYears:      { fontSize: 13, color: C.textSub, fontWeight: '600', marginBottom: 8 },
  // Language cards — 2 per row using twoCol
  langCard:      { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 10 },
  langHead:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  langName:      { fontSize: 15, fontWeight: '800', color: C.text, flex: 1 },
  nativePill:    { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  nativeTxt:     { fontSize: 11, color: '#16a34a', fontWeight: '700' },
  langRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  langIcon:      { fontSize: 13, width: 18 },
  langLbl:       { fontSize: 13, color: C.textSub, fontWeight: '600', flex: 1 },
  langVal:       { fontSize: 13, fontWeight: '700' },
  updateBtn:     { backgroundColor: C.primary, borderRadius: 13, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  updateBtnTxt:  { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// Full-width section card — no border, shadow only
const sc = StyleSheet.create({
  wrap:  { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  head:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  title: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// Half-width section card — no border, shadow only
const hsc = StyleSheet.create({
  wrap:  { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  head:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
});

// Field: label above, value below
const f = StyleSheet.create({
  wrap:  { marginBottom: 10 },
  label: { fontSize: 11, color: C.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  value: { fontSize: 14, color: C.text, fontWeight: '600', lineHeight: 19 },
});

const ch = StyleSheet.create({
  wrap: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  txt:  { fontSize: 13, fontWeight: '700' },
});

const dc = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border + '80' },
  label: { flex: 1, fontSize: 13, color: C.text, fontWeight: '600' },
  view:  { fontSize: 13, color: C.primary, fontWeight: '700' },
});

const ts = StyleSheet.create({
  wrap:    { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, elevation: 10, zIndex: 999 },
  success: { backgroundColor: '#16a34a' },
  error:   { backgroundColor: '#dc2626' },
  txt:     { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
});
