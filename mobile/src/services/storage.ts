/**
 * Storage Service
 * Koristi AsyncStorage za lokalno spremanje podataka
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  CLIENT_ID: 'clientId',
  USERNAME: 'username',
  USER_DATA: 'userData',
  SELECTED_GOAL: 'selectedGoal',
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

