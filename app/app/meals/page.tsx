"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Tipovi
interface MealComponent {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GeneratedMeal {
  name: string;
  description: string;
  image?: string;
  preparationTip?: string;
  components: MealComponent[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface DailyPlan {
  date: string;
  dayName: string;
  meals: {
    breakfast: GeneratedMeal;
    snack1: GeneratedMeal;
    lunch: GeneratedMeal;
    snack2: GeneratedMeal;
    snack3?: GeneratedMeal;
    dinner: GeneratedMeal;
  };
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface WeeklyMealPlan {
  userId: string;
  generatedAt: string;
  weekStartDate: string;
  userTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goal: string;
  };
  goalNote?: string;
  days: DailyPlan[];
  weeklyTotals: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
  };
  supplementNote?: string;
}

// Upute za pripremu - ažurirano za nova profesionalna imena
const preparationInstructions: Record<string, string> = {
  // DORUČAK
  "Proteinska pločica s toplom zobovakom": "Skuhaj zobene pahuljice u mlijeku na laganoj vatri 5-7 minuta uz miješanje. Isprži jaja i bjelanjke na tavi s malo maslinovog ulja. Nasjeckaj svježu bananu. Posluži zobene u zdjeli, jaja sa strane i ukrasi bananom.",
  "Kremasta zobovaka s proteinima i tropskim voćem": "Skuhaj zobene u mlijeku dok ne postanu kremaste. Ostavi da se malo ohlade, zatim umiješaj proteinski prah. Nasjeckaj bananu, dodaj pržene bademe na vrh i odmah posluži.",
  "Mediteranski omlet s gljivama i puretinom": "Nasjeckaj šampinjone i crveni luk. Propržiti na tavi 3-4 minute. Umuti jaja, prelij preko povrća i peci dok omlet ne postane čvrst. Dodaj narezanu pureću šunku. Posluži uz tople kriške integralnog kruha.",
  "Islandski skyr parfait sa šumskim voćem": "U visoku čašu ili zdjelu stavi skyr, umiješaj proteinski prah dok ne postane kremasto. Dodaj sloj svježih borovnica, zatim narezanu bananu. Možeš ponoviti slojeve za efektan izgled.",
  "Toskanski tost s puretinom i grčkim jogurtom": "Toastiraj kriške integralnog kruha do zlatne boje. Posloži dimljenu puretinu preko tosta. Posluži grčki jogurt u zdjelici sa strane uz svježu bananu.",
  "Rustikalni zrnati sir s voćem i bademima": "Rasporedi zrnati sir u plitku zdjelu. Nasjeckaj bananu i rasporedi preko sira. Dodaj šumske borovnice i pržene bademe. Lagano promiješaj ili posluži u slojevima.",
  "Energetski tost s kikiriki maslacem i voćem": "Namazi svaku rižinu galetu tankim slojem kikiriki maslaca. Nasjeckaj bananu na kolutiće i posloži preko. Posluži grčki jogurt u zdjelici sa strane.",
  "Proteinski bowl Acai style": "Stavi grčki jogurt u duboku zdjelu. Pospi zobenim pahuljicama. Nasjeckaj bananu i rasporedi s jedne strane, svježe borovnice s druge. Ukrasi indijskim oraščićima na vrhu.",
  "Power breakfast za aktivne": "Isprži jaja na željeni način. Toastiraj integralni kruh i namazi kikiriki maslacem. Posloži dimljenu puretinu na tanjur. Popij čašu svježeg mlijeka uz obrok.",
  "Proteinski smoothie sa zobovakom": "U blender stavi mlijeko, zobene pahuljice, proteinski prah i bananu. Miksaj 60 sekundi na visokoj brzini dok ne postane potpuno glatko i kremasto.",
  "Klasični proteinski doručak sa skyrom": "Isprži jaja na oko u malo maslaca. Toastiraj integralni kruh. Posluži skyr u zdjelici s narezanom bananom sa strane.",
  "Orijentalna zobovaka s indijskim oraščićima": "Skuhaj zobene u mlijeku 5-7 minuta. Umiješaj proteinski prah dok je još toplo. Nasjeckaj bananu, pospi indijskim oraščićima i odmah posluži.",
  
  // RUČAK
  "Pileća prsa na žaru s pašta primavera": "Začini pileća prsa solju i paprom. Peči na roštilju ili tavi 6-7 minuta sa svake strane. Skuhaj tjesteninu al dente. Nasjeckaj salatu i cherry rajčice. Posluži piletinu preko tjestenine sa salatom.",
  "Piletina s domaćim pireom i svježim krastavcima": "Skuhaj krumpir do mekoće, ociedi i izgnječi s malo mlijeka i maslaca. Isprži pileća prsa. Nasjeckaj krastavce i rikulu. Posluži piletinu s pireom i salatom.",
  "Pureća prsa s mladim krumpirom i sezonskom salatom": "Skuhaj mlade krumpiriće u slanoj vodi 15-20 min. Isprži pureća prsa na tavi. Pripremi salatu od zelene salate i rajčica. Posluži sve zajedno.",
  "Atlantski losos s mladim krumpirom i svježim povrćem": "Začini losos filet solju i limunom. Peci u pećnici na 200°C 12-15 minuta. Skuhaj mlade krumpiriće. Nasjeckaj krastavce i baby špinat. Posluži toplo.",
  "Tuna nicoise s pašta fusilli": "Skuhaj fusilli tjesteninu al dente. Ociedi tunu iz konzerve. Pomiješaj tjesteninu s tunom, slatkim kukuruzom i narezanim krastavcima. Začini po želji.",
  "Roštilj piletina s pečenim krumpirom i sezonskom salatom": "Nasjeckaj krumpir na kockice, poprskaj uljem i peci u pećnici na 200°C 25-30 min. Isprži piletinu na roštilju ili tavi. Pripremi salatu. Posluži toplo.",
  "Piletina s heljdinom kašom i mediteranskom salatom": "Skuhaj heljdu u slanoj vodi 15 minuta. Isprži pileća prsa. Nasjeckaj rikulu i rajčice za salatu. Posluži piletinu preko heljde sa salatom.",
  "Pašta Alfredo s piletinom": "Skuhaj tagliatelle. Isprži narezanu piletinu, dodaj vrhnje za kuhanje i kratko prokuhaj. Pomiješaj s tjesteninom. Posluži s baby špinatom.",
  "Losos pašta primavera": "Ispeci losos filet. Skuhaj penne tjesteninu. Prepolovi cherry rajčice. Rasporedi tjesteninu, losos i rajčice na tanjur, dodaj rikulu.",
  "Pureća prsa s heljdom i svježim povrćem": "Skuhaj heljdu. Isprži pureća prsa na tavi. Nasjeckaj krastavce i cherry rajčice. Posluži puretinu preko heljde sa svježim povrćem.",
  "Piletina à la maison s domaćim pireom": "Skuhaj krumpir i izgnječi u kremasti pire. Isprži pileća prsa. Nasjeckaj svježe rajčice i baby špinat. Posluži domaćim stilom.",
  "Tuna salata mediteran": "Ociedi tunu i stavi u veliku zdjelu. Dodaj kukuruz, narezane krastavce, zelenu salatu i cherry rajčice. Lagano pomiješaj i začini.",
  
  // VEČERA
  "Tuna tartare sa svježim krastavcima": "Ociedi tunu i lagano je razdvoji vilicom. Nasjeckaj krastavce na tanke kolutiće. Pripremi miješanu salatu. Posluži tunu na salati s rižinim galetama sa strane.",
  "Grčki proteinski parfait sa šumskim voćem": "Umiješaj proteinski prah u grčki jogurt dok ne postane kremasto. Dodaj svježe borovnice i narezanu bananu. Posluži u lijepoj zdjeli.",
  "Pečeni losos s avokadom i zelenom salatom": "Začini losos i peci u pećnici 12-15 min na 200°C. Nasjeckaj Hass avokado i krastavce. Pripremi baby špinat. Posluži losos na krevetu od salate.",
  "Rustikalni zrnati sir sa šumskim voćem": "Rasporedi zrnati sir u zdjelu. Dodaj svježe borovnice i narezanu bananu. Posluži rižine galete sa strane za hrskavost.",
  "Avokado toast s jajima na oko": "Isprži jaja na oko. Nasjeckaj avokado i blago zgnječi. Pripremi rikulu i cherry rajčice. Posluži jaja na avokadu sa salatom.",
  "Tuna crostini s mediteranskom salatom": "Ociedi tunu. Pripremi miješanu salatu s krastavcima. Posluži tunu na rižinim galetama sa salatom uz.",
  "Islandski skyr proteinski bowl": "Umiješaj proteinski prah u skyr. Dodaj svježe borovnice i narezanu bananu na vrh. Posluži odmah.",
  "Losos tataki s azijskim umakom": "Brzo ispeci losos na visokoj temperaturi 1-2 min sa svake strane. Nasjeckaj krastavce. Razrijedi kikiriki maslac s malo vode za umak. Posluži s galetama.",
  "Zrnati sir à la mode s kikiriki maslacem": "Stavi zrnati sir u zdjelu. Dodaj žlicu kikiriki maslaca i lagano promiješaj. Nasjeckaj bananu i dodaj na vrh.",
  "Grčki jogurt bowl s avokadom i borovnicama": "Umiješaj proteinski prah u grčki jogurt. Nasjeckaj avokado i dodaj. Ukrasi svježim borovnicama.",
  
  // UŽINE
  "Proteinski smoothie Tropical Bliss": "Stavi sve sastojke u blender: mlijeko, proteinski prah, bananu i borovnice. Miksaj 60 sekundi dok ne postane potpuno glatko.",
  "Islandski skyr s tropskim voćem": "Stavi skyr u zdjelu. Nasjeckaj bananu i posloži na vrh. Posluži odmah.",
  "Grčki proteinski parfait": "Umiješaj proteinski prah u grčki jogurt. Dodaj svježe borovnice na vrh. Posluži u staklenoj čaši za efektan izgled.",
  "Energy boost s bademima": "Nasjeckaj bananu na kolutiće. Posluži s prženim bademima sa strane. Jednostavno i hranjivo.",
  "Rižine galette s kikiriki maslacem": "Namazi kikiriki maslac na rižine galete. Nasjeckaj bananu i posloži preko. Posluži odmah.",
  "Pure protein shake": "Stavi proteinski prah i mlijeko u shaker ili blender. Protreši dobro ili miksaj 30 sekundi.",
  "Islandski skyr sa šumskim voćem": "Stavi skyr u zdjelu. Dodaj svježe borovnice na vrh. Lagano promiješaj ili posluži u slojevima.",
  "Grčki bowl s bananom i bademima": "Stavi grčki jogurt u zdjelu. Nasjeckaj bananu i rasporedi. Pospi prženim bademima.",
  "Rižine galette sa zrnatim sirom": "Rasporedi zrnati sir preko rižinih galeta. Posluži kao brzu, proteinsku užinu.",
  "Proteinski smoothie Berry Blast": "Stavi mlijeko, proteinski prah, bananu i borovnice u blender. Miksaj dok ne postane glatko i kremasto.",
};

function getPreparationInstructions(mealName: string): string {
  return preparationInstructions[mealName] || "Pripremi sastojke prema gramažama. Kombiniraj i posluži.";
}

// Tekućine - prikazuju se u ml umjesto g
const LIQUID_INGREDIENTS = [
  "mlijeko", "milk", "voda", "water", "sok", "juice", 
  "vrhnje", "cream", "jogurt tekući", "kefir", "smoothie"
];

function isLiquid(ingredientName: string): boolean {
  const nameLower = ingredientName.toLowerCase();
  return LIQUID_INGREDIENTS.some(liquid => nameLower.includes(liquid));
}

function formatAmount(name: string, grams: number): string {
  if (isLiquid(name)) {
    return `${grams} ml`;
  }
  return `${grams}g`;
}

// Tip za Recipe-based jela
interface IngredientGrams {
  food: string;
  grams: number;
  text: string;
}

interface RecipeMeal {
  id: string;
  slotType: string;
  slotName: string;
  recipe: {
    id: string;
    name: string;
    image: string;
    source: string;
    sourceUrl: string;
    servings: number;
    prepTime: number;
    ingredients: string[];
    ingredientsWithGrams?: IngredientGrams[];
    totalWeight?: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  scaleFactor: number;
  scaledIngredientsWithGrams?: IngredientGrams[];
  scaledTotalWeight?: number;
  adjustedNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

interface RecipeDayPlan {
  dayIndex: number;
  dayName: string;
  meals: RecipeMeal[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

interface RecipeWeeklyPlan {
  userId: string;
  generatedAt: string;
  weekStartDate: string;
  userTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goalType: string;
  };
  days: RecipeDayPlan[];
  weeklyAverages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  source: string;
}

export default function MealsPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan | null>(null);
  const [recipePlan, setRecipePlan] = useState<RecipeWeeklyPlan | null>(null);
  const [planMode, setPlanMode] = useState<'classic' | 'recipe'>('classic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<{ title: string; meal: GeneratedMeal } | null>(null);
  const [selectedRecipeMeal, setSelectedRecipeMeal] = useState<RecipeMeal | null>(null);
  const [planKey, setPlanKey] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem("clientId");
    setClientId(id);
  }, []);

  const generateWeeklyPlan = async () => {
    if (!clientId) {
      setError("Nisi prijavljen. Molimo prijavi se prvo.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = planMode === 'recipe' 
        ? "/api/meal-plan/recipes"
        : "/api/meal-plan/weekly";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clientId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Greška pri generiranju plana");
      }

      console.log("📊 Plan generiran:", planMode, data.plan);

      if (planMode === 'recipe') {
        setRecipePlan(data.plan);
        setWeeklyPlan(null);
      } else {
        setWeeklyPlan(data.plan);
        setRecipePlan(null);
      }
      
      setPlanKey(prev => prev + 1);
      setSelectedDay(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Greška pri generiranju plana";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId && !weeklyPlan && !recipePlan && !loading) {
      generateWeeklyPlan();
    }
  }, [clientId]);

    return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&h=1080&fit=crop&q=80')`,
            filter: "brightness(0.15) saturate(0.8)"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
      </div>

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <motion.a 
            href="/app" 
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            whileHover={{ x: -3 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-light tracking-wide">Natrag</span>
          </motion.a>
          
          {/* CORPEX Logo */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="text-sm font-light tracking-[0.4em] text-white/70 uppercase">
              Corpex
            </span>
          </div>
          
          <motion.button
            onClick={generateWeeklyPlan}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2 bg-white/10 border border-white/20 text-white text-sm font-light tracking-wide rounded-full hover:bg-white/15 hover:border-white/30 disabled:opacity-50 transition-all"
          >
            {loading ? "Generiram..." : "Novi plan"}
          </motion.button>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <motion.div 
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-light text-white tracking-wide mb-2">
            Tjedni Plan Prehrane
          </h1>
          <p className="text-sm text-white/40 font-light">
            {planMode === 'recipe' ? 'Recepti s fotografijama' : 'Personalizirani plan'}
          </p>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div 
          className="mb-8 flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => { setPlanMode('classic'); setRecipePlan(null); }}
            className={`px-6 py-2.5 rounded-full text-sm font-light tracking-wide transition-all ${
              planMode === 'classic' 
                ? 'bg-white/15 text-white border border-white/30' 
                : 'text-white/50 hover:text-white/80 border border-transparent'
            }`}
          >
            Klasični Plan
          </button>
          <button
            onClick={() => { setPlanMode('recipe'); setWeeklyPlan(null); }}
            className={`px-6 py-2.5 rounded-full text-sm font-light tracking-wide transition-all ${
              planMode === 'recipe' 
                ? 'bg-white/15 text-white border border-white/30' 
                : 'text-white/50 hover:text-white/80 border border-transparent'
            }`}
          >
            Recepti
          </button>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm"
          >
            <p className="text-red-300/80 text-sm font-light text-center">{error}</p>
          </motion.div>
        )}

        {/* Loading */}
        {loading && !weeklyPlan && !recipePlan && (
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="inline-block animate-spin rounded-full h-8 w-8 border border-white/20 border-t-white/70"></div>
            <p className="mt-4 text-white/40 text-sm font-light tracking-wide">
              {planMode === 'recipe' ? 'Tražim recepte...' : 'Generiram plan...'}
            </p>
          </motion.div>
        )}

        {/* Recipe Plan */}
        <AnimatePresence mode="wait">
        {recipePlan && planMode === 'recipe' && (
          <motion.div
            key={`recipe-${planKey}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Ciljevi - Recipe */}
            <motion.div 
              className="mb-6 p-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-light">Dnevni ciljevi</p>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10 font-light">
                  {recipePlan.userTargets.goalType === 'lose' ? 'Skidanje kila' : 
                   recipePlan.userTargets.goalType === 'gain' ? 'Dobivanje mišića' : 'Održavanje'}
                </span>
              </div>
              <div className="flex gap-8 text-sm">
                <div><span className="font-normal text-white">{recipePlan.userTargets.calories}</span> <span className="text-white/40 font-light">kcal</span></div>
                <div><span className="font-normal text-white">{recipePlan.userTargets.protein}g</span> <span className="text-white/40 font-light">proteina</span></div>
                <div><span className="font-normal text-white">{recipePlan.userTargets.carbs}g</span> <span className="text-white/40 font-light">UH</span></div>
                <div><span className="font-normal text-white">{recipePlan.userTargets.fat}g</span> <span className="text-white/40 font-light">masti</span></div>
              </div>
            </motion.div>

            {/* Dani - Recipe */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 justify-center">
              {recipePlan.days.map((day, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => setSelectedDay(idx)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-5 py-2 rounded-full text-sm font-light tracking-wide transition-all whitespace-nowrap ${
                    selectedDay === idx
                      ? 'bg-white/15 text-white border border-white/30'
                      : 'text-white/40 hover:text-white/70 border border-transparent hover:border-white/10'
                  }`}
                >
                  {day.dayName}
                </motion.button>
              ))}
            </div>

            {/* Recipe Meals Grid */}
            <div className="grid gap-4">
              {recipePlan.days[selectedDay]?.meals.map((meal, idx) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.2)' }}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 transition-all cursor-pointer group"
                  onClick={() => setSelectedRecipeMeal(meal)}
                >
                  <div className="flex">
                    {/* Slika */}
                    <div className="w-28 h-28 md:w-36 md:h-36 flex-shrink-0 relative overflow-hidden">
                      <img 
                        src={meal.recipe.image} 
                        alt={meal.recipe.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder-food.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
                      <div className="absolute top-2 left-2">
                        <span className="px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs text-white/80 font-light">
                          {meal.slotName}
                        </span>
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <h3 className="font-normal text-white text-sm md:text-base line-clamp-2 mb-1">
                        {meal.recipe.name}
                      </h3>
                      <p className="text-xs text-white/30 mb-3 font-light">
                        {meal.recipe.source}
                      </p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-white/70">{meal.adjustedNutrition.calories} kcal</span>
                        <span className="text-white/40">P: {meal.adjustedNutrition.protein}g</span>
                        <span className="text-white/40">C: {meal.adjustedNutrition.carbs}g</span>
                        <span className="text-white/40">F: {meal.adjustedNutrition.fat}g</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Dnevni totali - Recipe */}
            {recipePlan.days[selectedDay] && (
              <motion.div 
                className="mt-6 p-5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-3 font-light">Dnevni unos</p>
                <div className="flex justify-between text-sm">
                  <span className="text-white font-normal">{recipePlan.days[selectedDay].totals.calories} kcal</span>
                  <span className="text-white/60 font-light">{recipePlan.days[selectedDay].totals.protein}g proteina</span>
                  <span className="text-white/60 font-light">{recipePlan.days[selectedDay].totals.carbs}g UH</span>
                  <span className="text-white/60 font-light">{recipePlan.days[selectedDay].totals.fat}g masti</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* Recipe Meal Modal */}
        <AnimatePresence>
          {selectedRecipeMeal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedRecipeMeal(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}
                className="bg-neutral-900/95 backdrop-blur-md rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Image */}
                <div className="relative h-52">
                  <img 
                    src={selectedRecipeMeal.recipe.image} 
                    alt={selectedRecipeMeal.recipe.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />
                  <motion.button
                    onClick={() => setSelectedRecipeMeal(null)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white border border-white/10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                  <div className="absolute bottom-4 left-5 right-5">
                    <span className="text-xs text-white/50 uppercase tracking-[0.2em] font-light">{selectedRecipeMeal.slotName}</span>
                    <h2 className="text-xl font-normal text-white mt-1">{selectedRecipeMeal.recipe.name}</h2>
                  </div>
                </div>

                <div className="p-5 overflow-y-auto max-h-[50vh]">
                  {/* Makrosi */}
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                      <p className="text-lg font-normal text-white">{selectedRecipeMeal.adjustedNutrition.calories}</p>
                      <p className="text-xs text-white/40 font-light">kcal</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <p className="text-lg font-normal text-white">{selectedRecipeMeal.adjustedNutrition.protein}g</p>
                      <p className="text-xs text-white/40 font-light">Proteini</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <p className="text-lg font-normal text-white">{selectedRecipeMeal.adjustedNutrition.carbs}g</p>
                      <p className="text-xs text-white/40 font-light">UH</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <p className="text-lg font-normal text-white">{selectedRecipeMeal.adjustedNutrition.fat}g</p>
                      <p className="text-xs text-white/40 font-light">Masti</p>
                    </div>
                  </div>

                  {/* Sastojci s gramažama */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-normal text-white">Sastojci</h3>
                      {selectedRecipeMeal.scaledTotalWeight && (
                        <span className="text-xs text-white/50 font-light">Ukupno: {selectedRecipeMeal.scaledTotalWeight}g</span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {selectedRecipeMeal.scaledIngredientsWithGrams && selectedRecipeMeal.scaledIngredientsWithGrams.length > 0 ? (
                        selectedRecipeMeal.scaledIngredientsWithGrams.map((ing, i) => (
                          <li key={i} className="text-sm flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                            <span className="text-white/70 font-light flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                              {ing.food}
                            </span>
                            <span className="text-white/50 font-light">{ing.grams}g</span>
                          </li>
                        ))
                      ) : (
                        selectedRecipeMeal.recipe.ingredients.map((ing, i) => (
                          <li key={i} className="text-sm text-white/70 font-light flex items-start gap-2 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30 mt-1.5 flex-shrink-0"></span>
                            {ing}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  {/* Izvor */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-white/40 font-light">
                      Izvor: <span className="text-white/60">{selectedRecipeMeal.recipe.source}</span>
                    </p>
                    {selectedRecipeMeal.recipe.sourceUrl && (
                      <a 
                        href={selectedRecipeMeal.recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/60 hover:text-white transition-colors mt-2 inline-flex items-center gap-1 font-light"
                      >
                        Pogledaj originalni recept 
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Classic Plan */}
        <AnimatePresence mode="wait">
        {weeklyPlan && planMode === 'classic' && (
          <motion.div
            key={planKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Ciljevi */}
            <motion.div 
              className="mb-6 p-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-light">Dnevni ciljevi</p>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10 font-light">
                  {weeklyPlan.userTargets.goal === 'lose' ? 'Skidanje kila' : 
                   weeklyPlan.userTargets.goal === 'gain' ? 'Dobivanje mišića' : 
                   'Održavanje'}
                </span>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="font-normal text-white">{weeklyPlan.userTargets.calories}</span> <span className="text-white/40 font-light">kcal</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-1">
                      <span className={`font-light ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 5
                          ? 'text-white/60'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 10
                          ? 'text-amber-400/70'
                          : 'text-red-400/70'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.calories} kcal
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-normal text-white">{weeklyPlan.userTargets.protein}g</span> <span className="text-white/40 font-light">proteina</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-1">
                      <span className={`font-light ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 5
                          ? 'text-white/60'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 10
                          ? 'text-amber-400/70'
                          : 'text-red-400/70'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.protein}g
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-normal text-white">{weeklyPlan.userTargets.carbs}g</span> <span className="text-white/40 font-light">UH</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-1">
                      <span className={`font-light ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 5
                          ? 'text-white/60'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 10
                          ? 'text-amber-400/70'
                          : 'text-red-400/70'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.carbs}g
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-normal text-white">{weeklyPlan.userTargets.fat}g</span> <span className="text-white/40 font-light">masti</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-1">
                      <span className={`font-light ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 5
                          ? 'text-white/60'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 10
                          ? 'text-amber-400/70'
                          : 'text-red-400/70'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.fat}g
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Napomena za cilj */}
            {weeklyPlan.goalNote && (
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-sm text-white/60 whitespace-pre-line leading-relaxed font-light">
                  {weeklyPlan.goalNote}
                </div>
              </div>
            )}

            {/* Dani */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 justify-center">
              {weeklyPlan.days.map((day, index) => (
                <motion.button
                  key={day.date}
                  onClick={() => setSelectedDay(index)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-5 py-2 rounded-full text-sm font-light tracking-wide transition-all whitespace-nowrap ${
                    selectedDay === index
                      ? "bg-white/15 text-white border border-white/30"
                      : "text-white/40 hover:text-white/70 border border-transparent hover:border-white/10"
                  }`}
                >
                  {day.dayName}
                </motion.button>
              ))}
            </div>

            {/* Odabrani dan */}
            <AnimatePresence mode="wait">
              {weeklyPlan.days[selectedDay] && (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Dan header */}
                  <motion.div 
                    className="flex justify-between items-center py-4 mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div>
                      <h2 className="text-lg font-normal text-white">
                        {weeklyPlan.days[selectedDay].dayName}
                      </h2>
                      <p className="text-xs text-white/30 font-light">
                        {weeklyPlan.days[selectedDay].date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-normal text-white">{weeklyPlan.days[selectedDay].dailyTotals.calories} kcal</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/40 font-light">
                        <span>P: {weeklyPlan.days[selectedDay].dailyTotals.protein}g</span>
                        <span>C: {weeklyPlan.days[selectedDay].dailyTotals.carbs}g</span>
                        <span>F: {weeklyPlan.days[selectedDay].dailyTotals.fat}g</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Grid obroka */}
                  <motion.div 
                    className="grid grid-cols-2 md:grid-cols-3 gap-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.06,
                          delayChildren: 0.1
                        }
                      }
                    }}
                  >
                    <MealTile 
                      title="Doručak" 
                      meal={weeklyPlan.days[selectedDay].meals.breakfast}
                      onClick={() => setSelectedMeal({ title: "Doručak", meal: weeklyPlan.days[selectedDay].meals.breakfast })}
                      index={0}
                    />
                    <MealTile 
                      title="Međuobrok" 
                      meal={weeklyPlan.days[selectedDay].meals.snack1}
                      onClick={() => setSelectedMeal({ title: "Međuobrok 1", meal: weeklyPlan.days[selectedDay].meals.snack1 })}
                      index={1}
                    />
                    <MealTile 
                      title="Ručak" 
                      meal={weeklyPlan.days[selectedDay].meals.lunch}
                      onClick={() => setSelectedMeal({ title: "Ručak", meal: weeklyPlan.days[selectedDay].meals.lunch })}
                      index={2}
                    />
                    <MealTile 
                      title="Međuobrok 2" 
                      meal={weeklyPlan.days[selectedDay].meals.snack2}
                      onClick={() => setSelectedMeal({ title: "Međuobrok 2", meal: weeklyPlan.days[selectedDay].meals.snack2 })}
                      index={3}
                    />
                    {weeklyPlan.days[selectedDay].meals.snack3 && (
                      <MealTile 
                        title="Međuobrok 3" 
                        meal={weeklyPlan.days[selectedDay].meals.snack3}
                        onClick={() => setSelectedMeal({ title: "Međuobrok 3", meal: weeklyPlan.days[selectedDay].meals.snack3! })}
                        index={4}
                      />
                    )}
                    <MealTile 
                      title="Večera" 
                      meal={weeklyPlan.days[selectedDay].meals.dinner}
                      onClick={() => setSelectedMeal({ title: "Večera", meal: weeklyPlan.days[selectedDay].meals.dinner })}
                      index={5}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tjedni prosjek */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Tjedni prosjek</p>
              <div className="flex gap-6 text-sm">
                <div><span className="font-semibold text-white">{weeklyPlan.weeklyTotals.avgCalories}</span> <span className="text-slate-500">kcal</span></div>
                <div><span className="font-semibold text-white">{weeklyPlan.weeklyTotals.avgProtein}g</span> <span className="text-slate-500">P</span></div>
                <div><span className="font-semibold text-white">{weeklyPlan.weeklyTotals.avgCarbs}g</span> <span className="text-slate-500">C</span></div>
                <div><span className="font-semibold text-white">{weeklyPlan.weeklyTotals.avgFat}g</span> <span className="text-slate-500">F</span></div>
              </div>
            </div>
            
            {/* Napomena o suplementaciji */}
            {weeklyPlan.supplementNote && (
              <div className="mt-6 p-4 bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded-xl border border-violet-800/50">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💪</span>
                  <div>
                    <p className="text-sm font-medium text-violet-400 mb-1">Napomena o suplementaciji</p>
                    <p className="text-sm text-violet-200/80">
                      Između obroka i nakon treninga, sukladno vlastitim potrebama, preporuča se konzumacija <strong className="text-violet-300">whey proteina</strong> kao suplementacije i dodatka prehrani - miješati s vodom.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Gumb za odlazak na trening */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <button
                onClick={() => router.push("/app/workout")}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-lg font-semibold text-white transition hover:opacity-90 shadow-lg"
              >
                🏋️ Generiraj Plan Treninga
              </button>
              <p className="text-center text-sm text-slate-500 mt-2">
                Nastavi na personalizirani plan vježbanja
              </p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Modal s Mac-style animacijom */}
      <AnimatePresence>
        {selectedMeal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-40"
              onClick={() => setSelectedMeal(null)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-light">{selectedMeal.title}</p>
                    <h3 className="text-xl font-normal text-white mt-1">{selectedMeal.meal.name}</h3>
                  </div>
                  <motion.button
                    onClick={() => setSelectedMeal(null)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors border border-white/10"
                  >
                    <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Slika jela */}
                <div className="w-full h-48 rounded-2xl overflow-hidden">
                  {selectedMeal.meal.image ? (
                    <img 
                      src={selectedMeal.meal.image} 
                      alt={selectedMeal.meal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <svg className="w-16 h-16 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Makroi */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-white/10 rounded-xl border border-white/10">
                    <p className="text-lg font-normal text-white">{selectedMeal.meal.totals.calories}</p>
                    <p className="text-xs text-white/40 font-light">kcal</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-lg font-normal text-white">{selectedMeal.meal.totals.protein}g</p>
                    <p className="text-xs text-white/40 font-light">Proteini</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-lg font-normal text-white">{selectedMeal.meal.totals.carbs}g</p>
                    <p className="text-xs text-white/40 font-light">UH</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-lg font-normal text-white">{selectedMeal.meal.totals.fat}g</p>
                    <p className="text-xs text-white/40 font-light">Masti</p>
                  </div>
                </div>

                {/* Sastojci */}
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-[0.15em] font-light mb-3">Sastojci</p>
                  <div className="space-y-2">
                    {selectedMeal.meal.components.map((comp, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.04 }}
                        className="flex justify-between items-center py-2.5 px-4 bg-white/5 rounded-xl border border-white/5"
                      >
                        <span className="text-white/70 font-light">{comp.name}</span>
                        <span className="text-white/50 font-light tabular-nums">{formatAmount(comp.name, comp.grams)}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Opis jela */}
                {selectedMeal.meal.description && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-[0.15em] font-light mb-3">O jelu</p>
                    <p className="text-white/60 leading-relaxed text-sm font-light">
                      {selectedMeal.meal.description}
                    </p>
                  </div>
                )}

                {/* Priprema */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 uppercase tracking-[0.15em] font-light mb-3">Priprema</p>
                  <p className="text-white/60 leading-relaxed text-sm font-light">
                    {selectedMeal.meal.preparationTip || getPreparationInstructions(selectedMeal.meal.name)}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Meal Tile - mala kartica za grid s premium animacijom
const mealCardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20
    }
  }
};

function MealTile({ title, meal, onClick, index }: { title: string; meal: GeneratedMeal; onClick: () => void; index: number }) {
  if (!meal || !meal.components || meal.components.length === 0) return null;

  return (
    <motion.div
      variants={mealCardVariants}
      whileHover={{ 
        scale: 1.02, 
        borderColor: 'rgba(255,255,255,0.2)',
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 cursor-pointer transition-all group overflow-hidden"
    >
      {/* Slika jela */}
      <div className="w-full h-24 rounded-xl mb-3 overflow-hidden relative">
        {meal.image ? (
          <img 
            src={meal.image} 
            alt={meal.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      
      <p className="text-xs text-white/40 uppercase tracking-[0.15em] font-light">{title}</p>
      <p className="font-normal text-white text-sm mt-1 line-clamp-2">{meal.name}</p>
      <div className="flex items-center gap-3 mt-2 text-xs">
        <span className="text-white/60">{meal.totals.calories} kcal</span>
        <span className="text-white/30">·</span>
        <span className="text-white/40">{meal.totals.protein}g P</span>
      </div>
    </motion.div>
  );
}
