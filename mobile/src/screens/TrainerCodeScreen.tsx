/**
 * Trainer Code Screen
 * ====================
 * Ekran za trenera da vidi i dijeli svoj kod s klijentima
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  Clipboard,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

interface Props {
  authToken: string;
  onBack?: () => void;
}

export default function TrainerCodeScreen({ authToken, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [trainerCode, setTrainerCode] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState<string>('');
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadTrainerCode();
  }, []);

  async function loadTrainerCode() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/code`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();
      
      if (result.success) {
        setTrainerCode(result.data.trainerCode);
        setTrainerName(result.data.name || 'Trener');
      } else {
        Alert.alert('Greška', result.error || 'Nije moguće učitati kod.');
      }
    } catch (error) {
      console.error('Error loading trainer code:', error);
      Alert.alert('Greška', 'Nije moguće učitati kod. Provjerite internet vezu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerateCode() {
    Alert.alert(
      'Regeneriraj kod',
      'Ako generirate novi kod, klijenti s starim kodom se neće moći povezati. Jeste li sigurni?',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Generiraj novi',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            try {
              const response = await fetch(`${API_BASE_URL}/api/trainer/code`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
              });
              const result = await response.json();
              
              if (result.success) {
                setTrainerCode(result.data.trainerCode);
                Alert.alert('Uspjeh', 'Novi kod je generiran!');
              } else {
                Alert.alert('Greška', result.error || 'Nije moguće generirati novi kod.');
              }
            } catch (error) {
              console.error('Error regenerating code:', error);
              Alert.alert('Greška', 'Nije moguće generirati novi kod.');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  }

  function handleCopyCode() {
    if (trainerCode) {
      Clipboard.setString(trainerCode);
      Alert.alert('Kopirano!', 'Kod je kopiran u međuspremnik.');
    }
  }

  async function handleShareCode() {
    if (!trainerCode) return;
    
    try {
      await Share.share({
        message: `Pridruži mi se na fitness aplikaciji! \n\nMoj kod za povezivanje: ${trainerCode}\n\nSkini aplikaciju i unesi ovaj kod da se povežeš sa mnom kao svojim trenerom.`,
        title: 'Pozivnica za fitness aplikaciju',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Učitavanje koda...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.backText}>← Natrag</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Moj kod</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}></Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Tvoj jedinstveni kod</Text>
          <Text style={styles.subtitle}>
            Podijeli ovaj kod s klijentima da se povežu s tobom
          </Text>

          {/* Code Display */}
          <TouchableOpacity style={styles.codeContainer} onPress={handleCopyCode}>
            <Text style={styles.codeText}>{trainerCode}</Text>
            <Text style={styles.codeTap}>Klikni za kopiranje</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
              <Text style={styles.shareIcon}>📤</Text>
              <Text style={styles.shareButtonText}>Podijeli kod</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Text style={styles.copyIcon}></Text>
              <Text style={styles.copyButtonText}>Kopiraj</Text>
            </TouchableOpacity>
          </View>

          {/* Regenerate Button */}
          <TouchableOpacity 
            style={styles.regenerateButton} 
            onPress={handleRegenerateCode}
            disabled={regenerating}
          >
            {regenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.regenerateText}>🔄 Generiraj novi kod</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>📱 Kako klijent koristi kod:</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Klijent skine aplikaciju</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Prođe onboarding (unese svoje podatke)</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Klikne "Poveži se s trenerom"</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Unese tvoj kod: {trainerCode}</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>✓</Text>
            <Text style={styles.stepText}>Pojavi se u tvojoj listi klijenata!</Text>
          </View>
        </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  placeholder: { width: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 10, fontSize: 16 },
  content: {
    paddingHorizontal: 30,
    alignItems: 'center',
    paddingTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 30,
  },
  codeContainer: {
    backgroundColor: '#27272A',
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 40,
    marginBottom: 25,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 3,
  },
  codeTap: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3F3F46',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareIcon: { fontSize: 18 },
  shareButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyIcon: { fontSize: 18 },
  copyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  regenerateButton: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginTop: 10,
  },
  regenerateText: {
    color: '#A1A1AA',
    fontSize: 15,
    fontWeight: '500',
  },
  instructions: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  instructionsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#27272A',
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
    overflow: 'hidden',
  },
  stepText: {
    color: '#D4D4D8',
    fontSize: 14,
    flex: 1,
  },
});

