import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme/colors';

export function EmailVerificationScreen({ email, onBackToLogin }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="mail-open-outline" size={56} color={palette.accent} />
        <Text style={styles.title}>Confirm Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to{`\n`}
          <Text style={styles.email}>{email || 'your email address'}</Text>
        </Text>
        <Text style={styles.hint}>
          Open the link from your email inbox. After successful confirmation, this app will show the confirmed screen.
        </Text>
        <Pressable style={styles.button} onPress={onBackToLogin}>
          <Text style={styles.buttonText}>Back to Login</Text>
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
  email: {
    fontWeight: '700',
    color: palette.textMain
  },
  hint: {
    marginTop: 12,
    textAlign: 'center',
    color: palette.textSecondary,
    lineHeight: 20
  },
  button: {
    marginTop: 18,
    backgroundColor: palette.accent,
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
