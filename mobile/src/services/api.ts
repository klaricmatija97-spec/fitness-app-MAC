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
export const getApiBaseUrl = () => {
  // PRODUCTION: Koristi Vercel URL
  // Za lokalno testiranje, promijeni USE_LOCAL na true
  const LOCAL_IP = '192.168.1.3';
  const USE_LOCAL = false; // FALSE = Vercel, TRUE = lokalni server
  
  if (USE_LOCAL) {
    return `http://${LOCAL_IP}:3000`;
  }
  return 'https://fitness-app-mac.vercel.app';
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
  // Trener podaci
  userType?: 'client' | 'trainer';
  userId?: string;
  name?: string;
  trainerCode?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
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
    console.log('[Login] Attempting login to:', `${API_BASE_URL}/api/auth/login`);
    console.log('[Login] Credentials:', { username: credentials.username, password: '***' });
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    console.log('[Login] Response status:', response.status, response.statusText);
    console.log('[Login] Response ok:', response.ok);

    const data = await response.json();
    console.log('[Login] Response data:', { ...data, token: data.token ? '***' : undefined });
    
    if (!response.ok) {
      // Server je vratio error status
      return {
        ok: false,
        message: data.message || `Greška pri prijavi (${response.status})`,
      };
    }
    
    return data;
  } catch (error) {
    console.error('[Login] Network error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Detaljnija poruka o grešci
    if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to connect')) {
      return {
        ok: false,
        message: `Nije moguće povezati se sa serverom.\n\nProvjeri:\n1. Je li server pokrenut na ${API_BASE_URL}?\n2. Je li mobilni uređaj na istoj WiFi mreži?\n3. Je li IP adresa točna?`,
      };
    }
    
    return {
      ok: false,
      message: `Greška pri prijavi: ${errorMessage}`,
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
      // Povećan timeout na 120 sekundi jer generiranje plana može trajati
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 120000) : null;
      
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
        throw new Error(`Request timeout - server nije odgovorio u roku od 120 sekundi. Provjeri je li server pokrenut na ${API_BASE_URL}`);
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

