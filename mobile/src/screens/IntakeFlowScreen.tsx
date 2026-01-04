/**
 * Intake Flow Screen
 * Upravlja svim intake slajdovima nakon odabira cilja
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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Premium sportske slike
const backgroundImages = [
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80',
];

// Opcije spola - minimalistično sa simbolima
const genderOptions = [
  { value: 'mr', label: 'Muškarac', symbol: '♂' },
  { value: 'mrs', label: 'Žena', symbol: '♀' },
];

// Dob - sada koristimo točnu vrijednost umjesto raspona

const weightUnits = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];

const heightUnits = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'inch' },
];

const trainingFrequencyOptions = [
  { value: '3', label: '3 puta tjedno' },
  { value: '5', label: '5 puta tjedno' },
  { value: '6', label: '6 puta tjedno' },
];

// Tipovi ciljeva
export type GoalType = 'FAT_LOSS' | 'RECOMPOSITION' | 'MUSCLE_GAIN' | 'ENDURANCE';

// Opcije ciljeva s akcent bojama
const goalOptions: { id: GoalType; title: string; subtitle: string; emoji: string; accentColor: string; isHero?: boolean }[] = [
  {
    id: 'FAT_LOSS',
    title: 'Skinuti masno tkivo',
    subtitle: 'Najčešći izbor',
    emoji: '🔥',
    accentColor: '#FF7A00',
    isHero: true,
  },
  {
    id: 'RECOMPOSITION',
    title: 'Rekompozicija',
    subtitle: 'Ako već treniraš',
    emoji: '⚖️',
    accentColor: '#A855F7',
  },
  {
    id: 'MUSCLE_GAIN',
    title: 'Dobiti mišićnu masu',
    subtitle: 'Traži disciplinu',
    emoji: '💪',
    accentColor: '#22C55E',
  },
  {
    id: 'ENDURANCE',
    title: 'Izdržljivost',
    subtitle: 'Kondicija & energija',
    emoji: '🏃',
    accentColor: '#3B82F6',
  },
];

type SlideId = 'goal' | 'honorific' | 'age' | 'weight' | 'height' | 'favoriteActivities' | 'foodPreferences' | 'avoidIngredients' | 'allergies' | 'healthConditions' | 'trainingFrequency';

// Sportovi i aktivnosti s emoji ikonama
const sportsActivities = [
  { value: 'gym', label: 'Teretana', emoji: '🏋️' },
  { value: 'running', label: 'Trčanje', emoji: '🏃' },
  { value: 'cycling', label: 'Biciklizam', emoji: '🚴' },
  { value: 'swimming', label: 'Plivanje', emoji: '🏊' },
  { value: 'football', label: 'Nogomet', emoji: '⚽' },
  { value: 'basketball', label: 'Košarka', emoji: '🏀' },
  { value: 'tennis', label: 'Tenis', emoji: '🎾' },
  { value: 'boxing', label: 'Boks', emoji: '🥊' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'hiking', label: 'Planinarenje', emoji: '🥾' },
  { value: 'crossfit', label: 'CrossFit', emoji: '💪' },
  { value: 'martial-arts', label: 'Borilački sportovi', emoji: '🥋' },
  { value: 'dancing', label: 'Ples', emoji: '💃' },
  { value: 'climbing', label: 'Penjanje', emoji: '🧗' },
  { value: 'skiing', label: 'Skijanje', emoji: '⛷️' },
  { value: 'volleyball', label: 'Odbojka', emoji: '🏐' },
  { value: 'padel', label: 'Padel', emoji: '🏸' },
  { value: 'rowing', label: 'Veslanje', emoji: '🚣' },
];

interface IntakeFormState {
  goal: GoalType | '';
  honorific: string;
  age: string; // Točna dob (npr. "25")
  weight: { value: string; unit: string };
  height: { value: string; unit: string };
  favoriteActivities: string[]; // Omiljeni sportovi/aktivnosti
  foodPreferences: string;
  avoidIngredients: string;
  allergies: string;
  healthConditions: string; // Ozljede, bolesti, zdravstvena stanja
  trainingFrequency: string;
}

interface IntakeFlowScreenProps {
  onComplete: (formData: IntakeFormState) => void;
  onBack?: () => void;
}

const slideOrder: SlideId[] = [
  'goal',
  'honorific',
  'age',
  'weight',
  'height',
  'favoriteActivities',  // Omiljeni sportovi - za trenera kao putokaz
  'trainingFrequency',
  'healthConditions',  // Ozljede i bolesti - BITNO za trenera
  'foodPreferences',
  'avoidIngredients',
  'allergies',
];

export default function IntakeFlowScreen({ onComplete, onBack }: IntakeFlowScreenProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const [showWeightInput, setShowWeightInput] = useState(true);
  const [intakeForm, setIntakeForm] = useState<IntakeFormState>({
    goal: '',
    honorific: '',
    age: '25', // Default dob
    weight: { value: '50', unit: 'kg' },
    height: { value: '150', unit: 'cm' },
    favoriteActivities: [], // Omiljeni sportovi
    foodPreferences: '',
    avoidIngredients: '',
    allergies: '',
    healthConditions: '',
    trainingFrequency: '',
  });

  const currentSlide = slideOrder[currentSlideIndex];
  const isAnimating = useRef(false);
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const slideTranslateY = useRef(new Animated.Value(0)).current;
  const weightInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heightInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State za direktni unos vrijednosti
  const [isEditingAge, setIsEditingAge] = useState(false);
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [isEditingHeight, setIsEditingHeight] = useState(false);
  const [tempValue, setTempValue] = useState('');

  // PanResponder za swipe navigaciju - striktnije pragove
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Nikad ne uzimaj na početku
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating.current) return false;
        // Mora biti izrazito vertikalan swipe (dy > 3x dx) i minimum 50px pomaka
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 3;
        const isSignificant = Math.abs(gestureState.dy) > 50;
        return isVertical && isSignificant;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;
        const { dy, vy } = gestureState;
        
        // Striktiji pragovi: 120px ili brzina 0.8
        if (dy > 120 && vy > 0.3) {
          // Swipe down - nazad (samo ako nije prvi slide)
          if (currentSlideIndex > 0) {
            goToPrevious();
          }
          // MAKNUT onBack() - ne izlazi iz onboardinga na swipe
        } else if (dy < -120 && vy < -0.3) {
          // Swipe up - naprijed
          if (canGoNext()) {
            goToNext();
          }
        }
      },
    })
  ).current;

  // Rotiraj pozadinske slike
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgImage((prev) => (prev + 1) % backgroundImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Reset showWeightInput kada se promijeni slide
  useEffect(() => {
    if (currentSlide === 'weight') {
      setShowWeightInput(true);
    }
  }, [currentSlide]);

  // Debounce za sakrivanje input polja nakon 1 sekunde
  useEffect(() => {
    if (currentSlide === 'weight') {
      // Očisti prethodni timeout
      if (weightInputTimeoutRef.current) {
        clearTimeout(weightInputTimeoutRef.current);
      }

      // Ako je unesena vrijednost i nije prazna, postavi timeout
      if (intakeForm.weight.value && intakeForm.weight.value.trim() !== '') {
        weightInputTimeoutRef.current = setTimeout(() => {
          setShowWeightInput(false);
        }, 1000);
      } else {
        // Ako je prazno, prikaži input
        setShowWeightInput(true);
      }

      // Cleanup timeout na unmount ili promjenu
      return () => {
        if (weightInputTimeoutRef.current) {
          clearTimeout(weightInputTimeoutRef.current);
        }
      };
    }
  }, [intakeForm.weight.value, currentSlide]);


  const canGoNext = (): boolean => {
    switch (currentSlide) {
      case 'goal':
        return intakeForm.goal !== '';
      case 'honorific':
        return intakeForm.honorific !== '';
      case 'age':
        const age = parseInt(intakeForm.age);
        return age >= 10 && age <= 100;
      case 'weight':
        return intakeForm.weight.value !== '' && parseInt(intakeForm.weight.value) > 0;
      case 'height':
        return intakeForm.height.value !== '' && parseInt(intakeForm.height.value) > 0;
      case 'favoriteActivities':
        return intakeForm.favoriteActivities.length >= 1; // Bar jedna aktivnost
      case 'trainingFrequency':
        return intakeForm.trainingFrequency !== '';
      default:
        return true; // Text inputs su opcionalni
    }
  };

  const goToNext = () => {
    if (!canGoNext() || isAnimating.current) return;
    
    isAnimating.current = true;
    
    Animated.parallel([
      Animated.timing(slideOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideTranslateY, {
        toValue: -30,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (currentSlideIndex < slideOrder.length - 1) {
        setCurrentSlideIndex(currentSlideIndex + 1);
        slideTranslateY.setValue(30);
        slideOpacity.setValue(0);
        
        Animated.parallel([
          Animated.timing(slideOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideTranslateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          isAnimating.current = false;
        });
      } else {
        // Završi intake flow
        onComplete(intakeForm);
      }
    });
  };

  const goToPrevious = () => {
    if (currentSlideIndex === 0 || isAnimating.current) return;
    
    isAnimating.current = true;
    
    Animated.parallel([
      Animated.timing(slideOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideTranslateY, {
        toValue: 30,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentSlideIndex(currentSlideIndex - 1);
      slideTranslateY.setValue(-30);
      slideOpacity.setValue(0);
      
      Animated.parallel([
        Animated.timing(slideOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  };

  const updateForm = (field: keyof IntakeFormState, value: any) => {
    setIntakeForm((prev) => ({ ...prev, [field]: value }));
  };

  // Haptic feedback + auto-advance za single-choice pitanja
  const selectAndAdvance = (field: keyof IntakeFormState, value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateForm(field, value);
    
    // Auto-advance nakon kratke pauze
    setTimeout(() => {
      if (!isAnimating.current) {
        goToNext();
      }
    }, 300);
  };

  // Samo haptic bez auto-advance
  const selectWithHaptic = (field: keyof IntakeFormState, value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateForm(field, value);
  };

  const renderSlide = () => {
    const slideStyle = {
      opacity: slideOpacity,
      transform: [{ translateY: slideTranslateY }],
    };

    switch (currentSlide) {
      case 'goal':
        const heroGoal = goalOptions.find(g => g.isHero)!;
        const otherGoals = goalOptions.filter(g => !g.isHero);
        
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Koji je tvoj cilj?</Text>
            <Text style={styles.goalSubtitle}>Možeš ga promijeniti kasnije</Text>
            
            {/* Hero kartica - Full width */}
            <TouchableOpacity
              style={[
                styles.goalHeroCard,
                intakeForm.goal === heroGoal.id && styles.goalCardSelected,
              ]}
              onPress={() => selectAndAdvance('goal', heroGoal.id)}
              activeOpacity={0.9}
            >
              {/* Checkmark ako je selektirano */}
              {intakeForm.goal === heroGoal.id && (
                <View style={styles.goalCheckmark}>
                  <Text style={styles.goalCheckmarkText}>✓</Text>
                </View>
              )}
              
              <View style={styles.goalHeroContent}>
                <Text style={[styles.goalHeroEmoji, intakeForm.goal === heroGoal.id && { transform: [{ scale: 1.1 }] }]}>
                  {heroGoal.emoji}
                </Text>
                <View style={styles.goalHeroText}>
                  <Text style={[
                    styles.goalHeroTitle,
                    intakeForm.goal === heroGoal.id && { color: '#fff' }
                  ]}>{heroGoal.title}</Text>
                  <Text style={styles.goalHeroSubtitle}>{heroGoal.subtitle}</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Grid s ostalim karticama - 2 gore, 1 full width dolje */}
            <View style={styles.goalOtherGrid}>
              {otherGoals.map((goal, index) => {
                const isLastCard = index === otherGoals.length - 1;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      isLastCard ? styles.goalFullWidthCard : styles.goalSmallCard,
                      intakeForm.goal === goal.id && styles.goalCardSelected,
                    ]}
                    onPress={() => selectAndAdvance('goal', goal.id)}
                    activeOpacity={0.9}
                  >
                    {/* Checkmark ako je selektirano */}
                    {intakeForm.goal === goal.id && (
                      <View style={styles.goalCheckmark}>
                        <Text style={styles.goalCheckmarkText}>✓</Text>
                      </View>
                    )}
                    
                    {isLastCard ? (
                      // Full width kartica - horizontalni layout
                      <View style={styles.goalFullWidthContent}>
                        <Text style={[
                          styles.goalFullWidthEmoji,
                          intakeForm.goal === goal.id && { transform: [{ scale: 1.1 }] }
                        ]}>{goal.emoji}</Text>
                        <View>
                          <Text style={[
                            styles.goalSmallTitle,
                            intakeForm.goal === goal.id && { color: '#fff' }
                          ]}>{goal.title}</Text>
                          <Text style={styles.goalSmallSubtitle}>{goal.subtitle}</Text>
                        </View>
                      </View>
                    ) : (
                      // Male kartice - vertikalni layout
                      <>
                        <Text style={styles.goalSmallEmoji}>{goal.emoji}</Text>
                        <Text style={[
                          styles.goalSmallTitle,
                          intakeForm.goal === goal.id && { color: '#fff' }
                        ]}>{goal.title}</Text>
                        <Text style={styles.goalSmallSubtitle}>{goal.subtitle}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 'honorific':
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Spol</Text>
            <View style={styles.genderContainer}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderCard,
                    intakeForm.honorific === option.value && styles.genderCardSelected,
                  ]}
                  onPress={() => selectAndAdvance('honorific', option.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.genderSymbol,
                    intakeForm.honorific === option.value && styles.genderSymbolSelected,
                  ]}>{option.symbol}</Text>
                  <Text
                    style={[
                      styles.genderLabel,
                      intakeForm.honorific === option.value && styles.genderLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );

      case 'age':
        const currentAge = parseInt(intakeForm.age) || 25;
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Koliko imaš godina?</Text>
            {isEditingAge && (
              <Text style={styles.descriptionText}>Upiši dob i potvrdi</Text>
            )}
            <View style={styles.arrowInputContainer}>
              <View style={styles.arrowColumn}>
                {!isEditingAge && (
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newValue = Math.min(100, currentAge + 1);
                      updateForm('age', newValue.toString());
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.valueDisplay}
                  onPress={() => {
                    setTempValue(currentAge.toString());
                    setIsEditingAge(true);
                  }}
                  activeOpacity={0.8}
                >
                  {isEditingAge ? (
                    <TextInput
                      style={styles.directInput}
                      value={tempValue}
                      onChangeText={setTempValue}
                      keyboardType="number-pad"
                      autoFocus
                      selectTextOnFocus
                      maxLength={3}
                    />
                  ) : (
                    <>
                      <Text style={styles.valueText}>{currentAge}</Text>
                      <Text style={styles.tapToEditHint}>klikni na broj za direktan unos</Text>
                    </>
                  )}
                  <Text style={styles.unitLabel}>godina</Text>
                </TouchableOpacity>
                
                {!isEditingAge && (
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newValue = Math.max(10, currentAge - 1);
                      updateForm('age', newValue.toString());
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {isEditingAge && (
              <TouchableOpacity 
                style={styles.confirmInputButton}
                onPress={() => {
                  const parsed = parseInt(tempValue);
                  if (parsed >= 10 && parsed <= 100) {
                    updateForm('age', parsed.toString());
                  }
                  setIsEditingAge(false);
                  Keyboard.dismiss();
                }}
              >
                <Text style={styles.confirmInputText}>Gotovo ✓</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );

      case 'weight':
        const currentWeight = parseInt(intakeForm.weight.value) || 50;
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Trenutna težina</Text>
            {isEditingWeight && (
              <Text style={styles.descriptionText}>Upiši težinu i potvrdi</Text>
            )}
            <View style={styles.arrowInputContainer}>
              <View style={styles.arrowColumn}>
                {!isEditingWeight && (
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newValue = Math.min(300, currentWeight + 1);
                      updateForm('weight', { ...intakeForm.weight, value: newValue.toString() });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.valueDisplay}
                  onPress={() => {
                    setTempValue(currentWeight.toString());
                    setIsEditingWeight(true);
                  }}
                  activeOpacity={0.8}
                >
                  {isEditingWeight ? (
                    <TextInput
                      style={styles.directInput}
                      value={tempValue}
                      onChangeText={setTempValue}
                      keyboardType="number-pad"
                      autoFocus
                      selectTextOnFocus
                      maxLength={3}
                    />
                  ) : (
                    <>
                      <Text style={styles.valueText}>{currentWeight}</Text>
                      <Text style={styles.tapToEditHint}>klikni na broj za direktan unos</Text>
                    </>
                  )}
                  <View style={styles.unitSelector}>
                    {weightUnits.map((unit) => (
                      <TouchableOpacity
                        key={unit.value}
                        style={[
                          styles.unitButton,
                          intakeForm.weight.unit === unit.value && styles.unitButtonSelected,
                        ]}
                        onPress={() =>
                          updateForm('weight', { ...intakeForm.weight, unit: unit.value })
                        }
                      >
                        <Text
                          style={[
                            styles.unitText,
                            intakeForm.weight.unit === unit.value && styles.unitTextSelected,
                          ]}
                        >
                          {unit.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
                
                {!isEditingWeight && (
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newValue = Math.max(30, currentWeight - 1);
                      updateForm('weight', { ...intakeForm.weight, value: newValue.toString() });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {isEditingWeight && (
              <TouchableOpacity 
                style={styles.confirmInputButton}
                onPress={() => {
                  const parsed = parseInt(tempValue);
                  if (parsed >= 30 && parsed <= 300) {
                    updateForm('weight', { ...intakeForm.weight, value: parsed.toString() });
                  }
                  setIsEditingWeight(false);
                  Keyboard.dismiss();
                }}
              >
                <Text style={styles.confirmInputText}>Gotovo ✓</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );

      case 'height':
        const currentHeight = parseInt(intakeForm.height.value) || 150;
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Visina</Text>
            {isEditingHeight && (
              <Text style={styles.descriptionText}>Upiši visinu i potvrdi</Text>
            )}
            <View style={styles.arrowInputContainer}>
              <View style={styles.arrowColumn}>
                {!isEditingHeight && (
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newValue = Math.min(250, currentHeight + 1);
                      updateForm('height', { ...intakeForm.height, value: newValue.toString() });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.valueDisplay}
                  onPress={() => {
                    setTempValue(currentHeight.toString());
                    setIsEditingHeight(true);
                  }}
                  activeOpacity={0.8}
                >
                  {isEditingHeight ? (
                    <TextInput
                      style={styles.directInput}
                      value={tempValue}
                      onChangeText={setTempValue}
                      keyboardType="number-pad"
                      autoFocus
                      selectTextOnFocus
                      maxLength={3}
                    />
                  ) : (
                    <>
                      <Text style={styles.valueText}>{currentHeight}</Text>
                      <Text style={styles.tapToEditHint}>klikni na broj za direktan unos</Text>
                    </>
                  )}
                  <View style={styles.unitSelector}>
                    {heightUnits.map((unit) => (
                      <TouchableOpacity
                        key={unit.value}
                        style={[
                          styles.unitButton,
                          intakeForm.height.unit === unit.value && styles.unitButtonSelected,
                        ]}
                        onPress={() =>
                          updateForm('height', { ...intakeForm.height, unit: unit.value })
                        }
                      >
                        <Text
                          style={[
                            styles.unitText,
                            intakeForm.height.unit === unit.value && styles.unitTextSelected,
                          ]}
                        >
                          {unit.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
                
                {!isEditingHeight && (
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newValue = Math.max(100, currentHeight - 1);
                      updateForm('height', { ...intakeForm.height, value: newValue.toString() });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {isEditingHeight && (
              <TouchableOpacity 
                style={styles.confirmInputButton}
                onPress={() => {
                  const parsed = parseInt(tempValue);
                  if (parsed >= 100 && parsed <= 250) {
                    updateForm('height', { ...intakeForm.height, value: parsed.toString() });
                  }
                  setIsEditingHeight(false);
                  Keyboard.dismiss();
                }}
              >
                <Text style={styles.confirmInputText}>Gotovo ✓</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );

      case 'favoriteActivities':
        const toggleActivity = (value: string) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const current = intakeForm.favoriteActivities;
          if (current.includes(value)) {
            updateForm('favoriteActivities', current.filter(v => v !== value));
          } else {
            updateForm('favoriteActivities', [...current, value]);
          }
        };
        
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Što voliš raditi?</Text>
            <Text style={styles.descriptionText}>Odaberi sportove i aktivnosti koje te zanimaju</Text>
            <ScrollView 
              style={styles.activitiesScrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.activitiesGrid}
            >
              {sportsActivities.map((activity) => {
                const isSelected = intakeForm.favoriteActivities.includes(activity.value);
                return (
                  <TouchableOpacity
                    key={activity.value}
                    style={[
                      styles.activityChip,
                      isSelected && styles.activityChipSelected,
                    ]}
                    onPress={() => toggleActivity(activity.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                    <Text style={[
                      styles.activityChipText,
                      isSelected && styles.activityChipTextSelected,
                    ]}>
                      {activity.label}
                    </Text>
                    {isSelected && <Text style={styles.activityCheckmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.selectedCount}>
              {intakeForm.favoriteActivities.length} odabrano
            </Text>
          </Animated.View>
        );

      case 'foodPreferences':
        return (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={[styles.slideContent, slideStyle]}>
              <Text style={styles.questionText}>Preferiram</Text>
              <Text style={styles.descriptionText}>Što želiš jesti više?</Text>
              <TextInput
                style={styles.textArea}
                placeholder="junetina, losos, riža, avokado..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={intakeForm.foodPreferences}
                onChangeText={(text) => updateForm('foodPreferences', text)}
                multiline
                numberOfLines={4}
                blurOnSubmit={true}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Text style={styles.hintText}>Odvoji namirnice zarezom</Text>
              <TouchableOpacity style={styles.dismissKeyboardButton} onPress={Keyboard.dismiss}>
                <Text style={styles.dismissKeyboardText}>Gotovo ✓</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        );

      case 'avoidIngredients':
        return (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={[styles.slideContent, slideStyle]}>
              <Text style={styles.questionText}>Ne želim jesti</Text>
              <Text style={styles.descriptionText}>Što ne želiš jesti?</Text>
              <TextInput
                style={styles.textArea}
                placeholder="piletina, tuna, mlijeko..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={intakeForm.avoidIngredients}
                onChangeText={(text) => updateForm('avoidIngredients', text)}
                multiline
                numberOfLines={4}
                blurOnSubmit={true}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Text style={styles.hintText}>Odvoji namirnice zarezom</Text>
              <TouchableOpacity style={styles.dismissKeyboardButton} onPress={Keyboard.dismiss}>
                <Text style={styles.dismissKeyboardText}>Gotovo ✓</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        );

      case 'allergies':
        return (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={[styles.slideContent, slideStyle]}>
              <Text style={styles.questionText}>Alergije i intolerancije</Text>
              <Text style={styles.descriptionText}>Što ne smiješ jesti?</Text>
              <TextInput
                style={styles.textArea}
                placeholder="laktoza, gluten, orašasti plodovi..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={intakeForm.allergies}
                onChangeText={(text) => updateForm('allergies', text)}
                multiline
                numberOfLines={4}
                blurOnSubmit={true}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Text style={styles.hintText}>Odvoji namirnice zarezom</Text>
              <TouchableOpacity style={styles.dismissKeyboardButton} onPress={Keyboard.dismiss}>
                <Text style={styles.dismissKeyboardText}>Gotovo ✓</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        );

      case 'healthConditions':
        return (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={[styles.slideContent, slideStyle]}>
              <Text style={styles.questionText}>Ozljede i zdravstvena stanja</Text>
              <Text style={styles.descriptionText}>
                Imaš li ozljede, bolesti ili stanja koja utječu na trening?
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="npr. hernija diska, visoki tlak, dijabetes, ozljeda koljena..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={intakeForm.healthConditions}
                onChangeText={(text) => updateForm('healthConditions', text)}
                multiline
                numberOfLines={5}
                blurOnSubmit={true}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Text style={styles.hintText}>
                Ove informacije su povjerljive i pomažu treneru da prilagodi program tvojim potrebama
              </Text>
              
              {/* Gumb za zatvaranje tipkovnice */}
              <TouchableOpacity 
                style={styles.dismissKeyboardButton}
                onPress={Keyboard.dismiss}
              >
                <Text style={styles.dismissKeyboardText}>Gotovo ✓</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        );

      case 'trainingFrequency':
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Koliko puta tjedno možeš trenirati?</Text>
            <Text style={styles.descriptionText}>Odaberi broj treninga tjedno koje možeš realno uključiti u svoj raspored.</Text>
            <View style={styles.frequencyGrid}>
              {trainingFrequencyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyCard,
                    intakeForm.trainingFrequency === option.value && styles.frequencyCardSelected,
                  ]}
                  onPress={() => selectAndAdvance('trainingFrequency', option.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.frequencyNumber,
                    intakeForm.trainingFrequency === option.value && styles.frequencyNumberSelected,
                  ]}>
                    {option.value}
                  </Text>
                  <Text style={[
                    styles.frequencyLabel,
                    intakeForm.trainingFrequency === option.value && styles.frequencyLabelSelected,
                  ]}>
                    {option.value === '1' ? 'dan' : option.value === '2' || option.value === '3' || option.value === '4' ? 'dana' : 'dana'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

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
      <View style={styles.content}>
        {renderSlide()}

        {/* Progress dots */}
        <View style={styles.progressContainer}>
          <View style={styles.dotsContainer}>
            {slideOrder.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentSlideIndex && styles.dotActive,
                  index < currentSlideIndex && styles.dotCompleted,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Navigation buttons */}
        <View style={styles.buttonContainer}>
          {currentSlideIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.backButton]}
              onPress={goToPrevious}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Nazad</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              !canGoNext() && styles.nextButtonDisabled,
            ]}
            onPress={goToNext}
            activeOpacity={0.8}
            disabled={!canGoNext()}
          >
            <Text
              style={[
                styles.nextButtonText,
                !canGoNext() && styles.nextButtonTextDisabled,
              ]}
            >
              {currentSlideIndex === slideOrder.length - 1 ? 'Završi' : 'Dalje'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    zIndex: 10,
    justifyContent: 'center',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  optionsContainer: {
    gap: 16,
    alignItems: 'center',
  },
  optionsScrollView: {
    flex: 1,
    maxHeight: 400,
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  optionButtonFullWidth: {
    width: '100%',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.6)',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  numberInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 20,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  unitButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  unitButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  unitTextSelected: {
    color: '#fff',
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  progressContainer: {
    marginTop: 32,
    marginBottom: 24,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  navButton: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  nextButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  nextButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.15)',
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  nextButtonTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  confirmedValueContainer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 16,
  },
  confirmedValueText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  editButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  arrowInputContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  arrowColumn: {
    alignItems: 'center',
    gap: 20,
  },
  arrowButton: {
    width: 80,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  valueDisplay: {
    alignItems: 'center',
    gap: 16,
    minWidth: 200,
  },
  valueText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  unitLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Sportovi i aktivnosti
  activitiesScrollView: {
    maxHeight: 400,
    marginTop: 16,
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 20,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#fff',
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityChipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  activityChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  activityCheckmark: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  selectedCount: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 16,
  },
  
  // Gumb za zatvaranje tipkovnice
  dismissKeyboardButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginTop: 20,
  },
  dismissKeyboardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Direktni unos vrijednosti
  tapToEditHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 10,
  },
  directInput: {
    fontSize: 64,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  confirmInputButton: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 30,
  },
  confirmInputText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: '700',
  },
  
  // Spol - elegantne kartice
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 50,
  },
  genderCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 36,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 130,
  },
  genderCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#fff',
  },
  genderSymbol: {
    fontSize: 48,
    marginBottom: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  genderSymbolSelected: {
    color: '#fff',
  },
  genderLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  genderLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Goal styles - asymmetric layout
  goalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    marginBottom: 24,
  },
  goalHeroCard: {
    width: '100%',
    minHeight: 130,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 20,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  goalHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalHeroEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  goalHeroText: {
    flex: 1,
  },
  goalHeroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  goalHeroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  goalCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCheckmarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  goalOtherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  goalSmallCard: {
    width: '48.5%',
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  goalCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#fff',
  },
  goalSmallEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  goalSmallTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  goalSmallSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  goalFullWidthCard: {
    width: '100%',
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    position: 'relative',
  },
  goalFullWidthContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalFullWidthEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  // Frequency grid styles
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  frequencyCard: {
    width: 72,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#fff',
  },
  frequencyNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: -0.5,
  },
  frequencyNumberSelected: {
    color: '#fff',
  },
  frequencyLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  frequencyLabelSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
});

