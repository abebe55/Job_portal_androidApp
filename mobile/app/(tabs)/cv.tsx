import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image, Modal, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { getCV, updateCV } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { C, S } from '../../constants/theme';

// ── Ethiopian skill/profession categories ─────────────────────────────────────
const SKILL_CATEGORIES = [
  { key: 'sales',        label: 'Sales & Marketing',        icon: 'storefront-outline',      color: '#f59e0b' },
  { key: 'it',           label: 'IT & Technology',           icon: 'laptop-outline',           color: '#3b82f6' },
  { key: 'design',       label: 'Design & Creative',         icon: 'color-palette-outline',    color: '#8b5cf6' },
  { key: 'teaching',     label: 'Teaching & Training',       icon: 'school-outline',           color: '#10b981' },
  { key: 'finance',      label: 'Finance & Accounting',      icon: 'calculator-outline',       color: '#06b6d4' },
  { key: 'health',       label: 'Healthcare & Medical',      icon: 'medkit-outline',           color: '#ef4444' },
  { key: 'engineering',  label: 'Engineering & Construction',icon: 'construct-outline',        color: '#f97316' },
  { key: 'admin',        label: 'Admin & Office Work',       icon: 'briefcase-outline',        color: '#6366f1' },
  { key: 'driver',       label: 'Driving & Transport',       icon: 'car-outline',              color: '#84cc16' },
  { key: 'security',     label: 'Security & Guard',          icon: 'shield-outline',           color: '#64748b' },
  { key: 'cleaning',     label: 'Cleaning & Housekeeping',   icon: 'sparkles-outline',         color: '#14b8a6' },
  { key: 'cooking',      label: 'Cooking & Food Service',    icon: 'restaurant-outline',       color: '#f43f5e' },
  { key: 'tailoring',    label: 'Tailoring & Garment',       icon: 'cut-outline',              color: '#a855f7' },
  { key: 'beauty',       label: 'Beauty & Hairdressing',     icon: 'flower-outline',           color: '#ec4899' },
  { key: 'construction', label: 'Construction & Labor',      icon: 'hammer-outline',           color: '#78716c' },
  { key: 'agriculture',  label: 'Agriculture & Farming',     icon: 'leaf-outline',             color: '#22c55e' },
  { key: 'legal',        label: 'Legal & Government Affairs',icon: 'document-text-outline',    color: '#0ea5e9' },
  { key: 'media',        label: 'Media & Journalism',        icon: 'newspaper-outline',        color: '#f59e0b' },
  { key: 'ngo',          label: 'NGO & Development Work',    icon: 'people-outline',           color: '#8b5cf6' },
  { key: 'other',        label: 'Other / Custom Skill',      icon: 'add-circle-outline',       color: '#6b7280' },
];

// Skills per category
const CATEGORY_SKILLS: Record<string, string[]> = {
  sales:        ['Sales Representative','Marketing Officer','Customer Service','Cashier','Shop Assistant','Telemarketer','Brand Ambassador','Merchandiser'],
  it:           ['Software Developer','Web Developer','Mobile App Developer','IT Support','Network Engineer','Database Admin','Cybersecurity','Data Analyst','UI/UX Designer'],
  design:       ['Graphic Designer','Video Editor','Photographer','Animator','Interior Designer','Fashion Designer','Logo Designer','Social Media Designer'],
  teaching:     ['English Teacher','Amharic Teacher','Math Teacher','Science Teacher','Tutor','Trainer','Lecturer','Kindergarten Teacher','Special Needs Teacher'],
  finance:      ['Accountant','Auditor','Finance Officer','Bank Teller','Loan Officer','Tax Specialist','Cashier','Bookkeeper','Financial Analyst'],
  health:       ['Nurse','Doctor','Pharmacist','Health Officer','Lab Technician','Midwife','Physiotherapist','Dentist','Public Health Officer'],
  engineering:  ['Civil Engineer','Electrical Engineer','Mechanical Engineer','Architect','Surveyor','AutoCAD Operator','Site Engineer','Quantity Surveyor'],
  admin:        ['Secretary','Receptionist','Office Manager','Data Entry Clerk','HR Officer','ጉዳይ አስፈጻሚ (Affairs Officer)','Procurement Officer','Logistics Officer'],
  driver:       ['Car Driver','Truck Driver','Bus Driver','Bajaj Driver','Delivery Driver','Forklift Operator'],
  security:     ['Security Guard','Night Guard','CCTV Operator','Bodyguard'],
  cleaning:     ['Cleaner','Housekeeper','Laundry Worker','Janitor','Sanitation Worker'],
  cooking:      ['Cook','Chef','Baker','Barista','Waiter/Waitress','Hotel Staff','Catering Worker'],
  tailoring:    ['Tailor','Seamstress','Garment Worker','Fashion Designer','Embroidery Worker'],
  beauty:       ['Hairdresser','Beautician','Nail Technician','Makeup Artist','Barber'],
  construction: ['Mason','Carpenter','Painter','Plumber','Electrician','Welder','General Laborer','Tile Layer'],
  agriculture:  ['Farmer','Agricultural Technician','Livestock Worker','Irrigation Technician','Agronomist'],
  legal:        ['Lawyer','Legal Officer','Court Clerk','Compliance Officer','ጉዳይ አስፈጻሚ','Government Liaison'],
  media:        ['Journalist','Reporter','Content Creator','Social Media Manager','Broadcaster','Editor'],
  ngo:          ['Program Officer','Field Officer','Community Mobilizer','M&E Officer','Project Coordinator','Social Worker'],
  other:        [],
};

