/**
 * Calculations Summary Screen
 * Prikazuje izračunate podatke prije generiranja plana prehrane
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CalculationsSummaryScreenProps {
  calculations: {
    bmr: number;
    tdee: number;
    targetCalories: number;
    macros: {
      protein: number;
      carbs: number;
      fats: number;
    };
    goalType: 'lose' | 'maintain' | 'gain';
  };
  onGenerate: () => void;
  onBack?: () => void;
}

const GOAL_LABELS: Record<string, string> = {
  lose: 'Gubitak težine',
  maintain: 'Održavanje težine',
  gain: 'Povećanje težine',
};

export default function CalculationsSummaryScreen({
  calculations,
  onGenerate,
  onBack,
}: CalculationsSummaryScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Nazad</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Tvoji Izračunati Podaci</Text>
          <Text style={styles.subtitle}>
            Ovo su tvoji ciljni makronutrijenti za {GOAL_LABELS[calculations.goalType]}
          </Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* BMR */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>BMR (Bazalni metabolizam)</Text>
            <Text style={styles.cardValue}>{Math.round(calculations.bmr)}</Text>
            <Text style={styles.cardUnit}>kalorija/dan</Text>
            <Text style={styles.cardDescription}>
              Minimalna količina energije koju tvoje tijelo troši u mirovanju
            </Text>
          </View>

          {/* TDEE */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TDEE (Ukupna dnevna potrošnja)</Text>
            <Text style={styles.cardValue}>{Math.round(calculations.tdee)}</Text>
            <Text style={styles.cardUnit}>kalorija/dan</Text>
            <Text style={styles.cardDescription}>
              Ukupna količina energije koju tvoje tijelo troši uključujući aktivnost
            </Text>
          </View>

          {/* Target Calories */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Ciljane kalorije</Text>
            <Text style={styles.cardValue}>{Math.round(calculations.targetCalories)}</Text>
            <Text style={styles.cardUnit}>kalorija/dan</Text>
            <Text style={styles.cardDescription}>
              {calculations.goalType === 'lose' && 'Kalorijski deficit za gubitak težine'}
              {calculations.goalType === 'maintain' && 'Kalorije za održavanje trenutne težine'}
              {calculations.goalType === 'gain' && 'Kalorijski suficit za povećanje težine'}
            </Text>
          </View>

          {/* Macros */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Makronutrijenti</Text>
            <View style={styles.macrosGrid}>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{Math.round(calculations.macros.protein)}g</Text>
                <Text style={styles.macroLabel}>Proteini</Text>
                <Text style={styles.macroCalories}>
                  {Math.round(calculations.macros.protein * 4)} kcal
                </Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{Math.round(calculations.macros.carbs)}g</Text>
                <Text style={styles.macroLabel}>Ugljikohidrati</Text>
                <Text style={styles.macroCalories}>
                  {Math.round(calculations.macros.carbs * 4)} kcal
                </Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{Math.round(calculations.macros.fats)}g</Text>
                <Text style={styles.macroLabel}>Masti</Text>
                <Text style={styles.macroCalories}>
                  {Math.round(calculations.macros.fats * 9)} kcal
                </Text>
              </View>
            </View>
            <View style={styles.macrosTotal}>
              <Text style={styles.macrosTotalText}>
                Ukupno: {Math.round(calculations.macros.protein * 4 + calculations.macros.carbs * 4 + calculations.macros.fats * 9)} kcal
              </Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 Informacije</Text>
            <Text style={styles.infoText}>
              Na temelju ovih podataka generirat ćemo tjedni plan prehrane koji će ti pomoći da postigneš svoj cilj.
            </Text>
            <Text style={styles.infoText}>
              Plan će uključivati obroke prilagođene tvojim kalorijskim i makronutrijentnim ciljevima.
            </Text>
          </View>
        </ScrollView>

        {/* Generate Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={onGenerate}
            activeOpacity={0.8}
          >
            <Text style={styles.generateButtonText}>Generiraj Plan Prehrane</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  cardValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  cardUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  macroBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macroCalories: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macrosTotal: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  macrosTotalText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  generateButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
});

