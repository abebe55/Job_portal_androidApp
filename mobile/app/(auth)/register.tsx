import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { C } from '../../constants/theme';
import api from '../../services/api';

// ── Employer types with their required docs ───────────────────────────────────
const EMPLOYER_TYPES = [
  {
    key: 'company',
    label: 'Company / PLC / Corporation',
    icon: 'business-outline',
    color: '#2563eb',
    desc: 'Registered business with legal status',
    docs: ['business_license', 'tin_certificate'],
  },
  {
    key: 'factory',
    label: 'Factory / Manufacturing',
    icon: 'construct-outline',
    color: '#d97706',
    desc: 'Manufacturing or production facility',
    docs: ['business_license', 'registration_cert'],
  },
  {
    key: 'ngo',
    label: 'NGO / Organization',
    icon: 'people-outline',
    color: '#16a34a',
    desc: 'Non-profit, charity or development org',
    docs: ['registration_cert'],
  },
  {
    key: 'shop',
    label: 'Shop / Small Business',
    icon: 'storefront-outline',
    color: '#7c3aed',
    desc: 'Retail shop, café, salon, etc.',
    docs: ['national_id_front', 'national_id_back', 'national_id_number'],
  },
  {
    key: 'individual',
    label: 'Individual / Freelancer',
    icon: 'person-outline',
    color: '#0891b2',
    desc: 'Hiring as an individual person',
    docs: ['national_id_front', 'national_id_back', 'national_id_number'],
  },
  {
    key: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    color: '#6b7280',
    desc: 'Any other type of employer',
    docs: ['national_id_front', 'national_id_back', 'national_id_number'],
  },
];

const DOC_META: Record<string, { label: string; hint: string; type: 'image' | 'file' }> = {
  business_license:  { label: 'Business License',           hint: 'Upload your valid business license (PDF or image)', type: 'file' },
  tin_certificate:   { label: 'TIN Certificate',            hint: 'Tax Identification Number certificate',             type: 'file' },
  registration_cert: { label: 'Registration Certificate',   hint: 'Ministry/authority registration certificate',       type: 'file' },
  national_id_front: { label: 'National ID — Front',        hint: 'Clear photo of the front of your national ID',     type: 'image' },
  national_id_back:  { label: 'National ID — Back',         hint: 'Clear photo of the back of your national ID',      type: 'image' },
  supporting_doc:    { label: 'Supporting Document (Optional)', hint: 'Any additional document to support your application', type: 'file' },
};

// ── Reusable input ────────────────────────────────────────────────────────────
function InputRow({ icon, placeholder, value, onChange, props = {} }: any) {
  return (
    <View style={s.inputWrap}>
      <Ionicons name={icon} size={18} color={C.textSub} style={s.inputIcon} />
      <TextInput style={s.input} placeholder={placeholder} value={value}
        onChangeText={onChange} placeholderTextColor={C.textSub} {...props} />
    </View>
  );
}

