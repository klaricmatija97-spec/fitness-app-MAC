"""
TJEDNI PLAN PREHRANE - PROFESIONALNI GENERATOR (Python)
Koristi postojeće modele, kalkulatore, jela i namirnice.
"""

import json
import math
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass


# ============================================
# TIPOVI I STRUKTURE PODATAKA
# ============================================

@dataclass
class MealComponent:
    """Komponenta obroka (namirnica s gramažom)"""
    food: str
    grams: float
    displayName: str


@dataclass
class Meal:
    """Jelo iz baze"""
    id: str
    name: str
    description: str
    image: Optional[str]
    preparationTip: Optional[str]
    components: List[MealComponent]
    tags: List[str]
    suitableFor: List[str]
    mealType: str  # breakfast, lunch, dinner, snack


@dataclass
class Food:
    """Namirnica iz baze"""
    id: str
    name: str
    nameEn: str
    caloriesPer100g: float
    proteinPer100g: float
    carbsPer100g: float
    fatsPer100g: float
    category: str


@dataclass
class MealTargets:
    """Ciljni makroi za jedan obrok"""
    calories: float
    protein: float
    carbs: float
    fat: float


@dataclass
class UserPreferences:
    """Korisničke preferencije"""
    allergies: List[str] = None
    dislikes: List[str] = None
    preferredIngredients: List[str] = None
    desiredMealsPerDay: int = 5
    goalType: str = "maintain"  # lose, maintain, gain
    
    def __post_init__(self):
        if self.allergies is None:
            self.allergies = []
        if self.dislikes is None:
            self.dislikes = []
        if self.preferredIngredients is None:
            self.preferredIngredients = []


@dataclass
class DailyTargets:
    """Dnevni ciljevi"""
    calories: float
    protein: float
    carbs: float
    fat: float


@dataclass
class GeneratedMeal:
    """Generirani obrok s izračunatim makroima"""
    id: str
    name: str
    description: str
    image: Optional[str]
    preparationTip: Optional[str]
    components: List[Dict[str, Any]]
    totals: Dict[str, float]


@dataclass
class DailyPlan:
    """Dnevni plan prehrane"""
    date: str
    dayName: str
    meals: Dict[str, GeneratedMeal]
    dailyTotals: Dict[str, float]


# ============================================
# UČITAVANJE PODATAKA
# ============================================

def load_foods_database() -> Dict[str, Food]:
    """
    Učitaj bazu namirnica iz TypeScript fajla.
    Ovo je placeholder - u produkciji bi se ovo učitavalo iz baze ili JSON fajla.
    """
    # Ovo će biti zamijenjeno stvarnim učitavanjem iz foods-database.ts
    # Za sada vraćamo prazan dict - treba implementirati parser ili JSON export
    return {}


