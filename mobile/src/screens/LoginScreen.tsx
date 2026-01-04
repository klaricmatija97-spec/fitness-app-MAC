/**
 * Login Screen
 * Rotirajuće pozadinske slike, dark mode, login i registracija
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';

// Besplatni fitness video s Pexels (licenca: besplatna za komercijalnu upotrebu)
const BACKGROUND_VIDEO_URL = 'https://videos.pexels.com/video-files/4761434/4761434-hd_1080_1920_25fps.mp4';

// Fallback slike ako video ne radi
const fallbackImage = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  onSkipLogin?: () => void;
  onBack?: () => void;
  onTrainerRegister?: () => void;
  onTrainerLoginSuccess?: (trainerData: {
    id: string;
    name: string;
    email: string;
    trainerCode: string;
    accessToken: string;
  }) => void;
}

export default function LoginScreen({ onLoginSuccess, onSkipLogin, onBack, onTrainerRegister, onTrainerLoginSuccess }: LoginScreenProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Register state
  const [registerName, setRegisterName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Animacije - fade-in (sinkronizirano s pozadinskom slikom)
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const titleOpacity = React.useRef(new Animated.Value(0)).current;
  const formOpacity = React.useRef(new Animated.Value(0)).current;
  const backgroundOpacity = React.useRef(new Animated.Value(0)).current;

  // PanResponder za swipe-down navigaciju (samo kada nije scroll)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Aktiviraj samo ako je swipe-down i nije scroll
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && 
               Math.abs(gestureState.dy) > 10 &&
               gestureState.dy > 0; // Samo swipe down
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 && onBack) { // Swipe down
          onBack();
        }
      },
    })
  ).current;


  // Pokreni animacije pri učitavanju - sinkronizirano s pozadinskom slikom
  useEffect(() => {
    // Pozadinska slika i logo zajedno - prvi (0ms)
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Title - drugi (200ms)
    Animated.timing(titleOpacity, {
      toValue: 1,
      duration: 600,
      delay: 200,
      useNativeDriver: true,
    }).start();

    // Form - treći (400ms)
    Animated.timing(formOpacity, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, [isLoginMode]); // Reset animacije kada se mijenja mod (login/register)

  // Login handler
  const handleLogin = async () => {
    setLoginError('');
    setLoginLoading(true);

    try {
      const { login } = await import('../services/api');
      const { authStorage } = await import('../services/storage');
      
      const result = await login({ username, password });
      
      if (result.ok && result.token) {
        // Provjeri je li trener
        if (result.userType === 'trainer' && result.userId) {
          // Spremi trener podatke
          await authStorage.saveToken(result.token);
          await authStorage.saveTrainerId(result.userId);
          if (result.username) {
            await authStorage.saveUsername(result.username);
          }
          
          setLoginLoading(false);
          setLoginError(''); // Clear any error
          
          // Prikaži uspješnu poruku
          console.log('[Login] Trainer login successful:', result.name);
          
          // Pozovi trener callback ako postoji
          if (onTrainerLoginSuccess) {
            onTrainerLoginSuccess({
              id: result.userId,
              name: result.name || '',
              email: result.username || username,
              trainerCode: result.trainerCode || '',
              accessToken: result.token,
            });
          } else {
            // Fallback na običan login success
            onLoginSuccess?.();
          }
          return;
        }
        
        // Klijent login
        if (result.clientId) {
          await authStorage.saveToken(result.token);
          await authStorage.saveClientId(result.clientId);
          if (result.username) {
            await authStorage.saveUsername(result.username);
          }
          
          setLoginLoading(false);
          onLoginSuccess?.();
        } else {
          setLoginError(result.message || 'Pogrešno korisničko ime ili lozinka');
          setLoginLoading(false);
        }
      } else {
        setLoginError(result.message || 'Pogrešno korisničko ime ili lozinka');
        setLoginLoading(false);
      }
    } catch (error) {
      setLoginError('Greška pri prijavi. Molimo pokušajte ponovno.');
      setLoginLoading(false);
    }
  };

  // Register handler
  const handleRegister = async () => {
    setRegisterError('');

    if (!registerName || !registerUsername || !registerEmail || !registerPhone || !registerPassword) {
      setRegisterError('Molimo ispunite sva polja');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Lozinke se ne podudaraju');
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError('Lozinka mora imati najmanje 6 znakova');
      return;
    }

    setRegisterLoading(true);

    try {
      const { register } = await import('../services/api');
      const { authStorage } = await import('../services/storage');
      
      const result = await register({
        name: registerName,
        username: registerUsername,
        email: registerEmail,
        phone: registerPhone,
        password: registerPassword,
      });
      
      if (result.ok && result.token && result.clientId) {
        // Spremi token i clientId
        await authStorage.saveToken(result.token);
        await authStorage.saveClientId(result.clientId);
        if (result.username) {
          await authStorage.saveUsername(result.username);
        }
        
        setRegisterLoading(false);
        setIsLoginMode(true);
        setUsername(registerUsername);
        setRegisterError('');
        // Automatski prijavi korisnika nakon registracije
        onLoginSuccess?.();
      } else {
        setRegisterError(result.message || 'Greška pri registraciji');
        setRegisterLoading(false);
      }
    } catch (error) {
      setRegisterError('Greška pri registraciji. Molimo pokušajte ponovno.');
      setRegisterLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      {...panResponder.panHandlers}
    >
      {/* Rotirajuće pozadinske slike - sinkronizirano s animacijom */}
      <Animated.View 
        style={[
          styles.backgroundContainer,
          { opacity: backgroundOpacity }
        ]}
      >
        {/* Video pozadina */}
        <Video
          source={{ uri: BACKGROUND_VIDEO_URL }}
          style={styles.backgroundVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onError={() => console.log('Video error - using fallback')}
        />
        {/* Fallback slika dok se video učitava */}
        <Image
          source={{ uri: fallbackImage }}
          style={[styles.image, styles.fallbackImage]}
          resizeMode="cover"
        />
        {/* Overlay za čitljivost */}
        <View style={styles.imageOverlay} />
      </Animated.View>

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />

      {/* CORPEX logo */}
      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
        <Text style={styles.logo}>CORPEX</Text>
      </Animated.View>

      {/* Main content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {isLoginMode ? (
            <Animated.View style={[styles.formContainer, { opacity: formOpacity }]}>
              <Animated.View style={{ opacity: titleOpacity }}>
                <Text style={styles.title}>Prijava</Text>
                <Text style={styles.subtitle}>Unesi podatke za pristup</Text>
              </Animated.View>

              <View style={styles.form}>
                {/* Email */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>E-MAIL</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="email@example.com"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>LOZINKA</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                  />
                </View>

                {/* Error */}
                {loginError ? <Text style={styles.error}>{loginError}</Text> : null}

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.button, loginLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>NASTAVI</Text>
                  )}
                </TouchableOpacity>

                {/* Switch to register */}
                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => setIsLoginMode(false)}
                >
                  <Text style={styles.switchButtonText}>
                    Nemaš račun? Registriraj se →
                  </Text>
                </TouchableOpacity>

                {/* Trainer register link */}
                {onTrainerRegister && (
                  <TouchableOpacity
                    style={styles.trainerRegisterLink}
                    onPress={onTrainerRegister}
                  >
                    <Text style={styles.trainerRegisterLinkText}>
                      Registracija trenera →
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Skip login */}
                {onSkipLogin && (
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={onSkipLogin}
                  >
                    <Text style={styles.skipButtonText}>
                      Preskoči prijavu →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          ) : (
            <Animated.View style={[styles.formContainer, { opacity: formOpacity }]}>
              <Animated.View style={{ opacity: titleOpacity }}>
                <Text style={styles.title}>Registracija</Text>
                <Text style={styles.subtitle}>Kreiraj svoj račun</Text>
              </Animated.View>

              <View style={styles.form}>
                {/* Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>IME I PREZIME</Text>
                  <TextInput
                    style={styles.input}
                    value={registerName}
                    onChangeText={setRegisterName}
                    placeholder="Ivan Horvat"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                {/* Username */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>KORISNIČKO IME</Text>
                  <TextInput
                    style={styles.input}
                    value={registerUsername}
                    onChangeText={setRegisterUsername}
                    placeholder="ivan.horvat"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="none"
                  />
                </View>

                {/* Email */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>EMAIL</Text>
                  <TextInput
                    style={styles.input}
                    value={registerEmail}
                    onChangeText={setRegisterEmail}
                    placeholder="ivan@example.com"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Phone */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>TELEFON</Text>
                  <TextInput
                    style={styles.input}
                    value={registerPhone}
                    onChangeText={setRegisterPhone}
                    placeholder="+385 91 123 4567"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>LOZINKA</Text>
                  <TextInput
                    style={styles.input}
                    value={registerPassword}
                    onChangeText={setRegisterPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                  />
                </View>

                {/* Confirm Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>POTVRDI LOZINKU</Text>
                  <TextInput
                    style={styles.input}
                    value={registerConfirmPassword}
                    onChangeText={setRegisterConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                  />
                </View>

                {/* Error */}
                {registerError ? <Text style={styles.error}>{registerError}</Text> : null}

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.button, registerLoading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>REGISTRIRAJ SE</Text>
                  )}
                </TouchableOpacity>

                {/* Switch to login */}
                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => setIsLoginMode(true)}
                >
                  <Text style={styles.switchButtonText}>
                    ← Već imaš račun? Prijavi se
                  </Text>
                </TouchableOpacity>

                {/* Trainer register link */}
                {onTrainerRegister && (
                  <TouchableOpacity
                    style={styles.trainerRegisterLink}
                    onPress={onTrainerRegister}
                  >
                    <Text style={styles.trainerRegisterLinkText}>
                      Registracija trenera →
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Skip login */}
                {onSkipLogin && (
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={onSkipLogin}
                  >
                    <Text style={styles.skipButtonText}>
                      Preskoči prijavu →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Bottom decoration line */}
      <View style={styles.bottomLine} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1, // Iza videa
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)', // Malo tamniji za bolju čitljivost
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logoContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  logo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '300',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 10,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 12,
    color: '#fff',
    fontSize: 18,
    fontWeight: '300',
  },
  error: {
    color: 'rgba(255,64,64,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '300',
    textTransform: 'uppercase',
  },
  switchButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  switchButtonText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  trainerRegisterLink: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  trainerRegisterLinkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

