/**
 * Storage Service
 * Koristi AsyncStorage za lokalno spremanje podataka
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  CLIENT_ID: 'clientId',
  TRAINER_ID: 'trainerId',
  TRAINER_TOKEN: 'trainerToken', // Poseban token za trenera
  USERNAME: 'username',
  USER_DATA: 'userData',
  SELECTED_GOAL: 'selectedGoal',
  APP_STATE: 'appState',
  INTAKE_DATA: 'intakeData',
  CALCULATOR_RESULTS: 'calculatorResults',
} as const;

/**
 * Auth storage
 */
export const authStorage = {
  async saveToken(token: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async saveClientId(clientId: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
  },

  async getClientId(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.CLIENT_ID);
  },

  async saveTrainerId(trainerId: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.TRAINER_ID, trainerId);
  },

  async getTrainerId(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.TRAINER_ID);
  },

  async saveTrainerToken(token: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.TRAINER_TOKEN, token);
  },

  async getTrainerToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.TRAINER_TOKEN);
  },

  async saveUsername(username: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, username);
  },

  async getUsername(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.USERNAME);
  },

  async clearAuth() {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.CLIENT_ID,
      STORAGE_KEYS.TRAINER_ID,
      STORAGE_KEYS.TRAINER_TOKEN,
      STORAGE_KEYS.USERNAME,
    ]);
  },
};

/**
 * Goal storage
 */
export const goalStorage = {
  async saveGoal(goal: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_GOAL, goal);
  },

  async getGoal(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_GOAL);
  },

  async clearGoal() {
    await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_GOAL);
  },
};

/**
 * User data storage
 */
export const userDataStorage = {
  async saveUserData(data: any) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
  },

  async getUserData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  async clearUserData() {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
  },
};

/**
 * App state storage - sprema trenutni screen i podatke
 */
export type AppScreen = 
  | 'welcome' 
  | 'login' 
  | 'onboarding' 
  | 'intakeFlow' 
  | 'calculator' 
  | 'calculationsSummary' 
  | 'mealPlan'
  | 'trainerHome'
  | 'clientDashboard';

export interface AppStateData {
  currentScreen: AppScreen;
  intakeFormData?: any;
  calculatorResults?: any;
  connectedTrainerId?: string | null;
  connectedTrainerName?: string | null;
  lastUpdated: number;
}

export const appStateStorage = {
  async saveAppState(state: AppStateData) {
    await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify({
      ...state,
      lastUpdated: Date.now(),
    }));
  },

  async getAppState(): Promise<AppStateData | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_STATE);
      if (!data) return null;
      
      const parsed = JSON.parse(data) as AppStateData;
      
      // Ako je starije od 7 dana, ignoriraj
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.lastUpdated > sevenDaysMs) {
        await this.clearAppState();
        return null;
      }
      
      return parsed;
    } catch {
      return null;
    }
  },

  async clearAppState() {
    await AsyncStorage.removeItem(STORAGE_KEYS.APP_STATE);
  },

  async saveIntakeData(data: any) {
    await AsyncStorage.setItem(STORAGE_KEYS.INTAKE_DATA, JSON.stringify(data));
  },

  async getIntakeData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.INTAKE_DATA);
    return data ? JSON.parse(data) : null;
  },

  async saveCalculatorResults(results: any) {
    await AsyncStorage.setItem(STORAGE_KEYS.CALCULATOR_RESULTS, JSON.stringify(results));
  },

  async getCalculatorResults(): Promise<any | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CALCULATOR_RESULTS);
    return data ? JSON.parse(data) : null;
  },
};

