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
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  scaleFactor: number;
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
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <a 
            href="/app" 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Natrag</span>
          </a>
          
          {/* CORPEX Logo */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500">
              CORPEX
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <a href="/app" className="text-xs text-slate-500 hover:text-slate-300">Početna</a>
            <span className="text-slate-700">|</span>
            <a href="/app/profile" className="text-xs text-slate-500 hover:text-slate-300">Profil</a>
      </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tjedni Plan Prehrane</h1>
            <p className="text-sm text-slate-400 mt-1">
              {planMode === 'recipe' ? 'Recepti s fotografijama iz Edamam baze' : 'Personalizirani plan sa 6 obroka dnevno'}
            </p>
          </div>
          <button
            onClick={generateWeeklyPlan}
            disabled={loading}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors shadow-lg shadow-violet-500/20"
          >
            {loading ? "Generiram..." : "Novi plan"}
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 flex items-center gap-1 p-1 bg-slate-900 rounded-xl w-fit">
          <button
            onClick={() => { setPlanMode('classic'); setRecipePlan(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              planMode === 'classic' 
                ? 'bg-violet-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Klasični Plan
          </button>
          <button
            onClick={() => { setPlanMode('recipe'); setWeeklyPlan(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              planMode === 'recipe' 
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📸</span> Recepti
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && !weeklyPlan && !recipePlan && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-700 border-t-violet-500"></div>
            <p className="mt-3 text-slate-400 text-sm">
              {planMode === 'recipe' ? 'Tražim recepte s fotografijama...' : 'Generiram tvoj plan prehrane...'}
            </p>
          </div>
        )}

        {/* Recipe Plan */}
        <AnimatePresence mode="wait">
        {recipePlan && planMode === 'recipe' && (
          <motion.div
            key={`recipe-${planKey}`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Ciljevi - Recipe */}
            <motion.div 
              className="mb-4 p-4 bg-gradient-to-r from-orange-900/30 to-amber-900/30 border border-orange-800/50 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-orange-300/70 uppercase tracking-wide">Dnevni ciljevi</p>
                <span className="text-xs px-2 py-1 rounded-full bg-orange-800/50 text-orange-300 border border-orange-700">
                  {recipePlan.userTargets.goalType === 'lose' ? '🎯 Skidanje kila' : 
                   recipePlan.userTargets.goalType === 'gain' ? '💪 Dobivanje mišića' : '⚖️ Održavanje'}
                </span>
              </div>
              <div className="flex gap-6 text-sm">
                <div><span className="font-semibold text-white">{recipePlan.userTargets.calories}</span> <span className="text-orange-300/70">kcal</span></div>
                <div><span className="font-semibold text-white">{recipePlan.userTargets.protein}g</span> <span className="text-orange-300/70">proteina</span></div>
                <div><span className="font-semibold text-white">{recipePlan.userTargets.carbs}g</span> <span className="text-orange-300/70">UH</span></div>
                <div><span className="font-semibold text-white">{recipePlan.userTargets.fat}g</span> <span className="text-orange-300/70">masti</span></div>
              </div>
            </motion.div>

            {/* Dani - Recipe */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {recipePlan.days.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(idx)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    selectedDay === idx
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {day.dayName}
                </button>
              ))}
            </div>

            {/* Recipe Meals Grid */}
            <div className="grid gap-4">
              {recipePlan.days[selectedDay]?.meals.map((meal, idx) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700 hover:border-orange-600/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRecipeMeal(meal)}
                >
                  <div className="flex">
                    {/* Slika */}
                    <div className="w-32 h-32 flex-shrink-0 relative">
                      <img 
                        src={meal.recipe.image} 
                        alt={meal.recipe.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder-food.jpg';
                        }}
                      />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white">
                          {meal.slotName}
                        </span>
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 p-4">
                      <h3 className="font-semibold text-white text-sm line-clamp-2 mb-2">
                        {meal.recipe.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">
                        Izvor: {meal.recipe.source}
                      </p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-orange-400">{meal.adjustedNutrition.calories} kcal</span>
                        <span className="text-slate-400">P: {meal.adjustedNutrition.protein}g</span>
                        <span className="text-slate-400">C: {meal.adjustedNutrition.carbs}g</span>
                        <span className="text-slate-400">F: {meal.adjustedNutrition.fat}g</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Dnevni totali - Recipe */}
            {recipePlan.days[selectedDay] && (
              <motion.div 
                className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs text-slate-500 uppercase mb-2">Dnevni unos</p>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-400 font-semibold">{recipePlan.days[selectedDay].totals.calories} kcal</span>
                  <span className="text-slate-300">{recipePlan.days[selectedDay].totals.protein}g proteina</span>
                  <span className="text-slate-300">{recipePlan.days[selectedDay].totals.carbs}g UH</span>
                  <span className="text-slate-300">{recipePlan.days[selectedDay].totals.fat}g masti</span>
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedRecipeMeal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Image */}
                <div className="relative h-48">
                  <img 
                    src={selectedRecipeMeal.recipe.image} 
                    alt={selectedRecipeMeal.recipe.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  <button
                    onClick={() => setSelectedRecipeMeal(null)}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-xs text-orange-400 uppercase tracking-wide">{selectedRecipeMeal.slotName}</span>
                    <h2 className="text-xl font-bold text-white mt-1">{selectedRecipeMeal.recipe.name}</h2>
                  </div>
                </div>

                <div className="p-4 overflow-y-auto max-h-[50vh]">
                  {/* Makrosi */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-orange-900/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-orange-400">{selectedRecipeMeal.adjustedNutrition.calories}</p>
                      <p className="text-xs text-slate-400">kcal</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-white">{selectedRecipeMeal.adjustedNutrition.protein}g</p>
                      <p className="text-xs text-slate-400">Proteini</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-white">{selectedRecipeMeal.adjustedNutrition.carbs}g</p>
                      <p className="text-xs text-slate-400">UH</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-white">{selectedRecipeMeal.adjustedNutrition.fat}g</p>
                      <p className="text-xs text-slate-400">Masti</p>
                    </div>
                  </div>

                  {/* Sastojci */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white mb-2">Sastojci</h3>
                    <ul className="space-y-1">
                      {selectedRecipeMeal.recipe.ingredients.map((ing, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-orange-500 mt-1">•</span>
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Izvor */}
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                      Izvor: <span className="text-slate-400">{selectedRecipeMeal.recipe.source}</span>
                    </p>
                    {selectedRecipeMeal.recipe.sourceUrl && (
                      <a 
                        href={selectedRecipeMeal.recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-400 hover:underline mt-1 inline-block"
                      >
                        Pogledaj originalni recept →
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8
            }}
          >
            {/* Ciljevi */}
            <motion.div 
              className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Dnevni ciljevi</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  weeklyPlan.userTargets.goal === 'lose' 
                    ? 'bg-blue-900/50 text-blue-400 border border-blue-800' 
                    : weeklyPlan.userTargets.goal === 'gain' 
                    ? 'bg-violet-900/50 text-violet-400 border border-violet-800'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {weeklyPlan.userTargets.goal === 'lose' ? '🎯 Skidanje kila' : 
                   weeklyPlan.userTargets.goal === 'gain' ? '💪 Dobivanje mišića' : 
                   '⚖️ Održavanje'}
                </span>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold text-white">{weeklyPlan.userTargets.calories}</span> <span className="text-slate-400">kcal</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-0.5">
                      <span className="text-slate-500">Ostvareno: </span>
                      <span className={`font-medium ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 5
                          ? 'text-violet-400'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 10
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.calories} kcal
                        ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories > 0 ? '+' : ''}
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-white">{weeklyPlan.userTargets.protein}g</span> <span className="text-slate-400">proteina</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-0.5">
                      <span className="text-slate-500">Ostvareno: </span>
                      <span className={`font-medium ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 5
                          ? 'text-violet-400'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 10
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.protein}g
                        ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein > 0 ? '+' : ''}
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-white">{weeklyPlan.userTargets.carbs}g</span> <span className="text-slate-400">UH</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-0.5">
                      <span className="text-slate-500">Ostvareno: </span>
                      <span className={`font-medium ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 5
                          ? 'text-violet-400'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 10
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.carbs}g
                        ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs > 0 ? '+' : ''}
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-white">{weeklyPlan.userTargets.fat}g</span> <span className="text-slate-400">masti</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-0.5">
                      <span className="text-slate-500">Ostvareno: </span>
                      <span className={`font-medium ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 5
                          ? 'text-violet-400'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 10
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.fat}g
                        ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat > 0 ? '+' : ''}
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
          </div>
      </motion.div>

            {/* Napomena za cilj */}
            {weeklyPlan.goalNote && (
              <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {weeklyPlan.goalNote}
                </div>
              </div>
            )}

            {/* Napomena o odstupanju */}
            <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800/50 rounded-xl">
              <div className="text-sm text-amber-200/80 whitespace-pre-line leading-relaxed">
                ℹ️ Napomena: Stvarni dnevni unos može odstupati do ±15% od zadanih ciljeva zbog realističnih ograničenja porcija i dostupnih kombinacija namirnica. Generator optimizira plan da bude što bliže ciljevima uz održavanje raznolikosti i realističnih obroka.
        </div>
      </div>

            {/* Dani */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {weeklyPlan.days.map((day, index) => (
                <motion.button
                  key={day.date}
                  onClick={() => setSelectedDay(index)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={selectedDay === index ? { 
                    scale: [1, 1.05, 1],
                    transition: { duration: 0.3 }
                  } : {}}
                  className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-all ${
                    selectedDay === index
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
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
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                >
                  {/* Dan header */}
                  <motion.div 
                    className="flex justify-between items-center py-3 mb-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
            <div>
                      <motion.h2 
                        className="text-lg font-semibold text-white"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        {weeklyPlan.days[selectedDay].dayName}
                      </motion.h2>
                      <motion.p 
                        className="text-xs text-slate-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                      >
                        {weeklyPlan.days[selectedDay].date}
                      </motion.p>
            </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-white">{weeklyPlan.days[selectedDay].dailyTotals.calories} kcal</p>
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 5
                              ? 'bg-violet-900/50 text-violet-400'
                              : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 10
                              ? 'bg-amber-900/50 text-amber-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}>
                            {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories > 0 ? '+' : ''}
                            {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories.toFixed(1)}%
                          </span>
                        )}
            </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500">
                          P: {weeklyPlan.days[selectedDay].dailyTotals.protein}g
                          {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation && (
                            <span className={`ml-1 ${
                              Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 5
                                ? 'text-violet-400'
                                : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 10
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}>
                              ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein > 0 ? '+' : ''}
                              {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                        <span className="text-slate-600">·</span>
                        <p className="text-xs text-slate-500">
                          C: {weeklyPlan.days[selectedDay].dailyTotals.carbs}g
                          {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation && (
                            <span className={`ml-1 ${
                              Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 5
                                ? 'text-violet-400'
                                : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 10
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}>
                              ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs > 0 ? '+' : ''}
                              {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                        <span className="text-slate-600">·</span>
                        <p className="text-xs text-slate-500">
                          F: {weeklyPlan.days[selectedDay].dailyTotals.fat}g
                          {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation && (
                            <span className={`ml-1 ${
                              Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 5
                                ? 'text-violet-400'
                                : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 10
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}>
                              ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat > 0 ? '+' : ''}
                              {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Grid obroka */}
                  <motion.div 
                    className="grid grid-cols-2 md:grid-cols-3 gap-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.08,
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
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setSelectedMeal(null)}
            />
            
            {/* Modal - Mac style zoom animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ 
                type: "spring",
                stiffness: 350,
                damping: 25,
                mass: 0.8
              }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-violet-500 uppercase tracking-wide font-medium">{selectedMeal.title}</p>
                    <h3 className="text-xl font-semibold text-white mt-1">{selectedMeal.meal.name}</h3>
                  </div>
        <button
                    onClick={() => setSelectedMeal(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
        >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
        </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Slika jela */}
                <div className="w-full h-48 bg-slate-800 rounded-xl overflow-hidden">
                  {selectedMeal.meal.image ? (
                    <img 
                      src={selectedMeal.meal.image} 
                      alt={selectedMeal.meal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
      </div>

      {/* Makroi */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-xl font-bold text-white">{selectedMeal.meal.totals.calories}</p>
                    <p className="text-xs text-slate-500">kcal</p>
        </div>
                  <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-xl font-bold text-violet-400">{selectedMeal.meal.totals.protein}g</p>
                    <p className="text-xs text-slate-500">Proteini</p>
        </div>
                  <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-xl font-bold text-amber-400">{selectedMeal.meal.totals.carbs}g</p>
                    <p className="text-xs text-slate-500">UH</p>
        </div>
                  <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-xl font-bold text-rose-400">{selectedMeal.meal.totals.fat}g</p>
                    <p className="text-xs text-slate-500">Masti</p>
        </div>
      </div>

                {/* Sastojci */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Sastojci</p>
                  <div className="space-y-2">
                    {selectedMeal.meal.components.map((comp, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className="flex justify-between items-center py-2 px-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                      >
                        <span className="text-slate-300">{comp.name}</span>
                        <span className="text-white font-semibold tabular-nums">{formatAmount(comp.name, comp.grams)}</span>
                      </motion.div>
                    ))}
              </div>
            </div>

                {/* Opis jela */}
                {selectedMeal.meal.description && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">O jelu</p>
                    <p className="text-slate-400 leading-relaxed text-sm">
                      {selectedMeal.meal.description}
                    </p>
        </div>
      )}

                {/* Priprema */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Priprema</p>
                  <p className="text-slate-400 leading-relaxed text-sm">
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
    y: 30,
    scale: 0.9,
    rotateX: -15
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
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
        scale: 1.03, 
        y: -5,
        transition: { type: "spring", stiffness: 400, damping: 17 }
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 cursor-pointer hover:bg-slate-800 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 transition-colors"
      style={{ perspective: 1000 }}
    >
      {/* Slika jela */}
      <motion.div 
        className="w-full h-24 bg-slate-900 rounded-lg mb-3 overflow-hidden"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {meal.image ? (
          <img 
            src={meal.image} 
            alt={meal.name}
            className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </motion.div>
      
      <p className="text-xs text-violet-400 uppercase tracking-wide font-medium">{title}</p>
      <p className="font-medium text-white text-sm mt-0.5 line-clamp-2">{meal.name}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-slate-400">{meal.totals.calories} kcal</span>
        <span className="text-slate-600">•</span>
        <span className="text-xs text-violet-400/70">{meal.totals.protein}g P</span>
      </div>
    </motion.div>
  );
}
