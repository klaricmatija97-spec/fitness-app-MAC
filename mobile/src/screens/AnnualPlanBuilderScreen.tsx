import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WEEK_WIDTH = 25; // Širina jednog tjedna u pikselima
const TIMELINE_HEIGHT = 80;

// ============================================
// IFT FAZE - Definicije
// ============================================

interface FazaDefinicija {
  tip: string;
  naziv: string;
  nazivKratki: string;
  boja: string;
  ikona: string;
  opis: string;
  trajanjeTjedana: { min: number; max: number };
  ponavljanja: string;
  intenzitet: string;
}

const IFT_FAZE: FazaDefinicija[] = [
  { 
    tip: 'hipertrofija', 
    naziv: 'Hipertrofija', 
    nazivKratki: 'HIP', 
    boja: '#8B5CF6', 
    ikona: '💪', 
    opis: 'Povećanje mišićne mase',
    trajanjeTjedana: { min: 4, max: 8 },
    ponavljanja: '8-12',
    intenzitet: '65-80% 1RM',
  },
  { 
    tip: 'jakost', 
    naziv: 'Jakost', 
    nazivKratki: 'JAK', 
    boja: '#EF4444', 
    ikona: '🏋️', 
    opis: 'Maksimalna snaga',
    trajanjeTjedana: { min: 3, max: 6 },
    ponavljanja: '1-5',
    intenzitet: '85-100% 1RM',
  },
  { 
    tip: 'snaga', 
    naziv: 'Snaga/Power', 
    nazivKratki: 'PWR', 
    boja: '#F97316', 
    ikona: '⚡', 
    opis: 'Eksplozivnost',
    trajanjeTjedana: { min: 3, max: 5 },
    ponavljanja: '3-6 ekspl.',
    intenzitet: '75-90% 1RM',
  },
  { 
    tip: 'izdrzljivost', 
    naziv: 'Izdržljivost', 
    nazivKratki: 'IZD', 
    boja: '#22C55E', 
    ikona: '🔄', 
    opis: 'Mišićna izdržljivost',
    trajanjeTjedana: { min: 3, max: 6 },
    ponavljanja: '15-25',
    intenzitet: '50-65% 1RM',
  },
  { 
    tip: 'deload', 
    naziv: 'Deload', 
    nazivKratki: 'DEL', 
    boja: '#6B7280', 
    ikona: '😴', 
    opis: 'Oporavak',
    trajanjeTjedana: { min: 1, max: 1 },
    ponavljanja: '8-12',
    intenzitet: '50-60% 1RM',
  },
  { 
    tip: 'priprema', 
    naziv: 'Priprema', 
    nazivKratki: 'PRI', 
    boja: '#14B8A6', 
    ikona: '🎪', 
    opis: 'Priprema za natjecanje',
    trajanjeTjedana: { min: 2, max: 4 },
    ponavljanja: 'Specifično',
    intenzitet: '70-85% 1RM',
  },
  { 
    tip: 'natjecanje', 
    naziv: 'Natjecanje', 
    nazivKratki: 'NAT', 
    boja: '#FFD700', 
    ikona: '🏆', 
    opis: 'Natjecateljska faza',
    trajanjeTjedana: { min: 1, max: 2 },
    ponavljanja: 'Održavanje',
    intenzitet: '95-105% 1RM',
  },
  { 
    tip: 'tranzicija', 
    naziv: 'Tranzicija', 
    nazivKratki: 'TRA', 
    boja: '#94A3B8', 
    ikona: '🌊', 
    opis: 'Aktivni odmor',
    trajanjeTjedana: { min: 1, max: 3 },
    ponavljanja: 'Lagano',
    intenzitet: '40-60% 1RM',
  },
];

// ============================================
// Tipovi
// ============================================

interface Mesocycle {
  id: string;
  trainingProgramId: string;
  name: string;
  type: string;
  startWeek: number;
  durationWeeks: number;
  status: 'planned' | 'active' | 'completed' | 'skipped';
  orderIndex: number;
}

interface Props {
  authToken: string;
  clientId: string;
  clientName: string;
  year: number;
  onBack?: () => void;
  onGenerateProgram?: (clientId: string, mesocycleId: string) => void;
  onManualMesocycle?: (programId: string, mesocycleId?: string) => void;
}

const MONTH_NAMES = [
  'Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip',
  'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro'
];

const WEEKS_PER_MONTH = [5, 4, 4, 5, 4, 4, 5, 4, 5, 4, 4, 5]; // Približno

