/**
 * Trainer Register Screen
 * Registracija novog trenera s pozivnim kodom
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

// Ista pozadinska slika kao login
const backgroundImage = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop&q=80';

interface TrainerRegisterScreenProps {
  onRegisterSuccess?: (trainerData: {
    id: string;
    name: string;
    email: string;
    trainerCode: string;
    accessToken: string;
  }) => void;
  onBack?: () => void;
}

export default function TrainerRegisterScreen({ onRegisterSuccess, onBack }: TrainerRegisterScreenProps) {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
  
  // Validiraj formu
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
    
    if (!inviteCode.trim()) {
      setError('Unesite pozivni kod');
      return false;
    }
    
    return true;
  };
  
  // Registracija
  const handleRegister = async () => {
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { getApiBaseUrl } = await import('../services/api');
      const API_URL = getApiBaseUrl();
      
      const response = await fetch(`${API_URL}/api/auth/register-trainer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim() || undefined,
          password,
          inviteCode: inviteCode.trim().toUpperCase(),
        }),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        // Uspješna registracija
        Alert.alert(
          '✅ Registracija uspješna!',
          `Dobrodošao ${data.trainer.name}!\n\nTvoj trener kod: ${data.trainer.trainerCode}\n\nKlijenti koriste ovaj kod za povezivanje s tobom.`,
          [
            {
              text: 'Nastavi',
              onPress: () => {
                onRegisterSuccess?.({
                  id: data.trainer.id,
                  name: data.trainer.name,
                  email: data.trainer.email,
                  trainerCode: data.trainer.trainerCode,
                  accessToken: data.accessToken,
                });
              },
            },
          ]
        );
      } else {
        setError(data.message || 'Greška pri registraciji');
      }
    } catch (err) {
      console.error('[TrainerRegister] Error:', err);
      setError('Greška pri povezivanju. Provjerite internet vezu.');
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background */}
      <View style={styles.backgroundContainer}>
        <Image
          source={{ uri: backgroundImage }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay} />
      </View>
      
      {/* Gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      />
      
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
            <Text style={styles.title}>Registracija trenera</Text>
            <Text style={styles.subtitle}>
              Kreiraj svoj trenerski račun i počni raditi s klijentima
            </Text>
          </View>
          
          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>IME I PREZIME</Text>
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
              <Text style={styles.label}>EMAIL</Text>
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
              <Text style={styles.label}>LOZINKA</Text>
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
              <Text style={styles.label}>POTVRDI LOZINKU</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry
              />
            </View>
            
            {/* Invite Code */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>POZIVNI KOD *</Text>
              <TextInput
                style={[styles.input, styles.inviteCodeInput]}
                value={inviteCode}
                onChangeText={(text) => setInviteCode(text.toUpperCase())}
                placeholder="XXXXXX"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="characters"
                maxLength={20}
              />
              <Text style={styles.inviteCodeHint}>
                Pozivni kod dobiješ od Corpex tima
              </Text>
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
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>REGISTRIRAJ SE</Text>
              )}
            </TouchableOpacity>
            
            {/* Info */}
            <Text style={styles.infoText}>
              Registracijom prihvaćaš uvjete korištenja i pravila privatnosti.
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
    marginBottom: 40,
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
  inviteCodeInput: {
    letterSpacing: 4,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  inviteCodeHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 8,
    textAlign: 'center',
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
});

