/**
 * Trainer Register Screen
 * ========================
 * Jednostavan flow:
 * 1. Trener ispuni formu (ime, email, telefon, lozinka)
 * 2. Admin odobri → Račun se automatski kreira
 * 3. Trener se prijavi
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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getApiBaseUrl } from '../services/api';

const backgroundImage = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop&q=80';

interface TrainerRegisterScreenProps {
  onRegisterSuccess?: () => void;
  onBack?: () => void;
}

export default function TrainerRegisterScreen({ onRegisterSuccess, onBack }: TrainerRegisterScreenProps) {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    messages: string[];
  }>({ score: 0, messages: [] });
  
  // Animacije
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);
  
  // Provjeri snagu lozinke
  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength({ score: 0, messages: [] });
      return;
    }
    
    const messages: string[] = [];
    let score = 0;
    
    if (password.length >= 8) score++;
    else messages.push('Min. 8 znakova');
    
    if (/[A-Z]/.test(password)) score++;
    else messages.push('Veliko slovo');
    
    if (/[a-z]/.test(password)) score++;
    else messages.push('Malo slovo');
    
    if (/[0-9]/.test(password)) score++;
    else messages.push('Broj');
    
    setPasswordStrength({ score, messages });
  }, [password]);
  
  // Validacija
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Unesite ime i prezime');
      return false;
    }
    
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Unesite ispravan email');
      return false;
    }
    
    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 znakova');
      return false;
    }
    
    if (passwordStrength.score < 4) {
      setError('Lozinka nije dovoljno jaka: ' + passwordStrength.messages.join(', '));
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Lozinke se ne podudaraju');
      return false;
    }
    
    return true;
  };
  
  // Pošalji zahtjev
  const handleSubmit = async () => {
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const API_URL = getApiBaseUrl();
      
      console.log('[TrainerRequest] Sending to:', `${API_URL}/api/trainer/request-access`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_URL}/api/trainer/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim() || undefined,
          password: password,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data.ok) {
        setRequestSent(true);
        Alert.alert(
          '✅ Zahtjev poslan!',
          'Vaš zahtjev je uspješno poslan.\n\nKad ga odobrimo, dobit ćete email s potvrdom i moći ćete se prijaviti s emailom i lozinkom koju ste upravo unijeli.',
          [{ text: 'U redu' }]
        );
      } else {
        setError(data.message || 'Greška pri slanju zahtjeva');
      }
    } catch (err: any) {
      console.error('[TrainerRequest] Error:', err);
      if (err.name === 'AbortError') {
        setError('Zahtjev je istekao. Server ne odgovara.');
      } else {
        setError(`Greška: ${err.message || 'Provjerite internet vezu.'}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Password strength indicator
  const renderPasswordStrength = () => {
    if (password.length === 0) return null;
    
    const colors = ['#ff4444', '#ff8800', '#ffcc00', '#44ff44'];
    const labels = ['Slaba', 'Srednja', 'Dobra', 'Odlična'];
    
    return (
      <View style={styles.passwordStrengthContainer}>
        <View style={styles.passwordStrengthBars}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.passwordStrengthBar,
                {
                  backgroundColor: i < passwordStrength.score
                    ? colors[passwordStrength.score - 1]
                    : 'rgba(255,255,255,0.1)',
                },
              ]}
            />
          ))}
        </View>
        <Text style={[
          styles.passwordStrengthLabel,
          { color: colors[passwordStrength.score - 1] || 'rgba(255,255,255,0.3)' }
        ]}>
          {passwordStrength.score > 0 ? labels[passwordStrength.score - 1] : ''}
        </Text>
      </View>
    );
  };
  
  // Success state
  if (requestSent) {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundContainer}>
          <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} resizeMode="cover" />
          <View style={styles.imageOverlay} />
        </View>
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.9)']} style={styles.gradient} />
        
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>📧</Text>
          <Text style={styles.successTitle}>Zahtjev poslan!</Text>
          <Text style={styles.successText}>
            Vaš zahtjev čeka odobrenje.
            {'\n\n'}
            Kad ga odobrimo, dobit ćete email i moći ćete se <Text style={styles.boldText}>prijaviti</Text> s:
            {'\n\n'}
            📧 {email}
            {'\n'}
            🔐 Lozinka koju ste unijeli
          </Text>
          <TouchableOpacity style={styles.backToLoginButton} onPress={onBack}>
            <Text style={styles.backToLoginText}>← Natrag na prijavu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background */}
      <View style={styles.backgroundContainer}>
        <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} resizeMode="cover" />
        <View style={styles.imageOverlay} />
      </View>
      
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.9)']} style={styles.gradient} />
      
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Natrag</Text>
      </TouchableOpacity>
      
      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🏋️</Text>
            <Text style={styles.title}>Postani Corpex trener</Text>
            <Text style={styles.subtitle}>
              Ispuni formu i pričekaj odobrenje. Račun će biti automatski kreiran.
            </Text>
          </View>
          
          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>IME I PREZIME *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ivan Horvat"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="words"
              />
            </View>
            
            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>EMAIL *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ivan@gym.hr"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            {/* Phone */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>TELEFON (OPCIJALNO)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+385 91 123 4567"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="phone-pad"
              />
            </View>
            
            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>LOZINKA *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 znakova, veliko slovo, broj"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry
              />
              {renderPasswordStrength()}
            </View>
            
            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>POTVRDI LOZINKU *</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry
              />
            </View>
            
            {/* Error */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}
            
            {/* Submit */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>POŠALJI ZAHTJEV</Text>
              )}
            </TouchableOpacity>
            
            {/* Info */}
            <Text style={styles.infoText}>
              Nakon odobrenja, račun će biti automatski kreiran i moći ćete se prijaviti s ovim emailom i lozinkom.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
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
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    padding: 10,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
  },
  formContainer: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    color: '#fff',
    fontSize: 17,
    fontWeight: '300',
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  passwordStrengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  passwordStrengthLabel: {
    fontSize: 11,
    fontWeight: '500',
    width: 60,
    textAlign: 'right',
  },
  errorContainer: {
    backgroundColor: 'rgba(255,64,64,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,64,64,0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.6)',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 20,
  },
  successText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  boldText: {
    fontWeight: '600',
    color: '#fff',
  },
  backToLoginButton: {
    marginTop: 40,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backToLoginText: {
    color: 'rgba(139, 92, 246, 1)',
    fontSize: 16,
    fontWeight: '500',
  },
});
