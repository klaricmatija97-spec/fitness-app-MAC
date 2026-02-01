/**
 * Onboarding Screen
 * Pojednostavljena verzija - bez kompleksnih animacija
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Premium sportske slike
const backgroundImages = [
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80',
];

const messages = [
  {
    headline: 'Mnogi se boje da će se "nabildati"?',
    explanation: 'Mnogi se boje prevelikog mišićnog rasta.\n\nVažno je znati da se to ne događa preko noći, i nije nešto od čega treba strahovati.\n\nMišićna masa se razvija postupno, uz vrijeme, dosljedan trening, kvalitetnu prehranu te dovoljno odmora i discipline.',
  },
  {
    headline: 'Ne dobivaš na težini?',
    explanation: 'Najčešći razlog je nedovoljan unos kalorija.\n\nBez dovoljno energije tijelo nema od čega graditi mišićnu masu.\n\nZa napredak je važno:\n• unositi dovoljno kalorija i hranjivih tvari\n• jesti više ugljikohidrata kroz redovite obroke\n• birati energetski bogatiju pripremu hrane\n• jesti redovito, ne samo kada si gladan — već i kada si sit',
  },
  {
    headline: 'Ne gubiš kilograme?',
    explanation: 'Nisi u kalorijskom deficitu. Važno je birati hranu većeg volumena, a manje kalorija. Takva hrana stvara osjećaj sitosti i olakšava kontrolu unosa.\n\nPrimjer: Krumpir vs. Riža\n• Krumpir (100g): ~77 kalorija, veći volumen\n• Riža (100g): ~130 kalorija, manji volumen\n\nKrumpir ima manje kalorija po gramu, ali zauzima više prostora, što daje osjećaj sitosti.',
  },
  {
    headline: 'Nedostatak vremena je izgovor!',
    explanation: 'Nedostatak vremena često je samo osjećaj.\n\nZa napredak nije potrebno provoditi sate u teretani svaki dan.\n\nTri treninga tjedno po otprilike sat vremena dovoljna su za vidljive i održive rezultate.\n\nUz malo strpljenja i upornosti, trening postaje navika.',
  },
  {
    headline: 'Whey protein',
    explanation: 'Whey protein je dodatak prehrani, a ne zamjena za obroke. Visoko je kvalitetan protein dobiven iz mlijeka.\n\nNjegova uloga nije zamijeniti kvalitetnu prehranu, već pomoći u postizanju dnevnog cilja unosa proteina.\n\nPreporučeni dnevni unos proteina iznosi približno 1,8 do 2,2 grama po kilogramu tjelesne mase.',
  },
  {
    headline: 'Kreatin monohidrat',
    explanation: 'Kreatin je prirodna tvar prisutna u tijelu i u namirnicama poput mesa i ribe.\n\nSuplementacija kreatinom povećava dostupnost ATP-a, glavnog izvora energije za mišićne kontrakcije.\n\nPreporučena dnevna doza iznosi 3–5 g.',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

export default function OnboardingScreen({ onComplete, onBack }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Rotiraj pozadinske slike svakih 15 sekundi (usporeno)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgImage((prev) => (prev + 1) % backgroundImages.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Reset scroll na vrh kada se promijeni slide
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < messages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const currentMessage = messages[currentIndex];
  const isLastSlide = currentIndex === messages.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Pozadinska slika - statična, bez animacije */}
      <View style={styles.backgroundContainer}>
              <Image
          source={{ uri: backgroundImages[currentBgImage] }}
          style={styles.backgroundImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay} />
      </View>

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {messages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentIndex && styles.progressDotActive,
              index < currentIndex && styles.progressDotCompleted,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headlineText}>{currentMessage.headline}</Text>
          <View style={styles.spacing} />
          <Text style={styles.explanationText}>{currentMessage.explanation}</Text>
              </ScrollView>
      </View>

      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        {currentIndex > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
            <Text style={styles.backButtonText}>← Nazad</Text>
            </TouchableOpacity>
          )}

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'ZAVRŠI' : 'DALJE →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={styles.skipButtonText}>Preskoči</Text>
      </TouchableOpacity>
    </SafeAreaView>
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
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  headlineText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  spacing: {
    height: 24,
  },
  explanationText: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
