import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { MainTabsScreen } from './src/screens/MainTabsScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { EmailVerificationScreen } from './src/screens/EmailVerificationScreen';
import { EmailConfirmedScreen } from './src/screens/EmailConfirmedScreen';
import { getProfile, refreshSessionToken } from './src/services/authApi';
import { clearSession, loadSession, saveSession } from './src/services/sessionStorage';
import { palette } from './src/theme/colors';

export default function App() {
  const [mode, setMode] = useState('login');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [sessionRefreshToken, setSessionRefreshToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const current = await loadSession();
        if (!current?.token) return;

        try {
          const profile = await getProfile(current.token);
          setSessionToken(current.token);
          setSessionRefreshToken(current?.refreshToken || '');
          setCurrentUser(profile?.data || current?.user || null);
          setIsAuthenticated(true);
        } catch (_profileError) {
          if (!current?.refreshToken) {
            throw _profileError;
          }

          const refreshed = await refreshSessionToken(current.refreshToken);
          const nextToken = refreshed?.data?.accessToken;
          const nextRefreshToken = refreshed?.data?.refreshToken || current.refreshToken;
          const nextUser = refreshed?.data?.user || current?.user || null;

          if (!nextToken) {
            throw new Error('Unable to refresh session');
          }

          await saveSession({
            token: nextToken,
            refreshToken: nextRefreshToken,
            user: nextUser
          });

          setSessionToken(nextToken);
          setSessionRefreshToken(nextRefreshToken);
          setCurrentUser(nextUser);
          setIsAuthenticated(true);
        }
      } catch (_error) {
        await clearSession();
        setSessionToken('');
        setSessionRefreshToken('');
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrapSession();
  }, []);

  useEffect(() => {
    const handleWebAuthCallback = async () => {
      if (typeof window === 'undefined') return;
      const rawHash = window.location.hash || '';
      if (!rawHash.includes('access_token=')) return;

      const params = new URLSearchParams(rawHash.replace(/^#/, ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      if (!accessToken) return;

      try {
        if (type === 'recovery') {
          setRecoveryToken(accessToken);
          setMode('reset');
          return;
        }

        const profile = await getProfile(accessToken);
        await saveSession({
          token: accessToken,
          refreshToken: refreshToken || null,
          user: profile?.data || null
        });
        setSessionToken(accessToken);
        setSessionRefreshToken(refreshToken || '');
        setCurrentUser(profile?.data || null);
        setMode('email-confirmed');
      } catch (_error) {
        setMode('login');
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleWebAuthCallback();
  }, []);

  if (isInitializing) {
    return <View style={styles.safeArea} />;
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <View style={styles.container}>
        {isAuthenticated ? (
          <MainTabsScreen
            user={currentUser}
            token={sessionToken}
            onUserUpdated={async (updatedUser) => {
              setCurrentUser(updatedUser || null);
              await saveSession({
                token: sessionToken,
                refreshToken: sessionRefreshToken,
                user: updatedUser || null
              });
            }}
            onLogout={async () => {
              await clearSession();
              setSessionToken('');
              setSessionRefreshToken('');
              setCurrentUser(null);
              setIsAuthenticated(false);
              setMode('login');
            }}
          />
        ) : mode === 'login' ? (
          <LoginScreen
            onSwitch={() => setMode('signup')}
            onLoginSuccess={async (session) => {
              if (session?.token) {
                await saveSession({
                  token: session.token,
                  refreshToken: session.refreshToken,
                  user: session.user || null
                });
                setSessionToken(session.token);
                setSessionRefreshToken(session.refreshToken || '');
                setCurrentUser(session.user || null);
              }
              setIsAuthenticated(true);
            }}
            onForgotPassword={() => setMode('forgot')}
          />
        ) : mode === 'signup' ? (
          <SignUpScreen
            onSwitch={() => setMode('login')}
            onSignUpSuccess={(email) => {
              setPendingVerificationEmail(email || '');
              setMode('verify-email');
            }}
          />
        ) : mode === 'verify-email' ? (
          <EmailVerificationScreen
            email={pendingVerificationEmail}
            onBackToLogin={() => setMode('login')}
          />
        ) : mode === 'email-confirmed' ? (
          <EmailConfirmedScreen
            onContinue={() => {
              if (sessionToken) {
                setIsAuthenticated(true);
                return;
              }
              setIsAuthenticated(true);
            }}
          />
        ) : mode === 'forgot' ? (
          <ForgotPasswordScreen
            onBackToLogin={() => setMode('login')}
          />
        ) : mode === 'reset' ? (
          <ResetPasswordScreen
            recoveryToken={recoveryToken}
            onBackToLogin={() => {
              setRecoveryToken('');
              setMode('login');
            }}
            onResetSuccess={() => {
              setRecoveryToken('');
              setMode('login');
            }}
          />
        ) : (
          <LoginScreen
            onSwitch={() => setMode('signup')}
            onLoginSuccess={async (session) => {
              if (session?.token) {
                await saveSession({
                  token: session.token,
                  refreshToken: session.refreshToken,
                  user: session.user || null
                });
                setSessionToken(session.token);
                setSessionRefreshToken(session.refreshToken || '');
                setCurrentUser(session.user || null);
              }
              setIsAuthenticated(true);
            }}
            onForgotPassword={() => setMode('forgot')}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background
  },
  container: {
    flex: 1,
    backgroundColor: palette.background
  }
});
