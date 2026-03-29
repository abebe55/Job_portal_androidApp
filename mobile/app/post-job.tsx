import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createJob } from '../services/api';
import PageHeader from '../components/PageHeader';
import { C } from '../constants/theme';

// ── Options ───────────────────────────────────────────────────────────────────
const SKILL_LEVELS = [
  { key: 'entry',  label: 'Entry Level',  desc: '0–2 yrs' },
  { key: 'mid',    label: 'Mid Level',    desc: '2–5 yrs' },
  { key: 'senior', label: 'Senior Level', desc: '5+ yrs' },
];

const JOB_TYPES = [
  { key: 'fulltime',   label: 'Full Time',   icon: 'briefcase-outline' },
  { key: 'parttime',   label: 'Part Time',   icon: 'time-outline' },
  { key: 'contract',   label: 'Contract',    icon: 'document-text-outline' },
  { key: 'internship', label: 'Internship',  icon: 'school-outline' },
];

const SKILL_TYPES = [
  'Sales & Marketing', 'IT & Technology', 'Design & Creative',
  'Teaching & Training', 'Finance & Accounting', 'Healthcare & Medical',
  'Engineering & Construction', 'Admin & Office Work', 'Driving & Transport',
  'Security & Guard', 'Cleaning & Housekeeping', 'Cooking & Food Service',
  'Tailoring & Garment', 'Beauty & Hairdressing', 'Construction & Labor',
  'Agriculture & Farming', 'Legal & Government Affairs', 'Media & Journalism',
  'NGO & Development Work', 'Banking & Insurance', 'Logistics & Supply Chain',
  'Real Estate & Property', 'Tourism & Hospitality', 'Other',
];

const LOCATIONS = [
  'Addis Ababa', 'Dire Dawa', 'Adama (Nazret)', 'Bahir Dar', 'Gondar',
  'Mekelle', 'Hawassa', 'Jimma', 'Dessie', 'Bishoftu (Debre Zeit)',
  'Shashamane', 'Arba Minch', 'Harar', 'Dilla', 'Nekemte',
  'Oromia Region', 'Amhara Region', 'Tigray Region', 'SNNPR',
  'Somali Region', 'Afar Region', 'Benishangul-Gumuz', 'Gambela',
  'Sidama Region', 'Remote / Work from Home', 'Other',
];

const GENDER_OPTIONS = ['Any', 'Male', 'Female'];
const EXPERIENCE_OPTIONS = ['No Experience Required', 'Less than 1 year', '1 year', '2 years', '3 years', '4 years', '5+ years', '10+ years'];
const VACANCY_OPTIONS = ['1', '2', '3', '4', '5', '6–10', '10–20', '20+'];
const SALARY_TYPES = ['Fixed', 'Negotiable', 'Range'];

const WORK_MODES = [
  { key: 'onsite',       label: 'On-site',         icon: 'business-outline' },
  { key: 'remote',       label: 'Remote',           icon: 'wifi-outline' },
  { key: 'hybrid',       label: 'Hybrid',           icon: 'git-merge-outline' },
  { key: 'onsite_night', label: 'On-site (Night)',  icon: 'moon-outline' },
  { key: 'field',        label: 'Field Work',       icon: 'map-outline' },
  { key: 'travel',       label: 'Travel Required',  icon: 'airplane-outline' },
];

