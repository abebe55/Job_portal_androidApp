/**
 * PageHeader
 *
 * On web:    invisible — the WebLayout header handles the title.
 *            Only renders the back button when showBack=true.
 * On mobile: purple bar with title, menu/back button.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Drawer from './Drawer';
import { C } from '../constants/theme';

type Props = {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  right?: React.ReactNode;
};

export default function PageHeader({
  title, showBack = false, showMenu = true, right,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  const handleBack = () => {
    if (Platform.OS === 'web') {
      router.replace('/(tabs)/');
    } else {
      router.back();
    }
  };

  // ── Web: render nothing (WebLayout owns the header) ────────────────────────
  if (Platform.OS === 'web') {
    // Still render a back button row for non-tab pages (post-job, my-jobs, etc.)
    if (showBack) {
      return (
        <View style={styles.webBackBar}>
          <TouchableOpacity onPress={handleBack} style={styles.webBackBtn}>
            <Ionicons name="arrow-back" size={18} color={C.primary} />
            <Text style={styles.webBackText}>Back</Text>
          </TouchableOpacity>
          {right ? <View>{right}</View> : null}
        </View>
      );
    }
    return null;
  }

  // ── Mobile: full purple bar ─────────────────────────────────────────────────
  return (
    <>
      <StatusBar backgroundColor={C.primary} barStyle="light-content" />
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        ) : showMenu ? (
          <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.iconBtn}>
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.iconBtn}>{right ?? null}</View>
      </View>
      <Drawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  // Mobile
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 6,
    paddingBottom: 8,
    paddingTop: 10,
    gap: 2,
  },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:   { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center' },

  // Web back bar (for non-tab pages)
  webBackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  webBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  webBackText: { fontSize: 13, fontWeight: '600', color: C.primary },
});
