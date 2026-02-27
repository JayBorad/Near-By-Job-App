import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthHeader } from '../components/AuthHeader';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { SocialRow } from '../components/SocialRow';
import { AuthSwitcher } from '../components/AuthSwitcher';
import { ScreenLoader } from '../components/ScreenLoader';
import { AnimatedPopup } from '../components/AnimatedPopup';
import { palette } from '../theme/colors';
import { signIn } from '../services/authApi';

export function LoginScreen({ onSwitch, onLoginSuccess, onForgotPassword }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [errors, setErrors] = useState({ identifier: '', password: '' });
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const cardScale = useRef(new Animated.Value(0.97)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true
      })
    ]).start();
  }, [cardOpacity, cardScale, cardTranslateY]);

  const runErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true })
    ]).start();
  };

  const validateForm = () => {
    const nextErrors = { identifier: '', password: '' };

    if (!identifier.trim()) {
      nextErrors.identifier = 'Email or username is required';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required';
    } else if (password.trim().length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  };

  const handleFieldChange = (field, value) => {
    if (field === 'identifier') {
      setIdentifier(value);
    } else {
      setPassword(value);
    }
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field) => {
    if (field === 'identifier' && !identifier.trim()) {
      setErrors((prev) => ({ ...prev, identifier: 'Email or username is required' }));
    }
    if (field === 'password' && password.trim() && password.trim().length < 6) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 6 characters' }));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      runErrorShake();
      return;
    }
    setLoading(true);
    try {
      const response = await signIn({
        identifier: identifier.trim().toLowerCase(),
        password: password.trim()
      });
      if (onLoginSuccess) {
        onLoginSuccess({
          token: response?.data?.accessToken,
          refreshToken: response?.data?.refreshToken,
          user: response?.data?.user || null
        });
      }
    } catch (error) {
      setPopup({
        visible: true,
        title: 'Login Failed',
        message: error.message || 'Login failed',
        type: 'error'
      });
      runErrorShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <AuthHeader title="Welcome Back" subtitle="Sign in to continue your journey with a clean and premium UI." icon="shield-checkmark-outline" />

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }, { scale: cardScale }, { translateX: shakeX }]
              }
            ]}
          >
            <FormInput
              label="Email or Username"
              placeholder="you@example.com or username"
              icon="mail-outline"
              keyboardType="default"
              value={identifier}
              onChangeText={(value) => handleFieldChange('identifier', value)}
              onBlur={() => handleBlur('identifier')}
              error={errors.identifier}
            />
            <FormInput
              label="Password"
              placeholder="Enter password"
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(value) => handleFieldChange('password', value)}
              onBlur={() => handleBlur('password')}
              error={errors.password}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightPress={() => setShowPassword((prev) => !prev)}
            />

            <Pressable onPress={onForgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
            <PrimaryButton title="Login" loading={loading} onPress={handleLogin} />
            <SocialRow />
            <AuthSwitcher text="New here?" actionText="Create account" onPress={onSwitch} />
          </Animated.View>
        </View>
      </ScrollView>
      <ScreenLoader visible={loading} text="Signing you in..." />
      <AnimatedPopup
        visible={popup.visible}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ visible: false, title: '', message: '', type: 'error' })}
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
  },
  forgotText: {
    textAlign: 'right',
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4
  }
});