// Specialization prompts per role — shown after a specific role is selected
const SPECIALIZATION_PROMPT: Record<string, { label: string; placeholder: string }> = {
  // Teaching
  'English Teacher':        { label: 'Subject / Grade Level', placeholder: 'e.g. English Language, Grade 9-12' },
  'Amharic Teacher':        { label: 'Subject / Grade Level', placeholder: 'e.g. Amharic Literature, Grade 5-8' },
  'Math Teacher':           { label: 'Subject / Grade Level', placeholder: 'e.g. Mathematics, Grade 10-12' },
  'Science Teacher':        { label: 'Subject / Grade Level', placeholder: 'e.g. Biology & Chemistry, Grade 9-10' },
  'Tutor':                  { label: 'Subject(s) You Tutor', placeholder: 'e.g. Mathematics, Physics, English' },
  'Trainer':                { label: 'Training Field / Topic', placeholder: 'e.g. Leadership, Sales Skills, IT Training' },
  'Lecturer':               { label: 'Department / Course(s) You Teach', placeholder: 'e.g. Computer Science, Software Engineering, AAU' },
  'Kindergarten Teacher':   { label: 'Age Group / Curriculum', placeholder: 'e.g. Ages 3-6, Montessori' },
  'Special Needs Teacher':  { label: 'Disability Type / Specialization', placeholder: 'e.g. Visual Impairment, Autism Spectrum' },
  // IT
  'Software Developer':     { label: 'Tech Stack / Languages', placeholder: 'e.g. React, Node.js, Python, Django' },
  'Web Developer':          { label: 'Technologies / Frameworks', placeholder: 'e.g. React, Vue.js, Laravel, WordPress' },
  'Mobile App Developer':   { label: 'Platform / Framework', placeholder: 'e.g. React Native, Flutter, Android (Kotlin)' },
  'IT Support':             { label: 'Systems / Tools', placeholder: 'e.g. Windows Server, Active Directory, Networking' },
  'Network Engineer':       { label: 'Specialization / Certifications', placeholder: 'e.g. Cisco CCNA, Firewall, VPN, LAN/WAN' },
  'Database Admin':         { label: 'Database Systems', placeholder: 'e.g. MySQL, PostgreSQL, Oracle, MongoDB' },
  'Cybersecurity':          { label: 'Specialization', placeholder: 'e.g. Penetration Testing, SOC Analyst, SIEM' },
  'Data Analyst':           { label: 'Tools / Domain', placeholder: 'e.g. Python, Power BI, Excel, Finance Data' },
  'UI/UX Designer':         { label: 'Tools / Platforms', placeholder: 'e.g. Figma, Adobe XD, Web & Mobile Design' },
  // Design
  'Graphic Designer':       { label: 'Design Tools / Specialization', placeholder: 'e.g. Adobe Illustrator, Photoshop, Branding' },
  'Video Editor':           { label: 'Software / Type of Content', placeholder: 'e.g. Premiere Pro, YouTube, Wedding Videos' },
  'Photographer':           { label: 'Photography Type', placeholder: 'e.g. Wedding, Portrait, Commercial, Events' },
  'Animator':               { label: 'Animation Type / Tools', placeholder: 'e.g. 2D Animation, After Effects, Blender' },
  'Interior Designer':      { label: 'Specialization', placeholder: 'e.g. Residential, Commercial, Office Design' },
  'Fashion Designer':       { label: 'Specialization', placeholder: 'e.g. Traditional Ethiopian Wear, Modern Fashion' },
  'Logo Designer':          { label: 'Tools / Style', placeholder: 'e.g. Adobe Illustrator, Minimalist, Brand Identity' },
  'Social Media Designer':  { label: 'Platforms / Tools', placeholder: 'e.g. Instagram, Facebook, Canva, Photoshop' },
  // Health
  'Nurse':                  { label: 'Department / Ward', placeholder: 'e.g. ICU, Pediatrics, Emergency, Maternity' },
  'Doctor':                 { label: 'Specialty / Department', placeholder: 'e.g. General Practice, Surgery, Pediatrics, OB-GYN' },
  'Pharmacist':             { label: 'Work Setting', placeholder: 'e.g. Hospital Pharmacy, Retail Pharmacy, Clinical' },
  'Health Officer':         { label: 'Specialization', placeholder: 'e.g. Public Health, Epidemiology, Community Health' },
  'Lab Technician':         { label: 'Lab Type / Tests', placeholder: 'e.g. Clinical Lab, Microbiology, Hematology' },
  'Midwife':                { label: 'Work Setting', placeholder: 'e.g. Hospital, Health Center, Community Midwifery' },
  'Physiotherapist':        { label: 'Specialization', placeholder: 'e.g. Orthopedic, Neurological, Sports Rehab' },
  'Dentist':                { label: 'Specialization', placeholder: 'e.g. General Dentistry, Orthodontics, Oral Surgery' },
  'Public Health Officer':  { label: 'Program / Focus Area', placeholder: 'e.g. Malaria Control, Nutrition, WASH' },
  // Engineering
  'Civil Engineer':         { label: 'Specialization', placeholder: 'e.g. Structural, Road & Highway, Water Supply' },
  'Electrical Engineer':    { label: 'Specialization', placeholder: 'e.g. Power Systems, Electronics, Automation' },
  'Mechanical Engineer':    { label: 'Specialization', placeholder: 'e.g. Manufacturing, HVAC, Automotive' },
  'Architect':              { label: 'Specialization', placeholder: 'e.g. Residential, Commercial, Urban Planning' },
  'Surveyor':               { label: 'Type of Surveying', placeholder: 'e.g. Land Survey, Quantity Survey, Topographic' },
  'AutoCAD Operator':       { label: 'Drawing Type / Software', placeholder: 'e.g. Architectural, Structural, Civil 3D' },
  'Site Engineer':          { label: 'Project Type', placeholder: 'e.g. Building Construction, Road, Dam' },
  'Quantity Surveyor':      { label: 'Specialization', placeholder: 'e.g. Building, Infrastructure, Cost Estimation' },
  // Finance
  'Accountant':             { label: 'Accounting Software / Area', placeholder: 'e.g. Peachtree, QuickBooks, Tax Accounting' },
  'Auditor':                { label: 'Audit Type', placeholder: 'e.g. Internal Audit, External Audit, IT Audit' },
  'Finance Officer':        { label: 'Specialization', placeholder: 'e.g. Budget Management, Financial Reporting, Treasury' },
  'Bank Teller':            { label: 'Bank / Branch Type', placeholder: 'e.g. Commercial Bank, Microfinance, CBE' },
  'Loan Officer':           { label: 'Loan Type', placeholder: 'e.g. Business Loans, Mortgage, Microfinance' },
  'Tax Specialist':         { label: 'Tax Type / Authority', placeholder: 'e.g. VAT, Income Tax, ERCA Compliance' },
  'Financial Analyst':      { label: 'Analysis Area', placeholder: 'e.g. Investment Analysis, Risk, Financial Modeling' },
  // Legal
  'Lawyer':                 { label: 'Area of Law', placeholder: 'e.g. Commercial Law, Criminal Law, Family Law, Labor Law' },
  'Legal Officer':          { label: 'Specialization', placeholder: 'e.g. Contract Review, Compliance, Corporate Law' },
  'Court Clerk':            { label: 'Court Type', placeholder: 'e.g. Federal High Court, Regional Court, Woreda Court' },
  'Compliance Officer':     { label: 'Industry / Regulation', placeholder: 'e.g. Banking Compliance, NBE Regulations, AML' },
  // Media
  'Journalist':             { label: 'Beat / Medium', placeholder: 'e.g. Politics, Business, Print, TV, Online' },
  'Reporter':               { label: 'Coverage Area / Medium', placeholder: 'e.g. Sports, Health, Radio, Digital Media' },
  'Content Creator':        { label: 'Platform / Niche', placeholder: 'e.g. YouTube, TikTok, Instagram, Tech Content' },
  'Social Media Manager':   { label: 'Platforms / Industry', placeholder: 'e.g. Facebook, Instagram, Twitter, E-commerce' },
  'Broadcaster':            { label: 'Medium / Station', placeholder: 'e.g. Radio, TV, EBC, Fana Broadcasting' },
  'Editor':                 { label: 'Type of Editing', placeholder: 'e.g. News Editing, Video Editing, Book Editing' },
  // NGO
  'Program Officer':        { label: 'Sector / Donor', placeholder: 'e.g. Health, Education, USAID, GIZ, UNICEF' },
  'Field Officer':          { label: 'Program / Location', placeholder: 'e.g. Food Security, Oromia Region, WASH' },
  'Community Mobilizer':    { label: 'Community / Program', placeholder: 'e.g. Rural Health, Women Empowerment, Addis Ababa' },
  'M&E Officer':            { label: 'Tools / Sector', placeholder: 'e.g. KoboToolbox, MEAL, Health Programs' },
  'Project Coordinator':    { label: 'Project Type / Donor', placeholder: 'e.g. Infrastructure, EU-funded, Livelihood' },
  'Social Worker':          { label: 'Target Group / Setting', placeholder: 'e.g. Street Children, Elderly, Hospital Social Work' },
  // Sales
  'Sales Representative':   { label: 'Product / Industry', placeholder: 'e.g. FMCG, Pharmaceuticals, Real Estate, Insurance' },
  'Marketing Officer':      { label: 'Marketing Channel / Industry', placeholder: 'e.g. Digital Marketing, FMCG, B2B Sales' },
  'Customer Service':       { label: 'Industry / Channel', placeholder: 'e.g. Telecom, Banking, Call Center, Retail' },
  'Brand Ambassador':       { label: 'Brand / Product Type', placeholder: 'e.g. Beverage, Cosmetics, Telecom' },
  // Admin
  'Secretary':              { label: 'Industry / Executive Level', placeholder: 'e.g. Legal Secretary, Executive Secretary, NGO' },
  'HR Officer':             { label: 'HR Specialization', placeholder: 'e.g. Recruitment, Payroll, Training & Development' },
  'Procurement Officer':    { label: 'Procurement Type', placeholder: 'e.g. Government Procurement, Medical Supplies, IT' },
  'Logistics Officer':      { label: 'Logistics Type', placeholder: 'e.g. Warehouse, Import/Export, Fleet Management' },
  // Driver
  'Car Driver':             { label: 'Vehicle Type / Employer Type', placeholder: 'e.g. Sedan, NGO Driver, Private Driver' },
  'Truck Driver':           { label: 'Truck Type / Route', placeholder: 'e.g. Heavy Truck, Long Distance, Addis-Djibouti' },
  'Bus Driver':             { label: 'Bus Type / Route', placeholder: 'e.g. City Bus, School Bus, Inter-city' },
  'Forklift Operator':      { label: 'Forklift Type / Industry', placeholder: 'e.g. Counterbalance, Warehouse, Manufacturing' },
  // Construction
  'Electrician':            { label: 'Specialization', placeholder: 'e.g. Building Wiring, Industrial, Solar Installation' },
  'Plumber':                { label: 'Specialization', placeholder: 'e.g. Residential, Commercial, Water Supply' },
  'Welder':                 { label: 'Welding Type', placeholder: 'e.g. Arc Welding, MIG, TIG, Structural Steel' },
  'Mason':                  { label: 'Specialization', placeholder: 'e.g. Block Laying, Plastering, Tiling' },
  'Carpenter':              { label: 'Specialization', placeholder: 'e.g. Furniture, Formwork, Finishing' },
  // Agriculture
  'Farmer':                 { label: 'Crop / Livestock Type', placeholder: 'e.g. Teff, Coffee, Poultry, Dairy Farming' },
  'Agricultural Technician':{ label: 'Specialization', placeholder: 'e.g. Soil Science, Irrigation, Crop Protection' },
  'Agronomist':             { label: 'Crop / Research Area', placeholder: 'e.g. Cereal Crops, Horticulture, Soil Fertility' },
};
const REGIONS = ['Addis Ababa','Oromia','Amhara','Tigray','SNNPR','Somali','Afar','Benishangul-Gumuz','Gambela','Harari','Dire Dawa','Sidama','South West Ethiopia'];
const MARITAL = ['Single','Married','Divorced','Widowed'];
const GENDER  = ['Male / ወንድ','Female / ሴት'];
const DISABILITY = ['None','Visual Impairment','Hearing Impairment','Physical Disability','Intellectual Disability','Other'];
const EMPLOY_STATUS = ['Currently Employed (Full-time)','Currently Employed (Part-time)','Self-Employed / Freelancer','Unemployed / Looking for Work','Student','Fresh Graduate','Intern / Trainee'];
const EDU_LEVELS = ['PhD / Doctorate',"Master's Degree",'Postgraduate Diploma','BSc / Bachelor of Science','BA / Bachelor of Arts','BEd / Bachelor of Education','BEng / Bachelor of Engineering','Advanced Diploma (3-yr TVET)','Diploma (2-yr TVET/College)','TVET Level IV','TVET Level III','TVET Level II','TVET Level I','Preparatory (Grade 11-12)','Secondary (Grade 9-10)','Primary (Grade 1-8)','No Formal Education'];
const ENROLL  = ['Regular','Extension','Distance','Night','Summer','Online'];
const LANG_LV = ['Native','Fluent','Professional','Intermediate','Basic'];
const GPA_SCALE = ['4.0','5.0','10.0','100%','Other'];

