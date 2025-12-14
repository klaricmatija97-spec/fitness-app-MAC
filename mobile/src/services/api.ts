/**
 * API Service
 * Koristi iste API endpointe kao web aplikacija
 * 
 * NOTE: Za development, pokreni Next.js server na portu 3000
 * Za production, postavi pravi URL u environment varijablama
 */

// Koristi localhost za development (Expo Go na istom WiFi-u)
// Za production, koristi environment varijablu ili postavi pravi URL
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development - koristi localhost ili LAN IP
    // Možeš koristiti: 'http://192.168.x.x:3000' za LAN pristup
    return 'http://localhost:3000';
  }
  // Production - TODO: Postavi pravi URL
  return process.env.EXPO_PUBLIC_API_URL || 'https://your-production-url.com';
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
 * Generate meal plan
 */
export async function generateMealPlan(clientId: string, token: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/meal-plan/generate`, {
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
    console.error('Generate meal plan error:', error);
    return null;
  }
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

