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

  const renderBMR = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>BMR KALKULATOR</Text>
      <Text style={styles.stepSubtitle}>Bazalni metabolizam</Text>
      
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
    </View>
  );

  const renderTDEE = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>TDEE KALKULATOR</Text>
      <Text style={styles.stepSubtitle}>Ukupna dnevna potrošnja energije</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>BMR (iz prethodnog koraka)</Text>
        <TextInput
          style={styles.input}
          value={tdeeInputs.bmr.toString()}
          onChangeText={(v) => setTdeeInputs({ ...tdeeInputs, bmr: parseInt(v) || 0 })}
          keyboardType="numeric"
          editable={false}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Razina aktivnosti</Text>
        <View style={styles.pickerContainer}>
          {[
            { label: 'Sedentary (malo vježbanja)', value: 'sedentary' },
            { label: 'Light (1-3 dana/tjedno)', value: 'light' },
            { label: 'Moderate (3-5 dana/tjedno)', value: 'moderate' },
            { label: 'Active (6-7 dana/tjedno)', value: 'active' },
            { label: 'Very Active (vrlo aktivno)', value: 'very_active' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.pickerOption,
                tdeeInputs.activityLevel === option.value && styles.pickerOptionSelected,
              ]}
              onPress={() => setTdeeInputs({ ...tdeeInputs, activityLevel: option.value as ActivityLevel })}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  tdeeInputs.activityLevel === option.value && styles.pickerOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.calcButton} onPress={handleTDEECalculate}>
        <Text style={styles.calcButtonText}>Izračunaj TDEE</Text>
      </TouchableOpacity>

      {tdeeResult !== null && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Tvoj TDEE</Text>
          <Text style={styles.resultValue}>{tdeeResult}</Text>
          <Text style={styles.resultUnit}>kalorija/dan</Text>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleTDEEContinue}>
            <Text style={styles.continueButtonText}>Nastavi →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderTarget = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>CILJANE KALORIJE</Text>
      <Text style={styles.stepSubtitle}>Prilagođeno vašem cilju</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>TDEE (iz prethodnog koraka)</Text>
        <TextInput
          style={styles.input}
          value={targetInputs.tdee.toString()}
          onChangeText={(v) => setTargetInputs({ ...targetInputs, tdee: parseInt(v) || 0 })}
          keyboardType="numeric"
          editable={false}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Cilj</Text>
        <View style={styles.pickerContainer}>
          {[
            { label: 'Gubitak težine (-500 kcal)', value: 'lose' },
            { label: 'Održavanje težine (= TDEE)', value: 'maintain' },
            { label: 'Povećanje težine (+500 kcal)', value: 'gain' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.pickerOption,
                targetInputs.goalType === option.value && styles.pickerOptionSelected,
              ]}
              onPress={() => setTargetInputs({ ...targetInputs, goalType: option.value as GoalType })}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  targetInputs.goalType === option.value && styles.pickerOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.calcButton} onPress={handleTargetCalculate}>
        <Text style={styles.calcButtonText}>Izračunaj ciljane kalorije</Text>
      </TouchableOpacity>

      {targetResult !== null && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>
            Ciljane kalorije ({targetInputs.goalType === 'lose' ? 'Gubitak' : targetInputs.goalType === 'gain' ? 'Dobitak' : 'Održavanje'})
          </Text>
          <Text style={styles.resultValue}>{targetResult}</Text>
          <Text style={styles.resultUnit}>kalorija/dan</Text>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleTargetContinue}>
            <Text style={styles.continueButtonText}>Nastavi →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderMacros = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>MAKRONUTRIJENTI</Text>
      <Text style={styles.stepSubtitle}>Proteini, ugljikohidrati i masti</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Ciljane kalorije</Text>
        <TextInput
          style={styles.input}
          value={macrosInputs.targetCalories.toString()}
          onChangeText={(v) => setMacrosInputs({ ...macrosInputs, targetCalories: parseInt(v) || 0 })}
          keyboardType="numeric"
          editable={false}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Težina (kg)</Text>
        <TextInput
          style={styles.input}
          value={macrosInputs.weight.toString()}
          onChangeText={(v) => setMacrosInputs({ ...macrosInputs, weight: parseFloat(v) || 0 })}
          keyboardType="numeric"
          editable={false}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Cilj</Text>
        <View style={styles.pickerContainer}>
          {[
            { label: 'Gubitak težine', value: 'lose' },
            { label: 'Održavanje težine', value: 'maintain' },
            { label: 'Povećanje težine', value: 'gain' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.pickerOption,
                macrosInputs.goalType === option.value && styles.pickerOptionSelected,
              ]}
              onPress={() => setMacrosInputs({ ...macrosInputs, goalType: option.value as GoalType })}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  macrosInputs.goalType === option.value && styles.pickerOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.calcButton} onPress={handleMacrosCalculate}>
        <Text style={styles.calcButtonText}>Izračunaj makroe</Text>
      </TouchableOpacity>

      {macrosResult !== null && (
        <View style={styles.resultContainer}>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Proteini</Text>
            <Text style={styles.macroValue}>{macrosResult.protein}g</Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Ugljikohidrati</Text>
            <Text style={styles.macroValue}>{macrosResult.carbs}g</Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Masti</Text>
            <Text style={styles.macroValue}>{macrosResult.fats}g</Text>
          </View>
          
          <TouchableOpacity style={styles.completeButton} onPress={handleMacrosComplete}>
            <Text style={styles.completeButtonText}>✓ Završi</Text>
          </TouchableOpacity>
        </View>
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
  stepSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 32,
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