const TABS = [
  { key: 'personal',   label: 'Personal',   icon: 'person-outline' },
  { key: 'skill',      label: 'My Skill',   icon: 'star-outline' },
  { key: 'education',  label: 'Education',  icon: 'school-outline' },
  { key: 'experience', label: 'Experience', icon: 'briefcase-outline' },
  { key: 'documents',  label: 'Documents',  icon: 'documents-outline' },
];

type EduEntry = { id: string; level: string; field: string; institution: string; enrollment_type: string; gpa: string; gpa_scale: string; graduation_year: string; exit_exam_score: string; exit_exam_year: string; thesis_title: string; };
const newEdu = (): EduEntry => ({ id: Date.now().toString(), level: '', field: '', institution: '', enrollment_type: 'Regular', gpa: '', gpa_scale: '4.0', graduation_year: '', exit_exam_score: '', exit_exam_year: '', thesis_title: '' });

type ExpEntry = { id: string; job_title: string; company: string; location: string; start_date: string; end_date: string; is_current: boolean; duties: string; };
const newExp = (): ExpEntry => ({ id: Date.now().toString(), job_title: '', company: '', location: '', start_date: '', end_date: '', is_current: false, duties: '' });

// ── Reusable UI ───────────────────────────────────────────────────────────────
function Sec({ title, icon, color = C.primary, children }: any) {
  return (
    <View style={sec.wrap}>
      <View style={[sec.row, { borderLeftColor: color }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[sec.title, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Fld({ label, req, children }: any) {
  return (
    <View style={fld.wrap}>
      <Text style={fld.label}>{label}{req ? <Text style={{ color: C.danger }}> *</Text> : ''}</Text>
      {children}
    </View>
  );
}

function TIn({ value, onChange, placeholder, multi = false, kb = 'default' as any }: any) {
  return (
    <TextInput style={[fld.input, multi && fld.multi]} value={value || ''} onChangeText={onChange}
      placeholder={placeholder || ''} placeholderTextColor={C.textSub}
      multiline={multi} numberOfLines={multi ? 4 : 1} keyboardType={kb} />
  );
}

function Row2({ children }: any) { return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>; }

function Drop({ label, req, value, options, onChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <Fld label={label} req={req}>
      <TouchableOpacity style={fld.drop} onPress={() => setOpen(true)}>
        <Text style={[fld.dropTxt, !value && { color: C.textSub }]} numberOfLines={1}>{value || `Select...`}</Text>
        <Ionicons name="chevron-down" size={15} color={C.textSub} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={dd.bg} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={dd.sheet}>
          <Text style={dd.title}>{label}</Text>
          <ScrollView style={{ maxHeight: 340 }}>
            {options.map((o: string) => (
              <TouchableOpacity key={o} style={[dd.item, value === o && dd.active]} onPress={() => { onChange(o); setOpen(false); }}>
                <Text style={[dd.txt, value === o && dd.activeTxt]}>{o}</Text>
                {value === o && <Ionicons name="checkmark" size={15} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Fld>
  );
}

function UplBtn({ label, icon, value, onPick, type = 'doc' }: any) {
  const pick = async () => {
    if (type === 'image') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!r.canceled && r.assets[0]) onPick(r.assets[0].uri, r.assets[0].fileName || 'photo.jpg');
    } else {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!r.canceled && r.assets[0]) onPick(r.assets[0].uri, r.assets[0].name);
    }
  };
  return (
    <TouchableOpacity style={upl.btn} onPress={pick}>
      <Ionicons name={icon} size={17} color={value ? C.success : C.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[upl.label, value && { color: C.success }]}>{label}</Text>
        {value ? <Text style={upl.file} numberOfLines={1}>{value.split('/').pop()}</Text> : null}
      </View>
      <Ionicons name={value ? 'checkmark-circle' : 'cloud-upload-outline'} size={17} color={value ? C.success : C.textSub} />
    </TouchableOpacity>
  );
}

// ── Toast notification ────────────────────────────────────────────────────────
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
    <Animated.View style={[toast.wrap, type === 'success' ? toast.success : toast.error, { opacity }]}>
      <Ionicons name={type === 'success' ? 'checkmark-circle' : 'close-circle'} size={20} color="#fff" />
      <Text style={toast.txt}>{message}</Text>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CVScreen() {
  const [cv, setCv]           = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [tab, setTab]         = useState('personal');
  const [eduList, setEduList] = useState<EduEntry[]>([newEdu()]);
  const [expList, setExpList] = useState<ExpEntry[]>([newExp()]);
  const [files, setFiles]     = useState<Record<string, { uri: string; name: string }>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType]       = useState<'success' | 'error'>('success');
  const [toastMsg, setToastMsg]         = useState('');

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToastType(type); setToastMsg(msg); setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
    setTimeout(() => setToastVisible(false), 3000);
  };

  useEffect(() => {
    getCV().then(res => {
      const d = res.data;
      setCv(d);
      try { if (d.education_entries) setEduList(JSON.parse(d.education_entries)); } catch {}
      try { if (d.experience_entries) setExpList(JSON.parse(d.experience_entries)); } catch {}
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const set = useCallback((k: string, v: any) => setCv((p: any) => ({ ...p, [k]: v })), []);
  const setFile = (k: string, uri: string, name: string) => setFiles(p => ({ ...p, [k]: { uri, name } }));
  const updEdu = (id: string, k: keyof EduEntry, v: string) => setEduList(p => p.map(e => e.id === id ? { ...e, [k]: v } : e));
  const updExp = (id: string, k: keyof ExpEntry, v: any) => setExpList(p => p.map(e => e.id === id ? { ...e, [k]: v } : e));

  // Fields that must never be sent back (read-only or file fields handled separately)
  const READ_ONLY_FIELDS = new Set([
    'id', 'user', 'updated_at', 'is_complete',
    'education_level_display', 'field_of_study_display',
    'employment_status_display', 'amharic_level_display', 'english_level_display',
  ]);
  const FILE_FIELDS = new Set([
    'profile_photo', 'transcript_file', 'exit_exam_file', 'degree_certificate',
    'tvet_certificate', 'experience_letter', 'recommendation_letter',
    'national_id', 'other_document',
  ]);

  const save = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      const payload = { ...cv, education_entries: JSON.stringify(eduList), experience_entries: JSON.stringify(expList) };

      // Append only writable, non-file scalar fields
      Object.entries(payload).forEach(([k, v]) => {
        if (READ_ONLY_FIELDS.has(k)) return;
        if (FILE_FIELDS.has(k)) return; // handled below
        if (v !== null && v !== undefined && typeof v !== 'object') {
          form.append(k, String(v));
        } else if (typeof v === 'boolean') {
          form.append(k, v ? 'true' : 'false');
        }
      });

      // Append newly picked files only
      for (const [k, f] of Object.entries(files)) {
        if (f.uri.startsWith('blob:') || f.uri.startsWith('data:')) {
          // Web: fetch the blob and append as File
          try {
            const resp = await fetch(f.uri);
            const blob = await resp.blob();
            form.append(k, blob, f.name);
          } catch { /* skip if fetch fails */ }
        } else {
          // Native: append as RN file object
          form.append(k, { uri: f.uri, name: f.name, type: 'application/octet-stream' } as any);
        }
      }

      await updateCV(form);
      showToast('success', 'CV saved successfully!');
    } catch (err: any) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data).slice(0, 120) : 'Failed to save. Please try again.';
      showToast('error', msg);
    }
    setSaving(false);
  };

  if (loading) return <View style={S.page}><PageHeader title="Create CV" /><ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} /></View>;

  const cat = SKILL_CATEGORIES.find(c => c.key === cv.skill_category);
  const catSkills = cv.skill_category ? CATEGORY_SKILLS[cv.skill_category] || [] : [];
  const needsEdu = !['driver','security','cleaning','cooking','construction','agriculture'].includes(cv.skill_category || '');

  return (
    <View style={S.page}>
      <PageHeader title="Create CV" />

      {/* Tab bar */}
      <View style={st.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabContent}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[st.tab, tab === t.key && st.tabOn]} onPress={() => setTab(t.key)}>
              <Ionicons name={t.icon as any} size={15} color={tab === t.key ? C.primary : C.textSub} />
              <Text style={[st.tabTxt, tab === t.key && st.tabTxtOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── TAB: MY SKILL ──────────────────────────────────────────── */}
        {tab === 'skill' && (
          <>
            <View style={st.skillIntro}>
              <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
              <Text style={st.skillIntroTxt}>Select your main skill or profession area. This helps employers find you for the right jobs.</Text>
            </View>

            {/* Category grid */}
            <Text style={st.sectionLabel}>What type of work do you do?</Text>
            <View style={st.catGrid}>
              {Array.from({ length: Math.ceil(SKILL_CATEGORIES.length / 2) }, (_, i) => (
                <View key={i} style={st.catRow}>
                  {SKILL_CATEGORIES.slice(i * 2, i * 2 + 2).map(c => (
                    <TouchableOpacity key={c.key}
                      style={[st.catCard, cv.skill_category === c.key && { borderColor: c.color, backgroundColor: c.color + '15' }]}
                      onPress={() => { set('skill_category', c.key); set('skill_title', ''); }}>
                      <Ionicons name={c.icon as any} size={22} color={cv.skill_category === c.key ? c.color : C.textSub} />
                      <Text style={[st.catLabel, cv.skill_category === c.key && { color: c.color, fontWeight: '700' }]}>{c.label}</Text>
                      {cv.skill_category === c.key && <Ionicons name="checkmark-circle" size={14} color={c.color} style={{ position: 'absolute', top: 6, right: 6 }} />}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Specific skill selection */}
            {cv.skill_category && cv.skill_category !== 'other' && catSkills.length > 0 && (
              <Sec title={`Select Your ${cat?.label} Role`} icon="star-outline" color={cat?.color}>
                <Text style={st.skillHint}>Choose the role that best matches your work:</Text>
                <View style={st.skillGrid}>
                  {catSkills.map(s => (
                    <TouchableOpacity key={s}
                      style={[st.skillChip, cv.skill_title === s && { backgroundColor: cat?.color, borderColor: cat?.color }]}
                      onPress={() => { set('skill_title', s); set('skill_title_custom', ''); }}>
                      <Text style={[st.skillChipTxt, cv.skill_title === s && { color: '#fff', fontWeight: '700' }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* If a chip is selected — show specialization field only */}
                {cv.skill_title ? (
                  <>
                    <View style={st.selectedRoleRow}>
                      <Ionicons name="checkmark-circle" size={15} color={cat?.color} />
                      <Text style={[st.selectedRoleText, { color: cat?.color }]}>Selected: {cv.skill_title}</Text>
                      <TouchableOpacity onPress={() => { set('skill_title', ''); set('skill_specialization', ''); }}>
                        <Text style={st.changeRoleBtn}>Change</Text>
                      </TouchableOpacity>
                    </View>
                    {SPECIALIZATION_PROMPT[cv.skill_title] && (
                      <Fld label={SPECIALIZATION_PROMPT[cv.skill_title].label} req>
                        <TIn
                          value={cv.skill_specialization}
                          onChange={(v: string) => set('skill_specialization', v)}
                          placeholder={SPECIALIZATION_PROMPT[cv.skill_title].placeholder}
                        />
                      </Fld>
                    )}
                  </>
                ) : (
                  /* No chip selected — show free-text field */
                  <Fld label="Or type your specific role / job title">
                    <TIn value={cv.skill_title_custom} onChange={(v: string) => set('skill_title_custom', v)} placeholder="e.g. Senior Sales Manager, Freelance Designer..." />
                  </Fld>
                )}
              </Sec>
            )}

            {cv.skill_category === 'other' && (
              <Sec title="Your Custom Skill / Profession" icon="create-outline" color="#6b7280">
                <Fld label="Job Title / Skill Name" req>
                  <TIn value={cv.skill_title_custom} onChange={(v: string) => set('skill_title_custom', v)} placeholder="e.g. Electrician, Plumber, Online Tutor..." />
                </Fld>
                {!cv.skill_title_custom && (
                  <Text style={st.customHint}>
                    <Ionicons name="information-circle-outline" size={12} color={C.textSub} /> Type your skill above to continue
                  </Text>
                )}
              </Sec>
            )}

            {/* Career summary — shows once a skill/title is chosen for any category */}
            {cv.skill_category && (cv.skill_title || cv.skill_title_custom) && (
              <Sec title="Professional Summary" icon="document-text-outline" color="#7c3aed">
                <Fld label="Describe your skills and experience in 2-3 sentences">
                  <TIn value={cv.objective} onChange={(v: string) => set('objective', v)}
                    placeholder={`e.g. I am an experienced ${cv.skill_title || cv.skill_title_custom || 'professional'} with 3 years of experience in Addis Ababa. I am hardworking, reliable and ready to contribute to your team.`}
                    multi />
                </Fld>
              </Sec>
            )}
          </>
        )}

        {/* ── TAB: PERSONAL ──────────────────────────────────────────── */}
        {tab === 'personal' && (
          <>
            <Sec title="Profile Photo" icon="camera-outline" color="#7c3aed">
              <View style={st.photoRow}>
                {(files.profile_photo?.uri || cv.profile_photo)
                  ? <Image source={{ uri: files.profile_photo?.uri || cv.profile_photo }} style={st.photo} />
                  : <View style={st.photoBox}><Ionicons name="person" size={32} color={C.border} /></View>
                }
                <UplBtn label="Upload Photo" icon="camera-outline" value={files.profile_photo?.name} type="image"
                  onPick={(uri: string, name: string) => setFile('profile_photo', uri, name)} />
              </View>
            </Sec>

            <Sec title="Full Name" icon="person-outline" color="#2563eb">
              <Row2>
                <View style={{ flex: 1 }}><Fld label="First Name" req><TIn value={cv.first_name} onChange={(v: string) => set('first_name', v)} placeholder="e.g. Abebe" /></Fld></View>
                <View style={{ flex: 1 }}><Fld label="Father's Name" req><TIn value={cv.father_name} onChange={(v: string) => set('father_name', v)} placeholder="e.g. Kebede" /></Fld></View>
              </Row2>
              <Row2>
                <View style={{ flex: 1 }}><Fld label="Grandfather's Name"><TIn value={cv.grandfather_name} onChange={(v: string) => set('grandfather_name', v)} placeholder="e.g. Girma" /></Fld></View>
                <View style={{ flex: 1 }}><Fld label="Amharic Name"><TIn value={cv.full_name_am} onChange={(v: string) => set('full_name_am', v)} placeholder="ሙሉ ስም" /></Fld></View>
              </Row2>
              <Row2>
                <View style={{ flex: 1 }}><Drop label="Gender" req value={cv.gender} options={GENDER} onChange={(v: string) => set('gender', v)} /></View>
                <View style={{ flex: 1 }}><Drop label="Marital Status" value={cv.marital_status} options={MARITAL} onChange={(v: string) => set('marital_status', v)} /></View>
              </Row2>
              <Row2>
                <View style={{ flex: 1 }}><Fld label="Date of Birth"><TIn value={cv.date_of_birth} onChange={(v: string) => set('date_of_birth', v)} placeholder="DD/MM/YYYY" /></Fld></View>
                <View style={{ flex: 1 }}><Fld label="Nationality"><TIn value={cv.nationality} onChange={(v: string) => set('nationality', v)} placeholder="Ethiopian" /></Fld></View>
              </Row2>
            </Sec>

            <Sec title="Contact" icon="call-outline" color="#16a34a">
              <Fld label="Phone 1" req><TIn value={cv.phone} onChange={(v: string) => set('phone', v)} placeholder="+251 9XX XXX XXX" kb="phone-pad" /></Fld>
              <Fld label="Phone 2"><TIn value={cv.phone_alt} onChange={(v: string) => set('phone_alt', v)} placeholder="+251 9XX XXX XXX" kb="phone-pad" /></Fld>
              <Fld label="Phone 3"><TIn value={cv.phone_alt2} onChange={(v: string) => set('phone_alt2', v)} placeholder="+251 9XX XXX XXX" kb="phone-pad" /></Fld>
              <Fld label="Email"><TIn value={cv.email} onChange={(v: string) => set('email', v)} placeholder="your@email.com" kb="email-address" /></Fld>
            </Sec>

            <Sec title="Address" icon="location-outline" color="#d97706">
              <Drop label="Region / Kilil" req value={cv.region} options={REGIONS} onChange={(v: string) => set('region', v)} />
              <Row2>
                <View style={{ flex: 1 }}><Fld label="City / Town" req><TIn value={cv.city} onChange={(v: string) => set('city', v)} placeholder="e.g. Addis Ababa" /></Fld></View>
                <View style={{ flex: 1 }}><Fld label="Sub-City"><TIn value={cv.sub_city} onChange={(v: string) => set('sub_city', v)} placeholder="e.g. Yeka" /></Fld></View>
              </Row2>
              <Row2>
                <View style={{ flex: 1 }}><Fld label="Woreda"><TIn value={cv.woreda} onChange={(v: string) => set('woreda', v)} placeholder="e.g. 09" /></Fld></View>
                <View style={{ flex: 1 }}><Fld label="Kebele"><TIn value={cv.kebele} onChange={(v: string) => set('kebele', v)} placeholder="e.g. 05" /></Fld></View>
              </Row2>
              <Fld label="House Number"><TIn value={cv.house_number} onChange={(v: string) => set('house_number', v)} placeholder="e.g. New Flower, House 12" /></Fld>
            </Sec>

            <Sec title="Employment Status" icon="briefcase-outline" color="#6366f1">
              <Drop label="Current Employment Status" value={cv.employment_status} options={EMPLOY_STATUS} onChange={(v: string) => set('employment_status', v)} />
            </Sec>

            <Sec title="Disability / Special Needs" icon="accessibility-outline" color="#64748b">
              <Drop label="Disability Status" value={cv.disability || 'None'} options={DISABILITY} onChange={(v: string) => set('disability', v)} />
              <Text style={st.disabilityNote}>This information is optional and used only to support inclusive hiring.</Text>
            </Sec>
          </>
        )}

        {/* ── TAB: EDUCATION ─────────────────────────────────────────── */}
        {tab === 'education' && (
          <>
            {/* Education is optional for non-academic jobs but still shown */}
            {!needsEdu && (
              <View style={st.infoBox}>
                <Ionicons name="information-circle-outline" size={15} color="#2563eb" />
                <Text style={st.infoTxt}>Education is optional for your skill type. Fill what applies to you.</Text>
              </View>
            )}

            {eduList.map((edu, idx) => (
              <Sec key={edu.id} title={`Education ${idx + 1}`} icon="school-outline" color="#2563eb">
                <View style={st.eduHdr}>
                  <Text style={st.eduNum}>Entry {idx + 1}</Text>
                  {eduList.length > 1 && (
                    <TouchableOpacity onPress={() => setEduList(p => p.filter(e => e.id !== edu.id))}>
                      <Ionicons name="trash-outline" size={15} color={C.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <Drop label="Education Level" value={edu.level} options={EDU_LEVELS} onChange={(v: string) => updEdu(edu.id, 'level', v)} />
                <Fld label="Field of Study / Department">
                  <TIn value={edu.field} onChange={(v: string) => updEdu(edu.id, 'field', v)} placeholder="e.g. Computer Science, Accounting, Nursing, TVET Electricity" />
                </Fld>
                <Fld label="Institution / School Name">
                  <TIn value={edu.institution} onChange={(v: string) => updEdu(edu.id, 'institution', v)} placeholder="e.g. Addis Ababa University, Entoto TVET College" />
                </Fld>
                <Row2>
                  <View style={{ flex: 1 }}><Drop label="Enrollment Type" value={edu.enrollment_type} options={ENROLL} onChange={(v: string) => updEdu(edu.id, 'enrollment_type', v)} /></View>
                  <View style={{ flex: 1 }}><Fld label="Graduation Year"><TIn value={edu.graduation_year} onChange={(v: string) => updEdu(edu.id, 'graduation_year', v)} placeholder="e.g. 2022" kb="numeric" /></Fld></View>
                </Row2>
                <Row2>
                  <View style={{ flex: 1 }}><Fld label="GPA / CGPA"><TIn value={edu.gpa} onChange={(v: string) => updEdu(edu.id, 'gpa', v)} placeholder="e.g. 3.45" kb="decimal-pad" /></Fld></View>
                  <View style={{ flex: 1 }}><Drop label="GPA Scale" value={edu.gpa_scale || '4.0'} options={GPA_SCALE} onChange={(v: string) => updEdu(edu.id, 'gpa_scale', v)} /></View>
                </Row2>
                <Row2>
                  <View style={{ flex: 1 }}><Fld label="Exit Exam Score (%)"><TIn value={edu.exit_exam_score} onChange={(v: string) => updEdu(edu.id, 'exit_exam_score', v)} placeholder="e.g. 72" kb="decimal-pad" /></Fld></View>
                  <View style={{ flex: 1 }}><Fld label="Exit Exam Year"><TIn value={edu.exit_exam_year} onChange={(v: string) => updEdu(edu.id, 'exit_exam_year', v)} placeholder="e.g. 2023" kb="numeric" /></Fld></View>
                </Row2>
                {['PhD / Doctorate',"Master's Degree",'Postgraduate Diploma'].includes(edu.level) && (
                  <Fld label="Thesis / Research Title">
                    <TIn value={edu.thesis_title} onChange={(v: string) => updEdu(edu.id, 'thesis_title', v)} placeholder="e.g. Impact of AI on Ethiopian Agriculture" />
                  </Fld>
                )}
              </Sec>
            ))}

            <TouchableOpacity style={st.addBtn} onPress={() => setEduList(p => [...p, newEdu()])}>
              <Ionicons name="add-circle-outline" size={17} color={C.primary} />
              <Text style={st.addBtnTxt}>Add Another Education Entry</Text>
            </TouchableOpacity>

            <Sec title="Languages" icon="language-outline" color="#16a34a">
              <Row2>
                <View style={{ flex: 1 }}><Drop label="Amharic" value={cv.amharic_level || 'Native'} options={LANG_LV} onChange={(v: string) => set('amharic_level', v)} /></View>
                <View style={{ flex: 1 }}><Drop label="English" value={cv.english_level} options={LANG_LV} onChange={(v: string) => set('english_level', v)} /></View>
              </Row2>
              <Fld label="Other Languages (Oromiffa, Tigrinya, Arabic...)">
                <TIn value={cv.other_languages} onChange={(v: string) => set('other_languages', v)} placeholder="e.g. Oromiffa (Fluent), Tigrinya (Basic)" />
              </Fld>
            </Sec>
          </>
        )}

        {/* ── TAB: EXPERIENCE ────────────────────────────────────────── */}
        {tab === 'experience' && (
          <>
            <Sec title="Work Experience" icon="briefcase-outline" color="#d97706">
              <Fld label="Do you have work experience?">
                <View style={st.chipRow}>
                  {['Yes', 'No'].map(o => (
                    <TouchableOpacity key={o} style={[st.chip, cv.has_experience === (o === 'Yes') && st.chipOn]}
                      onPress={() => set('has_experience', o === 'Yes')}>
                      <Text style={[st.chipTxt, cv.has_experience === (o === 'Yes') && st.chipTxtOn]}>{o}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Fld>
              {cv.has_experience && (
                <>
                  <Fld label="Total Years of Experience">
                    <TIn value={cv.experience_years} onChange={(v: string) => set('experience_years', v)} placeholder="e.g. 3" kb="numeric" />
                  </Fld>

                  {expList.map((exp, idx) => (
                    <View key={exp.id} style={idx > 0 ? st.expEntry : undefined}>
                      {idx > 0 && (
                        <View style={st.eduHdr}>
                          <Text style={st.eduNum}>Job {idx + 1}</Text>
                          <TouchableOpacity onPress={() => setExpList(p => p.filter(e => e.id !== exp.id))}>
                            <Ionicons name="trash-outline" size={15} color={C.danger} />
                          </TouchableOpacity>
                        </View>
                      )}
                      <Fld label="Job Title" req>
                        <TIn value={exp.job_title} onChange={(v: string) => updExp(exp.id, 'job_title', v)} placeholder="e.g. Software Developer, Accountant, Nurse" />
                      </Fld>
                      <Fld label="Company / Organization" req>
                        <TIn value={exp.company} onChange={(v: string) => updExp(exp.id, 'company', v)} placeholder="e.g. Commercial Bank of Ethiopia, Ethio Telecom" />
                      </Fld>
                      <Fld label="Location">
                        <TIn value={exp.location} onChange={(v: string) => updExp(exp.id, 'location', v)} placeholder="e.g. Addis Ababa, Hawassa" />
                      </Fld>
                      <Row2>
                        <View style={{ flex: 1 }}><Fld label="Start Date"><TIn value={exp.start_date} onChange={(v: string) => updExp(exp.id, 'start_date', v)} placeholder="e.g. Jan 2021" /></Fld></View>
                        <View style={{ flex: 1 }}>
                          {exp.is_current
                            ? <Fld label="End Date"><Text style={st.currentJobTxt}>Present (Current Job)</Text></Fld>
                            : <Fld label="End Date"><TIn value={exp.end_date} onChange={(v: string) => updExp(exp.id, 'end_date', v)} placeholder="e.g. Dec 2023" /></Fld>
                          }
                        </View>
                      </Row2>
                      <Fld label="Currently working here?">
                        <View style={st.chipRow}>
                          {['Yes', 'No'].map(o => (
                            <TouchableOpacity key={o}
                              style={[st.chip, exp.is_current === (o === 'Yes') && st.chipOn]}
                              onPress={() => updExp(exp.id, 'is_current', o === 'Yes')}>
                              <Text style={[st.chipTxt, exp.is_current === (o === 'Yes') && st.chipTxtOn]}>{o}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </Fld>
                      <Fld label="Main Duties & Responsibilities">
                        <TIn value={exp.duties} onChange={(v: string) => updExp(exp.id, 'duties', v)}
                          placeholder="Describe your main tasks and achievements in this role..." multi />
                      </Fld>
                    </View>
                  ))}

                  <TouchableOpacity style={st.addBtn} onPress={() => setExpList(p => [...p, newExp()])}>
                    <Ionicons name="add-circle-outline" size={17} color={C.primary} />
                    <Text style={st.addBtnTxt}>Add Another Job Experience</Text>
                  </TouchableOpacity>
                </>
              )}
            </Sec>

            <Sec title="Additional Skills" icon="star-outline" color="#7c3aed">
              <Fld label="Technical / Professional Skills">
                <TIn value={cv.technical_skills} onChange={(v: string) => set('technical_skills', v)}
                  placeholder="List your specific skills, tools, software, equipment you can use..." multi />
              </Fld>
              <Fld label="Computer Skills">
                <TIn value={cv.computer_skills} onChange={(v: string) => set('computer_skills', v)}
                  placeholder="e.g. MS Office, Excel, Internet, Peachtree, Photoshop..." />
              </Fld>
              <Fld label="Soft Skills">
                <TIn value={cv.soft_skills} onChange={(v: string) => set('soft_skills', v)}
                  placeholder="e.g. Teamwork, Communication, Leadership, Punctuality..." />
              </Fld>
            </Sec>

            <Sec title="Driving License" icon="car-outline" color="#16a34a">
              <Fld label="Do you have a driving license?">
                <View style={st.chipRow}>
                  {['Yes', 'No'].map(o => (
                    <TouchableOpacity key={o} style={[st.chip, cv.driving_license === (o === 'Yes') && st.chipOn]}
                      onPress={() => set('driving_license', o === 'Yes')}>
                      <Text style={[st.chipTxt, cv.driving_license === (o === 'Yes') && st.chipTxtOn]}>{o}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Fld>
              {cv.driving_license && (
                <Fld label="License Type">
                  <View style={st.chipRow}>
                    {['A','B','C','D','F','A+B','B+C'].map(l => (
                      <TouchableOpacity key={l} style={[st.chip, cv.driving_license_type === l && st.chipOn]}
                        onPress={() => set('driving_license_type', l)}>
                        <Text style={[st.chipTxt, cv.driving_license_type === l && st.chipTxtOn]}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Fld>
              )}
            </Sec>

            <Sec title="References" icon="people-outline" color="#6b7280">
              <Fld label="Reference 1 (Name, Title, Phone)">
                <TIn value={cv.reference_1} onChange={(v: string) => set('reference_1', v)} placeholder="e.g. Ato Bekele Tadesse, Manager, 0911234567" />
              </Fld>
              <Fld label="Reference 2 (Name, Title, Phone)">
                <TIn value={cv.reference_2} onChange={(v: string) => set('reference_2', v)} placeholder="e.g. W/ro Tigist Alemu, Supervisor, 0922345678" />
              </Fld>
            </Sec>
          </>
        )}

        {/* ── TAB: DOCUMENTS ─────────────────────────────────────────── */}
        {tab === 'documents' && (
          <Sec title="Upload Supporting Documents" icon="documents-outline" color="#7c3aed">
            <Text style={st.docHint}>Upload scanned copies or clear photos (PDF or image). These will be visible to employers when you apply.</Text>
            <UplBtn label="Degree / Diploma Certificate" icon="ribbon-outline"
              value={files.degree_certificate?.name || cv.degree_certificate}
              onPick={(uri: string, name: string) => setFile('degree_certificate', uri, name)} />
            <UplBtn label="Official Transcript / Grade Report" icon="document-text-outline"
              value={files.transcript_file?.name || cv.transcript_file}
              onPick={(uri: string, name: string) => setFile('transcript_file', uri, name)} />
            <UplBtn label="Exit Exam Result" icon="clipboard-outline"
              value={files.exit_exam_file?.name || cv.exit_exam_file}
              onPick={(uri: string, name: string) => setFile('exit_exam_file', uri, name)} />
            <UplBtn label="TVET Certificate / COC" icon="ribbon-outline"
              value={files.tvet_certificate?.name || cv.tvet_certificate}
              onPick={(uri: string, name: string) => setFile('tvet_certificate', uri, name)} />
            <UplBtn label="Experience / Employment Letter" icon="briefcase-outline"
              value={files.experience_letter?.name || cv.experience_letter}
              onPick={(uri: string, name: string) => setFile('experience_letter', uri, name)} />
            <UplBtn label="Recommendation Letter" icon="mail-outline"
              value={files.recommendation_letter?.name || cv.recommendation_letter}
              onPick={(uri: string, name: string) => setFile('recommendation_letter', uri, name)} />
            <UplBtn label="National ID / Kebele ID" icon="card-outline"
              value={files.national_id?.name || cv.national_id}
              onPick={(uri: string, name: string) => setFile('national_id', uri, name)} />
            <UplBtn label="Other Document" icon="attach-outline"
              value={files.other_document?.name || cv.other_document}
              onPick={(uri: string, name: string) => setFile('other_document', uri, name)} />
            <Fld label="Other Document Label (describe what it is)">
              <TIn value={cv.other_document_label} onChange={(v: string) => set('other_document_label', v)} placeholder="e.g. Police Clearance, Medical Certificate..." />
            </Fld>
          </Sec>
        )}

        {/* Save */}
        <TouchableOpacity style={st.saveBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="save-outline" size={17} color="#fff" /><Text style={st.saveTxt}>Save CV</Text></>
          }
        </TouchableOpacity>

      </ScrollView>
      <Toast visible={toastVisible} type={toastType} message={toastMsg} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  scroll:       { paddingLeft: 60, paddingRight: 60, paddingTop: 14, paddingBottom: 48 },
  tabBarWrap:   { backgroundColor: C.white, borderBottomWidth: 1.5, borderBottomColor: C.border },
  tabContent:   { paddingHorizontal: 10, paddingVertical: 8, gap: 6, alignItems: 'center' },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, backgroundColor: C.bg },
  tabOn:        { backgroundColor: C.primaryLight },
  tabTxt:       { fontSize: 13, color: C.textSub, fontWeight: '700' },
  tabTxtOn:     { color: C.primary, fontWeight: '800' },
  skillIntro:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  skillIntroTxt:{ flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 },
  catGrid:      { flexDirection: 'column', gap: 0, marginBottom: 16 },
  catRow:       { flexDirection: 'row', gap: 10, marginBottom: 10 },
  catCard:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: C.border, position: 'relative' },
  catLabel:     { flex: 1, fontSize: 13, color: C.textSub, fontWeight: '700', lineHeight: 16 },
  skillHint:    { fontSize: 12, color: C.textSub, marginBottom: 10 },
  skillGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  skillChip:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  skillChipTxt: { fontSize: 12, color: C.textSub, fontWeight: '500' },
  infoBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  infoTxt:      { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },
  photoRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  photo:        { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: C.primary },
  photoBox:     { width: 68, height: 68, borderRadius: 34, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  chipOn:       { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt:      { fontSize: 13, color: C.textSub, fontWeight: '700' },
  chipTxtOn:    { color: '#fff', fontWeight: '700' },
  eduHdr:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  eduNum:       { fontSize: 12, fontWeight: '700', color: C.textSub },
  expEntry:     { backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  currentJobTxt:{ fontSize: 13, color: C.success, fontWeight: '600', paddingVertical: 11 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primaryLight, borderRadius: 12, padding: 13, marginBottom: 14, borderWidth: 1.5, borderColor: C.primary, borderStyle: 'dashed' },
  addBtnTxt:    { color: C.primary, fontWeight: '700', fontSize: 13 },
  docHint:      { fontSize: 12, color: C.textSub, marginBottom: 12, lineHeight: 18 },
  customHint:   { fontSize: 12, color: C.textSub, marginTop: 6, fontStyle: 'italic' },
  selectedRoleRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primaryLight, borderRadius: 10, padding: 10, marginBottom: 10 },
  selectedRoleText: { flex: 1, fontSize: 13, fontWeight: '700' },
  changeRoleBtn:    { fontSize: 12, color: C.primary, fontWeight: '700', textDecorationLine: 'underline' },
  disabilityNote: { fontSize: 11, color: C.textSub, marginTop: 6, fontStyle: 'italic', lineHeight: 16 },
  saveBtn:      { backgroundColor: C.primary, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveTxt:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const sec = StyleSheet.create({
  wrap:  { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: 'rgba(124,58,237,0.07)' },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12, paddingLeft: 8, borderLeftWidth: 3 },
  title: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});

const fld = StyleSheet.create({
  wrap:    { marginBottom: 10 },
  label:   { fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 4 },
  input:   { backgroundColor: C.bg, borderRadius: 9, padding: 11, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  multi:   { minHeight: 88, textAlignVertical: 'top' },
  drop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderRadius: 9, padding: 11, borderWidth: 1, borderColor: C.border },
  dropTxt: { fontSize: 14, color: C.text, flex: 1 },
});

const dd = StyleSheet.create({
  bg:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  title:    { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  item:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  active:   { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8 },
  txt:      { fontSize: 14, color: C.text },
  activeTxt:{ color: C.primary, fontWeight: '700' },
});

const upl = StyleSheet.create({
  btn:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 9, padding: 11, borderWidth: 1.5, borderColor: C.border, marginBottom: 9 },
  label: { fontSize: 13, fontWeight: '600', color: C.text },
  file:  { fontSize: 11, color: C.success, marginTop: 2 },
});

const toast = StyleSheet.create({
  wrap:    { position: 'absolute', bottom: 24, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 10, zIndex: 999 },
  success: { backgroundColor: '#16a34a' },
  error:   { backgroundColor: '#dc2626' },
  txt:     { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
});