def load_meal_components() -> Dict[str, List[Dict]]:
    """
    Učitaj jela iz meal_components.json.
    """
    try:
        with open('lib/data/meal_components.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print("⚠️ meal_components.json not found")
        return {}


# ============================================
# RASPODJELA KALORIJA PO OBROCIMA
# ============================================

def get_meal_distribution(num_meals: int, goal_type: str) -> Dict[str, float]:
    """
    Vraća distribuciju kalorija po obrocima (3, 5 ili 6 obroka).
    Distribucija je ista za sve makroe.
    """
    if num_meals == 3:
        return {
            "breakfast": 0.35,
            "lunch": 0.40,
            "dinner": 0.25,
        }
    elif num_meals == 5:
        if goal_type == "lose":
            return {
                "breakfast": 0.30,
                "snack1": 0.10,
                "lunch": 0.30,
                "snack2": 0.10,
                "dinner": 0.20,
            }
        elif goal_type == "gain":
            return {
                "breakfast": 0.25,
                "snack1": 0.12,
                "lunch": 0.35,
                "snack2": 0.12,
                "dinner": 0.16,
            }
        else:  # maintain
            return {
                "breakfast": 0.25,
                "snack1": 0.10,
                "lunch": 0.35,
                "snack2": 0.10,
                "dinner": 0.20,
            }
    else:  # 6 obroka
        if goal_type == "lose":
            return {
                "breakfast": 0.25,
                "snack1": 0.08,
                "lunch": 0.28,
                "snack2": 0.08,
                "snack3": 0.08,
                "dinner": 0.23,
            }
        elif goal_type == "gain":
            return {
                "breakfast": 0.22,
                "snack1": 0.10,
                "lunch": 0.30,
                "snack2": 0.10,
                "snack3": 0.10,
                "dinner": 0.18,
            }
        else:  # maintain
            return {
                "breakfast": 0.22,
                "snack1": 0.08,
                "lunch": 0.30,
                "snack2": 0.08,
                "snack3": 0.10,
                "dinner": 0.22,
            }


def get_meal_targets(
    daily_targets: DailyTargets,
    meal_type: str,
    meal_distribution: Dict[str, float]
) -> MealTargets:
    """
    Vraća target kcal/protein/carbs/fat za jedan obrok na temelju dnevnih ciljeva
    i distribucije po obrocima.
    """
    if meal_type not in meal_distribution:
        raise ValueError(f"Unknown meal type: {meal_type}")
    
    ratio = meal_distribution[meal_type]
    
    return MealTargets(
        calories=daily_targets.calories * ratio,
        protein=daily_targets.protein * ratio,
        carbs=daily_targets.carbs * ratio,
        fat=daily_targets.fat * ratio,
    )


# ============================================
# FILTRIRANJE JELA
# ============================================

def filter_meals(all_meals: List[Meal], user: UserPreferences) -> List[Meal]:
    """
    Filtrira listu svih jela na temelju korisničkih ograničenja.
    
    1. Ukloni sva jela koja sadrže alergen iz user.allergies
    2. Ukloni sva jela koja sadrže namirnicu iz user.dislikes
    3. Zadrži sva ostala jela
    4. Vrati filtriranu listu
    
    Ako nema alergija ili dislikes, preskače filtriranje.
    
    Args:
        all_meals: Lista svih jela
        user: Korisničke preferencije (allergies, dislikes)
    
    Returns:
        Filtrirana lista jela
    """
    # Ako nema filtera, vrati sva jela
    if not user.allergies and not user.dislikes:
        return all_meals
    
    filtered_meals = []
    
    for meal in all_meals:
        # Provjeri alergije
        has_allergen = False
        if user.allergies:
            for component in meal.components:
                food_lower = component.food.lower()
                for allergen in user.allergies:
                    if allergen.lower() in food_lower or food_lower in allergen.lower():
                        has_allergen = True
                        break
                if has_allergen:
                    break
        
        # Provjeri dislikes
        has_disliked = False
        if user.dislikes:
            for component in meal.components:
                food_lower = component.food.lower()
                for dislike in user.dislikes:
                    if dislike.lower() in food_lower or food_lower in dislike.lower():
                        has_disliked = True
                        break
                if has_disliked:
                    break
        
        # Zadrži jelo ako nema alergena i nema disliked namirnica
        if not has_allergen and not has_disliked:
            filtered_meals.append(meal)
    
    return filtered_meals


# ============================================
# IZRAČUNAVANJE MAKROA ZA JELO
# ============================================

def calculate_meal_macros(meal: Meal, foods_db: Dict[str, Food], scale_factor: float = 1.0) -> Dict[str, float]:
    """
    Izračunaj makroe za jelo (kalorije, protein, carbs, fat).
    Koristi foods_db za nutritivne vrijednosti.
    """
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    
    for component in meal.components:
        food_id = component.food
        grams = component.grams * scale_factor
        
        # Pronađi namirnicu u bazi
        if food_id in foods_db:
            food = foods_db[food_id]
            ratio = grams / 100.0
            total_protein += food.proteinPer100g * ratio
            total_carbs += food.carbsPer100g * ratio
            total_fat += food.fatsPer100g * ratio
        else:
            # Default vrijednosti ako namirnica nije pronađena
            print(f"⚠️ Food not found in database: {food_id}")
            total_protein += 5 * (grams / 100.0)
            total_carbs += 15 * (grams / 100.0)
            total_fat += 5 * (grams / 100.0)
    
    # Zaokruži na 1 decimalu
    total_protein = round(total_protein, 1)
    total_carbs = round(total_carbs, 1)
    total_fat = round(total_fat, 1)
    
    # UVIJEK računaj kalorije iz makroa (P×4 + UH×4 + M×9)
    total_calories = round(total_protein * 4 + total_carbs * 4 + total_fat * 9)
    
    return {
        "calories": total_calories,
        "protein": total_protein,
        "carbs": total_carbs,
        "fat": total_fat,
    }


# ============================================
# SCORING FUNKCIJA
# ============================================

def score_meal(
    meal: Meal,
    meal_targets: MealTargets,
    foods_db: Dict[str, Food],
    user: UserPreferences
) -> float:
    """
    Scoring funkcija za jela na temelju kcal, protein, carbs, fat weight.
    Niži score = bolje jelo (bliže targetu).
    
    Formula:
    score = w1 * (kcal_diff / target_kcal)^2 + 
            w2 * (protein_diff / target_protein)^2 + 
            w3 * (carbs_diff / target_carbs)^2 + 
            w4 * (fat_diff / target_fat)^2
    
    gdje su w1, w2, w3, w4 težine (weights).
    """
    # Izračunaj makroe za jelo (bez skaliranja)
    meal_macros = calculate_meal_macros(meal, foods_db, scale_factor=1.0)
    
    # Izračunaj razlike
    kcal_diff = abs(meal_macros["calories"] - meal_targets.calories)
    protein_diff = abs(meal_macros["protein"] - meal_targets.protein)
    carbs_diff = abs(meal_macros["carbs"] - meal_targets.carbs)
    fat_diff = abs(meal_macros["fat"] - meal_targets.fat)
    
    # Normaliziraj razlike (podijeli s targetom da bi bile bez dimenzija)
    kcal_norm = (kcal_diff / meal_targets.calories) ** 2 if meal_targets.calories > 0 else 0
    protein_norm = (protein_diff / meal_targets.protein) ** 2 if meal_targets.protein > 0 else 0
    carbs_norm = (carbs_diff / meal_targets.carbs) ** 2 if meal_targets.carbs > 0 else 0
    fat_norm = (fat_diff / meal_targets.fat) ** 2 if meal_targets.fat > 0 else 0
    
    # Težine (weights) - kalorije su najvažnije, zatim protein
    w1 = 0.4  # kalorije
    w2 = 0.3  # protein
    w3 = 0.2  # carbs
    w4 = 0.1  # fat
    
    # Bonus za preferirane namirnice
    preference_bonus = 0.0
    if user.preferredIngredients:
        for component in meal.components:
            food_lower = component.food.lower()
            for pref in user.preferredIngredients:
                if pref.lower() in food_lower or food_lower in pref.lower():
                    preference_bonus -= 0.05  # Smanji score (bolje)
                    break
    
    score = w1 * kcal_norm + w2 * protein_norm + w3 * carbs_norm + w4 * fat_norm + preference_bonus
    
    return score


def choose_best_meal(
    available_meals: List[Meal],
    meal_targets: MealTargets,
    foods_db: Dict[str, Food],
    user: UserPreferences,
    used_meal_ids: set = None
) -> Optional[Meal]:
    """
    Vraća jelo s najmanjim score iz scoring funkcije.
    Ako je meal_id već korišten, penaliziraj ga.
    """
    if not available_meals:
        return None
    
    if used_meal_ids is None:
        used_meal_ids = set()
    
    best_meal = None
    best_score = float('inf')
    
    for meal in available_meals:
        # Penaliziraj već korištena jela
        penalty = 0.5 if meal.id in used_meal_ids else 0.0
        
        score = score_meal(meal, meal_targets, foods_db, user) + penalty
        
        if score < best_score:
            best_score = score
            best_meal = meal
    
    return best_meal


# ============================================
# GENERIRANJE OBROKA
# ============================================

def generate_meal(
    meal_type: str,
    available_meals: List[Meal],
    meal_targets: MealTargets,
    foods_db: Dict[str, Food],
    user: UserPreferences,
    used_meal_ids: set = None
) -> Optional[GeneratedMeal]:
    """
    Generira jedan obrok koristeći scoring, filtriranje i per-meal targets.
    """
    # Filtriraj jela po tipu obroka
    type_meals = [m for m in available_meals if m.mealType == meal_type]
    
    if not type_meals:
        print(f"⚠️ No meals available for type: {meal_type}")
        return None
    
    # Filtriraj jela (alergije, dislikes)
    filtered_meals = filter_meals(type_meals, user)
    
    if not filtered_meals:
        print(f"⚠️ No meals available after filtering for type: {meal_type}")
        return None
    
    # Odaberi najbolje jelo
    best_meal = choose_best_meal(filtered_meals, meal_targets, foods_db, user, used_meal_ids)
    
    if not best_meal:
        return None
    
    # Skaliraj jelo prema targetu
    meal_macros = calculate_meal_macros(best_meal, foods_db, scale_factor=1.0)
    
    # Izračunaj faktor skaliranja
    if meal_macros["calories"] > 0:
        scale_factor = meal_targets.calories / meal_macros["calories"]
        # Ograniči skaliranje (0.7x - 1.5x za realistične porcije)
        scale_factor = max(0.7, min(1.5, scale_factor))
    else:
        scale_factor = 1.0
    
    # Izračunaj finalne makroe
    final_macros = calculate_meal_macros(best_meal, foods_db, scale_factor=scale_factor)
    
    # Kreiraj komponente s novim gramažama
    scaled_components = []
    for component in best_meal.components:
        scaled_components.append({
            "name": component.displayName,
            "food": component.food,
            "grams": round(component.grams * scale_factor / 5) * 5,  # Zaokruži na 5g
            "calories": 0,  # Bit će izračunato kasnije
            "protein": 0,
            "carbs": 0,
            "fat": 0,
        })
    
    # Izračunaj makroe za svaku komponentu
    for comp in scaled_components:
        food_id = comp["food"]
        grams = comp["grams"]
        if food_id in foods_db:
            food = foods_db[food_id]
            ratio = grams / 100.0
            comp["protein"] = round(food.proteinPer100g * ratio, 1)
            comp["carbs"] = round(food.carbsPer100g * ratio, 1)
            comp["fat"] = round(food.fatsPer100g * ratio, 1)
            comp["calories"] = round(comp["protein"] * 4 + comp["carbs"] * 4 + comp["fat"] * 9)
    
    return GeneratedMeal(
        id=best_meal.id,
        name=best_meal.name,
        description=best_meal.description,
        image=best_meal.image,
        preparationTip=best_meal.preparationTip,
        components=scaled_components,
        totals=final_macros,
    )


# ============================================
# GENERIRANJE DNEVNOG PLANA
# ============================================

def generate_day_plan(
    date: str,
    day_name: str,
    daily_targets: DailyTargets,
    meal_distribution: Dict[str, float],
    available_meals: List[Meal],
    foods_db: Dict[str, Food],
    user: UserPreferences,
    used_meal_ids: set = None
) -> DailyPlan:
    """
    Generira dnevni plan s X obroka i vraća totale.
    """
    if used_meal_ids is None:
        used_meal_ids = set()
    
    meals = {}
    meal_types = list(meal_distribution.keys())
    
    for meal_type in meal_types:
        # Dobij target za ovaj obrok
        meal_targets = get_meal_targets(daily_targets, meal_type, meal_distribution)
        
        # Generiraj obrok
        generated_meal = generate_meal(
            meal_type,
            available_meals,
            meal_targets,
            foods_db,
            user,
            used_meal_ids
        )
        
        if generated_meal:
            meals[meal_type] = generated_meal
            used_meal_ids.add(generated_meal.id)
        else:
            print(f"⚠️ Failed to generate meal for {meal_type}")
    
    # Izračunaj dnevne totale
    daily_totals = {
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
    }
    
    for meal in meals.values():
        daily_totals["calories"] += meal.totals["calories"]
        daily_totals["protein"] += meal.totals["protein"]
        daily_totals["carbs"] += meal.totals["carbs"]
        daily_totals["fat"] += meal.totals["fat"]
    
    # Zaokruži
    daily_totals["calories"] = round(daily_totals["calories"])
    daily_totals["protein"] = round(daily_totals["protein"], 1)
    daily_totals["carbs"] = round(daily_totals["carbs"], 1)
    daily_totals["fat"] = round(daily_totals["fat"], 1)
    
    # LOGGING za debug
    print(f"\n📅 {day_name} ({date}):")
    print(f"   🎯 Target: {daily_targets.calories:.0f} kcal, P: {daily_targets.protein:.1f}g, C: {daily_targets.carbs:.1f}g, F: {daily_targets.fat:.1f}g")
    print(f"   ✅ Actual: {daily_totals['calories']:.0f} kcal, P: {daily_totals['protein']:.1f}g, C: {daily_totals['carbs']:.1f}g, F: {daily_totals['fat']:.1f}g")
    diff_cal = daily_totals["calories"] - daily_targets.calories
    diff_pct = (diff_cal / daily_targets.calories * 100) if daily_targets.calories > 0 else 0
    print(f"   📊 Difference: {diff_cal:+.0f} kcal ({diff_pct:+.1f}%)")
    
    return DailyPlan(
        date=date,
        dayName=day_name,
        meals=meals,
        dailyTotals=daily_totals,
    )


# ============================================
# PRILAGODAVANJE DNEVNOG PLANA
# ============================================

def tweak_day_plan(
    day_plan: DailyPlan,
    daily_targets: DailyTargets,
    foods_db: Dict[str, Food],
    max_iterations: int = 50
) -> DailyPlan:
    """
    Popravlja dnevni plan prema kalorijskom cilju.
    Iterativno skalira obroke dok makroi nisu unutar tolerancije.
    """
    tolerance_cal = 10  # ±10 kcal
    tolerance_macro = 0.01  # ±1%
    
    for iteration in range(max_iterations):
        # Izračunaj trenutne totale
        current_totals = day_plan.dailyTotals
        
        # Provjeri odstupanja
        cal_diff = abs(current_totals["calories"] - daily_targets.calories)
        protein_dev = abs(current_totals["protein"] - daily_targets.protein) / daily_targets.protein if daily_targets.protein > 0 else 0
        carbs_dev = abs(current_totals["carbs"] - daily_targets.carbs) / daily_targets.carbs if daily_targets.carbs > 0 else 0
        fat_dev = abs(current_totals["fat"] - daily_targets.fat) / daily_targets.fat if daily_targets.fat > 0 else 0
        max_macro_dev = max(protein_dev, carbs_dev, fat_dev)
        
        # Provjeri da li je sve unutar tolerancije
        if cal_diff <= tolerance_cal and max_macro_dev <= tolerance_macro:
            if iteration > 0:
                print(f"   ✅ Plan adjusted after {iteration} iterations")
            break
        
        # Izračunaj faktore skaliranja
        cal_factor = daily_targets.calories / current_totals["calories"] if current_totals["calories"] > 0 else 1.0
        protein_factor = daily_targets.protein / current_totals["protein"] if current_totals["protein"] > 0 else 1.0
        carbs_factor = daily_targets.carbs / current_totals["carbs"] if current_totals["carbs"] > 0 else 1.0
        fat_factor = daily_targets.fat / current_totals["fat"] if current_totals["fat"] > 0 else 1.0
        
        # Kombiniraj faktore
        combined_factor = 0.4 * cal_factor + 0.3 * protein_factor + 0.2 * carbs_factor + 0.1 * fat_factor
        
        # Ograniči skaliranje
        combined_factor = max(0.85, min(1.15, combined_factor))
        
        # Skaliraj sve obroke
        for meal_type, meal in day_plan.meals.items():
            # Skaliraj komponente
            for comp in meal.components:
                comp["grams"] = round(comp["grams"] * combined_factor / 5) * 5
                
                # Ponovno izračunaj makroe
                food_id = comp["food"]
                grams = comp["grams"]
                if food_id in foods_db:
                    food = foods_db[food_id]
                    ratio = grams / 100.0
                    comp["protein"] = round(food.proteinPer100g * ratio, 1)
                    comp["carbs"] = round(food.carbsPer100g * ratio, 1)
                    comp["fat"] = round(food.fatsPer100g * ratio, 1)
                    comp["calories"] = round(comp["protein"] * 4 + comp["carbs"] * 4 + comp["fat"] * 9)
            
            # Ponovno izračunaj totale obroka
            meal_totals = {
                "calories": sum(c["calories"] for c in meal.components),
                "protein": sum(c["protein"] for c in meal.components),
                "carbs": sum(c["carbs"] for c in meal.components),
                "fat": sum(c["fat"] for c in meal.components),
            }
            meal.totals = meal_totals
        
        # Ponovno izračunaj dnevne totale
        day_plan.dailyTotals = {
            "calories": round(sum(m.totals["calories"] for m in day_plan.meals.values())),
            "protein": round(sum(m.totals["protein"] for m in day_plan.meals.values()), 1),
            "carbs": round(sum(m.totals["carbs"] for m in day_plan.meals.values()), 1),
            "fat": round(sum(m.totals["fat"] for m in day_plan.meals.values()), 1),
        }
    
    return day_plan


# ============================================
# GENERIRANJE TJEDNOG PLANA
# ============================================

def generate_weekly_plan(
    daily_targets: DailyTargets,
    available_meals: List[Meal],
    foods_db: Dict[str, Food],
    user: UserPreferences,
    week_start_date: str = None
) -> List[DailyPlan]:
    """
    Generira tjedni plan (7 dana) pozivajući generate_day_plan 7 puta.
    """
    from datetime import datetime, timedelta
    
    # Odredi distribuciju obroka
    meal_distribution = get_meal_distribution(user.desiredMealsPerDay, user.goalType)
    
    # Odredi datum početka tjedna
    if week_start_date:
        start_date = datetime.strptime(week_start_date, "%Y-%m-%d")
    else:
        today = datetime.now()
        day_of_week = today.weekday()  # 0 = Monday
        days_to_monday = (7 - day_of_week) % 7
        if days_to_monday == 0:
            days_to_monday = 7
        start_date = today + timedelta(days=days_to_monday)
    
    day_names = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"]
    
    weekly_plan = []
    used_meal_ids = set()
    
    print(f"\n🚀 Generating weekly meal plan...")
    print(f"📋 User: {user.desiredMealsPerDay} meals/day, Goal: {user.goalType}")
    print(f"🎯 Daily targets: {daily_targets.calories:.0f} kcal, P: {daily_targets.protein:.1f}g, C: {daily_targets.carbs:.1f}g, F: {daily_targets.fat:.1f}g")
    
    for i in range(7):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime("%Y-%m-%d")
        day_name = day_names[i]
        
        # Generiraj dnevni plan
        day_plan = generate_day_plan(
            date_str,
            day_name,
            daily_targets,
            meal_distribution,
            available_meals,
            foods_db,
            user,
            used_meal_ids
        )
        
        # Prilagodi plan
        day_plan = tweak_day_plan(day_plan, daily_targets, foods_db)
        
        weekly_plan.append(day_plan)
    
    # Izračunaj tjedne prosjeke
    weekly_totals = {
        "avgCalories": sum(d.dailyTotals["calories"] for d in weekly_plan) / 7,
        "avgProtein": sum(d.dailyTotals["protein"] for d in weekly_plan) / 7,
        "avgCarbs": sum(d.dailyTotals["carbs"] for d in weekly_plan) / 7,
        "avgFat": sum(d.dailyTotals["fat"] for d in weekly_plan) / 7,
    }
    
    print(f"\n✅ Weekly plan generated!")
    print(f"📊 Weekly averages: {weekly_totals['avgCalories']:.0f} kcal, P: {weekly_totals['avgProtein']:.1f}g, C: {weekly_totals['avgCarbs']:.1f}g, F: {weekly_totals['avgFat']:.1f}g")
    
    return weekly_plan

