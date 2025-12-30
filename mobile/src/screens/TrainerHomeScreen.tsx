/**
 * Trainer Home Screen
 * ===================
 * 
 * Pregled svih klijenata s program statusom
 * Quick actions: "New Client", "New Program"
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================
// TIPOVI
// ============================================

interface ClientSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  currentProgram: {
    id: string;
    name: string;
    status: 'draft' | 'active' | 'archived';
    adherence: number;
    lastSessionDate?: string;
    needsAttention: boolean;
  } | null;
}

interface TrainerHomeData {
  clients: ClientSummary[];
  stats: {
    totalClients: number;
    activePrograms: number;
    draftPrograms: number;
    needsAttention: number;
  };
}

// ============================================
// API FUNKCIJE
// ============================================

import { API_BASE_URL } from '../services/api';

async function fetchClients(token: string): Promise<TrainerHomeData | null> {
  try {
    console.log('[TrainerHomeScreen] Fetching clients from:', `${API_BASE_URL}/api/trainer/clients`);
    const response = await fetch(`${API_BASE_URL}/api/trainer/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[TrainerHomeScreen] Response status:', response.status);
    const data = await response.json();
    console.log('[TrainerHomeScreen] Response data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('[TrainerHomeScreen] Clients fetched:', data.data?.clients?.length || 0);
      return data.data;
    } else {
      console.error('[TrainerHomeScreen] API returned error:', data.error, data.code);
      return null;
    }
  } catch (error) {
    console.error('[TrainerHomeScreen] Error fetching clients:', error);
    return null;
  }
}

// ============================================
// KOMPONENTA
// ============================================

interface Props {
  authToken: string;
  onClientPress?: (clientId: string) => void;
  onNewClient?: () => void;
  onNewProgram?: () => void;
  onShowCode?: () => void;
  onEditProfile?: () => void;
}

export default function TrainerHomeScreen({ authToken, onClientPress, onNewClient, onNewProgram, onShowCode, onEditProfile }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<TrainerHomeData | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'needsAttention'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    console.log('[TrainerHomeScreen] Loading data with token:', authToken?.substring(0, 20) + '...');
    const result = await fetchClients(authToken);
    console.log('[TrainerHomeScreen] Loaded data:', result);
    setData(result);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return '#A1A1AA';
      case 'active': return '#3F3F46';
      case 'archived': return '#757575';
      default: return '#757575';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'active': return 'Aktivan';
      case 'archived': return 'Arhiviran';
      default: return status;
    }
  }

  function filterClients() {
    if (!data) return [];
    
    switch (filter) {
      case 'active':
        return data.clients.filter(c => c.currentProgram?.status === 'active');
      case 'needsAttention':
        return data.clients.filter(c => c.currentProgram?.needsAttention);
      default:
        return data.clients;
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Učitavanje...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const filteredClients = filterClients();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerIconButton} onPress={onEditProfile}>
              <Text style={styles.headerIconText}>P</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={onShowCode}>
              <Text style={styles.headerIconText}>#</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Klijenti</Text>
          <TouchableOpacity style={styles.newButton} onPress={onNewClient}>
            <Text style={styles.newButtonText}>+ Novi</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        {data && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.stats.totalClients}</Text>
              <Text style={styles.statLabel}>Klijenata</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.stats.activePrograms}</Text>
              <Text style={styles.statLabel}>Aktivnih</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.stats.needsAttention}</Text>
              <Text style={styles.statLabel}>Pažnja</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Svi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Aktivni</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'needsAttention' && styles.filterButtonActive]}
            onPress={() => setFilter('needsAttention')}
          >
            <Text style={[styles.filterText, filter === 'needsAttention' && styles.filterTextActive]}>Pažnja</Text>
          </TouchableOpacity>
        </View>

        {/* Clients List */}
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.clientCard}
              onPress={() => onClientPress?.(item.id)}
            >
              <View style={styles.clientInfo}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.clientDetails}>
                  <Text style={styles.clientName}>{item.name}</Text>
                  <Text style={styles.clientEmail}>{item.email}</Text>
                  {item.currentProgram && (
                    <View style={styles.programInfo}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.currentProgram.status) },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {getStatusLabel(item.currentProgram.status)}
                        </Text>
                      </View>
                      <Text style={styles.programName}>{item.currentProgram.name}</Text>
                      {item.currentProgram.needsAttention && (
                        <View style={styles.attentionBadge}>
                          <Text style={styles.attentionText}>!</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              {item.currentProgram && (
                <View style={styles.adherenceContainer}>
                  <Text style={styles.adherenceValue}>{item.currentProgram.adherence}%</Text>
                  <Text style={styles.adherenceLabel}>Adherence</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nema klijenata</Text>
            </View>
          }
        />

        {/* New Program FAB */}
        <TouchableOpacity style={styles.fab} onPress={onNewProgram}>
          <Text style={styles.fabText}>+ Novi Program</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    backgroundColor: '#18181B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 18,
  },
  codeButton: {
    backgroundColor: '#3F3F46',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  codeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  newButton: {
    backgroundColor: '#27272A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#71717A',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#18181B',
  },
  filterButtonActive: {
    backgroundColor: '#27272A',
  },
  filterText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
  },
  clientCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 8,
  },
  programInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  programName: {
    fontSize: 12,
    color: '#D4D4D8',
    flex: 1,
  },
  attentionBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#71717A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  adherenceContainer: {
    alignItems: 'flex-end',
  },
  adherenceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  adherenceLabel: {
    fontSize: 10,
    color: '#71717A',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#71717A',
    marginTop: 16,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#27272A',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

