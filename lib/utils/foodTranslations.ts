/**
 * Prijevodi naziva namirnica s engleskog na hrvatski
 * 
 * Osnovni prijevodi za najčešće namirnice iz USDA baze
 */

const FOOD_TRANSLATIONS: Record<string, string> = {
  // Meso i proteini
  'chicken': 'Piletina',
  'chicken breast': 'Pileća prsa',
  'chicken ham': 'Pileća šunka',
  'chicken salami': 'Pileća salama',
  'chicken sausage': 'Pileća kobasica',
  'turkey': 'Puretina',
  'turkey breast': 'Pureća prsa',
  'beef': 'Junetina',
  'pork': 'Svinjetina',
  'salmon': 'Losos',
  'tuna': 'Tuna',
  'fish': 'Riba',
  'eggs': 'Jaja',
  'egg': 'Jaje',
  'egg, whole, raw': 'Jaje',
  'egg white': 'Bjelanjak',
  'egg whites': 'Bjelanjci',
  'ham': 'Šunka',
  
  // Mlijeko i mliječni proizvodi
  'milk': 'Mlijeko',
  'milk, lowfat': 'Mlijeko (niskmasno)',
  'milk, whole': 'Mlijeko (punomasno)',
  'cheese': 'Sir',
  'yogurt': 'Jogurt',
  'greek yogurt': 'Grčki jogurt',
  'yogurt, greek': 'Grčki jogurt',
  'cottage cheese': 'Zrnati sir',
  'cream': 'Vrhnje',
  'skyr': 'Skyr',
  
  // Ugljikohidrati
  'rice': 'Riža',
  'rice cooked': 'Riža',
  'rice, white, cooked': 'Riža',
  'bread': 'Kruh',
  'toast': 'Tost',
  'bread, toasted': 'Tost',
  'bread, whole wheat': 'Integralni kruh',
  'pasta': 'Tjestenina',
  'pasta cooked': 'Tjestenina',
  'spaghetti, cooked': 'Tjestenina',
  'potato': 'Krumpir',
  'potatoes': 'Krumpir',
  'potatoes, boiled': 'Kuhani krumpir',
  'sweet potato': 'Batat',
  'oats': 'Zobene pahuljice',
  'oatmeal': 'Zobena kaša',
  'quinoa': 'Quinoa',
  'banana': 'Banana',
  'bananas': 'Banane',
  'bananas, raw': 'Banana',
  
  // Masti
  'avocado': 'Avokado',
  'avocados, raw': 'Avokado',
  'olive oil': 'Maslinovo ulje',
  'almonds': 'Bademi',
  'almonds, raw': 'Bademi',
  'walnuts': 'Orasi',
  'cashew': 'Indijski oraščić',
  'cashews': 'Indijski oraščići',
  'peanut butter': 'Kikiriki maslac',
  'peanut': 'Kikiriki',
  'peanuts': 'Kikiriki',
  'nuts': 'Orašasti plodovi',
  
  // Povrće
  'broccoli': 'Brokula',
  'spinach': 'Špinat',
  'carrots': 'Mrkva',
  'carrot': 'Mrkva',
  'carrots, raw': 'Mrkva',
  'tomatoes': 'Rajčica',
  'tomato': 'Rajčica',
  'tomatoes, red, raw': 'Rajčica',
  'cucumber': 'Krastavac',
  'cucumbers, raw': 'Krastavac',
  'peppers': 'Paprika',
  'pepper': 'Paprika',
  'lettuce': 'Zelena salata',
  'lettuce, green leaf': 'Zelena salata',
  'lettuce, iceberg': 'Ledena salata',
  'onion': 'Luk',
  'onions': 'Luk',
  'garlic': 'Češnjak',
  'beans': 'Grah',
  'lentils': 'Leća',
  'mushroom': 'Gljive',
  'mushrooms': 'Gljive',
  'mushrooms, raw': 'Gljive',
  
  // Voće
  'apple': 'Jabuka',
  'apples': 'Jabuke',
  'apples, raw': 'Jabuka',
  'orange': 'Naranča',
  'oranges': 'Naranče',
  'berries': 'Bobice',
  'strawberries': 'Jagode',
  'blueberries': 'Borovnice',
  'blueberries, raw': 'Borovnice',
  'cherries': 'Višnje',
  'cherries, sweet, raw': 'Višnje',
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

