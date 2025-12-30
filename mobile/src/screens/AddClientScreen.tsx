/**
 * Add Client Screen
 * =================
 * 
 * Forma za dodavanje novog klijenta od strane trenera
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

interface Props {
  authToken: string;
  onComplete?: (clientId: string) => void;
  onCancel?: () => void;
}

export default function AddClientScreen({ authToken, onComplete, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  async function handleSubmit() {
    // Validacija
    if (!formData.name.trim()) {
      Alert.alert('Greška', 'Molimo unesite ime klijenta');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Greška', 'Molimo unesite email adresu');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Greška', 'Molimo unesite ispravnu email adresu');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });

      // Provjeri da li je response OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        // Pokušaj parsirati kao JSON, ako ne uspije koristi tekst
        let errorMessage = 'Nije moguće dodati klijenta';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
          if (errorJson.detalji) {
            errorMessage += `\n\nDetalji: ${JSON.stringify(errorJson.detalji, null, 2)}`;
          }
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        Alert.alert('Greška', errorMessage);
        return;
      }

      // Pokušaj parsirati JSON
      let result;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          throw new Error('Prazan response od servera');
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response status:', response.status);
        Alert.alert('Greška', 'Server je vratio nevaljan odgovor. Provjeri console logove.');
        return;
      }

      if (result.success) {
        Alert.alert('Uspjeh', 'Klijent je uspješno dodan', [
          {
            text: 'OK',
            onPress: () => {
              if (onComplete && result.data?.id) {
                onComplete(result.data.id);
              }
            },
          },
        ]);
      } else {
        // Detaljnija error poruka
        const errorMessage = result.error || 'Nije moguće dodati klijenta';
        const errorDetails = result.detalji ? `\n\nDetalji: ${JSON.stringify(result.detalji, null, 2)}` : '';
        Alert.alert('Greška', errorMessage + errorDetails);
        console.error('Error adding client:', result);
      }
    } catch (error) {
      console.error('Error adding client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška';
      Alert.alert('Greška', `Nije moguće dodati klijenta: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Odustani</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Novi klijent</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form */}
            <View style={styles.form}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ime i prezime *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Ivan Horvat"
                  placeholderTextColor="#52525B"
                  editable={!loading}
                  autoCapitalize="words"
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="ivan.horvat@example.com"
                  placeholderTextColor="#52525B"
                  editable={!loading}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="+385 91 234 5678"
                  placeholderTextColor="#52525B"
                  editable={!loading}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Napomene</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Dodatne informacije o klijentu..."
                  placeholderTextColor="#52525B"
                  editable={!loading}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Dodaj klijenta</Text>
                )}
              </TouchableOpacity>

              {/* Helper Text */}
              <Text style={styles.helperText}>
                * Obavezna polja. Ostala polja (visina, težina, ciljevi) mogu se dodati kasnije.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 80,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  submitButton: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helperText: {
    color: '#52525B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

