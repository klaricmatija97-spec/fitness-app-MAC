/**
 * API Service
 * Koristi iste API endpointe kao web aplikacija
 * 
 * NOTE: Za development, pokreni Next.js server na portu 3000
 * Za production, postavi pravi URL u environment varijablama
 */

// Koristi localhost za development (Expo Go na istom WiFi-u)
// Za production, koristi environment varijablu ili postavi pravi URL
// AUTO-DETECT: Koristi trenutnu LAN IP adresu (može se promijeniti ako se prebaciš na drugu mrežu)
const LAN_IP = '172.20.10.10'; // Ažurirano: koristi ifconfig | grep "inet " | grep -v 127.0.0.1 za pronalazak

const getApiBaseUrl = () => {
  // Check if we're in development mode
  // In React Native/Expo, __DEV__ is a global boolean
  const isDev = (typeof (global as any).__DEV__ !== 'undefined' 
    ? (global as any).__DEV__ 
    : true) as boolean;
  
  if (isDev) {
    // Development - koristi LAN IP za pristup s mobilnog uređaja
    // Zamijeni sa svojom LAN IP adresom ako je drugačija
    return `http://${LAN_IP}:3000`;
  }
  // Production - TODO: Postavi pravi URL
  // In Expo, environment variables prefixed with EXPO_PUBLIC_ are available at build time
  const apiUrl = typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_URL 
    ? (process as any).env.EXPO_PUBLIC_API_URL 
    : 'https://your-production-url.com';
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

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
 * Koristi LOKALNI generator (bez Supabase) - šalje direktne kalkulacije
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

    // Token je opcionalan za lokalni generator
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // LOKALNI GENERATOR: Uvijek koristi directCalculations
    if (!directCalculations) {
      throw new Error('directCalculations je obavezan za lokalni generator');
    }

    const body = {
      calculations: directCalculations,
      preferences: directCalculations.preferences,
    };
    console.log('📤 Sending calculations to LOCAL generator:', directCalculations);

    // Koristi LOKALNI endpoint (bez Supabase)
    const requestUrl = `${API_BASE_URL}/api/meal-plan/local`;
    console.log('📤 API Request:', {
      url: requestUrl,
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });

    let response: Response;
    try {
      console.log('🌐 Attempting to connect to:', requestUrl);
      console.log('📤 Request body:', JSON.stringify(body, null, 2));
      
      response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      
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
        throw new Error(`Request timeout - server nije odgovorio.\n\nProvjeri:\n1. Je li Next.js server pokrenut? (npm run dev)\n2. Je li server dostupan na http://${LAN_IP}:3000?`);
      }
      
      throw new Error(`❌ Ne mogu se spojiti na server!\n\nProvjeri:\n1. Pokreni server: npm run dev\n2. Je li telefon na istoj WiFi mreži?\n3. Server URL: http://${LAN_IP}:3000`);
    }

    if (!response.ok) {
      // Pokušaj parsirati kao JSON prvo, ako ne uspije, koristi tekst
      let errorMessage = `API error: ${response.status}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
          console.error('❌ API Error Response (JSON):', {
            status: response.status,
            statusText: response.statusText,
            body: errorData,
          });
        } else {
          // Ako nije JSON, pokušaj parsirati kao tekst (ali ograniči duljinu)
          const errorText = await response.text();
          const truncatedText = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
          errorMessage = `API error: ${response.status} - ${truncatedText}`;
          console.error('❌ API Error Response (Text/HTML):', {
            status: response.status,
            statusText: response.statusText,
            bodyLength: errorText.length,
            bodyPreview: truncatedText,
          });
        }
      } catch (parseError) {
        // Ako ni JSON ni tekst ne mogu biti parsirani, koristi default poruku
        console.error('❌ API Error Response (Parse failed):', {
          status: response.status,
          statusText: response.statusText,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        });
        errorMessage = `API error: ${response.status} - Unable to parse error response`;
      }
      throw new Error(errorMessage);
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

