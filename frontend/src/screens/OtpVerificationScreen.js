import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '../components/AuthHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthSwitcher } from '../components/AuthSwitcher';
import { ScreenLoader } from '../components/ScreenLoader';
import { palette } from '../theme/colors';

export function OtpVerificationScreen({ email, onBack, onVerified }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const otpInputRef = useRef(null);
  const popupScale = useRef(new Animated.Value(0.6)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [cardOpacity, cardTranslateY]);

  const verifyOtp = () => {
    const trimmed = otp.trim();
    if (!trimmed) {
      setError('OTP is required');
      return;
    }
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Enter a valid 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowSuccess(true);
      Animated.parallel([
        Animated.spring(popupScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
        Animated.timing(popupOpacity, { toValue: 1, duration: 240, useNativeDriver: true })
      ]).start(() => {
        setTimeout(() => {
          setShowSuccess(false);
          popupScale.setValue(0.6);
          popupOpacity.setValue(0);
          if (onVerified) {
            onVerified();
          }
        }, 850);
      });
    }, 1200);
  };

  const handleOtpChange = (value) => {
    const clean = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(clean);
    setError('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <AuthHeader
            title="OTP Verification"
            subtitle={`Enter 6-digit code sent to ${email || 'your email address'}`}
            icon="shield-outline"
          />

          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}> 
            <Text style={styles.otpLabel}>OTP Code</Text>
            <Pressable style={styles.otpRow} onPress={() => otpInputRef.current?.focus()}>
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const value = otp[index] || '';
                const isActive = index === otp.length && otp.length < 6;
                return (
                  <View key={index} style={[styles.otpBox, isActive && styles.otpBoxActive]}>
                    <Text style={styles.otpDigit}>{value}</Text>
                  </View>
                );
              })}
            </Pressable>
            <TextInput
              ref={otpInputRef}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.hiddenInput}
              autoFocus
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <PrimaryButton title="Verify OTP" loading={loading} onPress={verifyOtp} />
            <AuthSwitcher text="Wrong email?" actionText="Go Back" onPress={onBack} />
          </Animated.View>
        </View>
      </ScrollView>

      <ScreenLoader visible={loading} text="Verifying OTP..." />

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.successCard, { opacity: popupOpacity, transform: [{ scale: popupScale }] }]}> 
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Verified Successfully</Text>
            <Text style={styles.successText}>Your OTP is confirmed.</Text>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 24
  },
  content: {
    flex: 1,
    justifyContent: 'center'
  },
  card: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3
  },
  otpLabel: {
    fontSize: 13,
    color: palette.textSecondary,
    marginBottom: 8,
    fontWeight: '600'
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  otpBoxActive: {
    borderColor: palette.primary,
    backgroundColor: '#F0FDFA'
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.textMain
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  successCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 18
  },
  successIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.textMain
  },
  successText: {
    marginTop: 6,
    color: palette.textSecondary,
    fontSize: 14
  }
});
