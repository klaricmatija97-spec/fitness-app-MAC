/**
 * Annual Plan Builder Screen
 * ==========================
 * 
 * Timeline kao u video editoru:
 * - Povuci lijevi/desni rub bloka za resize
 * - Povuci sredinu bloka za pomicanje
 * - Tap na prazan tjedan za dodavanje
 */

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
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WEEK_WIDTH = 24;
const TRACK_HEIGHT = 60;
const HANDLE_WIDTH = 16;

// ============================================
// IFT FAZE
// ============================================

interface FazaDefinicija {
  tip: string;
  naziv: string;
  kratki: string;
  boja: string;
  opis: string;
  tjedanaMin: number;
  tjedanaMax: number;
  ponavljanja: string;
  intenzitet: string;
}

const FAZE: FazaDefinicija[] = [
  { tip: 'hipertrofija', naziv: 'Hipertrofija', kratki: 'HIP', boja: '#FFFFFF', opis: 'Povećanje mišićne mase', tjedanaMin: 4, tjedanaMax: 8, ponavljanja: '8-12', intenzitet: '65-80%' },
  { tip: 'jakost', naziv: 'Jakost', kratki: 'JAK', boja: '#A1A1AA', opis: 'Maksimalna snaga', tjedanaMin: 3, tjedanaMax: 6, ponavljanja: '1-5', intenzitet: '85-100%' },
  { tip: 'snaga', naziv: 'Snaga', kratki: 'PWR', boja: '#71717A', opis: 'Eksplozivnost', tjedanaMin: 3, tjedanaMax: 5, ponavljanja: '3-6', intenzitet: '75-90%' },
  { tip: 'izdrzljivost', naziv: 'Izdržljivost', kratki: 'IZD', boja: '#D4D4D8', opis: 'Mišićna izdržljivost', tjedanaMin: 3, tjedanaMax: 6, ponavljanja: '15-25', intenzitet: '50-65%' },
  { tip: 'deload', naziv: 'Deload', kratki: 'DEL', boja: '#3F3F46', opis: 'Tjedan oporavka', tjedanaMin: 1, tjedanaMax: 1, ponavljanja: '8-12', intenzitet: '50-60%' },
  { tip: 'priprema', naziv: 'Priprema', kratki: 'PRI', boja: '#52525B', opis: 'Priprema za natjecanje', tjedanaMin: 2, tjedanaMax: 4, ponavljanja: 'Specifično', intenzitet: '70-85%' },
  { tip: 'natjecanje', naziv: 'Natjecanje', kratki: 'NAT', boja: '#E4E4E7', opis: 'Natjecateljska faza', tjedanaMin: 1, tjedanaMax: 2, ponavljanja: 'Održavanje', intenzitet: '95-105%' },
  { tip: 'tranzicija', naziv: 'Tranzicija', kratki: 'TRA', boja: '#27272A', opis: 'Aktivni odmor', tjedanaMin: 1, tjedanaMax: 3, ponavljanja: 'Lagano', intenzitet: '40-60%' },
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

interface PhaseData {
  phaseType: string;
  phaseName: string;
  startWeek: number;
  endWeek: number;
  durationWeeks: number;
  mesocycleId: string;
  ponavljanja: string;
  intenzitet: string;
}

interface Props {
  authToken: string;
  clientId: string;
  clientName: string;
  year: number;
  onBack?: () => void;
  onGenerateProgram?: (clientId: string, phaseData: PhaseData) => void;
  onGenerateAllPhases?: (clientId: string, phases: PhaseData[], onComplete: (results: GeneratedPhaseResult[]) => void) => void;
}

interface GeneratedPhaseResult {
  phaseType: string;
  phaseName: string;
  programId: string | null;
  success: boolean;
  error?: string;
}

const MONTHS = ['Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip', 'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro'];
const WEEKS_PER_MONTH = [5, 4, 4, 5, 4, 4, 5, 4, 5, 4, 4, 5];

export default function AnnualPlanBuilderScreen({
  authToken,
  clientId,
  clientName,
  year,
  onBack,
  onGenerateProgram,
  onGenerateAllPhases,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<{current: number; total: number; phase: string} | null>(null);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [annualProgramId, setAnnualProgramId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{id: string; type: 'left' | 'right' | 'move'; startX: number; originalStart: number; originalDuration: number} | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Provjeri da li je backend dostupan
    loadAnnualProgram().catch(() => {
      // Ako nije, radi lokalno
      console.log('Working in local mode');
      setLoading(false);
    });
  }, [year, clientId]);

  async function loadAnnualProgram() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/annual-plan?clientId=${clientId}&year=${year}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      
      // Provjeri da li je odgovor OK
      if (!response.ok) {
        // 404 = plan ne postoji, treba kreirati
        if (response.status === 404) {
          console.log('Annual plan not found, creating new one...');
          await createNewAnnualProgram();
          return;
        }
        console.error('API error:', response.status);
        setMesocycles([]);
        return;
      }

      const text = await response.text();
      if (!text) {
        console.log('Empty response, creating new plan...');
        await createNewAnnualProgram();
        return;
      }

      const result = JSON.parse(text);

      if (result.success && result.data) {
        setMesocycles(result.data.mesocycles || []);
        setAnnualProgramId(result.data.id);
      } else {
        await createNewAnnualProgram();
      }
    } catch (error) {
      console.error('Error loading annual program:', error);
      // Ako je network error ili parsing error, prikaži prazan plan
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
          name: `${clientName} - ${year}`,
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
        }),
      });
      
      if (!response.ok) {
        // 409 = već postoji, pokušaj dohvatiti ID
        if (response.status === 409) {
          const text = await response.text();
          if (text) {
            const result = JSON.parse(text);
            if (result.data?.annualProgramId) {
              setAnnualProgramId(result.data.annualProgramId);
            }
          }
          return;
        }
        console.error('Error creating annual program:', response.status);
        return;
      }
      
      const text = await response.text();
      if (text) {
        const result = JSON.parse(text);
        if (result.success && result.data?.id) {
          setAnnualProgramId(result.data.id);
        }
      }
    } catch (error) {
      console.error('Error creating annual program:', error);
      // Nastavi bez ID-a, korisnik može raditi lokalno
    }
  }

  function getFaza(tip: string): FazaDefinicija {
    return FAZE.find(f => f.tip === tip) || FAZE[0];
  }

  // ============================================
  // DRAG HANDLERS - Video Editor Style
  // ============================================

  function handleDragStart(
    id: string, 
    type: 'left' | 'right' | 'move', 
    pageX: number
  ) {
    const meso = mesocycles.find(m => m.id === id);
    if (!meso) return;
    
    // Zaključaj scroll dok povlačiš
    setScrollEnabled(false);
    
    setDragging({
      id,
      type,
      startX: pageX,
      originalStart: meso.startWeek,
      originalDuration: meso.durationWeeks,
    });
  }

  function handleDragMove(pageX: number) {
    if (!dragging) return;

    const deltaX = pageX - dragging.startX;
    const deltaWeeks = Math.round(deltaX / WEEK_WIDTH);

    setMesocycles(prev => prev.map(m => {
      if (m.id !== dragging.id) return m;

      let newStart = dragging.originalStart;
      let newDuration = dragging.originalDuration;

      if (dragging.type === 'left') {
        // Pomakni lijevi rub
        newStart = Math.max(1, Math.min(51, dragging.originalStart + deltaWeeks));
        newDuration = dragging.originalDuration - (newStart - dragging.originalStart);
        newDuration = Math.max(1, Math.min(12, newDuration));
      } else if (dragging.type === 'right') {
        // Pomakni desni rub
        newDuration = Math.max(1, Math.min(12, dragging.originalDuration + deltaWeeks));
        // Ne prelazi 52 tjedna
        if (newStart + newDuration > 53) {
          newDuration = 53 - newStart;
        }
      } else {
        // Move cijeli blok
        newStart = Math.max(1, Math.min(53 - dragging.originalDuration, dragging.originalStart + deltaWeeks));
      }

      return { ...m, startWeek: newStart, durationWeeks: newDuration };
    }));
  }

  function handleDragEnd() {
    setDragging(null);
    // Otključaj scroll
    setScrollEnabled(true);
  }

  function handleWeekPress(week: number) {
    const existing = mesocycles.find(m => 
      week >= m.startWeek && week < m.startWeek + m.durationWeeks
    );
    
    if (existing) {
      const faza = getFaza(existing.type);
      const endWeek = existing.startWeek + existing.durationWeeks - 1;
      
      Alert.alert(
        faza.naziv,
        `Tjedni ${existing.startWeek}-${endWeek}\n${faza.ponavljanja} rep, ${faza.intenzitet}`,
        [
          { 
            text: 'Generiraj program', 
            onPress: () => onGenerateProgram?.(clientId, {
              phaseType: existing.type,
              phaseName: faza.naziv,
              startWeek: existing.startWeek,
              endWeek: endWeek,
              durationWeeks: existing.durationWeeks,
              mesocycleId: existing.id,
              ponavljanja: faza.ponavljanja,
              intenzitet: faza.intenzitet,
            })
          },
          { text: 'Obriši', style: 'destructive', onPress: () => deleteMesocycle(existing.id) },
          { text: 'Zatvori', style: 'cancel' },
        ]
      );
    } else {
      setSelectedWeek(week);
      setShowModal(true);
    }
  }

  function deleteMesocycle(id: string) {
    setMesocycles(prev => prev.filter(m => m.id !== id));
  }

  async function addFaza(faza: FazaDefinicija) {
    if (selectedWeek === null) return;
    
    const newMesocycle: Mesocycle = {
      id: `local-${Date.now()}`,
      trainingProgramId: annualProgramId || `local-program-${Date.now()}`,
      name: faza.naziv,
      type: faza.tip,
      startWeek: selectedWeek,
      durationWeeks: faza.tjedanaMin,
      status: 'planned',
      orderIndex: mesocycles.length,
    };
    
    setMesocycles([...mesocycles, newMesocycle]);
    setShowModal(false);
    setSelectedWeek(null);
    
    // Spremi na backend ako je dostupan
    if (annualProgramId && !annualProgramId.startsWith('local-')) {
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
            durationWeeks: faza.tjedanaMin,
            orderIndex: mesocycles.length,
          }),
        });
      } catch (error) {
        console.log('Saving locally (backend unavailable)');
      }
    }
  }

  // ============================================
  // GENERIRANJE SVIH FAZA
  // ============================================
  
  function getTotalWeeks(): number {
    return mesocycles.reduce((sum, m) => sum + m.durationWeeks, 0);
  }
  
  async function handleGenerateAllPhases() {
    if (mesocycles.length === 0) {
      Alert.alert('Nema faza', 'Dodaj barem jednu fazu na lentu vremena prije generiranja.');
      return;
    }
    
    // Sortiraj faze po startWeek
    const sortedMesocycles = [...mesocycles].sort((a, b) => a.startWeek - b.startWeek);
    
    // Konvertiraj u PhaseData format
    const phases: PhaseData[] = sortedMesocycles.map((m) => {
      const faza = getFaza(m.type);
      return {
        phaseType: m.type,
        phaseName: faza.naziv,
        startWeek: m.startWeek,
        endWeek: m.startWeek + m.durationWeeks - 1,
        durationWeeks: m.durationWeeks,
        mesocycleId: m.id,
        ponavljanja: faza.ponavljanja,
        intenzitet: faza.intenzitet,
      };
    });
    
    if (onGenerateAllPhases) {
      setGenerating(true);
      setGeneratingProgress({ current: 0, total: phases.length, phase: phases[0]?.phaseName || '' });
      
      onGenerateAllPhases(clientId, phases, (results) => {
        setGenerating(false);
        setGeneratingProgress(null);
        
        // Prikaži rezultate
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (successful === results.length) {
          Alert.alert(
            '✅ Uspješno',
            `Generirano ${successful} faza!`,
            [{ text: 'Pogledaj', onPress: onBack }]
          );
        } else if (successful > 0) {
          Alert.alert(
            '⚠️ Djelomično uspješno',
            `Generirano: ${successful}\nNeuspješno: ${failed}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('❌ Greška', 'Nijedna faza nije generirana. Provjeri postavke i pokušaj ponovno.');
        }
      });
    } else {
      Alert.alert('Info', 'Generiranje programa nije dostupno.');
    }
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        </LinearGradient>
      </View>
    );
  }

  const timelineWidth = 52 * WEEK_WIDTH;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>Natrag</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.year}>{year}</Text>
            <Text style={styles.clientName}>{clientName}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          {dragging ? (
            <Text style={styles.helpTextActive}>Povlacis... Pusti za potvrdu</Text>
          ) : (
            <>
              <Text style={styles.helpText}>Povuci rubove bloka za produživanje</Text>
              <Text style={styles.helpTextSub}>Tap prazan tjedan = dodaj fazu</Text>
            </>
          )}
        </View>

        {/* Timeline - Video Editor Style */}
        <View style={styles.timelineContainer}>
          <ScrollView 
            horizontal 
            ref={scrollRef}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            scrollEnabled={scrollEnabled}
            nestedScrollEnabled={false}
          >
            <View style={[styles.timeline, { width: timelineWidth + 40 }]}>
              
              {/* Month Ruler */}
              <View style={styles.monthRuler}>
                {MONTHS.map((month, i) => {
                  let left = 0;
                  for (let j = 0; j < i; j++) {
                    left += WEEKS_PER_MONTH[j] * WEEK_WIDTH;
                  }
                  return (
                    <View key={i} style={[styles.monthMark, { left, width: WEEKS_PER_MONTH[i] * WEEK_WIDTH }]}>
                      <Text style={styles.monthLabel}>{month}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Week Numbers */}
              <View style={styles.weekRuler}>
                {Array.from({ length: 52 }, (_, i) => (
                  <View key={i} style={[styles.weekMark, { left: i * WEEK_WIDTH }]}>
                    {(i + 1) % 4 === 1 && (
                      <Text style={styles.weekLabel}>{i + 1}</Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Clickable Week Grid */}
              <View style={styles.weekGrid}>
                {Array.from({ length: 52 }, (_, i) => {
                  const week = i + 1;
                  const isOccupied = mesocycles.some(m => 
                    week >= m.startWeek && week < m.startWeek + m.durationWeeks
                  );
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.weekCell, isOccupied && styles.weekCellOccupied]}
                      onPress={() => !isOccupied && handleWeekPress(week)}
                      activeOpacity={0.7}
                    />
                  );
                })}
              </View>

              {/* Mesocycle Blocks - Draggable */}
              <View style={styles.trackArea}>
                {mesocycles.map((m) => {
                  const faza = getFaza(m.type);
                  const left = (m.startWeek - 1) * WEEK_WIDTH;
                  const width = m.durationWeeks * WEEK_WIDTH;
                  const isDragging = dragging?.id === m.id;
                  
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.mesocycleBlock,
                        { 
                          left, 
                          width,
                          backgroundColor: faza.boja,
                          opacity: isDragging ? 0.9 : 1,
                          borderWidth: isDragging ? 2 : 1,
                          borderColor: isDragging ? '#FFF' : 'rgba(255,255,255,0.2)',
                        },
                      ]}
                    >
                      {/* Left Handle - Drag to resize */}
                      <View
                        style={styles.handleLeft}
                        onTouchStart={(e) => handleDragStart(m.id, 'left', e.nativeEvent.pageX)}
                        onTouchMove={(e) => handleDragMove(e.nativeEvent.pageX)}
                        onTouchEnd={handleDragEnd}
                      >
                        <View style={styles.handleBar} />
                      </View>

                      {/* Center - Tap for options or drag to move */}
                      <TouchableOpacity
                        style={styles.blockCenter}
                        onPress={() => handleWeekPress(m.startWeek)}
                        onLongPress={() => {
                          // Start move on long press
                        }}
                      >
                        <Text style={[styles.blockLabel, { color: faza.boja === '#FFFFFF' || faza.boja === '#E4E4E7' || faza.boja === '#D4D4D8' ? '#000' : '#FFF' }]}>
                          {faza.kratki}
                        </Text>
                        <Text style={[styles.blockWeeks, { color: faza.boja === '#FFFFFF' || faza.boja === '#E4E4E7' || faza.boja === '#D4D4D8' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)' }]}>
                          {m.durationWeeks}t
                        </Text>
                      </TouchableOpacity>

                      {/* Right Handle - Drag to resize */}
                      <View
                        style={styles.handleRight}
                        onTouchStart={(e) => handleDragStart(m.id, 'right', e.nativeEvent.pageX)}
                        onTouchMove={(e) => handleDragMove(e.nativeEvent.pageX)}
                        onTouchEnd={handleDragEnd}
                      >
                        <View style={styles.handleBar} />
                      </View>
                    </View>
                  );
                })}
              </View>

            </View>
          </ScrollView>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FAZE.map((faza) => (
              <View key={faza.tip} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: faza.boja }]} />
                <Text style={styles.legendText}>{faza.kratki}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Generate All Phases Button */}
        {mesocycles.length > 0 && (
          <TouchableOpacity
            style={[styles.generateAllButton, generating && styles.generateAllButtonDisabled]}
            onPress={handleGenerateAllPhases}
            disabled={generating}
          >
            {generating ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.generateAllButtonText}>
                  {generatingProgress 
                    ? `Generiram ${generatingProgress.current + 1}/${generatingProgress.total}: ${generatingProgress.phase}...`
                    : 'Generiram...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.generateAllButtonText}>
                ⚡ GENERIRAJ SVE FAZE ({getTotalWeeks()} tj.)
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Mesocycle List */}
        <ScrollView style={styles.listSection}>
          <Text style={styles.listTitle}>PLAN ({mesocycles.length})</Text>
          
          {mesocycles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nema mezociklusa</Text>
              <Text style={styles.emptySubtext}>Tap tjedan u timelinu</Text>
            </View>
          ) : (
            mesocycles
              .sort((a, b) => a.startWeek - b.startWeek)
              .map((m) => {
                const faza = getFaza(m.type);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.listItem}
                    onPress={() => handleWeekPress(m.startWeek)}
                  >
                    <View style={[styles.listItemColor, { backgroundColor: faza.boja }]} />
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemName}>{faza.naziv}</Text>
                      <Text style={styles.listItemWeeks}>
                        T{m.startWeek} - T{m.startWeek + m.durationWeeks - 1}
                      </Text>
                    </View>
                    <Text style={styles.listItemDuration}>{m.durationWeeks}t</Text>
                  </TouchableOpacity>
                );
              })
          )}
        </ScrollView>

        {/* Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tjedan {selectedWeek}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={styles.modalClose}>X</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalList}>
                {FAZE.map((faza) => (
                  <TouchableOpacity
                    key={faza.tip}
                    style={styles.modalItem}
                    onPress={() => addFaza(faza)}
                  >
                    <View style={[styles.modalItemColor, { backgroundColor: faza.boja }]} />
                    <View style={styles.modalItemContent}>
                      <Text style={styles.modalItemName}>{faza.naziv}</Text>
                      <Text style={styles.modalItemDesc}>
                        {faza.ponavljanja} rep · {faza.intenzitet}
                      </Text>
                    </View>
                    <Text style={styles.modalItemWeeks}>{faza.tjedanaMin}-{faza.tjedanaMax}t</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: { width: 70 },
  backText: { color: '#71717A', fontSize: 16 },
  headerCenter: { alignItems: 'center' },
  year: { color: '#FFF', fontSize: 28, fontWeight: '200', letterSpacing: 4 },
  clientName: { color: '#52525B', fontSize: 13, marginTop: 2 },
  headerRight: { width: 70 },
  
  // Help
  helpSection: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  helpText: {
    color: '#52525B',
    fontSize: 13,
  },
  helpTextSub: {
    color: '#3F3F46',
    fontSize: 11,
    marginTop: 2,
  },
  helpTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Timeline Container
  timelineContainer: {
    backgroundColor: '#18181B',
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeline: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  
  // Month Ruler
  monthRuler: {
    height: 20,
    position: 'relative',
    marginBottom: 4,
  },
  monthMark: {
    position: 'absolute',
    height: 20,
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#27272A',
    paddingLeft: 4,
  },
  monthLabel: {
    color: '#52525B',
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Week Ruler
  weekRuler: {
    height: 16,
    position: 'relative',
    marginBottom: 8,
  },
  weekMark: {
    position: 'absolute',
    width: WEEK_WIDTH,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabel: {
    color: '#3F3F46',
    fontSize: 9,
  },
  
  // Week Grid
  weekGrid: {
    flexDirection: 'row',
    height: 24,
    marginBottom: 8,
  },
  weekCell: {
    width: WEEK_WIDTH - 2,
    height: 24,
    backgroundColor: '#27272A',
    marginRight: 2,
    borderRadius: 3,
  },
  weekCellOccupied: {
    backgroundColor: '#3F3F46',
  },
  
  // Track Area
  trackArea: {
    height: TRACK_HEIGHT,
    position: 'relative',
  },
  
  // Mesocycle Block
  mesocycleBlock: {
    position: 'absolute',
    top: 0,
    height: TRACK_HEIGHT,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Drag Handles
  handleLeft: {
    width: HANDLE_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  handleRight: {
    width: HANDLE_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  handleBar: {
    width: 3,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
  },
  
  blockCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  blockLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  blockWeeks: {
    fontSize: 11,
    marginLeft: 6,
  },
  
  // Legend
  legend: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    color: '#52525B',
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Generate All Button
  generateAllButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  generateAllButtonDisabled: {
    backgroundColor: '#71717A',
  },
  generateAllButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // List
  listSection: {
    flex: 1,
    paddingHorizontal: 12,
  },
  listTitle: {
    color: '#3F3F46',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: { color: '#3F3F46', fontSize: 14, fontWeight: '500' },
  emptySubtext: { color: '#27272A', fontSize: 12, marginTop: 4 },
  
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  listItemColor: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  listItemWeeks: {
    color: '#52525B',
    fontSize: 12,
    marginTop: 2,
  },
  listItemDuration: {
    color: '#3F3F46',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalClose: {
    color: '#52525B',
    fontSize: 18,
    fontWeight: '600',
    padding: 4,
  },
  modalList: {
    padding: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  modalItemColor: {
    width: 6,
    height: 40,
    borderRadius: 3,
    marginRight: 14,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  modalItemDesc: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
  },
  modalItemWeeks: {
    color: '#52525B',
    fontSize: 12,
  },
});








