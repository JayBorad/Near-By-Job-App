import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AuthHeader } from '../components/AuthHeader';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthSwitcher } from '../components/AuthSwitcher';
import { ScreenLoader } from '../components/ScreenLoader';
import { AnimatedPopup } from '../components/AnimatedPopup';
import { palette } from '../theme/colors';
import { updatePassword } from '../services/authApi';

export function ResetPasswordScreen({ onBackToLogin, onResetSuccess, recoveryToken }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'success' });
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });
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

  const validateForm = () => {
    const nextErrors = { password: '', confirmPassword: '' };
    if (!password.trim()) {
      nextErrors.password = 'New password is required';
    } else if (password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Confirm password is required';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return !nextErrors.password && !nextErrors.confirmPassword;
  };

  const resetPassword = async () => {
    if (!validateForm()) {
      return;
    }
    if (!recoveryToken) {
      setPopup({
        visible: true,
        title: 'Invalid Reset Session',
        message: 'Reset token is missing or expired. Please request a new reset link.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      await updatePassword({
        token: recoveryToken,
        password: password.trim()
      });

      setPopup({
        visible: true,
        title: 'Password Updated',
        message: 'Your password has been reset successfully. Please login with your new password.',
        type: 'success'
      });
    } catch (err) {
      setPopup({
        visible: true,
        title: 'Reset Failed',
        message: err.message || 'Could not reset password',
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
            title="Reset Password"
            subtitle="Create a new password for your account and continue securely."
            icon="lock-open-outline"
          />

          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}> 
            <FormInput
              label="New Password"
              placeholder="Enter new password"
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightPress={() => setShowPassword((prev) => !prev)}
            />

            <FormInput
              label="Confirm Password"
              placeholder="Re-enter new password"
              icon="shield-checkmark-outline"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightPress={() => setShowConfirmPassword((prev) => !prev)}
            />

            <PrimaryButton title="Reset Password" loading={loading} onPress={resetPassword} />
            <AuthSwitcher text="Back to" actionText="Login" onPress={onBackToLogin} />
          </Animated.View>
        </View>
      </ScrollView>
      <ScreenLoader visible={loading} text="Updating password..." />
      <AnimatedPopup
        visible={popup.visible}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        onClose={() => {
          const isSuccess = popup.type === 'success';
          setPopup({ visible: false, title: '', message: '', type: 'success' });
          if (isSuccess && onResetSuccess) {
            onResetSuccess();
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