export default function AnnualPlanBuilderScreen({
  authToken,
  clientId,
  clientName,
  year,
  onBack,
  onGenerateProgram,
  onManualMesocycle,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [annualProgramId, setAnnualProgramId] = useState<string | null>(null);
  const [showFazaModal, setShowFazaModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedMesocycle, setSelectedMesocycle] = useState<Mesocycle | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadAnnualProgram();
  }, [year, clientId]);

  async function loadAnnualProgram() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/annual-plan?clientId=${clientId}&year=${year}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();

      if (result.success && result.data) {
        setMesocycles(result.data.mesocycles || []);
        setAnnualProgramId(result.data.id);
      } else if (result.code === 'NOT_FOUND') {
        await createNewAnnualProgram();
      } else {
        // Za sada, kreiraj prazan plan
        await createNewAnnualProgram();
      }
    } catch (error) {
      console.error('Error loading annual program:', error);
      // Za sada, nastavi s praznim planom
      setMesocycles([]);
    } finally {
      setLoading(false);
    }
  }

  async function createNewAnnualProgram() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/annual-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          year,
          name: `${clientName} - Godišnji plan ${year}`,
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setAnnualProgramId(result.data.id);
      }
    } catch (error) {
      console.error('Error creating annual program:', error);
    }
  }

  function getFazaByTip(tip: string): FazaDefinicija {
    return IFT_FAZE.find(f => f.tip === tip) || IFT_FAZE[0];
  }

  function handleTimelinePress(week: number) {
    // Provjeri da li već postoji mezociklus na ovom tjednu
    const existing = mesocycles.find(m => 
      week >= m.startWeek && week < m.startWeek + m.durationWeeks
    );
    
    if (existing) {
      setSelectedMesocycle(existing);
      Alert.alert(
        existing.name,
        `Tip: ${getFazaByTip(existing.type).naziv}\nTjedni: ${existing.startWeek} - ${existing.startWeek + existing.durationWeeks - 1}`,
        [
          { text: 'Generiraj trening', onPress: () => onGenerateProgram?.(clientId, existing.trainingProgramId) },
          { text: 'Ručno složi', onPress: () => onManualMesocycle?.(existing.trainingProgramId, existing.id) },
          { text: 'Obriši', style: 'destructive', onPress: () => handleDeleteMesocycle(existing.id) },
          { text: 'Zatvori', style: 'cancel' },
        ]
      );
    } else {
      setSelectedWeek(week);
      setShowFazaModal(true);
    }
  }

  async function handleAddFaza(faza: FazaDefinicija) {
    if (selectedWeek === null) return;
    
    const newMesocycle: Mesocycle = {
      id: `temp-${Date.now()}`,
      trainingProgramId: annualProgramId || '',
      name: `${faza.naziv} - Tjedan ${selectedWeek}`,
      type: faza.tip,
      startWeek: selectedWeek,
      durationWeeks: faza.trajanjeTjedana.min,
      status: 'planned',
      orderIndex: mesocycles.length,
    };
    
    setMesocycles([...mesocycles, newMesocycle]);
    setShowFazaModal(false);
    setSelectedWeek(null);
    
    // TODO: Spremi u bazu
    if (annualProgramId) {
      try {
        await fetch(`${API_BASE_URL}/api/training/manual/mesocycle`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            programId: annualProgramId,
            name: newMesocycle.name,
            type: faza.tip,
            startWeek: selectedWeek,
            durationWeeks: faza.trajanjeTjedana.min,
            orderIndex: mesocycles.length,
          }),
        });
      } catch (error) {
        console.error('Error saving mesocycle:', error);
      }
    }
  }

  async function handleDeleteMesocycle(mesocycleId: string) {
    setMesocycles(mesocycles.filter(m => m.id !== mesocycleId));
    // TODO: Obriši iz baze
  }

  function handleExtendMesocycle(mesocycleId: string, weeks: number) {
    setMesocycles(mesocycles.map(m => {
      if (m.id === mesocycleId) {
        return { ...m, durationWeeks: Math.max(1, m.durationWeeks + weeks) };
      }
      return m;
    }));
  }

  // Render timeline header (mjeseci)
  function renderMonthHeader() {
    let weekOffset = 0;
    return (
      <View style={styles.monthHeader}>
        {MONTH_NAMES.map((month, index) => {
          const weeksInMonth = WEEKS_PER_MONTH[index];
          const width = weeksInMonth * WEEK_WIDTH;
          const offset = weekOffset;
          weekOffset += weeksInMonth;
          return (
            <View key={index} style={[styles.monthCell, { width, left: offset * WEEK_WIDTH }]}>
              <Text style={styles.monthText}>{month}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  // Render week numbers
  function renderWeekNumbers() {
    return (
      <View style={styles.weekNumbersRow}>
        {Array.from({ length: 52 }, (_, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.weekNumberCell}
            onPress={() => handleTimelinePress(i + 1)}
          >
            <Text style={styles.weekNumberText}>{i + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // Render mesocycles na timeline
  function renderMesocyclesTimeline() {
    return (
      <View style={styles.timelineTrack}>
        {mesocycles.map((mesocycle, index) => {
          const faza = getFazaByTip(mesocycle.type);
          const left = (mesocycle.startWeek - 1) * WEEK_WIDTH;
          const width = mesocycle.durationWeeks * WEEK_WIDTH;
          
          return (
            <TouchableOpacity
              key={mesocycle.id}
              style={[
                styles.mesocycleBlock,
                {
                  left,
                  width: Math.max(width, 50),
                  backgroundColor: faza.boja,
                },
              ]}
              onPress={() => handleTimelinePress(mesocycle.startWeek)}
              onLongPress={() => {
                Alert.alert(
                  'Promijeni trajanje',
                  `Trenutno trajanje: ${mesocycle.durationWeeks} tjedana`,
                  [
                    { text: '-1 tjedan', onPress: () => handleExtendMesocycle(mesocycle.id, -1) },
                    { text: '+1 tjedan', onPress: () => handleExtendMesocycle(mesocycle.id, 1) },
                    { text: 'Zatvori', style: 'cancel' },
                  ]
                );
              }}
            >
              <Text style={styles.mesocycleIcon}>{faza.ikona}</Text>
              <Text style={styles.mesocycleLabel} numberOfLines={1}>
                {faza.nazivKratki}
              </Text>
              <Text style={styles.mesocycleWeeks}>{mesocycle.durationWeeks}t</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Render legenda faza
  function renderLegenda() {
    return (
      <View style={styles.legenda}>
        <Text style={styles.legendaTitle}>IFT FAZE</Text>
        <View style={styles.legendaGrid}>
          {IFT_FAZE.map((faza) => (
            <TouchableOpacity
              key={faza.tip}
              style={styles.legendaItem}
              onPress={() => {
                Alert.alert(
                  `${faza.ikona} ${faza.naziv}`,
                  `${faza.opis}\n\nPonavljanja: ${faza.ponavljanja}\nIntenzitet: ${faza.intenzitet}\nTrajanje: ${faza.trajanjeTjedana.min}-${faza.trajanjeTjedana.max} tjedana`,
                  [{ text: 'OK' }]
                );
              }}
            >
              <View style={[styles.legendaColor, { backgroundColor: faza.boja }]}>
                <Text style={styles.legendaIcon}>{faza.ikona}</Text>
              </View>
              <Text style={styles.legendaLabel}>{faza.naziv}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Modal za odabir faze
  function renderFazaModal() {
    return (
      <Modal
        visible={showFazaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFazaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Odaberi fazu za tjedan {selectedWeek}</Text>
            
            <ScrollView style={styles.fazaList}>
              {IFT_FAZE.map((faza) => (
                <TouchableOpacity
                  key={faza.tip}
                  style={[styles.fazaOption, { borderLeftColor: faza.boja }]}
                  onPress={() => handleAddFaza(faza)}
                >
                  <View style={styles.fazaOptionHeader}>
                    <Text style={styles.fazaOptionIcon}>{faza.ikona}</Text>
                    <Text style={styles.fazaOptionName}>{faza.naziv}</Text>
                  </View>
                  <Text style={styles.fazaOptionDesc}>{faza.opis}</Text>
                  <View style={styles.fazaOptionParams}>
                    <Text style={styles.fazaParam}>📊 {faza.ponavljanja}</Text>
                    <Text style={styles.fazaParam}>💪 {faza.intenzitet}</Text>
                    <Text style={styles.fazaParam}>📅 {faza.trajanjeTjedana.min}-{faza.trajanjeTjedana.max}t</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFazaModal(false)}
            >
              <Text style={styles.modalCloseText}>Zatvori</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Učitavanje godišnjeg plana...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Natrag</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📅 {year}</Text>
          <TouchableOpacity onPress={() => Alert.alert('Info', 'Klikni na prazan tjedan da dodaš fazu.\nDugi klik na fazu za promjenu trajanja.')}>
            <Text style={styles.infoText}>ℹ️</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.clientName}>{clientName}</Text>

        {/* Legenda faza */}
        {renderLegenda()}

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          <Text style={styles.sectionTitle}>GODIŠNJA LENTA VREMENA</Text>
          <Text style={styles.sectionSubtitle}>Klikni na tjedan za dodavanje faze</Text>
          
          <ScrollView 
            horizontal 
            ref={scrollViewRef}
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.timelineScroll}
          >
            <View style={styles.timeline}>
              {/* Mjeseci header */}
              {renderMonthHeader()}
              
              {/* Week numbers */}
              {renderWeekNumbers()}
              
              {/* Mesocycles track */}
              {renderMesocyclesTimeline()}
            </View>
          </ScrollView>
        </View>

        {/* Lista mezociklusa */}
        <ScrollView style={styles.mesocyclesList}>
          <Text style={styles.sectionTitle}>MEZOCIKLUSI ({mesocycles.length})</Text>
          
          {mesocycles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>Nema mezociklusa</Text>
              <Text style={styles.emptySubtext}>Klikni na tjedan u vremenskoj lenti iznad da dodaš prvu fazu</Text>
            </View>
          ) : (
            mesocycles.map((mesocycle, index) => {
              const faza = getFazaByTip(mesocycle.type);
              return (
                <TouchableOpacity
                  key={mesocycle.id}
                  style={[styles.mesocycleCard, { borderLeftColor: faza.boja }]}
                  onPress={() => handleTimelinePress(mesocycle.startWeek)}
                >
                  <View style={styles.mesocycleCardHeader}>
                    <Text style={styles.mesocycleCardIcon}>{faza.ikona}</Text>
                    <View style={styles.mesocycleCardInfo}>
                      <Text style={styles.mesocycleCardName}>{faza.naziv}</Text>
                      <Text style={styles.mesocycleCardWeeks}>
                        Tjedan {mesocycle.startWeek} - {mesocycle.startWeek + mesocycle.durationWeeks - 1} ({mesocycle.durationWeeks}t)
                      </Text>
                    </View>
                    <View style={[styles.mesocycleCardBadge, { backgroundColor: faza.boja }]}>
                      <Text style={styles.mesocycleCardBadgeText}>{faza.nazivKratki}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Modal za odabir faze */}
        {renderFazaModal()}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backText: { color: '#8B5CF6', fontSize: 16, fontWeight: '600' },
  title: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  infoText: { fontSize: 20 },
  clientName: { 
    color: '#AAA', 
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 10 
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 10, fontSize: 16 },
  
  // Legenda
  legenda: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  legendaTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  legendaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendaColor: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  legendaIcon: { fontSize: 14 },
  legendaLabel: { color: '#FFF', fontSize: 12, fontWeight: '500' },
  
  // Timeline
  timelineContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginHorizontal: 15,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 15,
  },
  timelineScroll: {
    paddingBottom: 10,
  },
  timeline: {
    width: 52 * WEEK_WIDTH,
  },
  monthHeader: {
    flexDirection: 'row',
    height: 30,
    marginBottom: 5,
  },
  monthCell: {
    position: 'absolute',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 4,
    marginRight: 2,
  },
  monthText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  weekNumbersRow: {
    flexDirection: 'row',
    height: 25,
    marginBottom: 5,
  },
  weekNumberCell: {
    width: WEEK_WIDTH,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
    borderWidth: 0.5,
    borderColor: '#444',
  },
  weekNumberText: {
    color: '#666',
    fontSize: 9,
  },
  timelineTrack: {
    height: TIMELINE_HEIGHT,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    position: 'relative',
  },
  mesocycleBlock: {
    position: 'absolute',
    top: 5,
    height: TIMELINE_HEIGHT - 10,
    borderRadius: 8,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  mesocycleIcon: {
    fontSize: 16,
  },
  mesocycleLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  mesocycleWeeks: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
  },
  
  // Lista
  mesocyclesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 5 },
  emptySubtext: { color: '#888', fontSize: 14, textAlign: 'center' },
  mesocycleCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  mesocycleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mesocycleCardIcon: { fontSize: 28, marginRight: 12 },
  mesocycleCardInfo: { flex: 1 },
  mesocycleCardName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  mesocycleCardWeeks: { color: '#AAA', fontSize: 13, marginTop: 2 },
  mesocycleCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  mesocycleCardBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  fazaList: {
    maxHeight: 400,
  },
  fazaOption: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  fazaOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fazaOptionIcon: { fontSize: 24, marginRight: 10 },
  fazaOptionName: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  fazaOptionDesc: { color: '#AAA', fontSize: 14, marginBottom: 10 },
  fazaOptionParams: {
    flexDirection: 'row',
    gap: 15,
  },
  fazaParam: { color: '#888', fontSize: 12 },
  modalCloseButton: {
    backgroundColor: '#444',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
