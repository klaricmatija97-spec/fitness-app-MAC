/**
 * User Data Storage
 * 
 * Spremanje i učitavanje podataka korisnika iz kalkulatora i slajdova
 * Podaci se spremaju lokalno u JSON fajl za brz pristup
 */

import fs from 'fs';
import path from 'path';

export interface UserCalculations {
  bmr: number;
  tdee: number;
  targetCalories: number;
  goalType: "lose" | "maintain" | "gain";
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  activityLevel: string;
}

export interface UserProfile {
  clientId: string;
  // Osnovni podaci
  gender: "male" | "female";
  age: number;
  weight: number; // kg
  height: number; // cm
  
  // Kalkulacije
  calculations: UserCalculations | null;
  
  // Ciljevi i preferencije
  goals: string[];
  activities: string[];
  allergies: string[];
  dietaryRestrictions: string[];
  injuries: string[];
  
  // Prehrana
  mealPreferences: {
    sweet: boolean;
    savory: boolean;
    mealCount: number;
  };
  
  // Trening
  training: {
    frequency: string; // koliko tjedno
    duration: string; // koliko dnevno
    location: string; // gdje treniram
    type: string; // tip treninga
    split: string; // split
  };
  
  // Timestamp
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USER_DATA_FILE = path.join(DATA_DIR, 'user-data.json');

/**
 * Osiguraj da data folder postoji
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Učitaj sve korisničke podatke
 */
export function loadUserData(): Map<string, UserProfile> {
  ensureDataDir();
  
  if (!fs.existsSync(USER_DATA_FILE)) {
    return new Map();
  }

  try {
    const content = fs.readFileSync(USER_DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    
    // Konvertuj array u Map
    const userMap = new Map<string, UserProfile>();
    if (Array.isArray(data)) {
      data.forEach((user: UserProfile) => {
        userMap.set(user.clientId, user);
      });
    } else if (typeof data === 'object') {
      // Ako je objekt, pretvori u Map
      Object.entries(data).forEach(([clientId, user]) => {
        userMap.set(clientId, user as UserProfile);
      });
    }
    
    return userMap;
  } catch (error) {
    console.error('Error loading user data:', error);
    return new Map();
  }
}

/**
 * Spremi korisničke podatke
 */
export function saveUserData(userMap: Map<string, UserProfile>) {
  ensureDataDir();
  
  // Konvertuj Map u array
  const data = Array.from(userMap.values());
  
  fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Dohvati korisničke podatke po clientId
 */
export function getUserData(clientId: string): UserProfile | null {
  const userMap = loadUserData();
  return userMap.get(clientId) || null;
}

/**
 * Spremi ili ažurira korisničke podatke
 */
export function saveUserProfile(profile: UserProfile) {
  const userMap = loadUserData();
  profile.lastUpdated = new Date().toISOString();
  userMap.set(profile.clientId, profile);
  saveUserData(userMap);
}

/**
 * Ažuriraj kalkulacije za korisnika
 */
export function updateUserCalculations(
  clientId: string,
  calculations: UserCalculations
) {
  let profile = getUserData(clientId);
  
  if (!profile) {
    // Kreiraj novi profil ako ne postoji
    profile = {
      clientId,
      gender: "male",
      age: 30,
      weight: 70,
      height: 175,
      calculations,
      goals: [],
      activities: [],
      allergies: [],
      dietaryRestrictions: [],
      injuries: [],
      mealPreferences: {
        sweet: false,
        savory: false,
        mealCount: 3,
      },
      training: {
        frequency: "",
        duration: "",
        location: "",
        type: "",
        split: "",
      },
      lastUpdated: new Date().toISOString(),
    };
  } else {
    profile.calculations = calculations;
    profile.lastUpdated = new Date().toISOString();
  }
  
  saveUserProfile(profile);
}

/**
 * Ažuriraj osnovne podatke korisnika
 */
export function updateUserBasicData(
  clientId: string,
  data: {
    gender?: "male" | "female";
    age?: number;
    weight?: number;
    height?: number;
  }
) {
  let profile = getUserData(clientId);
  
  if (!profile) {
    profile = {
      clientId,
      gender: data.gender || "male",
      age: data.age || 30,
      weight: data.weight || 70,
      height: data.height || 175,
      calculations: null,
      goals: [],
      activities: [],
      allergies: [],
      dietaryRestrictions: [],
      injuries: [],
      mealPreferences: {
        sweet: false,
        savory: false,
        mealCount: 3,
      },
      training: {
        frequency: "",
        duration: "",
        location: "",
        type: "",
        split: "",
      },
      lastUpdated: new Date().toISOString(),
    };
  } else {
    if (data.gender) profile.gender = data.gender;
    if (data.age) profile.age = data.age;
    if (data.weight) profile.weight = data.weight;
    if (data.height) profile.height = data.height;
    profile.lastUpdated = new Date().toISOString();
  }
  
  saveUserProfile(profile);
}

/**
 * Ažuriraj ciljeve i aktivnosti
 */
export function updateUserGoalsAndActivities(
  clientId: string,
  goals: string[],
  activities: string[]
) {
  let profile = getUserData(clientId);
  
  if (!profile) {
    profile = {
      clientId,
      gender: "male",
      age: 30,
      weight: 70,
      height: 175,
      calculations: null,
      goals,
      activities,
      allergies: [],
      dietaryRestrictions: [],
      injuries: [],
      mealPreferences: {
        sweet: false,
        savory: false,
        mealCount: 3,
      },
      training: {
        frequency: "",
        duration: "",
        location: "",
        type: "",
        split: "",
      },
      lastUpdated: new Date().toISOString(),
    };
  } else {
    profile.goals = goals;
    profile.activities = activities;
    profile.lastUpdated = new Date().toISOString();
  }
  
  saveUserProfile(profile);
}

/**
 * Ažuriraj trening podatke
 */
export function updateUserTraining(
  clientId: string,
  training: Partial<UserProfile['training']>
) {
  let profile = getUserData(clientId);
  
  if (!profile) {
    profile = {
      clientId,
      gender: "male",
      age: 30,
      weight: 70,
      height: 175,
      calculations: null,
      goals: [],
      activities: [],
      allergies: [],
      dietaryRestrictions: [],
      injuries: [],
      mealPreferences: {
        sweet: false,
        savory: false,
        mealCount: 3,
      },
      training: {
        frequency: training.frequency || "",
        duration: training.duration || "",
        location: training.location || "",
        type: training.type || "",
        split: training.split || "",
      },
      lastUpdated: new Date().toISOString(),
    };
  } else {
    profile.training = {
      ...profile.training,
      ...training,
    };
    profile.lastUpdated = new Date().toISOString();
  }
  
  saveUserProfile(profile);
}



