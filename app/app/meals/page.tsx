"use client";

import { useEffect, useState } from "react";
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

export default function MealsPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<{ title: string; meal: GeneratedMeal } | null>(null);

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
      const res = await fetch("/api/meal-plan/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clientId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Greška pri generiranju plana");
      }

      // DEBUG: Log plan data to verify it matches generator output
      console.log("📊 WEEKLY PLAN DATA FROM GENERATOR:", data.plan);
      
      // Log Thursday (index 3) as example day
      if (data.plan?.days?.[3]) {
        const thursday = data.plan.days[3];
        console.log("\n🔍 THURSDAY (Dan 4) VERIFICATION:");
        console.log("Daily totals from generator:", thursday.dailyTotals);
        
        // Sum meal totals manually
        let manualSum = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const mealTypes = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'] as const;
        mealTypes.forEach(mealType => {
          const meal = thursday.meals[mealType];
          if (meal && meal.totals) {
            console.log(`  ${mealType}: ${meal.name} - ${meal.totals.calories} kcal, P: ${meal.totals.protein}g, C: ${meal.totals.carbs}g, F: ${meal.totals.fat}g`);
            manualSum.calories += meal.totals.calories;
            manualSum.protein += meal.totals.protein;
            manualSum.carbs += meal.totals.carbs;
            manualSum.fat += meal.totals.fat;
          }
        });
        
        // Calculate calories from macros
        const calculatedCalories = Math.round(manualSum.protein * 4 + manualSum.carbs * 4 + manualSum.fat * 9);
        console.log("\n📈 MANUAL SUM (from meal.totals):", manualSum);
        console.log("📈 CALCULATED CALORIES (P×4 + C×4 + F×9):", calculatedCalories);
        console.log("📈 GENERATOR dailyTotals.calories:", thursday.dailyTotals.calories);
        console.log("✅ Match:", calculatedCalories === thursday.dailyTotals.calories ? "YES" : "NO");
      }

      setWeeklyPlan(data.plan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Greška pri generiranju plana";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId && !weeklyPlan && !loading) {
      generateWeeklyPlan();
    }
  }, [clientId]);

    return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <a 
            href="/app" 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Natrag</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/app" className="text-xs text-gray-500 hover:text-gray-700">Početna</a>
            <span className="text-gray-300">|</span>
            <a href="/app/profile" className="text-xs text-gray-500 hover:text-gray-700">Profil</a>
      </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tjedni Plan Prehrane</h1>
            <p className="text-sm text-gray-500 mt-1">Personalizirani plan sa 5 obroka dnevno</p>
            </div>
            <button
            onClick={generateWeeklyPlan}
            disabled={loading}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
            {loading ? "Generiram..." : "Novi plan"}
            </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
            <p className="text-gray-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && !weeklyPlan && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900"></div>
            <p className="mt-3 text-gray-500 text-sm">Generiram tvoj plan prehrane...</p>
          </div>
        )}

        {/* Plan */}
        {weeklyPlan && (
          <>
            {/* Ciljevi */}
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Dnevni ciljevi</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  weeklyPlan.userTargets.goal === 'lose' 
                    ? 'bg-blue-100 text-blue-700' 
                    : weeklyPlan.userTargets.goal === 'gain' 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {weeklyPlan.userTargets.goal === 'lose' ? '🎯 Skidanje kila' : 
                   weeklyPlan.userTargets.goal === 'gain' ? '💪 Dobivanje mišića' : 
                   '⚖️ Održavanje'}
                </span>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold text-gray-900">{weeklyPlan.userTargets.calories}</span> <span className="text-gray-500">kcal</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-0.5">
                      <span className="text-gray-500">Ostvareno: </span>
                      <span className={`font-medium ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 5
                          ? 'text-green-600'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 10
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.calories} kcal
                        ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories > 0 ? '+' : ''}
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{weeklyPlan.userTargets.protein}g</span> <span className="text-gray-500">proteina</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-0.5">
                      <span className="text-gray-500">Ostvareno: </span>
                      <span className={`font-medium ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 5
                          ? 'text-green-600'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 10
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.protein}g
                        ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein > 0 ? '+' : ''}
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{weeklyPlan.userTargets.carbs}g</span> <span className="text-gray-500">UH</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-0.5">
                      <span className="text-gray-500">Ostvareno: </span>
                      <span className={`font-medium ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 5
                          ? 'text-green-600'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 10
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.carbs}g
                        ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs > 0 ? '+' : ''}
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{weeklyPlan.userTargets.fat}g</span> <span className="text-gray-500">masti</span>
                  {(weeklyPlan.days[selectedDay]?.dailyTotals as any)?.deviation && (
                    <div className="text-xs mt-0.5">
                      <span className="text-gray-500">Ostvareno: </span>
                      <span className={`font-medium ${
                        Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 5
                          ? 'text-green-600'
                          : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 10
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {weeklyPlan.days[selectedDay].dailyTotals.fat}g
                        ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat > 0 ? '+' : ''}
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
          </div>
      </div>

            {/* Napomena za cilj */}
            {weeklyPlan.goalNote && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {weeklyPlan.goalNote}
                </div>
              </div>
            )}

            {/* Napomena o odstupanju */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800 whitespace-pre-line leading-relaxed">
                ℹ️ Napomena: Stvarni dnevni unos može odstupati do ±15% od zadanih ciljeva zbog realističnih ograničenja porcija i dostupnih kombinacija namirnica. Generator optimizira plan da bude što bliže ciljevima uz održavanje raznolikosti i realističnih obroka.
        </div>
      </div>

            {/* Dani */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {weeklyPlan.days.map((day, index) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(index)}
                  className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-all ${
                    selectedDay === index
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {day.dayName}
                </button>
              ))}
            </div>

            {/* Odabrani dan */}
            <AnimatePresence mode="wait">
              {weeklyPlan.days[selectedDay] && (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Dan header */}
                  <div className="flex justify-between items-center py-3 mb-4">
            <div>
                      <h2 className="text-lg font-semibold text-gray-900">{weeklyPlan.days[selectedDay].dayName}</h2>
                      <p className="text-xs text-gray-400">{weeklyPlan.days[selectedDay].date}</p>
            </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-gray-900">{weeklyPlan.days[selectedDay].dailyTotals.calories} kcal</p>
                        {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 5
                              ? 'bg-green-100 text-green-700'
                              : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories) <= 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories > 0 ? '+' : ''}
                            {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.calories.toFixed(1)}%
                          </span>
                        )}
            </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">
                          P: {weeklyPlan.days[selectedDay].dailyTotals.protein}g
                          {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation && (
                            <span className={`ml-1 ${
                              Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 5
                                ? 'text-green-600'
                                : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein) <= 10
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein > 0 ? '+' : ''}
                              {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.protein.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                        <span className="text-gray-300">·</span>
                        <p className="text-xs text-gray-400">
                          C: {weeklyPlan.days[selectedDay].dailyTotals.carbs}g
                          {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation && (
                            <span className={`ml-1 ${
                              Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 5
                                ? 'text-green-600'
                                : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs) <= 10
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs > 0 ? '+' : ''}
                              {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.carbs.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                        <span className="text-gray-300">·</span>
                        <p className="text-xs text-gray-400">
                          F: {weeklyPlan.days[selectedDay].dailyTotals.fat}g
                          {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation && (
                            <span className={`ml-1 ${
                              Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 5
                                ? 'text-green-600'
                                : Math.abs((weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat) <= 10
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              ({(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat > 0 ? '+' : ''}
                              {(weeklyPlan.days[selectedDay].dailyTotals as any).deviation.fat.toFixed(1)}%)
                            </span>
                          )}
                        </p>
            </div>
          </div>
      </div>

                  {/* Grid obroka */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MealTile 
                      title="Doručak" 
                      meal={weeklyPlan.days[selectedDay].meals.breakfast}
                      onClick={() => setSelectedMeal({ title: "Doručak", meal: weeklyPlan.days[selectedDay].meals.breakfast })}
                      delay={0}
                    />
                    <MealTile 
                      title="Međuobrok" 
                      meal={weeklyPlan.days[selectedDay].meals.snack1}
                      onClick={() => setSelectedMeal({ title: "Međuobrok 1", meal: weeklyPlan.days[selectedDay].meals.snack1 })}
                      delay={0.03}
                    />
                    <MealTile 
                      title="Ručak" 
                      meal={weeklyPlan.days[selectedDay].meals.lunch}
                      onClick={() => setSelectedMeal({ title: "Ručak", meal: weeklyPlan.days[selectedDay].meals.lunch })}
                      delay={0.06}
                    />
                    <MealTile 
                      title="Međuobrok" 
                      meal={weeklyPlan.days[selectedDay].meals.snack2}
                      onClick={() => setSelectedMeal({ title: "Međuobrok 2", meal: weeklyPlan.days[selectedDay].meals.snack2 })}
                      delay={0.09}
                    />
                    <MealTile 
                      title="Večera" 
                      meal={weeklyPlan.days[selectedDay].meals.dinner}
                      onClick={() => setSelectedMeal({ title: "Večera", meal: weeklyPlan.days[selectedDay].meals.dinner })}
                      delay={0.12}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tjedni prosjek */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Tjedni prosjek</p>
              <div className="flex gap-6 text-sm">
                <div><span className="font-semibold text-gray-900">{weeklyPlan.weeklyTotals.avgCalories}</span> <span className="text-gray-500">kcal</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.weeklyTotals.avgProtein}g</span> <span className="text-gray-500">P</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.weeklyTotals.avgCarbs}g</span> <span className="text-gray-500">C</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.weeklyTotals.avgFat}g</span> <span className="text-gray-500">F</span></div>
          </div>
            </div>
          </>
        )}
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
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
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
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{selectedMeal.title}</p>
                    <h3 className="text-xl font-semibold text-gray-900 mt-1">{selectedMeal.meal.name}</h3>
                  </div>
        <button
                    onClick={() => setSelectedMeal(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
        </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Slika jela */}
                <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden">
                  {selectedMeal.meal.image ? (
                    <img 
                      src={selectedMeal.meal.image} 
                      alt={selectedMeal.meal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
      </div>

      {/* Makroi */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{selectedMeal.meal.totals.calories}</p>
                    <p className="text-xs text-gray-500">kcal</p>
        </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{selectedMeal.meal.totals.protein}g</p>
                    <p className="text-xs text-gray-500">Proteini</p>
        </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{selectedMeal.meal.totals.carbs}g</p>
                    <p className="text-xs text-gray-500">UH</p>
        </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{selectedMeal.meal.totals.fat}g</p>
                    <p className="text-xs text-gray-500">Masti</p>
        </div>
      </div>

                {/* Sastojci */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Sastojci</p>
                  <div className="space-y-2">
                    {selectedMeal.meal.components.map((comp, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-700">{comp.name}</span>
                        <span className="text-gray-900 font-semibold tabular-nums">{formatAmount(comp.name, comp.grams)}</span>
                      </motion.div>
                    ))}
              </div>
            </div>

                {/* Opis jela */}
                {selectedMeal.meal.description && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">O jelu</p>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {selectedMeal.meal.description}
                    </p>
        </div>
      )}

                {/* Priprema */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Priprema</p>
                  <p className="text-gray-600 leading-relaxed text-sm">
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

// Meal Tile - mala kartica za grid
function MealTile({ title, meal, onClick, delay }: { title: string; meal: GeneratedMeal; onClick: () => void; delay: number }) {
  if (!meal || !meal.components || meal.components.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-shadow"
    >
      {/* Slika jela */}
      <div className="w-full h-24 bg-gray-100 rounded-lg mb-3 overflow-hidden">
        {meal.image ? (
          <img 
            src={meal.image} 
            alt={meal.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      
      <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="font-medium text-gray-900 text-sm mt-0.5 line-clamp-2">{meal.name}</p>
      <p className="text-xs text-gray-500 mt-1">{meal.totals.calories} kcal</p>
    </motion.div>
  );
}
