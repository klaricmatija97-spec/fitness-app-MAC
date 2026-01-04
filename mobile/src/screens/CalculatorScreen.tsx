/**
 * Calculator Screen
 * Kalkulatori za BMR, TDEE, Target Calories i Macros
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Platform,
  PanResponder,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
  type Gender,
  type ActivityLevel,
  type GoalType,
} from '../lib/calculations';

// Premium sportske slike
const backgroundImages = [
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80',
];

type CalculatorStep = 'bmr' | 'tdee' | 'target' | 'macros';

interface CalculatorScreenProps {
  onComplete: (results: {
    bmr: number;
    tdee: number;
    targetCalories: number;
    macros: { protein: number; carbs: number; fats: number };
  }) => void;
  onBack?: () => void;
  initialData?: {
    weight?: number;
    height?: number;
    age?: number;
    gender?: Gender;
  };
}

export default function CalculatorScreen({ onComplete, onBack, initialData }: CalculatorScreenProps) {
  const [currentStep, setCurrentStep] = useState<CalculatorStep>('bmr');
  const [currentBgImage, setCurrentBgImage] = useState(0);
  
  // BMR inputs
  const [bmrInputs, setBmrInputs] = useState({
    weight: initialData?.weight?.toString() || '',
    height: initialData?.height?.toString() || '',
    age: initialData?.age?.toString() || '',
    gender: (initialData?.gender || 'male') as Gender,
  });
  const [bmrResult, setBmrResult] = useState<number | null>(null);
  
  // TDEE inputs
  const [tdeeInputs, setTdeeInputs] = useState({
    bmr: 0,
    activityLevel: 'moderate' as ActivityLevel,
  });
  const [tdeeResult, setTdeeResult] = useState<number | null>(null);
  
  // Target inputs
  const [targetInputs, setTargetInputs] = useState({
    tdee: 0,
    goalType: 'maintain' as GoalType,
  });
  const [targetResult, setTargetResult] = useState<number | null>(null);
  
  // Macros inputs
  const [macrosInputs, setMacrosInputs] = useState({
    targetCalories: 0,
    goalType: 'maintain' as GoalType,
    weight: 0,
  });
  const [macrosResult, setMacrosResult] = useState<{ protein: number; carbs: number; fats: number } | null>(null);

  // Animacije
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // PanResponder za swipe-down navigaciju
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 && onBack) {
          onBack();
        }
      },
    })
  ).current;

  // Rotiraj pozadinske slike svakih 8 sekundi
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgImage((prev) => (prev + 1) % backgroundImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Ažuriraj inpute kada se initialData promijeni (npr. iz intake flow-a)
  useEffect(() => {
    if (initialData) {
      const newInputs = {
        weight: initialData.weight?.toString() || '',
        height: initialData.height?.toString() || '',
        age: initialData.age?.toString() || '',
        gender: initialData.gender || 'male' as Gender,
      };
      setBmrInputs(newInputs);
      
      // Auto-izračunaj BMR ako su svi podaci prisutni
      const weight = parseFloat(newInputs.weight);
      const height = parseFloat(newInputs.height);
      const age = parseInt(newInputs.age);
      
      if (weight && height && age) {
        const bmr = calculateBMR(weight, height, age, newInputs.gender);
        setBmrResult(bmr);
        setTdeeInputs(prev => ({ ...prev, bmr }));
      }
    }
  }, [initialData?.weight, initialData?.height, initialData?.age, initialData?.gender]);

  // Animacija pri promjeni stepa
  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  const handleBMRCalculate = () => {
    const weight = parseFloat(bmrInputs.weight);
    const height = parseFloat(bmrInputs.height);
    const age = parseInt(bmrInputs.age);
    
    if (!weight || !height || !age) {
      return;
    }
    
    const bmr = calculateBMR(weight, height, age, bmrInputs.gender);
    setBmrResult(bmr);
    setTdeeInputs({ ...tdeeInputs, bmr });
  };

  const handleBMRContinue = () => {
    if (bmrResult) {
      setCurrentStep('tdee');
      contentOpacity.setValue(0);
    }
  };

  const handleTDEECalculate = () => {
    if (!tdeeInputs.bmr) return;
    
    const tdee = calculateTDEE(tdeeInputs.bmr, tdeeInputs.activityLevel);
    setTdeeResult(tdee);
    setTargetInputs({ ...targetInputs, tdee });
  };

  const handleTDEEContinue = () => {
    if (tdeeResult) {
      setCurrentStep('target');
      contentOpacity.setValue(0);
    }
  };

  const handleTargetCalculate = () => {
    if (!targetInputs.tdee) return;
    
    const target = calculateTargetCalories(targetInputs.tdee, targetInputs.goalType);
    setTargetResult(target);
    setMacrosInputs({
      ...macrosInputs,
      targetCalories: target,
      goalType: targetInputs.goalType,
      weight: parseFloat(bmrInputs.weight) || 0,
    });
  };

  const handleTargetContinue = () => {
    if (targetResult) {
      setCurrentStep('macros');
      contentOpacity.setValue(0);
    }
  };

  const handleMacrosCalculate = () => {
    if (!macrosInputs.targetCalories || !macrosInputs.weight) return;
    
    const macros = calculateMacros(
      macrosInputs.targetCalories,
      macrosInputs.goalType,
      macrosInputs.weight
    );
    setMacrosResult(macros);
  };

  const handleMacrosComplete = () => {
    if (bmrResult && tdeeResult && targetResult && macrosResult) {
      onComplete({
        bmr: bmrResult,
        tdee: tdeeResult,
        targetCalories: targetResult,
        macros: macrosResult,
        goalType: macrosInputs.goalType,
      });
    }
  };

  // Provjeri je li podatak preuzet iz onboardinga
  const hasPrefilledData = initialData?.weight && initialData?.height && initialData?.age;

  const renderBMR = () => (
    <View style={styles.stepContainer}>
      {/* Minimalistički header */}
      <Text style={styles.stepTitleMinimal}>Bazalni metabolizam</Text>
      
      {hasPrefilledData ? (
        // MINIMALNI UI - podaci su već tu
        <>
          {/* Kompaktni prikaz podataka */}
          <View style={styles.dataCardsRow}>
            <View style={styles.dataCardSmall}>
              <Text style={styles.dataCardValue}>{bmrInputs.weight}</Text>
              <Text style={styles.dataCardLabel}>kg</Text>
            </View>
            <View style={styles.dataCardSmall}>
              <Text style={styles.dataCardValue}>{bmrInputs.height}</Text>
              <Text style={styles.dataCardLabel}>cm</Text>
            </View>
            <View style={styles.dataCardSmall}>
              <Text style={styles.dataCardValue}>{bmrInputs.age}</Text>
              <Text style={styles.dataCardLabel}>god</Text>
            </View>
            <View style={styles.dataCardSmall}>
              <Text style={styles.dataCardValue}>{bmrInputs.gender === 'male' ? '♂' : '♀'}</Text>
              <Text style={styles.dataCardLabel}>{bmrInputs.gender === 'male' ? 'M' : 'Ž'}</Text>
            </View>
          </View>

          {/* Veliki rezultat */}
          {bmrResult !== null ? (
            <View style={styles.bigResultContainer}>
              <Text style={styles.bigResultValue}>{bmrResult}</Text>
              <Text style={styles.bigResultLabel}>kcal/dan</Text>
              <Text style={styles.bigResultDescription}>
                Toliko kalorija tvoje tijelo troši u mirovanju
              </Text>
              
              <TouchableOpacity style={styles.continueButtonPrimary} onPress={handleBMRContinue}>
                <Text style={styles.continueButtonPrimaryText}>Nastavi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.calcButtonLarge} onPress={handleBMRCalculate}>
              <Text style={styles.calcButtonLargeText}>Izračunaj</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        // PUNI UI - nema prethodno unesenih podataka
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Težina (kg)</Text>
            <TextInput
              style={styles.input}
              value={bmrInputs.weight}
              onChangeText={(v) => setBmrInputs({ ...bmrInputs, weight: v })}
              keyboardType="numeric"
              placeholder="npr. 70"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Visina (cm)</Text>
            <TextInput
              style={styles.input}
              value={bmrInputs.height}
              onChangeText={(v) => setBmrInputs({ ...bmrInputs, height: v })}
              keyboardType="numeric"
              placeholder="npr. 175"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Dob (godine)</Text>
            <TextInput
              style={styles.input}
              value={bmrInputs.age}
              onChangeText={(v) => setBmrInputs({ ...bmrInputs, age: v })}
              keyboardType="numeric"
              placeholder="npr. 30"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Spol</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  bmrInputs.gender === 'male' && styles.pickerOptionSelected,
                ]}
                onPress={() => setBmrInputs({ ...bmrInputs, gender: 'male' })}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    bmrInputs.gender === 'male' && styles.pickerOptionTextSelected,
                  ]}
                >
                  Muškarac
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  bmrInputs.gender === 'female' && styles.pickerOptionSelected,
                ]}
                onPress={() => setBmrInputs({ ...bmrInputs, gender: 'female' })}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    bmrInputs.gender === 'female' && styles.pickerOptionTextSelected,
                  ]}
                >
                  Žena
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.calcButton} onPress={handleBMRCalculate}>
            <Text style={styles.calcButtonText}>Izračunaj BMR</Text>
          </TouchableOpacity>

          {bmrResult !== null && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Tvoj BMR</Text>
              <Text style={styles.resultValue}>{bmrResult}</Text>
              <Text style={styles.resultUnit}>kalorija/dan</Text>
              
              <TouchableOpacity style={styles.continueButton} onPress={handleBMRContinue}>
                <Text style={styles.continueButtonText}>Nastavi →</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );

  const activityOptions = [
    { label: 'Sjedilački', desc: 'Ured, malo kretanja', value: 'sedentary', emoji: '🪑' },
    { label: 'Lagano', desc: '1-3 treninga/tjedno', value: 'light', emoji: '🚶' },
    { label: 'Umjereno', desc: '3-5 treninga/tjedno', value: 'moderate', emoji: '🏃' },
    { label: 'Aktivno', desc: '6-7 treninga/tjedno', value: 'active', emoji: '💪' },
    { label: 'Vrlo aktivno', desc: 'Sportaš, fizički posao', value: 'very_active', emoji: '🔥' },
  ];

  const renderTDEE = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitleMinimal}>Dnevna potrošnja energije</Text>
      
      {/* BMR prikaz */}
      <View style={styles.previousValueCard}>
        <Text style={styles.previousValueLabel}>BMR</Text>
        <Text style={styles.previousValueNumber}>{tdeeInputs.bmr}</Text>
        <Text style={styles.previousValueUnit}>kcal</Text>
      </View>

      {/* Activity selector - lijepe kartice */}
      <Text style={styles.sectionLabel}>Koliko si aktivan/na?</Text>
      <View style={styles.activityGrid}>
        {activityOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.activityCard,
              tdeeInputs.activityLevel === option.value && styles.activityCardSelected,
            ]}
            onPress={() => {
              setTdeeInputs({ ...tdeeInputs, activityLevel: option.value as ActivityLevel });
              // Auto-izračunaj kada se odabere
              const tdee = calculateTDEE(tdeeInputs.bmr, option.value as ActivityLevel);
              setTdeeResult(tdee);
              setTargetInputs({ ...targetInputs, tdee });
            }}
          >
            <Text style={styles.activityEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.activityLabel,
              tdeeInputs.activityLevel === option.value && styles.activityLabelSelected,
            ]}>{option.label}</Text>
            <Text style={styles.activityDesc}>{option.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tdeeResult !== null && (
        <View style={styles.bigResultContainer}>
          <Text style={styles.bigResultValue}>{tdeeResult}</Text>
          <Text style={styles.bigResultLabel}>kcal/dan</Text>
          <Text style={styles.bigResultDescription}>
            Ukupno kalorija koje trošiš dnevno
          </Text>
          
          <TouchableOpacity style={styles.continueButtonPrimary} onPress={handleTDEEContinue}>
            <Text style={styles.continueButtonPrimaryText}>Nastavi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const goalOptions = [
    { label: 'Smanjiti', desc: '-500 kcal', value: 'lose', emoji: '📉', color: '#EF4444' },
    { label: 'Održati', desc: '= TDEE', value: 'maintain', emoji: '⚖️', color: '#60A5FA' },
    { label: 'Povećati', desc: '+500 kcal', value: 'gain', emoji: '📈', color: '#22C55E' },
  ];

  const renderTarget = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitleMinimal}>Tvoj cilj</Text>
      
      {/* TDEE prikaz */}
      <View style={styles.previousValueCard}>
        <Text style={styles.previousValueLabel}>TDEE</Text>
        <Text style={styles.previousValueNumber}>{targetInputs.tdee}</Text>
        <Text style={styles.previousValueUnit}>kcal</Text>
      </View>

      {/* Goal selector - velike kartice */}
      <View style={styles.goalCardsRow}>
        {goalOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.goalCard,
              targetInputs.goalType === option.value && { 
                backgroundColor: option.color,
                borderColor: option.color,
              },
            ]}
            onPress={() => {
              setTargetInputs({ ...targetInputs, goalType: option.value as GoalType });
              // Auto-izračunaj
              const target = calculateTargetCalories(targetInputs.tdee, option.value as GoalType);
              setTargetResult(target);
              setMacrosInputs({
                ...macrosInputs,
                targetCalories: target,
                goalType: option.value as GoalType,
                weight: parseFloat(bmrInputs.weight) || 0,
              });
            }}
          >
            <Text style={styles.goalEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.goalLabel,
              targetInputs.goalType === option.value && styles.goalLabelSelected,
            ]}>{option.label}</Text>
            <Text style={[
              styles.goalDesc,
              targetInputs.goalType === option.value && styles.goalDescSelected,
            ]}>{option.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {targetResult !== null && (
        <View style={styles.bigResultContainer}>
          <Text style={styles.bigResultValue}>{targetResult}</Text>
          <Text style={styles.bigResultLabel}>kcal/dan</Text>
          
          <TouchableOpacity style={styles.continueButtonPrimary} onPress={handleTargetContinue}>
            <Text style={styles.continueButtonPrimaryText}>Nastavi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Auto-izračunaj makronuntriente kada se dođe na ovaj step
  useEffect(() => {
    if (currentStep === 'macros' && macrosInputs.targetCalories && macrosInputs.weight) {
      const macros = calculateMacros(macrosInputs.targetCalories, macrosInputs.goalType, macrosInputs.weight);
      setMacrosResult(macros);
    }
  }, [currentStep, macrosInputs.targetCalories, macrosInputs.weight, macrosInputs.goalType]);

  const renderMacros = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitleMinimal}>Tvoji makronutrijenti</Text>
      
      {/* Prikaz ciljanih kalorija */}
      <View style={styles.previousValueCard}>
        <Text style={styles.previousValueLabel}>Cilj</Text>
        <Text style={styles.previousValueNumber}>{macrosInputs.targetCalories}</Text>
        <Text style={styles.previousValueUnit}>kcal/dan</Text>
      </View>

      {/* Makro kartice - automatski izračunate */}
      {macrosResult !== null && (
        <>
          <View style={styles.macroCardsContainer}>
            <View style={[styles.macroCard, { borderTopColor: '#EF4444' }]}>
              <Text style={styles.macroCardValue}>{macrosResult.protein}g</Text>
              <Text style={styles.macroCardLabel}>Proteini</Text>
              <Text style={styles.macroCardPercent}>
                {Math.round((macrosResult.protein * 4 / macrosInputs.targetCalories) * 100)}%
              </Text>
            </View>
            <View style={[styles.macroCard, { borderTopColor: '#60A5FA' }]}>
              <Text style={styles.macroCardValue}>{macrosResult.carbs}g</Text>
              <Text style={styles.macroCardLabel}>Ugljikohidrati</Text>
              <Text style={styles.macroCardPercent}>
                {Math.round((macrosResult.carbs * 4 / macrosInputs.targetCalories) * 100)}%
              </Text>
            </View>
            <View style={[styles.macroCard, { borderTopColor: '#FBBF24' }]}>
              <Text style={styles.macroCardValue}>{macrosResult.fats}g</Text>
              <Text style={styles.macroCardLabel}>Masti</Text>
              <Text style={styles.macroCardPercent}>
                {Math.round((macrosResult.fats * 9 / macrosInputs.targetCalories) * 100)}%
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.completeButtonLarge} onPress={handleMacrosComplete}>
            <Text style={styles.completeButtonLargeText}>Završi ✓</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Rotirajuće pozadinske slike */}
      <View style={styles.backgroundContainer}>
        {backgroundImages.map((img, idx) => (
          <View
            key={idx}
            style={[
              styles.backgroundImage,
              { opacity: idx === currentBgImage ? 1 : 0 },
            ]}
          >
            <Image
              source={{ uri: img }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay} />
          </View>
        ))}
      </View>

      {/* Tamni gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          {currentStep === 'bmr' && renderBMR()}
          {currentStep === 'tdee' && renderTDEE()}
          {currentStep === 'target' && renderTarget()}
          {currentStep === 'macros' && renderMacros()}
        </Animated.View>
      </ScrollView>

      {/* Bottom decoration line */}
      <View style={styles.bottomLine} />
    </View>
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
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 120,
    zIndex: 10,
  },
  stepContainer: {
    gap: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 8,
  },
  stepTitleMinimal: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  stepSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  
  // Minimalni UI - kartice s podacima
  dataCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  dataCardSmall: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 70,
  },
  dataCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  dataCardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Veliki rezultat
  bigResultContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  bigResultValue: {
    fontSize: 72,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bigResultLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    letterSpacing: 1,
  },
  bigResultDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 16,
    textAlign: 'center',
    maxWidth: 280,
  },
  
  // Gumbi za minimalni UI
  calcButtonLarge: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    alignSelf: 'center',
    marginTop: 20,
  },
  calcButtonLargeText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  continueButtonPrimary: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
    marginTop: 32,
  },
  continueButtonPrimaryText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Prethodni rezultat - mala kartica
  previousValueCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    opacity: 0.7,
  },
  previousValueLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previousValueNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  previousValueUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  
  // Section label
  sectionLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  // Activity grid
  activityGrid: {
    gap: 10,
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#fff',
  },
  activityEmoji: {
    fontSize: 24,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  activityLabelSelected: {
    color: '#fff',
  },
  activityDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  
  // Goal cards
  goalCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  goalCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  goalLabelSelected: {
    color: '#fff',
  },
  goalDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  goalDescSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  
  // Macro cards
  macroCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  macroCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 100,
    borderTopWidth: 3,
  },
  macroCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  macroCardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroCardPercent: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
  },
  
  // Complete button large
  completeButtonLarge: {
    backgroundColor: '#22C55E',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    alignSelf: 'center',
  },
  completeButtonLargeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  prefillBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  prefillText: {
    color: '#4ADE80',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 2,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calcButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  calcButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  resultContainer: {
    marginTop: 32,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  resultValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  resultUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  continueButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  completeButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
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

