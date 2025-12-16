/**
 * Goal Selection Screen
 * Odabir glavnog cilja korisnika nakon onboarding poruka
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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Premium sportske slike - Olympic lifting / F1 trening stil
const backgroundImages = [
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80',
];

export type GoalType = 'FAT_LOSS' | 'RECOMPOSITION' | 'MUSCLE_GAIN' | 'ENDURANCE';

interface GoalOption {
  id: GoalType;
  title: string;
  description: string;
}

const goals: GoalOption[] = [
  {
    id: 'FAT_LOSS',
    title: 'Skinuti masno tkivo',
    description: 'Smanjiti masno tkivo i lakše kontrolirati prehranu',
  },
  {
    id: 'RECOMPOSITION',
    title: 'Održavati težinu i smanjiti masno tkivo',
    description: 'Zadržati kilažu uz bolji sastav tijela',
  },
  {
    id: 'MUSCLE_GAIN',
    title: 'Povećati težinu i mišićnu masu',
    description: 'Dobiti na masi i povećati snagu',
  },
  {
    id: 'ENDURANCE',
    title: 'Poboljšati izdržljivost',
    description: 'Povećati kondiciju i razinu energije',
  },
];

interface GoalSelectionScreenProps {
  onComplete: (selectedGoal: GoalType) => void;
  onBack?: () => void;
}

export default function GoalSelectionScreen({ onComplete, onBack }: GoalSelectionScreenProps) {
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [currentBgImage, setCurrentBgImage] = useState(0);
  
  // Animacije
  const questionOpacity = useRef(new Animated.Value(0)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // PanResponder za swipe-down navigaciju
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 && onBack) { // Swipe down
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

  // Pokreni animacije pri učitavanju
  useEffect(() => {
    Animated.sequence([
      Animated.timing(questionOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardsOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Prikaži CTA gumb (uvijek vidljiv, ali deaktiviran dok nije odabran cilj)
  useEffect(() => {
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 400,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleGoalSelect = (goalId: GoalType) => {
    setSelectedGoal(goalId);
  };

  const handleContinue = () => {
    if (selectedGoal) {
      onComplete(selectedGoal);
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

      {/* Tamni gradient overlay - pojačan za bolju čitljivost */}
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Pitanje */}
        <Animated.View style={[styles.questionContainer, { opacity: questionOpacity }]}>
          <Text style={styles.questionText}>Koji je tvoj cilj?</Text>
        </Animated.View>

        {/* Kartice s ciljevima */}
        <Animated.View style={[styles.cardsContainer, { opacity: cardsOpacity }]}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {goals.map((goal) => {
              const isSelected = selectedGoal === goal.id;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    isSelected && styles.goalCardSelected,
                  ]}
                  onPress={() => handleGoalSelect(goal.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.goalCardContent}>
                    <Text 
                      style={[styles.goalTitle, isSelected && styles.goalTitleSelected]}
                      numberOfLines={2}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.85}
                    >
                      {goal.title}
                    </Text>
                    <View style={styles.goalDescriptionSpacing} />
                    <Text 
                      style={[styles.goalDescription, isSelected && styles.goalDescriptionSelected]}
                      numberOfLines={2}
                    >
                      {goal.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkIndicator}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* CTA gumb - prikaži uvijek, ali deaktiviran dok nije odabran cilj */}
        <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              !selectedGoal && styles.ctaButtonDisabled,
            ]}
            onPress={handleContinue}
            activeOpacity={selectedGoal ? 0.8 : 1}
            disabled={!selectedGoal}
          >
            <Text style={[
              styles.ctaButtonText,
              !selectedGoal && styles.ctaButtonTextDisabled,
            ]}>
              Nastavi
            </Text>
          </TouchableOpacity>
        </Animated.View>
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
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 40,
    zIndex: 10,
    justifyContent: 'flex-start',
  },
  questionContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  cardsContainer: {
    flex: 1,
    marginBottom: 32,
    justifyContent: 'flex-start',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    gap: 12,
    paddingVertical: 0,
    justifyContent: 'flex-start',
  },
  goalCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
    flexShrink: 1,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  goalCardSelected: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    borderBottomWidth: 2,
  },
  goalCardContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    lineHeight: 26,
  },
  goalTitleSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  goalDescriptionSpacing: {
    height: 6,
  },
  goalDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  goalDescriptionSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  checkIndicator: {
    position: 'absolute',
    top: 20,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  buttonContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 16,
    paddingHorizontal: 56,
    alignItems: 'center',
    minWidth: 220,
    borderRadius: 12,
  },
  ctaButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.2)',
    opacity: 0.5,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  ctaButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
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

