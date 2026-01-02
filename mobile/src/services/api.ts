/**
 * API Service
 * Koristi iste API endpointe kao web aplikacija
 * 
 * NOTE: Za development, pokreni Next.js server na portu 3000
 * Za production, postavi pravi URL u environment varijablama
 */

import { Platform } from 'react-native';

// Koristi localhost za development (Expo Go na istom WiFi-u)
// Za production, koristi environment varijablu ili postavi pravi URL
const getApiBaseUrl = () => {
  // Check if we're in development mode
  // In React Native/Expo, __DEV__ is a global boolean
  const isDev = (typeof (global as any).__DEV__ !== 'undefined' 
    ? (global as any).__DEV__ 
    : true) as boolean;
  
  if (isDev) {
    // Development - koristi LAN IP za pristup s mobilnog uređaja
    // Za iOS Simulator ili Android Emulator, koristi localhost
    // Za fizički uređaj, koristi LAN IP računala
    
    // Provjeri da li je simulator/emulator
    const isSimulator = Platform.OS === 'ios' || Platform.OS === 'android';
    
    // Za simulator/emulator koristi localhost (10.0.2.2 za Android emulator)
    if (Platform.OS === 'android') {
      // Android emulator koristi 10.0.2.2 za localhost računala
      return 'http://10.0.2.2:3000';
    } else if (Platform.OS === 'ios') {
      // iOS simulator koristi localhost
      return 'http://localhost:3000';
    }
    
    // Za fizički uređaj, koristi LAN IP
    // Zamijeni sa svojom LAN IP adresom ako je drugačija
    const LAN_IP = '192.168.1.11'; // TODO: Automatski detektiraj ili postavi ručno
    return `http://${LAN_IP}:3000`;
  }
  // Production - TODO: Postavi pravi URL
  // In Expo, environment variables prefixed with EXPO_PUBLIC_ are available at build time
  const apiUrl = typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_URL 
    ? (process as any).env.EXPO_PUBLIC_API_URL 
    : 'https://your-production-url.com';
  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

export interface LoginRequest {
  username: string;
  password: string;
  clientId?: string;
}

export interface LoginResponse {
  ok: boolean;
  token?: string;
  clientId?: string;
  username?: string;
  message?: string;
}

export interface RegisterRequest {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResponse {
  ok: boolean;
  token?: string;
  clientId?: string;
  username?: string;
  message?: string;
}

/**
 * Login API call
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return {
      ok: false,
      message: 'Greška pri prijavi. Provjeri internetsku vezu.',
    };
  }
}

/**
 * Register API call
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Register error:', error);
    return {
      ok: false,
      message: 'Greška pri registraciji. Provjeri internetsku vezu.',
    };
  }
}

/**
 * Change password API call
 */
export async function changePassword(
  clientId: string,
  tempPassword: string,
  newPassword: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        tempPassword,
        newPassword,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Change password error:', error);
    return {
      ok: false,
      message: 'Greška pri promjeni lozinke.',
    };
  }
}

/**
 * Get user data
 */
export async function getUserData(clientId: string, token: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user-data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get user data error:', error);
    return null;
  }
}

/**
 * Get calculations (BMR, TDEE, macros)
 */
export async function getCalculations(clientId: string, token: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/calculations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get calculations error:', error);
    return null;
  }
}

/**
 * Generate weekly meal plan
 * Supports both authenticated (with userId) and unauthenticated (with direct calculations) modes
 */
export async function generateWeeklyMealPlan(
  clientId: string | null,
  token: string | null,
  directCalculations?: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    goalType: 'lose' | 'maintain' | 'gain';
    bmr?: number;
    tdee?: number;
    preferences?: {
      allergies?: string;
      foodPreferences?: string;
      avoidIngredients?: string;
      trainingFrequency?: string;
    };
  }
) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const body: any = {};
    
    if (clientId && !directCalculations) {
      // Authenticated mode - use userId
      body.userId = clientId;
    } else if (directCalculations) {
      // Unauthenticated mode - use direct calculations
      body.calculations = directCalculations;
      console.log('📤 Sending direct calculations:', directCalculations);
    } else {
      throw new Error('Either clientId or directCalculations must be provided');
    }

    const requestUrl = `${API_BASE_URL}/api/meal-plan/pro/weekly`;
    console.log('📤 API Request:', {
      url: requestUrl,
      method: 'POST',
      body: JSON.stringify(body),
      headers,
      API_BASE_URL: API_BASE_URL,
    });

    let response: Response;
    try {
      console.log('🌐 Attempting to connect to:', requestUrl);
      console.log('📤 API_BASE_URL value:', API_BASE_URL);
      console.log('📤 Request body:', JSON.stringify(body, null, 2));
      
      // Timeout handling (fallback za starije React Native verzije)
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 60000) : null;
      
      response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        ...(controller && { signal: controller.signal }),
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      
      console.log('✅ Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
    } catch (fetchError) {
      console.error('❌ Network Error Details:', {
        error: fetchError,
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        name: fetchError instanceof Error ? fetchError.name : 'Unknown',
        url: requestUrl,
      });
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error(`Request timeout - server nije odgovorio u roku od 60 sekundi. Provjeri je li server pokrenut na ${API_BASE_URL}`);
      }
      
      // Detaljniji error message
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      throw new Error(`Network error: ${errorMsg}. URL: ${requestUrl}. Provjeri: 1) Je li server pokrenut? 2) Je li mobilni uređaj na istoj WiFi mreži? 3) Je li LAN IP točan (trenutno: ${API_BASE_URL})?`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 API Response:', data);
    
    if (!data.ok) {
      throw new Error(data.message || 'Greška pri generiranju plana');
    }
    
    return data;
  } catch (error) {
    console.error('Generate weekly meal plan error:', error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Greška pri generiranju plana',
    };
  }
}

/**
 * Generate meal plan (legacy - kept for backwards compatibility)
 */
export async function generateMealPlan(clientId: string, token: string) {
  return generateWeeklyMealPlan(clientId, token);
}

/**
 * Generate training plan
 */
export async function generateTrainingPlan(clientId: string, token: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clientId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Generate training plan error:', error);
    return null;
  }
}

