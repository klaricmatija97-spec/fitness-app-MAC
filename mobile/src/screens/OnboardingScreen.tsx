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
  'Mnogi se boje da će se odlaskom u teretanu "nabildati".\n\nTo se ne događa preko noći.\n\nMišići se grade postupno, uz vrijeme, trud i kontinuitet.',
  'Ako ne dobivaš na težini, razlog je jednostavan.\n\nNe unosiš dovoljno kalorija.\n\nBez dovoljno energije tijelo nema od čega graditi masu.',
  'Ako ne gubiš kilograme, najčešće nisi u kalorijskom deficitu.\n\nZa skidanje masnog tkiva važno je birati hranu većeg volumena, a manje kalorija.\n\nTakva hrana stvara osjećaj sitosti i olakšava kontrolu unosa.',
  'Za bolje rezultate izbjegavaj:\n\nšećer, pekarske proizvode, zaslađene sokove i alkohol.\n\nOve namirnice lako povećavaju kalorijski unos bez osjećaja sitosti.',
  'Dosljednost je važnija od savršenstva.\n\nKada se pravilna prehrana i trening spoje,\n\nrezultati dolaze — postupno, ali sigurno.',
  'Nedostatak vremena čest je izgovor, ali rijetko stvarni problem.\n\nTri treninga tjedno po 45 minuta dovoljna su za napredak.\n\nS vremenom trening postaje navika.',
  'Teretana nije rezervirana za bodybuildere.\n\nTo je prostor za zdravlje, snagu, kondiciju i bolju kvalitetu života.',
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const currentIndexRef = useRef(0);
  const isAnimating = useRef(false);
  
  // Animacije
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const messageTranslateY = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

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

  // Prikaži CTA gumb na zadnjoj poruci
  useEffect(() => {
    if (currentIndex === messages.length - 1) {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }).start();
    } else {
      buttonOpacity.setValue(0);
    }
  }, [currentIndex]);

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating.current) return false;
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;
        const idx = currentIndexRef.current;
        // Swipe prema gore - sljedeća poruka
        if (gestureState.dy < -50 && idx < messages.length - 1) {
          goToNext();
        }
        // Swipe prema dolje - prethodna poruka
        else if (gestureState.dy > 50 && idx > 0) {
          goToPrevious();
        }
      },
    })
  ).current;

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
    
    // Fade out trenutne poruke
    Animated.parallel([
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(messageTranslateY, {
        toValue: -20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      if (!finished) {
        isAnimating.current = false;
        return;
      }
      
      // Promijeni poruku - koristi callback da se osigura ažuriranje
      setCurrentIndex((prev) => {
        currentIndexRef.current = nextIndex;
        return nextIndex;
      });
      // Reset animacije za novu poruku
      messageTranslateY.setValue(20);
      // Fade in nove poruke
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
    
    // Fallback - resetiraj animaciju ako se zaglavi
    setTimeout(() => {
      if (isAnimating.current) {
        console.warn('Animation timeout, resetting');
        isAnimating.current = false;
        messageOpacity.setValue(1);
        messageTranslateY.setValue(0);
      }
    }, 1000);
  };

  const goToPrevious = () => {
    const idx = currentIndexRef.current;
    if (idx > 0 && !isAnimating.current) {
      isAnimating.current = true;
      const prevIndex = idx - 1;
      
      // Fade out trenutne poruke
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
      // Promijeni poruku - koristi callback da se osigura ažuriranje
      setCurrentIndex((prev) => {
        currentIndexRef.current = prevIndex;
        return prevIndex;
      });
      // Reset animacije za novu poruku
      messageTranslateY.setValue(-20);
      // Fade in nove poruke
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
      });
    }
  };

  const handleNext = () => {
    if (isAnimating.current) {
      return;
    }
    
    const idx = currentIndexRef.current;
    if (idx < messages.length - 1) {
      goToNext();
    } else {
      onComplete();
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

      {/* Tamni gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
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
              <Text style={styles.messageText}>{messages[currentIndex]}</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* CTA gumb - samo na zadnjoj poruci */}
        {currentIndex === messages.length - 1 && (
          <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={onComplete}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Nastavi</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
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
  messageText: {
    fontSize: 20,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: 0.5,
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

