import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme/colors';

export function EmailConfirmedScreen({ onContinue }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="checkmark-done-circle" size={60} color="#16A34A" />
        <Text style={styles.title}>Email Confirmed</Text>
        <Text style={styles.subtitle}>
          Your email is verified successfully. Tap the button below to continue to your dashboard.
        </Text>
        <Pressable style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>Go to Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: palette.background
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center'
  },
  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '700',
    color: palette.textMain
  },
  subtitle: {
    marginTop: 10,
    textAlign: 'center',
    color: palette.textSecondary,
    lineHeight: 22
  },
  button: {
    marginTop: 18,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    height: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  }
});
