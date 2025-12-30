/**
 * Connect Trainer Screen
 * ======================
 * Ekran za povezivanje klijenta s trenerom putem koda
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

interface Props {
  authToken: string;
  onConnected?: (trainerName: string, trainerId: string) => void;
  onSkip?: () => void;
  onBack?: () => void;
  onBrowseTrainers?: () => void; // Navigacija na listu trenera
}

export default function ConnectTrainerScreen({ authToken, onConnected, onSkip, onBack, onBrowseTrainers }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formatiraj kod dok korisnik tipka (auto-uppercase, dodaj TRN- ako nema)
  function handleCodeChange(text: string) {
    let formatted = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    // Ako korisnik unese samo 4 znaka, dodaj TRN- prefix
    if (formatted.length === 4 && !formatted.startsWith('TRN')) {
      formatted = 'TRN-' + formatted;
    }
    
    // Ograniči na 8 znakova (TRN-XXXX)
    if (formatted.length > 8) {
      formatted = formatted.substring(0, 8);
    }
    
    setCode(formatted);
    setError(null);
  }

  async function handleConnect() {
    // Validiraj format
    const codeToSubmit = code.startsWith('TRN-') ? code : `TRN-${code}`;
    
    if (!/^TRN-[A-Z0-9]{4}$/.test(codeToSubmit)) {
      setError('Neispravan format koda. Očekivani format: TRN-XXXX');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/client/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trainerCode: codeToSubmit }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '🎉 Uspješno povezano!',
          result.message,
          [
            {
              text: 'Nastavi',
              onPress: () => onConnected?.(result.data.trainerName, result.data.trainerId),
            },
          ]
        );
      } else {
        setError(result.error || 'Došlo je do greške. Pokušajte ponovo.');
      }
    } catch (err) {
      console.error('Connect error:', err);
      setError('Nije moguće povezati se. Provjerite internet vezu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            {onBack && (
              <TouchableOpacity onPress={onBack}>
                <Text style={styles.backText}>← Natrag</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔗</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>Poveži se s trenerom</Text>
            <Text style={styles.subtitle}>
              Unesite kod koji ste dobili od svog trenera
            </Text>

            {/* Browse Trainers Button */}
            {onBrowseTrainers && (
              <TouchableOpacity style={styles.browseButton} onPress={onBrowseTrainers}>
                <Text style={styles.browseButtonText}>🔍 Pregledaj trenere i njihove profile</Text>
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ili unesite kod</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Code Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="TRN-XXXX"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                keyboardType="default"
              />
              
              {/* Helper text */}
              <Text style={styles.helperText}>
                Format: TRN-XXXX (npr. TRN-A3X9)
              </Text>
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            {/* Connect Button */}
            <TouchableOpacity
              style={[styles.connectButton, loading && styles.buttonDisabled]}
              onPress={handleConnect}
              disabled={loading || code.length < 4}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.connectButtonText}>🔗 Poveži se</Text>
              )}
            </TouchableOpacity>

            {/* Skip Button */}
            {onSkip && (
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipButtonText}>Nastavi bez trenera</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 Kako dobiti kod?</Text>
            <Text style={styles.infoText}>
              Vaš trener ima jedinstveni kod u svojoj aplikaciji.{'\n'}
              Zamolite ga da vam pošalje kod putem SMS-a ili emaila.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backText: { color: '#8B5CF6', fontSize: 16, fontWeight: '600' },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: { fontSize: 48 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  browseButtonText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3A3A3C',
  },
  dividerText: {
    color: '#48484A',
    fontSize: 12,
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 4,
    borderWidth: 2,
    borderColor: '#444',
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    padding: 15,
  },
  skipButtonText: {
    color: '#888',
    fontSize: 16,
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 40,
  },
  infoTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    color: '#AAA',
    fontSize: 14,
    lineHeight: 20,
  },
});

