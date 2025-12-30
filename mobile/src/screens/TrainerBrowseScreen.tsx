/**
 * Trainer Browse Screen
 * ======================
 * 
 * Lista javno dostupnih trenera za pregledavanje i odabir.
 * Klijenti mogu pregledati profile trenera prije povezivanja.
 * 
 * Features:
 * - Pretraga po imenu
 * - Filter po specijalizaciji
 * - Filter po tipu treninga (online/uživo)
 * - Sortiranje po ocjeni/iskustvu
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

interface Props {
  authToken?: string;
  onSelectTrainer: (trainerId: string, trainerCode?: string) => void;
  onBack?: () => void;
}

interface TrainerCard {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  motto: string | null;
  specializations: string[];
  years_of_experience: number;
  location: string | null;
  hourly_rate: number | null;
  currency: string;
  training_type: 'online' | 'in_person' | 'both';
  is_verified: boolean;
  trainer_code: string | null;
  clientCount: number;
  averageRating: number;
  reviewCount: number;
}

type FilterType = 'all' | 'online' | 'in_person';

const SPECIALIZATION_FILTERS = [
  'Sve',
  'Hipertrofija',
  'Powerlifting',
  'Transformacija',
  'Prehrana',
  'Rehabilitacija',
];

export default function TrainerBrowseScreen({ authToken, onSelectTrainer, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trainers, setTrainers] = useState<TrainerCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [specFilter, setSpecFilter] = useState('Sve');

  useEffect(() => {
    loadTrainers();
  }, []);

  async function loadTrainers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') {
        params.append('training_type', typeFilter);
      }
      if (specFilter !== 'Sve') {
        params.append('specialization', specFilter);
      }

      const response = await fetch(`${API_BASE_URL}/api/trainers/public?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTrainers(data.data.trainers);
      } else {
        // Mock data za testiranje
        setTrainers([
          {
            id: '1',
            name: 'Ivan Horvat',
            avatar_url: null,
            bio: 'Certificirani fitness trener s 8 godina iskustva u hipertrofiji i transformaciji tijela.',
            motto: 'Konzistentnost pobjeđuje intenzitet',
            specializations: ['Hipertrofija', 'Transformacija'],
            years_of_experience: 8,
            location: 'Zagreb',
            hourly_rate: 40,
            currency: 'EUR',
            training_type: 'both',
            is_verified: true,
            trainer_code: 'TRN-A1B2',
            clientCount: 47,
            averageRating: 4.8,
            reviewCount: 23,
          },
          {
            id: '2',
            name: 'Ana Kovačević',
            avatar_url: null,
            bio: 'Specijalizirana za ženske transformacije i fitness natjecanja.',
            motto: 'Strong is the new beautiful',
            specializations: ['Transformacija', 'Bikini fitness'],
            years_of_experience: 5,
            location: 'Split',
            hourly_rate: 35,
            currency: 'EUR',
            training_type: 'online',
            is_verified: true,
            trainer_code: 'TRN-C3D4',
            clientCount: 32,
            averageRating: 4.9,
            reviewCount: 18,
          },
          {
            id: '3',
            name: 'Marko Babić',
            avatar_url: null,
            bio: 'Powerlifting coach i natjecatelj. USAPL certified.',
            motto: 'Move weight, build strength',
            specializations: ['Powerlifting', 'Snaga'],
            years_of_experience: 10,
            location: 'Rijeka',
            hourly_rate: 45,
            currency: 'EUR',
            training_type: 'in_person',
            is_verified: false,
            trainer_code: 'TRN-E5F6',
            clientCount: 28,
            averageRating: 4.7,
            reviewCount: 15,
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading trainers:', error);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrainers().then(() => setRefreshing(false));
  }, []);

  // Filter trainers by search query
  const filteredTrainers = trainers.filter((trainer) => {
    if (!searchQuery) return true;
    return trainer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           trainer.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           trainer.specializations.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  function renderStars(rating: number) {
    const fullStars = Math.floor(rating);
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  }

  function renderTrainerCard({ item }: { item: TrainerCard }) {
    return (
      <TouchableOpacity
        style={styles.trainerCard}
        onPress={() => onSelectTrainer(item.id, item.trainer_code || undefined)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          {/* Avatar */}
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{item.name.charAt(0)}</Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.trainerName}>{item.name}</Text>
              {item.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.location}>
              {item.location || 'Lokacija nije navedena'}
            </Text>
            <View style={styles.ratingRow}>
              <Text style={styles.stars}>{renderStars(item.averageRating)}</Text>
              <Text style={styles.ratingText}>
                {item.averageRating.toFixed(1)} ({item.reviewCount})
              </Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        {item.bio && (
          <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
        )}

        {/* Specializations */}
        <View style={styles.specsRow}>
          {item.specializations.slice(0, 3).map((spec, index) => (
            <View key={index} style={styles.specTag}>
              <Text style={styles.specTagText}>{spec}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerValue}>{item.years_of_experience} god</Text>
            <Text style={styles.footerLabel}>iskustva</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerValue}>{item.clientCount}</Text>
            <Text style={styles.footerLabel}>klijenata</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerValue}>
              {item.training_type === 'online' ? 'ONL' : 
               item.training_type === 'in_person' ? 'GYM' : 'ONL+GYM'}
            </Text>
            <Text style={styles.footerLabel}>
              {item.training_type === 'online' ? 'Online' : 
               item.training_type === 'in_person' ? 'Uživo' : 'Oboje'}
            </Text>
          </View>
          {item.hourly_rate && (
            <View style={styles.footerItem}>
              <Text style={styles.footerValue}>{item.hourly_rate}€</Text>
              <Text style={styles.footerLabel}>po satu</Text>
            </View>
          )}
        </View>

        {/* CTA Arrow */}
        <View style={styles.cardArrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000', '#18181B']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backText}>‹ Natrag</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Pronađi trenera</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Pretraži po imenu, lokaciji ili specijalizaciji..."
            placeholderTextColor="#52525B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Type Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, typeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setTypeFilter('all')}
          >
            <Text style={[styles.filterChipText, typeFilter === 'all' && styles.filterChipTextActive]}>
              Svi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, typeFilter === 'online' && styles.filterChipActive]}
            onPress={() => setTypeFilter('online')}
          >
            <Text style={[styles.filterChipText, typeFilter === 'online' && styles.filterChipTextActive]}>
              Online
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, typeFilter === 'in_person' && styles.filterChipActive]}
            onPress={() => setTypeFilter('in_person')}
          >
            <Text style={[styles.filterChipText, typeFilter === 'in_person' && styles.filterChipTextActive]}>
              Uživo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.loadingText}>Učitavanje trenera...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTrainers}
            renderItem={renderTrainerCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFF"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery 
                    ? 'Nema trenera koji odgovaraju pretrazi' 
                    : 'Nema dostupnih trenera'}
                </Text>
              </View>
            }
          />
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  title: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#18181B',
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#18181B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: '#27272A',
  },
  filterChipText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#71717A',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#71717A',
    fontSize: 16,
    textAlign: 'center',
  },

  // Trainer Card
  trainerCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainerName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  location: {
    color: '#71717A',
    fontSize: 14,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stars: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  ratingText: {
    color: '#71717A',
    fontSize: 12,
    marginLeft: 6,
  },
  bio: {
    color: '#D4D4D8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  specTag: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  specTagText: {
    color: '#FFF',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  footerLabel: {
    color: '#52525B',
    fontSize: 11,
    marginTop: 2,
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
  },
  arrowText: {
    color: '#52525B',
    fontSize: 24,
    fontWeight: '300',
  },
});