// ── File upload button (web uses hidden <input>, native uses pickers) ─────────
function UploadBtn({ docKey, files, setFiles }: { docKey: string; files: any; setFiles: any }) {
  const meta   = DOC_META[docKey];
  const picked = files[docKey];
  const inputRef = useRef<any>(null);

  // ── Validation helpers ──
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const MIN_SIZE = 5 * 1024;         // 5 KB — too small = likely not a real document

  const validateFile = (file: File | { size: number; type: string; name: string }): string | null => {
    if (file.size > MAX_SIZE) return `File too large (max 10 MB). Please compress or resize.`;
    if (file.size < MIN_SIZE) return `File too small — please upload a clear, full-size photo.`;
    if (meta.type === 'image') {
      if (!file.type.startsWith('image/')) return `Please upload an image file (JPG, PNG, etc.).`;
      // Warn if it looks like a screenshot (very wide aspect) — can't fully detect but size helps
    } else {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowed.includes(file.type)) return `Only PDF or image files are accepted.`;
    }
    return null;
  };

  // ── Web: hidden <input type="file"> ──
  const pickWeb = () => {
    if (inputRef.current) inputRef.current.click();
  };

  const onWebChange = (e: any) => {
    const file: File = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { Alert.alert('Invalid file', err); e.target.value = ''; return; }
    const uri = URL.createObjectURL(file);
    setFiles((p: any) => ({ ...p, [docKey]: { uri, name: file.name, type: file.type, file } }));
    e.target.value = ''; // reset so same file can be re-selected
  };

  // ── Native: expo pickers ──
  const pickNative = async () => {
    if (meta.type === 'image') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9,
      });
      if (!r.canceled && r.assets[0]) {
        const asset = r.assets[0];
        const approxSize = asset.fileSize ?? 0;
        if (approxSize > MAX_SIZE) { Alert.alert('File too large', 'Max 10 MB. Please choose a smaller image.'); return; }
        setFiles((p: any) => ({
          ...p,
          [docKey]: { uri: asset.uri, name: asset.fileName || `${docKey}.jpg`, type: 'image/jpeg', file: null },
        }));
      }
    } else {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!r.canceled && r.assets[0]) {
        const asset = r.assets[0];
        if ((asset.size ?? 0) > MAX_SIZE) { Alert.alert('File too large', 'Max 10 MB.'); return; }
        setFiles((p: any) => ({
          ...p,
          [docKey]: { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream', file: null },
        }));
      }
    }
  };

  const handlePick = Platform.OS === 'web' ? pickWeb : pickNative;
  const accept    = meta.type === 'image' ? 'image/*' : 'application/pdf,image/*';

  return (
    <View style={s.uploadWrap}>
      <Text style={s.uploadLabel}>
        {meta.label}
        {docKey !== 'supporting_doc' && <Text style={{ color: C.danger }}> *</Text>}
      </Text>
      <Text style={s.uploadHint}>{meta.hint}</Text>

      {/* Hidden web file input */}
      {Platform.OS === 'web' && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={onWebChange}
        />
      )}

      <TouchableOpacity style={[s.uploadBtn, picked && s.uploadBtnDone]} onPress={handlePick}>
        <Ionicons
          name={picked ? 'checkmark-circle' : 'cloud-upload-outline'}
          size={18} color={picked ? C.success : C.primary}
        />
        <Text style={[s.uploadBtnTxt, picked && { color: C.success }]} numberOfLines={1}>
          {picked ? picked.name : `Tap to upload ${meta.type === 'image' ? 'photo' : 'file'}`}
        </Text>
        {picked && (
          <TouchableOpacity onPress={() => setFiles((p: any) => { const n = { ...p }; delete n[docKey]; return n; })}>
            <Ionicons name="close-circle" size={18} color={C.textSub} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* ID-specific guidance */}
      {(docKey === 'national_id_front' || docKey === 'national_id_back') && (
        <View style={s.idGuide}>
          <Ionicons name="information-circle-outline" size={13} color="#2563eb" />
          <Text style={s.idGuideText}>
            Must be a clear, well-lit photo of your actual Ethiopian National ID card.
            Blurry, cropped, or unrelated images will be rejected by admin.
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();

  // Step: 'role' | 'basic' | 'employer_type' | 'employer_docs'
  const [step, setStep]           = useState<'role' | 'basic' | 'employer_type' | 'employer_docs'>('role');
  const [role, setRole]           = useState<'jobseeker' | 'employer'>('jobseeker');
  const [empType, setEmpType]     = useState('');
  const [empTypeOther, setEmpTypeOther] = useState('');

  const [form, setForm] = useState({
    username: '', email: '', password: '', phone: '', location: '', organization_name: '',
  });
  const [files, setFiles]   = useState<Record<string, any>>({});
  const [nationalIdNo, setNationalIdNo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const selectedType = EMPLOYER_TYPES.find(t => t.key === empType);

  // ── Validation per step ──
  const validateBasic = () => {
    if (!form.username.trim()) return 'Username is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!form.password.trim() || form.password.length < 6) return 'Password must be at least 6 characters.';
    if (!form.phone.trim()) return 'Phone number is required.';
    return '';
  };

  const validateDocs = () => {
    if (!empType) return 'Please select employer type.';
    if (empType === 'other' && !empTypeOther.trim()) return 'Please describe your employer type.';
    const required = selectedType?.docs || [];
    for (const d of required) {
      if (d === 'national_id_number') {
        if (!nationalIdNo.trim()) return 'National ID number is required.';
      } else if (!files[d]) {
        return `${DOC_META[d]?.label} is required.`;
      }
    }
    return '';
  };

  // ── Submit ──
  const handleSubmit = async () => {
    const docErr = validateDocs();
    if (docErr) { setError(docErr); return; }

    setLoading(true);
    setError('');
    try {
      if (role === 'employer') {
        // Employer: multipart/form-data with files
        const fd = new FormData();
        fd.append('username', form.username.trim());
        fd.append('email', form.email.trim());
        fd.append('password', form.password);
        fd.append('phone', form.phone.trim());
        fd.append('location', form.location.trim());
        fd.append('role', 'employer');
        fd.append('employer_type', empType);
        fd.append('employer_type_other', empTypeOther.trim());
        fd.append('organization_name', form.organization_name.trim());
        fd.append('national_id_number', nationalIdNo.trim());
        for (const [k, f] of Object.entries(files)) {
          if (!f) continue;
          if (f.file) {
            // Web: append the actual File object
            fd.append(k, f.file, f.name);
          } else if (f.uri && f.uri.startsWith('blob:')) {
            // Web fallback: fetch blob and convert to File
            try {
              const resp = await fetch(f.uri);
              const blob = await resp.blob();
              fd.append(k, blob, f.name);
            } catch { /* skip */ }
          } else {
            // Native: use RN file object
            fd.append(k, { uri: f.uri, name: f.name, type: f.type } as any);
          }
        }
        await api.post('/auth/register/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Jobseeker: plain JSON, no files
        await api.post('/auth/register/', {
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
          location: form.location.trim(),
          role: 'jobseeker',
        });
      }

      setSuccess(
        role === 'employer'
          ? 'Account created! Your documents are under review. You will be notified once approved.'
          : 'Account created! Redirecting to login...'
      );
      setTimeout(() => router.replace('/(auth)/login'), 2200);
    } catch (e: any) {
      const d = e?.response?.data;
      setError(
        d?.username?.[0] || d?.email?.[0] || d?.password?.[0] ||
        d?.employer_type?.[0] || d?.business_license?.[0] ||
        d?.national_id_front?.[0] || d?.national_id_number?.[0] ||
        d?.detail || d?.non_field_errors?.[0] ||
        e?.message || 'Registration failed. Please try again.'
      );
    }
    setLoading(false);
  };

  // ── STEP: Role selection ──────────────────────────────────────────────────
  if (step === 'role') {
    return (
      <View style={s.page}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.topBanner}>
            <View style={s.logoWrap}><Ionicons name="briefcase" size={32} color="#fff" /></View>
            <Text style={s.appName}>JobPortal</Text>
            <Text style={s.tagline}>Create your account</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>I want to join as</Text>
            <Text style={s.cardSub}>Choose your account type to get started</Text>

            <TouchableOpacity style={[s.roleCard, role === 'jobseeker' && s.roleCardActive]}
              onPress={() => setRole('jobseeker')}>
              <View style={[s.roleIconBox, { background: '#ede9fe' } as any]}>
                <Ionicons name="search-outline" size={26} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.roleCardTitle, role === 'jobseeker' && { color: C.primary }]}>Job Seeker</Text>
                <Text style={s.roleCardDesc}>Find jobs, build your CV, apply to positions</Text>
              </View>
              {role === 'jobseeker' && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
            </TouchableOpacity>

            <TouchableOpacity style={[s.roleCard, role === 'employer' && s.roleCardActive]}
              onPress={() => setRole('employer')}>
              <View style={[s.roleIconBox, { background: '#dbeafe' } as any]}>
                <Ionicons name="business-outline" size={26} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.roleCardTitle, role === 'employer' && { color: '#2563eb' }]}>Employer</Text>
                <Text style={s.roleCardDesc}>Post jobs, find talent, manage applications</Text>
              </View>
              {role === 'employer' && <Ionicons name="checkmark-circle" size={22} color="#2563eb" />}
            </TouchableOpacity>

            {role === 'employer' && (
              <View style={s.empNotice}>
                <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
                <Text style={s.empNoticeText}>
                  Employers must submit verification documents. Your account will be reviewed and activated within 24–48 hours.
                </Text>
              </View>
            )}

            <TouchableOpacity style={s.btn} onPress={() => setStep('basic')}>
              <Text style={s.btnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={s.linkRow} onPress={() => router.back()}>
              <Text style={s.linkText}>Already have an account? </Text>
              <Text style={s.linkBold}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── STEP: Basic info ──────────────────────────────────────────────────────
  if (step === 'basic') {
    return (
      <View style={s.page}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.stepHeader}>
            <TouchableOpacity onPress={() => setStep('role')} style={s.backBtn}>
              <Ionicons name="arrow-back" size={20} color={C.primary} />
            </TouchableOpacity>
            <View style={s.stepIndicator}>
              <View style={[s.stepDot, s.stepDotDone]} /><View style={s.stepLine} />
              <View style={[s.stepDot, s.stepDotActive]} /><View style={s.stepLine} />
              {role === 'employer' && <><View style={s.stepDot} /><View style={s.stepLine} /><View style={s.stepDot} /></>}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Basic Information</Text>
            <Text style={s.cardSub}>Your account credentials</Text>

            {error ? <View style={s.errorBox}><Ionicons name="alert-circle-outline" size={16} color={C.danger} /><Text style={s.errorText}>{error}</Text></View> : null}

            <InputRow icon="person-outline" placeholder="Username *" value={form.username}
              onChange={(v: string) => set('username', v)} props={{ autoCapitalize: 'none', autoCorrect: false }} />
            <InputRow icon="mail-outline" placeholder="Email *" value={form.email}
              onChange={(v: string) => set('email', v)} props={{ keyboardType: 'email-address', autoCapitalize: 'none' }} />
            <InputRow icon="lock-closed-outline" placeholder="Password * (min 6 chars)" value={form.password}
              onChange={(v: string) => set('password', v)} props={{ secureTextEntry: true }} />
            <InputRow icon="call-outline" placeholder="Phone Number *" value={form.phone}
              onChange={(v: string) => set('phone', v)} props={{ keyboardType: 'phone-pad' }} />
            <InputRow icon="location-outline" placeholder="Location (e.g. Addis Ababa)" value={form.location}
              onChange={(v: string) => set('location', v)} />

            <TouchableOpacity style={s.btn} onPress={() => {
              const err = validateBasic();
              if (err) { setError(err); return; }
              setError('');
              if (role === 'employer') setStep('employer_type');
              else handleSubmit();
            }} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Text style={s.btnText}>{role === 'employer' ? 'Next' : 'Create Account'}</Text>
                    <Ionicons name={role === 'employer' ? 'arrow-forward' : 'checkmark'} size={18} color="#fff" /></>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── STEP: Employer type ───────────────────────────────────────────────────
  if (step === 'employer_type') {
    return (
      <View style={s.page}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.stepHeader}>
            <TouchableOpacity onPress={() => setStep('basic')} style={s.backBtn}>
              <Ionicons name="arrow-back" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Employer Type</Text>
            <Text style={s.cardSub}>Select the type that best describes you or your organization</Text>

            {error ? <View style={s.errorBox}><Ionicons name="alert-circle-outline" size={16} color={C.danger} /><Text style={s.errorText}>{error}</Text></View> : null}

            {EMPLOYER_TYPES.map(t => (
              <TouchableOpacity key={t.key}
                style={[s.empTypeCard, empType === t.key && { borderColor: t.color, backgroundColor: t.color + '0d' }]}
                onPress={() => setEmpType(t.key)}>
                <View style={[s.empTypeIcon, { backgroundColor: t.color + '18' }]}>
                  <Ionicons name={t.icon as any} size={22} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.empTypeTitle, empType === t.key && { color: t.color }]}>{t.label}</Text>
                  <Text style={s.empTypeDesc}>{t.desc}</Text>
                </View>
                {empType === t.key && <Ionicons name="checkmark-circle" size={20} color={t.color} />}
              </TouchableOpacity>
            ))}

            {empType === 'other' && (
              <View style={s.inputWrap}>
                <Ionicons name="create-outline" size={18} color={C.textSub} style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Describe your employer type *"
                  value={empTypeOther} onChangeText={setEmpTypeOther} placeholderTextColor={C.textSub} />
              </View>
            )}

            <TouchableOpacity style={[s.btn, !empType && { opacity: 0.5 }]}
              disabled={!empType} onPress={() => {
                if (!empType) { setError('Please select your employer type.'); return; }
                if (empType === 'other' && !empTypeOther.trim()) { setError('Please describe your employer type.'); return; }
                setError('');
                setStep('employer_docs');
              }}>
              <Text style={s.btnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── STEP: Employer docs ───────────────────────────────────────────────────
  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.stepHeader}>
          <TouchableOpacity onPress={() => setStep('employer_type')} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Verification Documents</Text>
          <Text style={s.cardSub}>
            Upload documents to verify your identity as a{' '}
            <Text style={{ fontWeight: '700', color: selectedType?.color }}>{selectedType?.label}</Text>
          </Text>

          <View style={s.docNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#15803d" />
            <Text style={s.docNoticeText}>
              Your documents are encrypted and only reviewed by our admin team. They will not be shared with anyone.
            </Text>
          </View>

          {error ? <View style={s.errorBox}><Ionicons name="alert-circle-outline" size={16} color={C.danger} /><Text style={s.errorText}>{error}</Text></View> : null}
          {success ? <View style={s.successBox}><Ionicons name="checkmark-circle-outline" size={16} color={C.success} /><Text style={s.successText}>{success}</Text></View> : null}

          {/* Organization name */}
          <View style={s.inputWrap}>
            <Ionicons name="business-outline" size={18} color={C.textSub} style={s.inputIcon} />
            <TextInput style={s.input}
              placeholder={empType === 'individual' ? 'Your full name (as on ID)' : 'Organization / Company name *'}
              value={form.organization_name}
              onChangeText={v => set('organization_name', v)}
              placeholderTextColor={C.textSub} />
          </View>

          {/* Required docs for this type */}
          {(selectedType?.docs || []).map(docKey => {
            if (docKey === 'national_id_number') {
              return (
                <View key="national_id_number" style={s.uploadWrap}>
                  <Text style={s.uploadLabel}>National ID Number <Text style={{ color: C.danger }}>*</Text></Text>
                  <Text style={s.uploadHint}>Enter the ID number printed on your national ID card</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="card-outline" size={18} color={C.textSub} style={s.inputIcon} />
                    <TextInput style={s.input} placeholder="e.g. ETH-1234567890"
                      value={nationalIdNo} onChangeText={setNationalIdNo}
                      placeholderTextColor={C.textSub} autoCapitalize="characters" />
                  </View>
                </View>
              );
            }
            return <UploadBtn key={docKey} docKey={docKey} files={files} setFiles={setFiles} />;
          })}

          {/* Optional supporting doc for all */}
          <UploadBtn docKey="supporting_doc" files={files} setFiles={setFiles} />

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Text style={s.btnText}>Submit Registration</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" /></>
            }
          </TouchableOpacity>

          <Text style={s.footerNote}>
            After submission, our team will review your documents within 24–48 hours and activate your employer account.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:       { flex: 1, backgroundColor: C.bg },
  scroll:     { paddingBottom: 48 },

  topBanner:  { backgroundColor: C.primary, alignItems: 'center', paddingTop: 52, paddingBottom: 36 },
  logoWrap:   { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  appName:    { fontSize: 24, fontWeight: '800', color: '#fff' },
  tagline:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  stepHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  backBtn:    { padding: 8, borderRadius: 10, backgroundColor: C.primaryLight },
  stepIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  stepDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border },
  stepDotActive: { backgroundColor: C.primary },
  stepDotDone:   { backgroundColor: C.success },
  stepLine:   { width: 20, height: 2, backgroundColor: C.border },

  card: {
    backgroundColor: '#fff', borderRadius: 20,
    marginHorizontal: 11, marginTop: 12, padding: 20,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  cardTitle:  { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 4 },
  cardSub:    { fontSize: 13, color: C.textSub, marginBottom: 18, lineHeight: 18 },

  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#fecaca' },
  errorText:  { flex: 1, color: C.danger, fontSize: 13, fontWeight: '500' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dcfce7', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bbf7d0' },
  successText:{ flex: 1, color: '#15803d', fontSize: 13, fontWeight: '500' },

  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12, paddingHorizontal: 14 },
  inputIcon:  { marginRight: 10 },
  input:      { flex: 1, paddingVertical: 13, fontSize: 14, color: C.text },

  btn:        { backgroundColor: C.primary, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkRow:    { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  linkText:   { color: C.textSub, fontSize: 14 },
  linkBold:   { color: C.primary, fontSize: 14, fontWeight: '700' },

  // Role selection cards
  roleCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: C.border, backgroundColor: C.bg, marginBottom: 12 },
  roleCardActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  roleIconBox:    { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  roleCardTitle:  { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 2 },
  roleCardDesc:   { fontSize: 12, color: C.textSub, lineHeight: 17 },

  empNotice:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#93c5fd' },
  empNoticeText:  { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },

  // Employer type cards
  empTypeCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 13, borderWidth: 2, borderColor: C.border, backgroundColor: C.bg, marginBottom: 10 },
  empTypeIcon:    { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  empTypeTitle:   { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  empTypeDesc:    { fontSize: 12, color: C.textSub },

  // Upload
  uploadWrap:     { marginBottom: 14 },
  uploadLabel:    { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3 },
  uploadHint:     { fontSize: 11, color: C.textSub, marginBottom: 7, lineHeight: 16 },
  uploadBtn:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', padding: 13 },
  uploadBtnDone:  { borderColor: C.success, backgroundColor: '#f0fdf4', borderStyle: 'solid' },
  uploadBtnTxt:   { flex: 1, fontSize: 13, color: C.primary, fontWeight: '600' },

  docNotice:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#86efac' },
  docNoticeText:  { flex: 1, fontSize: 12, color: '#15803d', lineHeight: 18 },

  idGuide:        { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#eff6ff', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  idGuideText:    { flex: 1, fontSize: 11, color: '#1d4ed8', lineHeight: 16 },

  footerNote:     { fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 18, marginTop: 14, paddingHorizontal: 8 },
});
