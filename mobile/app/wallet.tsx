import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getWallet, initiateDeposit } from '../services/api';
import PageHeader from '../components/PageHeader';
import WebLayout from '../components/WebLayout';
import ChapaWebView from '../components/ChapaWebView';
import { C, S } from '../constants/theme';

const TX_COLORS: any = {
  deposit:    { color: '#16a34a', bg: '#dcfce7', icon: 'arrow-down-circle-outline' },
  commission: { color: '#f59e0b', bg: '#fef3c7', icon: 'cash-outline' },
  refund:     { color: '#3b82f6', bg: '#dbeafe', icon: 'refresh-circle-outline' },
  withdrawal: { color: '#ef4444', bg: '#fee2e2', icon: 'arrow-up-circle-outline' },
};

export default function WalletScreen() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [chapaUrl, setChapaUrl] = useState<string | null>(null);

  const fetchWallet = async () => {
    try { const res = await getWallet(); setWallet(res.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleTopUp = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) return Alert.alert('Error', 'Minimum top-up is ETB 10');
    setPaying(true);
    try {
      const res = await initiateDeposit({
        amount: amt,
        email: user?.email || 'user@example.com',
        first_name: user?.username || 'User',
        phone_number: user?.phone || '',
      });
      const url = res.data.checkout_url;
      if (url) {
        if (Platform.OS === 'web') {
          (window as any).location.href = url;
        } else {
          setChapaUrl(url);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Payment initiation failed');
    }
    setPaying(false);
  };

  if (loading) return (
    <View style={S.page}>
      <PageHeader title="My Wallet" showBack />
      <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
    </View>
  );

  return (
    <WebLayout title="My Wallet" subtitle="Manage your balance">
    <View style={S.page}>
      <PageHeader title="My Wallet" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="wallet-outline" size={20} color={C.primary} />
          </View>
          <View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>ETB {parseFloat(wallet?.balance || '0').toFixed(2)}</Text>
          </View>
        </View>

        {/* Top-up section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Up Wallet</Text>
          <Text style={styles.hint}>Pay via Chapa - supports Telebirr, CBE, and cards</Text>
          <View style={styles.amountRow}>
            <View style={styles.amountInput}>
              <Ionicons name="cash-outline" size={18} color={C.textSub} />
              <TextInput
                style={styles.amountField}
                placeholder="Amount (ETB)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholderTextColor={C.textSub}
              />
            </View>
            <TouchableOpacity style={styles.payBtn} onPress={handleTopUp} disabled={paying}>
              {paying
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="card-outline" size={16} color="#1d4ed8" /><Text style={styles.payBtnText}>Pay</Text></>
              }
            </TouchableOpacity>
          </View>
          {/* Quick amounts */}
          <View style={styles.quickRow}>
            {[100, 200, 500, 1000].map(v => (
              <TouchableOpacity key={v} style={styles.quickChip} onPress={() => setAmount(String(v))}>
                <Text style={styles.quickChipText}>+{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaction history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {(wallet?.transactions || []).length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={36} color={C.border} />
              <Text style={styles.emptyText}>No transactions yet.</Text>
            </View>
          ) : (
            (wallet?.transactions || []).map((tx: any) => {
              const t = TX_COLORS[tx.tx_type] ?? TX_COLORS.deposit;
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: t.bg }]}>
                    <Ionicons name={t.icon} size={18} color={t.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txType}>{tx.tx_type.charAt(0).toUpperCase() + tx.tx_type.slice(1)}</Text>
                    <Text style={styles.txDesc} numberOfLines={1}>{tx.description || tx.reference}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: t.color }]}>
                      {tx.tx_type === 'deposit' || tx.tx_type === 'refund' ? '+' : '-'}ETB {tx.amount}
                    </Text>
                    <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Chapa WebView modal */}
      <Modal visible={!!chapaUrl} animationType="slide" onRequestClose={() => { setChapaUrl(null); fetchWallet(); }}>
        {chapaUrl && (
          <ChapaWebView
            url={chapaUrl}
            title="Top Up Wallet"
            onComplete={async (txRef) => {
              setChapaUrl(null);
              // Poll wallet balance — deposit-return already credited it server-side
              for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 1500));
                await fetchWallet();
              }
            }}
            onCancel={() => { setChapaUrl(null); fetchWallet(); }}
          />
        )}
      </Modal>
    </View>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },
  balanceCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  balanceLabel: { color: C.textSub, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceAmount: { color: C.primary, fontSize: 24, fontWeight: '800', marginTop: 2 },
  section: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  hint: { fontSize: 11, color: C.textSub, marginBottom: 10 },
  amountRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  amountInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10,
    borderWidth: 1.5, borderColor: C.border,
  },
  amountField: { flex: 1, paddingVertical: 10, fontSize: 14, color: C.text, outlineStyle: 'none' as any },
  payBtn: {
    backgroundColor: '#ffffff', borderRadius: 8, paddingHorizontal: 16,
    paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#93c5fd',
  },
  payBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 13 },
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  quickChip: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 7,
    paddingVertical: 7, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#c4b5fd', minWidth: 60,
  },
  quickChipText: { color: C.primary, fontWeight: '700', fontSize: 12 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  txIcon: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  txType: { fontSize: 13, fontWeight: '600', color: C.text },
  txDesc: { fontSize: 11, color: C.textSub, marginTop: 1 },
  txAmount: { fontSize: 13, fontWeight: '700' },
  txDate: { fontSize: 10, color: C.textSub, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { color: C.textSub, fontSize: 13 },
});
