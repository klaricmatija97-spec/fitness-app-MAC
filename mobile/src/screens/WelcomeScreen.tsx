/**
 * Welcome Screen
 * Premium fitness aplikacija - početni ekran
 */

import React, { useState, useEffect, useRef } from 'react';
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
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80', // Olympic lifting
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80', // Weightlifting
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80', // Athletic training
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80', // Gym training
];

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const [currentBgImage, setCurrentBgImage] = useState(0);
  
  // Animacije - koristimo useRef da se ne kreiraju ponovno pri svakom renderu
  // Sve animacije su fade-in (samo opacity)
  const subtitleOpacity = React.useRef(new Animated.Value(0)).current;
  const buttonOpacity = React.useRef(new Animated.Value(0)).current;
  const brandOpacity = React.useRef(new Animated.Value(0)).current;

  // Swipe gesture handler - vertikalno povlačenje prema gore
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Aktiviraj samo ako je vertikalni pokret veći od horizontalnog
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Ako je povučeno prema gore (negativan dy) i dovoljno daleko (min 80px)
        if (gestureState.dy < -80) {
          onGetStarted();
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

  // Pokreni animacije pri učitavanju - sve fade-in
  useEffect(() => {
    // Brand logo - prvi (0ms)
    Animated.timing(brandOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Middle section (DOBRODOŠLI U CORPEX.) - izlazi s animacijom (300ms)
    Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Bottom section (KRENIMO) - zadnji izlazi (600ms)
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 600,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const subtitleAnimatedStyle = {
    opacity: subtitleOpacity,
  };

  const buttonAnimatedStyle = {
    opacity: buttonOpacity,
  };

  const brandAnimatedStyle = {
    opacity: brandOpacity,
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
        {/* Brand logo - gore */}
        <Animated.View style={[styles.brandContainer, brandAnimatedStyle]}>
          <Text style={styles.brandText}>CORPEX</Text>
        </Animated.View>

        {/* Main content */}
        <View style={styles.mainContent}>
          {/* Middle section - DOBRODOŠLI U CORPEX (centrirano) */}
          <Animated.View style={[styles.middleSection, subtitleAnimatedStyle]}>
            <Text style={styles.middleText}>DOBRODOŠLI U CORPEX.</Text>
          </Animated.View>

          {/* Bottom section - KRENIMO (minimalistički gumb) */}
          <Animated.View style={[styles.bottomSection, buttonAnimatedStyle]}>
            <TouchableOpacity
              style={styles.krenimoButton}
              onPress={onGetStarted}
              activeOpacity={0.6}
            >
              <Text style={styles.krenimoText}>KRENIMO</Text>
            </TouchableOpacity>
          </Animated.View>
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
    backgroundColor: 'rgba(0,0,0,0.6)', // Tamni overlay za premium izgled
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 60,
    zIndex: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  brandText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: '300',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 80,
    position: 'relative',
  },
  middleSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  middleText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 3,
    lineHeight: 36,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  krenimoButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  krenimoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '300',
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