// ── Reusable Dropdown ─────────────────────────────────────────────────────────
function Dropdown({ label, value, options, onChange, placeholder, required }: {
  label: string; value: string; options: string[];
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}{required ? <Text style={{ color: C.danger }}> *</Text> : ''}</Text>
      </View>
      <TouchableOpacity style={s.dropBtn} onPress={() => setOpen(true)}>
        <Text style={[s.dropTxt, !value && { color: C.textSub }]} numberOfLines={1}>
          {value || placeholder || 'Select...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.textSub} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={s.modalSheet}>
          <Text style={s.modalTitle}>{label}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map(o => (
              <TouchableOpacity key={o} style={[s.modalItem, value === o && s.modalItemActive]}
                onPress={() => { onChange(o); setOpen(false); }}>
                <Text style={[s.modalItemTxt, value === o && s.modalItemActiveTxt]}>{o}</Text>
                {value === o && <Ionicons name="checkmark" size={15} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}{required ? <Text style={{ color: C.danger }}> *</Text> : ''}</Text>
      {children}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PostJobScreen() {
  const [form, setForm] = useState({
    title: '', title_am: '',
    description: '', description_am: '',
    location: '', industry: '',
    skill_type: '', skill_type_other: '',
    company_name: '',
    skill_level: 'entry', job_type: 'fulltime', work_mode: 'onsite',
    salary: '', salary_type: 'Fixed', salary_max: '',
    deadline: '',
    requirements: '',
    gender_preference: 'Any',
    experience_required: 'No Experience Required',
    vacancies: '1',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const router = useRouter();

  const set = (key: string, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Job title is required.'); return; }
    if (!form.description.trim()) { setError('Job description is required.'); return; }
    if (!form.location) { setError('Please select a location.'); return; }
    if (!form.skill_type) { setError('Please select a skill type.'); return; }
    if (form.skill_type === 'Other' && !form.skill_type_other.trim()) {
      setError('Please specify the skill type.'); return;
    }
    if (!form.company_name.trim()) { setError('Please enter your company or work area name.'); return; }

    setSaving(true);
    try {
      // Resolve final industry/skill value
      const resolvedSkillType = form.skill_type === 'Other'
        ? form.skill_type_other.trim()
        : form.skill_type;

      // Build salary string
      let salaryStr = '';
      if (form.salary_type === 'Negotiable') {
        salaryStr = 'Negotiable';
      } else if (form.salary_type === 'Range' && form.salary && form.salary_max) {
        salaryStr = `${form.salary}–${form.salary_max}`;
      } else if (form.salary) {
        salaryStr = form.salary;
      }

      // Build description with extra fields appended
      let fullDesc = form.description.trim();
      if (form.company_name.trim()) fullDesc = `Company / Work Area: ${form.company_name.trim()}\n\n` + fullDesc;
      if (form.requirements.trim()) fullDesc += `\n\nRequirements:\n${form.requirements.trim()}`;
      if (form.work_mode !== 'onsite') fullDesc += `\n\nWork Mode: ${WORK_MODES.find(w => w.key === form.work_mode)?.label || form.work_mode}`;
      if (form.gender_preference !== 'Any') fullDesc += `\n\nGender Preference: ${form.gender_preference}`;
      if (form.experience_required !== 'No Experience Required') fullDesc += `\n\nExperience Required: ${form.experience_required}`;
      if (form.vacancies !== '1') fullDesc += `\n\nNumber of Vacancies: ${form.vacancies}`;

      await createJob({
        title: form.title.trim(),
        title_am: form.title_am.trim(),
        description: fullDesc,
        description_am: form.description_am.trim(),
        location: form.location,
        industry: resolvedSkillType,
        skill_level: form.skill_level,
        job_type: form.job_type,
        salary: salaryStr,
        deadline: form.deadline || null,
      });
      router.replace('/my-jobs');
    } catch (e: any) {
      const d = e?.response?.data;
      setError(d?.detail || (typeof d === 'object' ? JSON.stringify(d) : null) || 'Failed to submit. Please try again.');
    }
    setSaving(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <PageHeader title="Post a Job" showBack />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
          <Text style={s.infoText}>
            Your job will be reviewed by admin. Once approved, you'll receive the posting fee. After payment, your job goes live to job seekers.
          </Text>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Section 1: Job Identity ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="briefcase-outline" size={14} color={C.primary} />
            <Text style={s.sectionTitle}>Job Identity</Text>
          </View>

          <Field label="Job Title" required>
            <TextInput style={s.input} value={form.title}
              onChangeText={v => set('title', v)} placeholder="e.g. Senior Software Developer"
              placeholderTextColor={C.textSub} />
          </Field>

          <Field label="Job Title in Amharic (Optional)">
            <TextInput style={s.input} value={form.title_am}
              onChangeText={v => set('title_am', v)} placeholder="e.g. ሲኒየር ሶፍትዌር ዲቨሎፐር"
              placeholderTextColor={C.textSub} />
          </Field>

          <Dropdown label="Skill Type" required value={form.skill_type}
            options={SKILL_TYPES} onChange={v => set('skill_type', v)}
            placeholder="Select skill type..." />

          {form.skill_type === 'Other' && (
            <Field label="Specify Skill Type" required>
              <TextInput style={s.input} value={form.skill_type_other}
                onChangeText={v => set('skill_type_other', v)}
                placeholder="e.g. Welding, Pottery, Shoe Making..."
                placeholderTextColor={C.textSub} />
            </Field>
          )}

          <Field label="Company / Organization / Work Area" required>
            <TextInput style={s.input} value={form.company_name}
              onChangeText={v => set('company_name', v)}
              placeholder="e.g. Ethio Telecom, ABC Trading PLC, Self-employed..."
              placeholderTextColor={C.textSub} />
          </Field>

          <Dropdown label="Location" required value={form.location}
            options={LOCATIONS} onChange={v => set('location', v)}
            placeholder="Select city or region..." />
        </View>

        {/* ── Section 2: Job Type & Level ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="options-outline" size={14} color={C.primary} />
            <Text style={s.sectionTitle}>Job Type & Level</Text>
          </View>

          <Text style={s.label}>Job Type <Text style={{ color: C.danger }}>*</Text></Text>
          <View style={s.chipGrid}>
            {JOB_TYPES.map(t => (
              <TouchableOpacity key={t.key}
                style={[s.typeCard, form.job_type === t.key && s.typeCardActive]}
                onPress={() => set('job_type', t.key)}>
                <Ionicons name={t.icon as any} size={18}
                  color={form.job_type === t.key ? C.primary : C.textSub} />
                <Text style={[s.typeCardTxt, form.job_type === t.key && s.typeCardTxtActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.label, { marginTop: 14 }]}>Work Mode <Text style={{ color: C.danger }}>*</Text></Text>
          <View style={s.chipGrid}>
            {WORK_MODES.map(w => (
              <TouchableOpacity key={w.key}
                style={[s.typeCard, form.work_mode === w.key && s.typeCardActive]}
                onPress={() => set('work_mode', w.key)}>
                <Ionicons name={w.icon as any} size={18}
                  color={form.work_mode === w.key ? C.primary : C.textSub} />
                <Text style={[s.typeCardTxt, form.work_mode === w.key && s.typeCardTxtActive]}>
                  {w.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.label, { marginTop: 14 }]}>Skill Level <Text style={{ color: C.danger }}>*</Text></Text>
          <View style={s.levelRow}>
            {SKILL_LEVELS.map(l => (
              <TouchableOpacity key={l.key}
                style={[s.levelCard, form.skill_level === l.key && s.levelCardActive]}
                onPress={() => set('skill_level', l.key)}>
                <Text style={[s.levelCardTitle, form.skill_level === l.key && { color: '#fff' }]}>
                  {l.label}
                </Text>
                <Text style={[s.levelCardDesc, form.skill_level === l.key && { color: 'rgba(255,255,255,0.8)' }]}>
                  {l.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Dropdown label="Experience Required" value={form.experience_required}
            options={EXPERIENCE_OPTIONS} onChange={v => set('experience_required', v)} />

          <Dropdown label="Number of Vacancies (How many people to hire)" value={form.vacancies}
            options={VACANCY_OPTIONS} onChange={v => set('vacancies', v)} />

          <Dropdown label="Gender Preference" value={form.gender_preference}
            options={GENDER_OPTIONS} onChange={v => set('gender_preference', v)} />
        </View>

        {/* ── Section 3: Description ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="document-text-outline" size={14} color={C.primary} />
            <Text style={s.sectionTitle}>Description & Requirements</Text>
          </View>

          <Field label="Job Description" required>
            <TextInput style={[s.input, s.multiline]} value={form.description}
              onChangeText={v => set('description', v)}
              placeholder="Describe the role, responsibilities, and what the candidate will do day-to-day..."
              placeholderTextColor={C.textSub} multiline numberOfLines={5}
              textAlignVertical="top" />
          </Field>

          <Field label="Requirements & Qualifications">
            <TextInput style={[s.input, s.multiline]} value={form.requirements}
              onChangeText={v => set('requirements', v)}
              placeholder="List required skills, education, certifications, or qualifications..."
              placeholderTextColor={C.textSub} multiline numberOfLines={4}
              textAlignVertical="top" />
          </Field>

          <Field label="Job Description in Amharic (Optional)">
            <TextInput style={[s.input, s.multiline]} value={form.description_am}
              onChangeText={v => set('description_am', v)}
              placeholder="የስራ መግለጫ በአማርኛ..."
              placeholderTextColor={C.textSub} multiline numberOfLines={3}
              textAlignVertical="top" />
          </Field>
        </View>

        {/* ── Section 4: Compensation ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="cash-outline" size={14} color={C.primary} />
            <Text style={s.sectionTitle}>Compensation & Deadline</Text>
          </View>

          <Text style={s.label}>Salary Type</Text>
          <View style={s.chipRow}>
            {SALARY_TYPES.map(t => (
              <TouchableOpacity key={t}
                style={[s.chip, form.salary_type === t && s.chipActive]}
                onPress={() => set('salary_type', t)}>
                <Text style={[s.chipTxt, form.salary_type === t && s.chipTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.salary_type !== 'Negotiable' && (
            <View style={[s.fieldWrap, { marginTop: 12 }]}>
              {form.salary_type === 'Range' ? (
                <View style={s.salaryRangeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Min Salary (ETB)</Text>
                    <TextInput style={s.input} value={form.salary}
                      onChangeText={v => set('salary', v)}
                      placeholder="e.g. 5000" placeholderTextColor={C.textSub}
                      keyboardType="numeric" />
                  </View>
                  <Text style={s.rangeSep}>–</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Max Salary (ETB)</Text>
                    <TextInput style={s.input} value={form.salary_max}
                      onChangeText={v => set('salary_max', v)}
                      placeholder="e.g. 10000" placeholderTextColor={C.textSub}
                      keyboardType="numeric" />
                  </View>
                </View>
              ) : (
                <>
                  <Text style={s.label}>Salary (ETB)</Text>
                  <TextInput style={s.input} value={form.salary}
                    onChangeText={v => set('salary', v)}
                    placeholder="e.g. 8000" placeholderTextColor={C.textSub}
                    keyboardType="numeric" />
                </>
              )}
            </View>
          )}

          <Field label="Application Deadline">
            <TextInput style={s.input} value={form.deadline}
              onChangeText={v => set('deadline', v)}
              placeholder="YYYY-MM-DD  (e.g. 2025-06-30)"
              placeholderTextColor={C.textSub} keyboardType="numbers-and-punctuation" />
          </Field>
        </View>

        {/* Submit */}
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={s.submitBtnTxt}>Submit for Review</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={s.footerNote}>
          After submission, admin will review your job and set the posting fee. You will be notified to complete payment before it goes live.
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:       { paddingHorizontal: 60, paddingTop: 14, paddingBottom: 48 },
  infoBanner:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dbeafe', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText:     { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 19 },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#fecaca' },
  errorText:    { flex: 1, color: C.danger, fontSize: 13 },

  // Section
  section:      { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: 'rgba(124,58,237,0.07)' },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.7 },

  // Fields
  fieldWrap:    { marginBottom: 12 },
  labelRow:     { marginBottom: 5 },
  label:        { fontSize: 12, color: C.textSub, fontWeight: '700', marginBottom: 5 },
  input:        { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  multiline:    { minHeight: 90, textAlignVertical: 'top' },

  // Dropdown
  dropBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
  dropTxt:      { fontSize: 14, color: C.text, flex: 1 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:   { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '75%' },
  modalTitle:   { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 12 },
  modalItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  modalItemActive: { backgroundColor: C.primaryLight, marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 8 },
  modalItemTxt: { fontSize: 14, color: C.text, fontWeight: '500' },
  modalItemActiveTxt: { color: C.primary, fontWeight: '700' },

  // Job type cards
  chipGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  typeCard:     { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  typeCardActive: { backgroundColor: '#f0eeff', borderColor: C.primary },
  typeCardTxt:  { fontSize: 13, fontWeight: '600', color: C.textSub },
  typeCardTxtActive: { color: C.primary, fontWeight: '800' },

  // Skill level cards
  levelRow:     { flexDirection: 'row', gap: 8, marginTop: 6 },
  levelCard:    { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, alignItems: 'center' },
  levelCardActive: { backgroundColor: '#f0eeff', borderColor: C.primary },
  levelCardTitle: { fontSize: 12, fontWeight: '700', color: C.text, textAlign: 'center' },
  levelCardDesc:  { fontSize: 10, color: C.textSub, marginTop: 2, textAlign: 'center' },

  // Chips
  chipRow:      { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  chip:         { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  chipActive:   { backgroundColor: '#f0eeff', borderColor: C.primary },
  chipTxt:      { color: C.textSub, fontSize: 13, fontWeight: '600' },
  chipTxtActive:{ color: C.primary, fontWeight: '800' },

  // Salary range
  salaryRangeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rangeSep:     { fontSize: 18, color: C.textSub, fontWeight: '700', paddingBottom: 12 },

  // Submit
  submitBtn:    { backgroundColor: C.primary, borderRadius: 13, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footerNote:   { fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
});
