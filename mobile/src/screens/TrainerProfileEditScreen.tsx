/**
 * Trainer Profile Edit Screen
 * =============================
 * 
 * Ekran za trenere da urede svoj portfolio/profil.
 * Dostupno iz TrainerHomeScreen → "Moj profil"
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

interface Props {
  authToken: string;
  onBack?: () => void;
  onSaved?: () => void;
}

interface TrainerProfile {
  name: string;
  bio: string;
  motto: string;
  specializations: string[];
  certifications: { name: string; issuer: string; year: number }[];
  yearsOfExperience: number;
  location: string;
  hourlyRate: number | null;
  currency: string;
  languages: string[];
  trainingType: 'online' | 'in_person' | 'both';
  socialLinks: { instagram?: string; youtube?: string; website?: string };
  isPublic: boolean;
}

const SPECIALIZATION_OPTIONS = [
  'Hipertrofija',
  'Transformacija tijela',
  'Powerlifting',
  'Bodybuilding',
  'Funkcionalni trening',
  'Sportska prehrana',
  'Rehabilitacija',
  'Snaga i kondicija',
  'Gubitak masnoće',
  'Bikini fitness',
  'CrossFit',
  'Olimpijsko dizanje',
];

const LANGUAGE_OPTIONS = ['Hrvatski', 'Engleski', 'Njemački', 'Talijanski', 'Španjolski'];

export default function TrainerProfileEditScreen({ authToken, onBack, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TrainerProfile>({
    name: '',
    bio: '',
    motto: '',
    specializations: [],
    certifications: [],
    yearsOfExperience: 0,
    location: '',
    hourlyRate: null,
    currency: 'EUR',
    languages: ['Hrvatski'],
    trainingType: 'both',
    socialLinks: {},
    isPublic: true,
  });

  // For adding new certification
  const [newCertName, setNewCertName] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertYear, setNewCertYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await response.json();

      if (data.success && data.data) {
        setProfile({
          name: data.data.name || '',
          bio: data.data.bio || '',
          motto: data.data.motto || '',
          specializations: data.data.specializations || [],
          certifications: data.data.certifications || [],
          yearsOfExperience: data.data.years_of_experience || 0,
          location: data.data.location || '',
          hourlyRate: data.data.hourly_rate,
          currency: data.data.currency || 'EUR',
          languages: data.data.languages || ['Hrvatski'],
          trainingType: data.data.training_type || 'both',
          socialLinks: data.data.social_links || {},
          isPublic: data.data.is_public !== false,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile.name.trim()) {
      Alert.alert('Greška', 'Ime je obavezno');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.name,
          bio: profile.bio,
          motto: profile.motto,
          specializations: profile.specializations,
          certifications: profile.certifications,
          years_of_experience: profile.yearsOfExperience,
          location: profile.location,
          hourly_rate: profile.hourlyRate,
          currency: profile.currency,
          languages: profile.languages,
          training_type: profile.trainingType,
          social_links: profile.socialLinks,
          is_public: profile.isPublic,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Uspjeh!', 'Profil je uspješno spremljen', [
          { text: 'OK', onPress: () => onSaved?.() }
        ]);
      } else {
        Alert.alert('Greška', data.error || 'Nije moguće spremiti profil');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Greška', 'Nije moguće spremiti profil');
    } finally {
      setSaving(false);
    }
  }

  function toggleSpecialization(spec: string) {
    if (profile.specializations.includes(spec)) {
      setProfile({
        ...profile,
        specializations: profile.specializations.filter(s => s !== spec),
      });
    } else {
      setProfile({
        ...profile,
        specializations: [...profile.specializations, spec],
      });
    }
  }

  function toggleLanguage(lang: string) {
    if (profile.languages.includes(lang)) {
      if (profile.languages.length > 1) {
        setProfile({
          ...profile,
          languages: profile.languages.filter(l => l !== lang),
        });
      }
    } else {
      setProfile({
        ...profile,
        languages: [...profile.languages, lang],
      });
    }
  }

  function addCertification() {
    if (!newCertName.trim() || !newCertIssuer.trim()) {
      Alert.alert('Greška', 'Unesite naziv i izdavača certifikata');
      return;
    }

    setProfile({
      ...profile,
      certifications: [
        ...profile.certifications,
        {
          name: newCertName,
          issuer: newCertIssuer,
          year: parseInt(newCertYear) || new Date().getFullYear(),
        },
      ],
    });

    setNewCertName('');
    setNewCertIssuer('');
  }

  function removeCertification(index: number) {
    setProfile({
      ...profile,
      certifications: profile.certifications.filter((_, i) => i !== index),
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Učitavanje profila...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000', '#1C1C1E']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.cancelText}>Odustani</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Moj profil</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
              {saving ? 'Spremam...' : 'Spremi'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Public Toggle */}
            <View style={styles.publicToggle}>
              <View>
                <Text style={styles.publicLabel}>Javni profil</Text>
                <Text style={styles.publicHint}>
                  {profile.isPublic ? 'Klijenti mogu pronaći tvoj profil' : 'Profil je skriven od pretrage'}
                </Text>
              </View>
              <Switch
                value={profile.isPublic}
                onValueChange={(value) => setProfile({ ...profile, isPublic: value })}
                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                thumbColor="#FFF"
              />
            </View>

            {/* Basic Info */}
            <Text style={styles.sectionTitle}>OSNOVNI PODACI</Text>
            
            <Text style={styles.inputLabel}>Ime i prezime *</Text>
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              placeholder="Ivan Horvat"
              placeholderTextColor="#48484A"
            />

            <Text style={styles.inputLabel}>Motto / Slogan</Text>
            <TextInput
              style={styles.input}
              value={profile.motto}
              onChangeText={(text) => setProfile({ ...profile, motto: text })}
              placeholder="Tvoj inspirativni slogan..."
              placeholderTextColor="#48484A"
              maxLength={100}
            />

            <Text style={styles.inputLabel}>O meni</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.bio}
              onChangeText={(text) => setProfile({ ...profile, bio: text })}
              placeholder="Opiši sebe, svoju filozofiju treninga, iskustvo..."
              placeholderTextColor="#48484A"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Lokacija</Text>
                <TextInput
                  style={styles.input}
                  value={profile.location}
                  onChangeText={(text) => setProfile({ ...profile, location: text })}
                  placeholder="Zagreb"
                  placeholderTextColor="#48484A"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Godine iskustva</Text>
                <TextInput
                  style={styles.input}
                  value={profile.yearsOfExperience.toString()}
                  onChangeText={(text) => setProfile({ ...profile, yearsOfExperience: parseInt(text) || 0 })}
                  placeholder="5"
                  placeholderTextColor="#48484A"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Training Type */}
            <Text style={styles.sectionTitle}>TIP TRENINGA</Text>
            <View style={styles.trainingTypeRow}>
              {[
                { value: 'online', label: '💻 Online' },
                { value: 'in_person', label: '🏋️ Uživo' },
                { value: 'both', label: '💻🏋️ Oboje' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.trainingTypeButton,
                    profile.trainingType === type.value && styles.trainingTypeButtonActive,
                  ]}
                  onPress={() => setProfile({ ...profile, trainingType: type.value as any })}
                >
                  <Text style={[
                    styles.trainingTypeText,
                    profile.trainingType === type.value && styles.trainingTypeTextActive,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pricing */}
            <Text style={styles.sectionTitle}>CIJENA (OPCIONALNO)</Text>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Satnica</Text>
                <TextInput
                  style={styles.input}
                  value={profile.hourlyRate?.toString() || ''}
                  onChangeText={(text) => setProfile({ ...profile, hourlyRate: parseFloat(text) || null })}
                  placeholder="40"
                  placeholderTextColor="#48484A"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Valuta</Text>
                <View style={styles.currencyRow}>
                  {['EUR', 'USD', 'HRK'].map((curr) => (
                    <TouchableOpacity
                      key={curr}
                      style={[styles.currencyButton, profile.currency === curr && styles.currencyButtonActive]}
                      onPress={() => setProfile({ ...profile, currency: curr })}
                    >
                      <Text style={[styles.currencyText, profile.currency === curr && styles.currencyTextActive]}>
                        {curr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Specializations */}
            <Text style={styles.sectionTitle}>SPECIJALIZACIJE</Text>
            <View style={styles.tagsContainer}>
              {SPECIALIZATION_OPTIONS.map((spec) => (
                <TouchableOpacity
                  key={spec}
                  style={[styles.tag, profile.specializations.includes(spec) && styles.tagActive]}
                  onPress={() => toggleSpecialization(spec)}
                >
                  <Text style={[styles.tagText, profile.specializations.includes(spec) && styles.tagTextActive]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Languages */}
            <Text style={styles.sectionTitle}>JEZICI</Text>
            <View style={styles.tagsContainer}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.tag, profile.languages.includes(lang) && styles.tagActive]}
                  onPress={() => toggleLanguage(lang)}
                >
                  <Text style={[styles.tagText, profile.languages.includes(lang) && styles.tagTextActive]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Certifications */}
            <Text style={styles.sectionTitle}>CERTIFIKATI</Text>
            
            {profile.certifications.map((cert, index) => (
              <View key={index} style={styles.certItem}>
                <View style={styles.certInfo}>
                  <Text style={styles.certName}>{cert.name}</Text>
                  <Text style={styles.certIssuer}>{cert.issuer} • {cert.year}</Text>
                </View>
                <TouchableOpacity onPress={() => removeCertification(index)}>
                  <Text style={styles.certRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addCertForm}>
              <TextInput
                style={[styles.input, styles.certInput]}
                value={newCertName}
                onChangeText={setNewCertName}
                placeholder="Naziv certifikata (npr. ISSA CPT)"
                placeholderTextColor="#48484A"
              />
              <View style={styles.certRow}>
                <TextInput
                  style={[styles.input, styles.certInputHalf]}
                  value={newCertIssuer}
                  onChangeText={setNewCertIssuer}
                  placeholder="Izdavač (npr. ISSA)"
                  placeholderTextColor="#48484A"
                />
                <TextInput
                  style={[styles.input, styles.certInputSmall]}
                  value={newCertYear}
                  onChangeText={setNewCertYear}
                  placeholder="Godina"
                  placeholderTextColor="#48484A"
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              <TouchableOpacity style={styles.addCertButton} onPress={addCertification}>
                <Text style={styles.addCertButtonText}>+ Dodaj certifikat</Text>
              </TouchableOpacity>
            </View>

            {/* Social Links */}
            <Text style={styles.sectionTitle}>DRUŠTVENE MREŽE</Text>
            
            <Text style={styles.inputLabel}>Instagram</Text>
            <TextInput
              style={styles.input}
              value={profile.socialLinks.instagram || ''}
              onChangeText={(text) => setProfile({ 
                ...profile, 
                socialLinks: { ...profile.socialLinks, instagram: text } 
              })}
              placeholder="@username"
              placeholderTextColor="#48484A"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>YouTube</Text>
            <TextInput
              style={styles.input}
              value={profile.socialLinks.youtube || ''}
              onChangeText={(text) => setProfile({ 
                ...profile, 
                socialLinks: { ...profile.socialLinks, youtube: text } 
              })}
              placeholder="Naziv kanala"
              placeholderTextColor="#48484A"
            />

            <Text style={styles.inputLabel}>Web stranica</Text>
            <TextInput
              style={styles.input}
              value={profile.socialLinks.website || ''}
              onChangeText={(text) => setProfile({ 
                ...profile, 
                socialLinks: { ...profile.socialLinks, website: text } 
              })}
              placeholder="https://..."
              placeholderTextColor="#48484A"
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Spacer */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#8E8E93', marginTop: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  cancelText: { color: '#0A84FF', fontSize: 17 },
  title: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  saveText: { color: '#0A84FF', fontSize: 17, fontWeight: '600' },
  saveTextDisabled: { color: '#48484A' },
  keyboardView: { flex: 1 },
  content: { flex: 1, padding: 16 },

  // Public Toggle
  publicToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  publicLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  publicHint: { color: '#8E8E93', fontSize: 13, marginTop: 2 },

  // Section
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },

  // Inputs
  inputLabel: { color: '#8E8E93', fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#FFF',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: { flex: 1 },

  // Training Type
  trainingTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trainingTypeButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  trainingTypeButtonActive: {
    borderColor: '#0A84FF',
  },
  trainingTypeText: { color: '#8E8E93', fontSize: 14 },
  trainingTypeTextActive: { color: '#FFF', fontWeight: '600' },

  // Currency
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#0A84FF',
  },
  currencyText: { color: '#8E8E93', fontSize: 14 },
  currencyTextActive: { color: '#FFF', fontWeight: '600' },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  tagActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  tagText: { color: '#8E8E93', fontSize: 14 },
  tagTextActive: { color: '#FFF', fontWeight: '500' },

  // Certifications
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  certInfo: { flex: 1 },
  certName: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  certIssuer: { color: '#8E8E93', fontSize: 13, marginTop: 2 },
  certRemove: { color: '#FF453A', fontSize: 18, padding: 4 },
  addCertForm: {
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  certInput: { marginBottom: 8, backgroundColor: '#2C2C2E' },
  certRow: { flexDirection: 'row', gap: 8 },
  certInputHalf: { flex: 2, backgroundColor: '#2C2C2E' },
  certInputSmall: { flex: 1, backgroundColor: '#2C2C2E' },
  addCertButton: {
    backgroundColor: '#2C2C2E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  addCertButtonText: { color: '#0A84FF', fontSize: 15, fontWeight: '500' },
});

