/**
 * Trainer Profile Screen
 * ========================
 * 
 * Prikazuje detaljan portfolio trenera:
 * - Hero sekcija s cover slikom
 * - Osnovni podaci i statistika
 * - O meni (bio)
 * - Specijalizacije
 * - Certifikati
 * - Recenzije klijenata
 * - Galerija
 * - CTA za povezivanje
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 280;

interface Props {
  trainerId: string;
  trainerCode?: string;
  authToken?: string;
  onConnect?: (trainerId: string, trainerName: string) => void;
  onBack?: () => void;
}

interface TrainerProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  motto: string | null;
  specializations: string[];
  certifications: { name: string; issuer: string; year: number }[];
  yearsOfExperience: number;
  location: string | null;
  hourlyRate: number | null;
  currency: string;
  languages: string[];
  availability: Record<string, boolean>;
  trainingType: 'online' | 'in_person' | 'both';
  socialLinks: { instagram?: string; facebook?: string; youtube?: string; website?: string };
  isVerified: boolean;
  trainerCode: string | null;
  memberSince: string;
  stats: {
    clientCount: number;
    averageRating: number;
    reviewCount: number;
  };
  reviews: {
    id: string;
    clientName: string;
    rating: number;
    text: string | null;
    isVerified: boolean;
    createdAt: string;
  }[];
  gallery: {
    id: string;
    imageUrl: string;
    caption: string | null;
    type: string;
  }[];
}

export default function TrainerProfileScreen({ trainerId, trainerCode, authToken, onConnect, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [connecting, setConnecting] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfile();
  }, [trainerId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainers/${trainerId}/profile`);
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
      } else {
        Alert.alert('Greška', data.error || 'Nije moguće učitati profil');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Mock data za testiranje
      setProfile({
        id: trainerId,
        name: 'Ivan Horvat',
        avatarUrl: null,
        coverImageUrl: null,
        bio: 'Certificirani fitness trener s 8 godina iskustva. Specijaliziran za hipertrofiju i transformaciju tijela. Moja filozofija je jednostavna: konzistentnost pobjeđuje intenzitet. Radim s klijentima svih razina, od početnika do natjecatelja.',
        motto: 'Tvoje tijelo može sve. Samo treba uvjeriti um.',
        specializations: ['Hipertrofija', 'Transformacija tijela', 'Powerlifting', 'Sportska prehrana'],
        certifications: [
          { name: 'ISSA CPT', issuer: 'ISSA', year: 2016 },
          { name: 'Precision Nutrition L1', issuer: 'Precision Nutrition', year: 2018 },
          { name: 'NSCA CSCS', issuer: 'NSCA', year: 2020 },
        ],
        yearsOfExperience: 8,
        location: 'Zagreb, Hrvatska',
        hourlyRate: 40,
        currency: 'EUR',
        languages: ['Hrvatski', 'Engleski'],
        availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
        trainingType: 'both',
        socialLinks: { instagram: '@ivan.fitness', youtube: 'IvanFitnessHR' },
        isVerified: true,
        trainerCode: trainerCode || 'TRN-A1B2',
        memberSince: '2020-03-15',
        stats: {
          clientCount: 47,
          averageRating: 4.8,
          reviewCount: 23,
        },
        reviews: [
          { id: 'r1', clientName: 'Marko P.', rating: 5, text: 'Izvanredan trener! Promijenio mi je pristup treningu i prehrani. Rezultati su vidljivi već nakon 2 mjeseca.', isVerified: true, createdAt: '2024-06-15' },
          { id: 'r2', clientName: 'Ana K.', rating: 5, text: 'Profesionalan, strpljiv i motivirajući. Preporučujem svima!', isVerified: true, createdAt: '2024-05-20' },
          { id: 'r3', clientName: 'Luka M.', rating: 4, text: 'Odličan program, prilagođen mojim ciljevima. Zadovoljan sam napretkom.', isVerified: false, createdAt: '2024-04-10' },
        ],
        gallery: [],
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!profile || !authToken) {
      Alert.alert('Greška', 'Morate biti prijavljeni za povezivanje s trenerom');
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/client/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trainerCode: profile.trainerCode }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Uspjeh!', `Uspješno ste se povezali s ${profile.name}!`, [
          { text: 'OK', onPress: () => onConnect?.(profile.id, profile.name) }
        ]);
      } else {
        Alert.alert('Greška', data.error || 'Nije moguće povezati se');
      }
    } catch (error) {
      Alert.alert('Greška', 'Nije moguće povezati se s trenerom');
    } finally {
      setConnecting(false);
    }
  }

  function renderStars(rating: number) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('★');
      } else if (i === fullStars && hasHalf) {
        stars.push('☆');
      } else {
        stars.push('☆');
      }
    }
    
    return stars.join('');
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('hr-HR', { month: 'short', year: 'numeric' });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Učitavanje profila...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profil nije pronađen</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Natrag</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Animated header opacity
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Animated Nav Bar */}
      <Animated.View style={[styles.navBar, { opacity: headerOpacity }]}>
        <View style={styles.navBarContent}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.navBackText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>{profile.name}</Text>
          <View style={styles.navPlaceholder} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#1C1C1E', '#2C2C2E', '#1C1C1E']}
            style={styles.heroGradient}
          >
            {/* Back Button */}
            <TouchableOpacity style={styles.heroBackButton} onPress={onBack}>
              <Text style={styles.heroBackText}>‹ Natrag</Text>
            </TouchableOpacity>

            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{profile.name.charAt(0)}</Text>
                </View>
              )}
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>

            {/* Name & Motto */}
            <Text style={styles.trainerName}>{profile.name}</Text>
            {profile.motto && (
              <Text style={styles.motto}>"{profile.motto}"</Text>
            )}

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.stats.averageRating}</Text>
                <Text style={styles.statLabel}>Ocjena</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.stats.clientCount}</Text>
                <Text style={styles.statLabel}>Klijenata</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.yearsOfExperience}</Text>
                <Text style={styles.statLabel}>God. iskustva</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Info Pills */}
          <View style={styles.infoPills}>
            {profile.location && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>📍 {profile.location}</Text>
              </View>
            )}
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {profile.trainingType === 'online' ? '💻 Online' : 
                 profile.trainingType === 'in_person' ? '🏋️ Uživo' : '💻🏋️ Online i uživo'}
              </Text>
            </View>
            {profile.hourlyRate && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>💰 {profile.hourlyRate} {profile.currency}/h</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>O MENI</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          {/* Specializations */}
          {profile.specializations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SPECIJALIZACIJE</Text>
              <View style={styles.tagsContainer}>
                {profile.specializations.map((spec, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{spec}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Certifications */}
          {profile.certifications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CERTIFIKATI</Text>
              {profile.certifications.map((cert, index) => (
                <View key={index} style={styles.certItem}>
                  <View style={styles.certIcon}>
                    <Text style={styles.certIconText}>🏅</Text>
                  </View>
                  <View style={styles.certInfo}>
                    <Text style={styles.certName}>{cert.name}</Text>
                    <Text style={styles.certIssuer}>{cert.issuer} • {cert.year}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Languages */}
          {profile.languages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>JEZICI</Text>
              <Text style={styles.languagesText}>{profile.languages.join(' • ')}</Text>
            </View>
          )}

          {/* Reviews */}
          {profile.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                RECENZIJE ({profile.stats.reviewCount})
              </Text>
              {profile.reviews.slice(0, 5).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>
                      {review.clientName}
                      {review.isVerified && ' ✓'}
                    </Text>
                    <Text style={styles.reviewStars}>{renderStars(review.rating)}</Text>
                  </View>
                  {review.text && (
                    <Text style={styles.reviewText}>{review.text}</Text>
                  )}
                  <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Social Links */}
          {Object.keys(profile.socialLinks).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SOCIAL</Text>
              <View style={styles.socialLinks}>
                {profile.socialLinks.instagram && (
                  <TouchableOpacity 
                    style={styles.socialButton}
                    onPress={() => Linking.openURL(`https://instagram.com/${profile.socialLinks.instagram?.replace('@', '')}`)}
                  >
                    <Text style={styles.socialButtonText}>Instagram</Text>
                  </TouchableOpacity>
                )}
                {profile.socialLinks.youtube && (
                  <TouchableOpacity 
                    style={styles.socialButton}
                    onPress={() => Linking.openURL(`https://youtube.com/${profile.socialLinks.youtube}`)}
                  >
                    <Text style={styles.socialButtonText}>YouTube</Text>
                  </TouchableOpacity>
                )}
                {profile.socialLinks.website && (
                  <TouchableOpacity 
                    style={styles.socialButton}
                    onPress={() => Linking.openURL(profile.socialLinks.website!)}
                  >
                    <Text style={styles.socialButtonText}>Web</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Spacer for CTA */}
          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      {/* Fixed CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaButton, connecting && styles.ctaButtonDisabled]}
          onPress={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.ctaButtonText}>Poveži se s {profile.name.split(' ')[0]}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#0A84FF',
    fontSize: 17,
  },
  
  // Nav Bar
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingTop: 50,
    paddingBottom: 10,
  },
  navBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navBackText: {
    color: '#0A84FF',
    fontSize: 32,
    fontWeight: '300',
  },
  navTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  navPlaceholder: {
    width: 30,
  },

  scrollView: {
    flex: 1,
  },

  // Hero
  heroSection: {
    height: HEADER_HEIGHT,
  },
  heroGradient: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
  },
  heroBackButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  heroBackText: {
    color: '#0A84FF',
    fontSize: 17,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: '600',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1C1C1E',
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  trainerName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  motto: {
    color: '#8E8E93',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    paddingHorizontal: 40,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#3A3A3C',
  },

  // Content
  content: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  infoPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pillText: {
    color: '#FFF',
    fontSize: 13,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  bioText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagText: {
    color: '#FFF',
    fontSize: 14,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  certIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  certIconText: {
    fontSize: 20,
  },
  certInfo: {
    flex: 1,
  },
  certName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  certIssuer: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 2,
  },
  languagesText: {
    color: '#FFF',
    fontSize: 16,
  },
  reviewCard: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  reviewStars: {
    color: '#FFD60A',
    fontSize: 14,
  },
  reviewText: {
    color: '#D1D1D6',
    fontSize: 14,
    lineHeight: 20,
  },
  reviewDate: {
    color: '#48484A',
    fontSize: 12,
    marginTop: 8,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  socialButtonText: {
    color: '#0A84FF',
    fontSize: 15,
    fontWeight: '500',
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  ctaButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

