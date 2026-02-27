import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthHeader } from '../components/AuthHeader';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { SocialRow } from '../components/SocialRow';
import { AuthSwitcher } from '../components/AuthSwitcher';
import { ScreenLoader } from '../components/ScreenLoader';
import { AnimatedPopup } from '../components/AnimatedPopup';
import { palette } from '../theme/colors';
import { signUp } from '../services/authApi';
import { COUNTRY_CODES } from '../constants/countryCodes';

const COUNTRY_PHONE_RULES = {
  '+91': { exact: 10 },
  '+1': { exact: 10 },
  '+44': { min: 10, max: 10 },
  '+61': { exact: 9 },
  '+971': { exact: 9 }
};

const getPhoneRule = (code) => COUNTRY_PHONE_RULES[code] || { min: 6, max: 15 };

export function SignUpScreen({ onSwitch, onSignUpSuccess }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSearch, setCodeSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [pendingEmail, setPendingEmail] = useState('');
  const [errors, setErrors] = useState({ name: '', username: '', email: '', phone: '', password: '' });
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const cardScale = useRef(new Animated.Value(0.97)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const phoneRule = getPhoneRule(countryCode);
  const filteredCodes = COUNTRY_CODES.filter((item) => item.name.toLowerCase().includes(codeSearch.toLowerCase()));
  const selectedCodeOption = filteredCodes.find((item) => item.code === countryCode);
  const sortedCodeOptions = [
    ...(selectedCodeOption ? [selectedCodeOption] : []),
    ...filteredCodes.filter((item) => item.code !== countryCode)
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 520,
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

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const validateForm = () => {
    const nextErrors = { name: '', username: '', email: '', phone: '', password: '' };

    if (!name.trim()) {
      nextErrors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      nextErrors.email = 'Please enter a valid email';
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Phone is required';
    } else if (phoneRule.exact && phone.trim().length !== phoneRule.exact) {
      nextErrors.phone = `${countryCode} mobile number must be ${phoneRule.exact} digits`;
    } else if (!phoneRule.exact && (phone.trim().length < phoneRule.min || phone.trim().length > phoneRule.max)) {
      nextErrors.phone = `${countryCode} mobile number must be ${phoneRule.min}-${phoneRule.max} digits`;
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required';
    } else if (password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(nextErrors);
    return !nextErrors.name && !nextErrors.email && !nextErrors.phone && !nextErrors.password;
  };

  const handleFieldChange = (field, value) => {
    if (field === 'name') {
      setName(value);
    } else if (field === 'username') {
      setUsernameTouched(true);
      setUsername(value.toLowerCase().replace(/\s/g, ''));
    } else if (field === 'email') {
      setEmail(value);
      if (!usernameTouched) {
        const autoUsername = value.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._]/g, '_') || '';
        setUsername(autoUsername);
      }
    } else if (field === 'phone') {
      setPhone(value);
    } else {
      setPassword(value);
    }
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field) => {
    if (field === 'name' && name.trim() && name.trim().length < 2) {
      setErrors((prev) => ({ ...prev, name: 'Name must be at least 2 characters' }));
    }
    if (field === 'email' && email.trim() && !validateEmail(email)) {
      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email' }));
    }
    if (field === 'username' && username.trim() && !/^[a-zA-Z0-9._]{3,30}$/.test(username.trim())) {
      setErrors((prev) => ({ ...prev, username: 'Username must be 3-30 chars (letters, numbers, . _)' }));
    }
    if (field === 'phone' && phone.trim()) {
      if (phoneRule.exact && phone.trim().length !== phoneRule.exact) {
        setErrors((prev) => ({ ...prev, phone: `${countryCode} mobile number must be ${phoneRule.exact} digits` }));
      } else if (!phoneRule.exact && (phone.trim().length < phoneRule.min || phone.trim().length > phoneRule.max)) {
        setErrors((prev) => ({ ...prev, phone: `${countryCode} mobile number must be ${phoneRule.min}-${phoneRule.max} digits` }));
      }
    }
    if (field === 'password' && password.trim() && password.trim().length < 8) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters' }));
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      runErrorShake();
      return;
    }
    setLoading(true);

    try {
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/`
          : undefined;

      await signUp({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: `${countryCode}${phone.trim()}`,
        password: password.trim(),
        ...(redirectTo ? { redirectTo } : {})
      });
      setLoading(false);
      setPopup({
        visible: true,
        title: 'Confirmation Sent',
        message: 'A confirmation email has been sent. Please verify your email to continue.',
        type: 'success'
      });
      setPendingEmail(email.trim().toLowerCase());
    } catch (error) {
      setLoading(false);
      setPopup({
        visible: true,
        title: 'Sign Up Failed',
        message: error.message || 'Sign up failed',
        type: 'error'
      });
      runErrorShake();
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <AuthHeader title="Create Account" subtitle="Join us and explore a smooth, modern and elegant mobile experience." icon="person-add-outline" />

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
              label="Full Name"
              placeholder="Your full name"
              icon="person-outline"
              autoCapitalize="words"
              value={name}
              onChangeText={(value) => handleFieldChange('name', value)}
              onBlur={() => handleBlur('name')}
              error={errors.name}
            />
            <FormInput
              label="Email"
              placeholder="you@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              value={email}
              onChangeText={(value) => handleFieldChange('email', value)}
              onBlur={() => handleBlur('email')}
              error={errors.email}
            />
            <FormInput
              label="Username"
              placeholder="your.username"
              icon="at-outline"
              autoCapitalize="none"
              value={username}
              onChangeText={(value) => handleFieldChange('username', value)}
              onBlur={() => handleBlur('username')}
              error={errors.username}
            />
            <Text style={styles.phoneLabel}>Phone</Text>
            <View style={[styles.phoneRow, errors.phone ? styles.phoneRowError : null]}>
              <Pressable style={styles.countryCodeBtn} onPress={() => setShowCodeModal(true)}>
                <Text style={styles.countryCodeText}>{countryCode}</Text>
              </Pressable>
              <TextInput
                placeholder="555 123 4567"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={styles.phoneInput}
                value={phone}
                maxLength={phoneRule.exact || phoneRule.max}
                onChangeText={(value) => handleFieldChange('phone', value.replace(/[^0-9]/g, ''))}
                onBlur={() => handleBlur('phone')}
              />
            </View>
            {errors.phone ? <Text style={styles.phoneError}>{errors.phone}</Text> : null}
            <FormInput
              label="Password"
              placeholder="Create password"
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(value) => handleFieldChange('password', value)}
              onBlur={() => handleBlur('password')}
              error={errors.password}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightPress={() => setShowPassword((prev) => !prev)}
            />

            <Text style={styles.note}>By continuing, you agree to our terms and privacy policy.</Text>
            <PrimaryButton title="Sign Up" loading={loading} onPress={handleSignUp} />
            <SocialRow />
            <AuthSwitcher text="Already have an account?" actionText="Login" onPress={onSwitch} />
          </Animated.View>
        </View>
      </ScrollView>
      <ScreenLoader visible={loading} text="Creating account..." />
      <AnimatedPopup
        visible={popup.visible}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        onClose={() => {
          const wasSuccess = popup.type === 'success';
          setPopup({ visible: false, title: '', message: '', type: 'error' });
          if (wasSuccess && onSignUpSuccess) {
            onSignUpSuccess(pendingEmail);
            setPendingEmail('');
          }
        }}
      />
      <Modal visible={showCodeModal} transparent animationType="fade" onRequestClose={() => setShowCodeModal(false)}>
        <View style={styles.codeModalBackdrop}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>Select Country Code</Text>
            <TextInput
              value={codeSearch}
              onChangeText={setCodeSearch}
              placeholder="Search country"
              placeholderTextColor="#94A3B8"
              style={styles.codeSearch}
            />
            <ScrollView style={styles.codeList}>
              {sortedCodeOptions.map((item) => (
                <Pressable
                  key={`${item.iso}-${item.code}`}
                  style={[styles.codeItem, item.code === countryCode && styles.codeItemSelected]}
                  onPress={() => {
                    const nextRule = getPhoneRule(item.code);
                    const nextLimit = nextRule.exact || nextRule.max;
                    const normalizedPhone = phone.slice(0, nextLimit);
                    setCountryCode(item.code);
                    setPhone(normalizedPhone);
                    setShowCodeModal(false);
                    setCodeSearch('');
                  }}
                >
                  <Text style={styles.codeItemName}>{item.name}</Text>
                  <Text style={styles.codeItemValue}>{item.code}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.codeCloseBtn} onPress={() => setShowCodeModal(false)}>
              <Text style={styles.codeCloseText}>Close</Text>
            </Pressable>
          </View>
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
  note: {
    marginTop: 2,
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  phoneLabel: {
    fontSize: 13,
    color: palette.textSecondary,
    marginBottom: 6,
    fontWeight: '600'
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: 14,
    paddingHorizontal: 8,
    height: 52,
    marginBottom: 4
  },
  phoneRowError: {
    borderColor: palette.danger
  },
  countryCodeBtn: {
    height: 36,
    minWidth: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginRight: 8
  },
  countryCodeText: {
    color: palette.textMain,
    fontSize: 14,
    fontWeight: '700'
  },
  phoneInput: {
    flex: 1,
    color: palette.textMain,
    fontSize: 15
  },
  phoneError: {
    marginTop: 2,
    color: palette.danger,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10
  },
  codeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  codeModalCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    maxHeight: '70%'
  },
  codeModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: palette.textMain,
    marginBottom: 10
  },
  codeSearch: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 10,
    color: palette.textMain,
    marginBottom: 10
  },
  codeList: {
    maxHeight: 320
  },
  codeItem: {
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  codeItemSelected: {
    backgroundColor: '#E6FFFA'
  },
  codeItemName: {
    color: palette.textMain,
    fontSize: 13
  },
  codeItemValue: {
    color: palette.accent,
    fontWeight: '700'
  },
  codeCloseBtn: {
    marginTop: 10,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  codeCloseText: {
    color: palette.textSecondary,
    fontWeight: '700'
  }
});
