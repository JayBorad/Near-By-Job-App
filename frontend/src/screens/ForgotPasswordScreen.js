import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AuthHeader } from '../components/AuthHeader';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthSwitcher } from '../components/AuthSwitcher';
import { ScreenLoader } from '../components/ScreenLoader';
import { AnimatedPopup } from '../components/AnimatedPopup';
import { palette } from '../theme/colors';
import { forgotPassword } from '../services/authApi';

export function ForgotPasswordScreen({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'success' });
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

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const sendResetLink = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/`
          : undefined;

      await forgotPassword({
        email: email.trim().toLowerCase(),
        ...(redirectTo ? { redirectTo } : {})
      });

      setPopup({
        visible: true,
        title: 'Reset Email Sent',
        message: 'We sent a password reset link to your email. Please check your inbox.',
        type: 'success'
      });
    } catch (err) {
      setPopup({
        visible: true,
        title: 'Request Failed',
        message: err.message || 'Unable to send reset email',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <AuthHeader
            title="Forgot Password"
            subtitle="Enter your email and we will send you a password reset link."
            icon="key-outline"
          />

          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}> 
            <FormInput
              label="Email"
              placeholder="you@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
              error={error}
            />
            <PrimaryButton title="Send Reset Link" loading={loading} onPress={sendResetLink} />
            <AuthSwitcher text="Remember password?" actionText="Back to Login" onPress={onBackToLogin} />
          </Animated.View>
        </View>
      </ScrollView>
      <ScreenLoader visible={loading} text="Sending reset link..." />
      <AnimatedPopup
        visible={popup.visible}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        onClose={() => {
          const isSuccess = popup.type === 'success';
          setPopup({ visible: false, title: '', message: '', type: 'success' });
          if (isSuccess) {
            onBackToLogin();
          }
        }}
      />
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
  }
});
