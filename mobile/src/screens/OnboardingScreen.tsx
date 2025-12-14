/**
 * Onboarding Screen
 * Mentalna priprema korisnika - jedna poruka po ekranu
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
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Premium sportske slike - Olympic lifting / F1 trening stil
const backgroundImages = [
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80',
];

const messages = [
  {
    headline: 'Mnogi se boje da će se "nabildati"?',
    explanation: 'To se ne događa preko noći. Mišići se grade postupno, uz vrijeme, trud i kontinuitet.',
  },
  {
    headline: 'Ne dobivaš na težini?',
    explanation: 'Ne unosiš dovoljno kalorija. Bez dovoljno energije tijelo nema od čega graditi masu.',
  },
  {
    headline: 'Ne gubiš kilograme?',
    explanation: 'Najčešće nisi u kalorijskom deficitu. Važno je birati hranu većeg volumena, a manje kalorija. Takva hrana stvara osjećaj sitosti i olakšava kontrolu unosa.',
  },
  {
    headline: 'Izbjegavaj ove namirnice:',
    explanation: 'Šećer, pekarske proizvode, zaslađene sokove i alkohol. Ove namirnice lako povećavaju kalorijski unos bez osjećaja sitosti.',
  },
  {
    headline: 'Dosljednost je važnija od savršenstva.',
    explanation: 'Kada se pravilna prehrana i trening spoje, rezultati dolaze — postupno, ali sigurno.',
  },
  {
    headline: 'Nedostatak vremena je izgovor?',
    explanation: 'Tri treninga tjedno po 45 minuta dovoljna su za napredak. S vremenom trening postaje navika.',
  },
  {
    headline: 'Teretana nije samo za bodybuildere.',
    explanation: 'To je prostor za zdravlje, snagu, kondiciju i bolju kvalitetu života.',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

export default function OnboardingScreen({ onComplete, onBack }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const currentIndexRef = useRef(0);
  const isAnimating = useRef(false);
  
  // Animacije - gesture-driven
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const messageTranslateY = useRef(new Animated.Value(0)).current;

  // Sync ref s state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Rotiraj pozadinske slike svakih 8 sekundi
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgImage((prev) => (prev + 1) % backgroundImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Funkcija za završetak onboardinga s animacijom
  const handleCompleteWithAnimation = () => {
    if (isAnimating.current) {
      return;
    }
    
    isAnimating.current = true;
    
    // Animacija fade out prije prelaska na sljedeći ekran
    Animated.parallel([
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(messageTranslateY, {
        toValue: -30,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
      onComplete();
    });
  };

  const goToNext = () => {
    const idx = currentIndexRef.current;
    
    if (idx >= messages.length - 1) {
      return;
    }
    
    if (isAnimating.current) {
      return;
    }
    
    isAnimating.current = true;
    const nextIndex = idx + 1;
    
    // Blaža animacija - manji pomak, kraće trajanje, glatki easing
    Animated.parallel([
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(messageTranslateY, {
        toValue: -30,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      if (!finished) {
        isAnimating.current = false;
        return;
      }
      
      // Promijeni poruku odmah - bez čekanja
      setCurrentIndex(nextIndex);
      currentIndexRef.current = nextIndex;
      
      // Reset animacije za novu poruku - pomak dolje
      messageTranslateY.setValue(30);
      messageOpacity.setValue(0);
      
      // Blaža animacija - fade in i pomak dolje
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  };

  // Swipe gesture handler - gesture-driven animacije
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating.current) return false;
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Zaustavi sve aktivne animacije
        messageOpacity.stopAnimation();
        messageTranslateY.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isAnimating.current) return;
        
        const idx = currentIndexRef.current;
        const { dy } = gestureState;
        
        // Ograniči pomak na razumnu vrijednost (30px za blažu animaciju)
        const clampedDy = Math.max(-30, Math.min(30, dy));
        
        // Ažuriraj animacije u realnom vremenu - blaže vrijednosti
        if (dy < 0) {
          // Swipe prema gore - priprema za sljedeću poruku ili završetak onboardinga
          const progress = Math.min(1, Math.abs(dy) / 30);
          messageOpacity.setValue(1 - progress);
          messageTranslateY.setValue(-clampedDy);
        } else if (dy > 0) {
          // Swipe prema dolje - priprema za povratak na login (fade out, pomak dolje)
          const progress = Math.min(1, Math.abs(dy) / 30);
          messageOpacity.setValue(1 - progress);
          messageTranslateY.setValue(clampedDy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;
        
        const idx = currentIndexRef.current;
        const { dy, vy } = gestureState;
        
        // Provjeri brzinu i pomak za odluku o navigaciji
        const threshold = 50;
        const velocityThreshold = 0.5;
        
        // Swipe prema gore - sljedeća poruka ili završetak onboardinga
        if (dy < -threshold || vy < -velocityThreshold) {
          if (idx < messages.length - 1) {
            goToNext();
          } else {
            // Na zadnjoj poruci, swipe gore završava onboarding s animacijom
            handleCompleteWithAnimation();
          }
        }
        // Swipe prema dolje - direktno povratak na login (bez prelistavanja poruka)
        else if ((dy > threshold || vy > velocityThreshold)) {
          // Na bilo kojoj poruci, swipe dolje vraća direktno na login
          if (isAnimating.current) return;
          
          isAnimating.current = true;
          
          // Ista animacija kao za naprijed - fade out i pomak dolje
          Animated.parallel([
            Animated.timing(messageOpacity, {
              toValue: 0,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(messageTranslateY, {
              toValue: 30,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start(() => {
            isAnimating.current = false;
            onBack?.();
          });
        } else {
          // Vrati na početnu poziciju ako nije dovoljno pomaknuto - blaža animacija
          Animated.parallel([
            Animated.timing(messageOpacity, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(messageTranslateY, {
              toValue: 0,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const goToPrevious = () => {
    const idx = currentIndexRef.current;
    
    if (idx <= 0) {
      return;
    }
    
    if (isAnimating.current) {
      return;
    }
    
    isAnimating.current = true;
    const prevIndex = idx - 1;
    
    // Ista animacija kao goToNext - fade out i pomak dolje
    Animated.parallel([
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(messageTranslateY, {
        toValue: 30,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      if (!finished) {
        isAnimating.current = false;
        return;
      }
      
      // Promijeni poruku odmah - bez čekanja
      setCurrentIndex(prevIndex);
      currentIndexRef.current = prevIndex;
      
      // Reset animacije za novu poruku - pomak gore (suprotno od goToNext)
      messageTranslateY.setValue(-30);
      messageOpacity.setValue(0);
      
      // Ista animacija kao goToNext - fade in i pomak gore
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  };

  const handleNext = () => {
    if (isAnimating.current) {
      return;
    }
    
    const idx = currentIndexRef.current;
    if (idx < messages.length - 1) {
      goToNext();
    } else {
      // Na zadnjoj poruci, swipe ili tap završava onboarding s animacijom
      handleCompleteWithAnimation();
    }
  };

  const messageAnimatedStyle = {
    opacity: messageOpacity,
    transform: [{ translateY: messageTranslateY }],
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

      {/* Tamni gradient overlay - poboljšana čitljivost */}
      <LinearGradient
        colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Poruka - centrirana */}
        <View style={styles.messageContainer}>
          <TouchableOpacity
            style={styles.messageTouchable}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <Animated.View style={[styles.messageWrapper, messageAnimatedStyle]}>
              <Text style={styles.headlineText}>{messages[currentIndex].headline}</Text>
              <View style={styles.spacing} />
              <Text style={styles.explanationText}>{messages[currentIndex].explanation}</Text>
            </Animated.View>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
    zIndex: 10,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  messageTouchable: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageWrapper: {
    maxWidth: 600,
    alignItems: 'center',
  },
  headlineText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  spacing: {
    height: 32, // Prazan prostor između headlinea i objašnjenja
  },
  explanationText: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    minWidth: 200,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
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

