import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
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

export default function PageHeader({ title, showBack = false, showMenu = true, right }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  const handleBack = () => {
    if (Platform.OS === 'web') {
      // Always go home — avoids going back to Chapa checkout page
      router.replace('/(tabs)/');
    } else {
      router.back();
    }
  };

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
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center' },
});
