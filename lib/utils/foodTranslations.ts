/**
 * Prijevodi naziva namirnica s engleskog na hrvatski
 * 
 * Osnovni prijevodi za najčešće namirnice iz USDA baze
 */

const FOOD_TRANSLATIONS: Record<string, string> = {
  // Meso i proteini
  'chicken': 'Piletina',
  'chicken breast': 'Piletina',
  'turkey': 'Puretina',
  'turkey breast': 'Puretina',
  'beef': 'Junetina',
  'pork': 'Svinjetina',
  'salmon': 'Losos',
  'tuna': 'Tuna',
  'fish': 'Riba',
  'eggs': 'Jaja',
  'egg': 'Jaje',
  'egg, whole, raw': 'Jaje',
  'ham': 'Dimčena salama',
  
  // Mlijeko i mliječni proizvodi
  'milk': 'Mlijeko',
  'cheese': 'Sir',
  'yogurt': 'Jogurt',
  'greek yogurt': 'Grčki jogurt',
  'cottage cheese': 'Svježi sir',
  'cream': 'Vrhnje',
  'skyr': 'Skyr',
  
  // Ugljikohidrati
  'rice': 'Riža',
  'rice cooked': 'Riža',
  'bread': 'Kruh',
  'toast': 'Tost',
  'pasta': 'Tjestenina',
  'pasta cooked': 'Tjestenina',
  'potato': 'Krumpir',
  'potatoes': 'Krumpir',
  'sweet potato': 'Batat',
  'oats': 'Zobene pahuljice',
  'quinoa': 'Quinoa',
  'banana': 'Banana',
  'bananas': 'Banane',
  
  // Masti
  'avocado': 'Avokado',
  'olive oil': 'Maslinovo ulje',
  'almonds': 'Bademi',
  'walnuts': 'Orašasti plodovi',
  'peanut butter': 'Maslac od kikirikija',
  'nuts': 'Orašasti plodovi',
  
  // Povrće
  'broccoli': 'Brokula',
  'spinach': 'Špinat',
  'carrots': 'Mrkva',
  'carrot': 'Mrkva',
  'tomatoes': 'Rajčica',
  'tomato': 'Rajčica',
  'cucumber': 'Krastavac',
  'peppers': 'Paprika',
  'pepper': 'Paprika',
  'lettuce': 'Salata',
  'onion': 'Luk',
  'onions': 'Luk',
  'garlic': 'Češnjak',
  'beans': 'Grah',
  'lentils': 'Leća',
  
  // Voće
  'apple': 'Jabuka',
  'apples': 'Jabuke',
  'orange': 'Naranča',
  'oranges': 'Naranče',
  'berries': 'Bobice',
  'strawberries': 'Jagode',
  'blueberries': 'Borovnice',
  'cherries': 'Višnje',
  'cherry': 'Višnje',
  'grapes': 'Grožđe',
  'grape': 'Grožđe',
  
  // Proteinski dodaci
  'whey': 'Whey protein',
  'whey protein': 'Whey protein',
  'protein': 'Protein',
  'protein powder': 'Whey protein',
  
  // Ostalo
  'honey': 'Med',
  'sugar': 'Šećer',
  'salt': 'Sol',
  'water': 'Voda',
};

/**
 * Prevedi naziv namirnice s engleskog na hrvatski
 * 
 * @param englishName - Engleski naziv namirnice
 * @returns Hrvatski naziv namirnice (ili originalni ako prijevod ne postoji)
 */
export function translateFoodName(englishName: string): string {
  if (!englishName) return englishName;
  
  const lowerName = englishName.toLowerCase().trim();
  
  // Provjeri točno poklapanje
  if (FOOD_TRANSLATIONS[lowerName]) {
    return FOOD_TRANSLATIONS[lowerName];
  }
  
  // Provjeri djelomično poklapanje (npr. "Chicken breast, raw" -> "Pileća prsa")
  for (const [key, translation] of Object.entries(FOOD_TRANSLATIONS)) {
    if (lowerName.includes(key)) {
      // Ako je ključ duži od 3 znaka, koristi prijevod
      if (key.length >= 3) {
        return translation;
      }
    }
  }
  
  // Ako nema prijevoda, vrati originalni naziv
  return englishName;
}

/**
 * Prevedi nazive namirnica u objektu obroka
 * 
 * @param meal - Objekt obroka sa nazivom namirnice
 * @returns Objekt obroka s prevedenim nazivom
 */
export function translateMealName(meal: { name: string; [key: string]: any }): { name: string; [key: string]: any } {
  return {
    ...meal,
    name: translateFoodName(meal.name),
  };
}

