import { useState, useRef } from 'react';
import {
  View, ActivityIndicator, StyleSheet, TouchableOpacity,
  Text, SafeAreaView, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/theme';

interface Props {
  url: string;
  title?: string;
  returnHosts?: string[];
  onComplete: (txRef: string | null) => void;
  onCancel: () => void;
}

// Hosts that signal payment is complete (our backend payment-return endpoints)
const DEFAULT_RETURN_HOSTS = ['127.0.0.1', '10.0.2.2', 'localhost', 'jobportal-api.railway.app'];

export default function ChapaWebView({
  url, title = 'Chapa Payment', returnHosts, onComplete, onCancel,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const webRef = useRef<WebView>(null);
  const hosts = returnHosts ?? DEFAULT_RETURN_HOSTS;

  const handleNavChange = (nav: { url: string }) => {
    try {
      const uri = new URL(nav.url);
      // Intercept when Chapa redirects back to our backend payment-return page
      if (hosts.includes(uri.hostname)) {
        const txRef = uri.searchParams.get('tx_ref');
        onComplete(txRef);
        return false; // stop WebView from navigating
      }
    } catch {}
    return true;
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onCancel} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      {loading && (
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}

      {error ? (
        <View style={s.errorBox}>
          <Ionicons name="wifi-outline" size={56} color={C.border} />
          <Text style={s.errorTitle}>Failed to load</Text>
          <Text style={s.errorSub}>Check your internet connection and try again.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setError(false); setLoading(true); webRef.current?.reload(); }}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelLink} onPress={onCancel}>
            <Text style={s.cancelText}>Cancel Payment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: url }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          allowsInlineMediaPlayback
          onLoadStart={() => { setLoading(true); setProgress(0); }}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 500) { setLoading(false); setError(true); }
          }}
          onShouldStartLoadWithRequest={handleNavChange}
          style={s.webview}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.primary },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 8, paddingVertical: 12 },
  closeBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title:        { flex: 1, color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  progressBar:  { height: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  progressFill: { height: 3, backgroundColor: '#fff' },
  webview:      { flex: 1, backgroundColor: '#fff' },
  errorBox:     { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorTitle:   { fontSize: 18, fontWeight: '700', color: C.text },
  errorSub:     { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  retryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12, marginTop: 8 },
  retryText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelLink:   { marginTop: 4 },
  cancelText:   { color: C.textSub, fontSize: 14 },
});
