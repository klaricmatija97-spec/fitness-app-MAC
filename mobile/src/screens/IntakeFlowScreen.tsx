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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Premium sportske slike
const backgroundImages = [
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80',
];

// Opcije
const honorificOptions = [
  { value: 'mr', label: 'Mr' },
  { value: 'mrs', label: 'Mrs' },
  { value: 'ms', label: 'Ms' },
  { value: 'other', label: 'Other' },
];

const ageOptions = [
  { value: '10-20', label: '10 – 20' },
  { value: '20-30', label: '20 – 30' },
  { value: '30-40', label: '30 – 40' },
  { value: '40-50', label: '40 – 50' },
  { value: '50-60', label: '50 – 60' },
  { value: '60-70', label: '60 – 70' },
  { value: '70+', label: '70+' },
  { value: 'other', label: 'Ostalo' },
];

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

type SlideId = 'honorific' | 'age' | 'weight' | 'height' | 'foodPreferences' | 'avoidIngredients' | 'allergies' | 'trainingFrequency';

interface IntakeFormState {
  honorific: string;
  ageRange: string;
  weight: { value: string; unit: string };
  height: { value: string; unit: string };
  foodPreferences: string;
  avoidIngredients: string;
  allergies: string;
  trainingFrequency: string;
}

interface IntakeFlowScreenProps {
  onComplete: (formData: IntakeFormState) => void;
  onBack?: () => void;
}

const slideOrder: SlideId[] = [
  'honorific',
  'age',
  'weight',
  'height',
  'foodPreferences',
  'avoidIngredients',
  'allergies',
  'trainingFrequency',
];

export default function IntakeFlowScreen({ onComplete, onBack }: IntakeFlowScreenProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const [showWeightInput, setShowWeightInput] = useState(true);
  const [intakeForm, setIntakeForm] = useState<IntakeFormState>({
    honorific: '',
    ageRange: '',
    weight: { value: '50', unit: 'kg' },
    height: { value: '150', unit: 'cm' },
    foodPreferences: '',
    avoidIngredients: '',
    allergies: '',
    trainingFrequency: '',
  });

  const currentSlide = slideOrder[currentSlideIndex];
  const isAnimating = useRef(false);
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const slideTranslateY = useRef(new Animated.Value(0)).current;
  const weightInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heightInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // PanResponder za swipe navigaciju
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating.current) return false;
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;
        const { dy, vy } = gestureState;
        
        if (dy > 80 || vy > 0.5) {
          // Swipe down - nazad
          if (currentSlideIndex > 0) {
            goToPrevious();
          } else if (onBack) {
            onBack();
          }
        } else if (dy < -80 || vy < -0.5) {
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
      case 'honorific':
        return intakeForm.honorific !== '';
      case 'age':
        return intakeForm.ageRange !== '';
      case 'weight':
        return intakeForm.weight.value !== '' && parseInt(intakeForm.weight.value) > 0;
      case 'height':
        return intakeForm.height.value !== '' && parseInt(intakeForm.height.value) > 0;
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

  const renderSlide = () => {
    const slideStyle = {
      opacity: slideOpacity,
      transform: [{ translateY: slideTranslateY }],
    };

    switch (currentSlide) {
      case 'honorific':
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Spol</Text>
            <View style={styles.optionsContainer}>
              {honorificOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    intakeForm.honorific === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => updateForm('honorific', option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionText,
                      intakeForm.honorific === option.value && styles.optionTextSelected,
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
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Koliko imaš godina?</Text>
            <ScrollView style={styles.optionsScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.optionsContainer}>
                {ageOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      styles.optionButtonFullWidth,
                      intakeForm.ageRange === option.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => updateForm('ageRange', option.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        intakeForm.ageRange === option.value && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        );

      case 'weight':
        const currentWeight = parseInt(intakeForm.weight.value) || 50;
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Trenutna težina</Text>
            <Text style={styles.descriptionText}>Koristi strelice za odabir težine.</Text>
            <View style={styles.arrowInputContainer}>
              <View style={styles.arrowColumn}>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => {
                    const newValue = Math.max(30, currentWeight + 1);
                    updateForm('weight', { ...intakeForm.weight, value: newValue.toString() });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.arrowText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.valueDisplay}>
                  <Text style={styles.valueText}>{currentWeight}</Text>
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
                </View>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => {
                    const newValue = Math.max(30, currentWeight - 1);
                    updateForm('weight', { ...intakeForm.weight, value: newValue.toString() });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.arrowText}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        );

      case 'height':
        const currentHeight = parseInt(intakeForm.height.value) || 150;
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Visina</Text>
            <Text style={styles.descriptionText}>Koristi strelice za odabir visine.</Text>
            <View style={styles.arrowInputContainer}>
              <View style={styles.arrowColumn}>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => {
                    const newValue = Math.min(250, currentHeight + 1);
                    updateForm('height', { ...intakeForm.height, value: newValue.toString() });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.arrowText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.valueDisplay}>
                  <Text style={styles.valueText}>{currentHeight}</Text>
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
                </View>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => {
                    const newValue = Math.max(100, currentHeight - 1);
                    updateForm('height', { ...intakeForm.height, value: newValue.toString() });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.arrowText}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        );

      case 'foodPreferences':
        return (
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
            />
            <Text style={styles.hintText}>Odvoji namirnice zarezom</Text>
          </Animated.View>
        );

      case 'avoidIngredients':
        return (
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
            />
            <Text style={styles.hintText}>Odvoji namirnice zarezom</Text>
          </Animated.View>
        );

      case 'allergies':
        return (
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
            />
            <Text style={styles.hintText}>Odvoji namirnice zarezom</Text>
          </Animated.View>
        );

      case 'trainingFrequency':
        return (
          <Animated.View style={[styles.slideContent, slideStyle]}>
            <Text style={styles.questionText}>Koliko puta tjedno možeš trenirati?</Text>
            <Text style={styles.descriptionText}>Odaberi broj treninga tjedno koje možeš realno uključiti u svoj raspored.</Text>
            <View style={styles.optionsContainer}>
              {trainingFrequencyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    intakeForm.trainingFrequency === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => updateForm('trainingFrequency', option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionText,
                      intakeForm.trainingFrequency === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
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

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentSlideIndex + 1) / slideOrder.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentSlideIndex + 1} / {slideOrder.length}
          </Text>
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
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
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
});

