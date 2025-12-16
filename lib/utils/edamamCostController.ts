/**
 * Edamam API Cost Controller
 * 
 * Kontrolira troškove Edamam API poziva da ne prekoračiš limit (npr. 20€/mjesec)
 * 
 * Edamam cijene (Nutrition Analysis API):
 * - Free tier: 10,000 poziva/mjesec
 * - Paid tier: $0.001 per poziv (nakon free tier-a)
 * 
 * Za 20€ = ~20,000 dodatnih poziva (ukupno ~30,000/mjesec)
 */

interface CostTracking {
  totalRequests: number;
  freeRequestsUsed: number;
  paidRequestsUsed: number;
  currentCost: number; // u eurima
  lastResetDate: Date;
}

class EdamamCostController {
  private readonly FREE_TIER_LIMIT = 10000; // 10,000 free poziva/mjesec
  private readonly COST_PER_REQUEST = 0.001; // $0.001 po pozivu (pretvoreno u €)
  private readonly MAX_MONTHLY_COST = 20; // 20€ maksimalno
  private readonly MAX_REQUESTS_PER_MONTH = this.FREE_TIER_LIMIT + (this.MAX_MONTHLY_COST / this.COST_PER_REQUEST);
  
  private tracking: CostTracking = {
    totalRequests: 0,
    freeRequestsUsed: 0,
    paidRequestsUsed: 0,
    currentCost: 0,
    lastResetDate: new Date(),
  };

  constructor() {
    this.loadTracking();
    this.checkMonthlyReset();
  }

  /**
   * Provjeri da li možemo napraviti poziv bez prekoračenja limita
   */
  canMakeRequest(): { allowed: boolean; reason?: string; currentCost: number; remainingRequests: number } {
    this.checkMonthlyReset();

    // Provjeri da li smo prekoračili maksimalni broj poziva
    if (this.tracking.totalRequests >= this.MAX_REQUESTS_PER_MONTH) {
      return {
        allowed: false,
        reason: `Maksimalni broj poziva prekoračen (${this.tracking.totalRequests}/${this.MAX_REQUESTS_PER_MONTH})`,
        currentCost: this.tracking.currentCost,
        remainingRequests: 0,
      };
    }

    // Provjeri da li smo prekoračili maksimalni trošak
    if (this.tracking.currentCost >= this.MAX_MONTHLY_COST) {
      return {
        allowed: false,
        reason: `Maksimalni trošak prekoračen (${this.tracking.currentCost.toFixed(2)}€/${this.MAX_MONTHLY_COST}€)`,
        currentCost: this.tracking.currentCost,
        remainingRequests: Math.max(0, this.MAX_REQUESTS_PER_MONTH - this.tracking.totalRequests),
      };
    }

    const remainingRequests = Math.max(0, this.MAX_REQUESTS_PER_MONTH - this.tracking.totalRequests);
    
    return {
      allowed: true,
      currentCost: this.tracking.currentCost,
      remainingRequests,
    };
  }

  /**
   * Registriraj poziv i ažuriraj troškove
   */
  recordRequest(): void {
    this.checkMonthlyReset();

    this.tracking.totalRequests++;

    // Ako smo prešli free tier, računaj trošak
    if (this.tracking.totalRequests > this.FREE_TIER_LIMIT) {
      this.tracking.paidRequestsUsed++;
      this.tracking.currentCost += this.COST_PER_REQUEST;
    } else {
      this.tracking.freeRequestsUsed++;
    }

    this.saveTracking();
  }

  /**
   * Provjeri da li treba resetirati mjesečne podatke
   */
  private checkMonthlyReset(): void {
    const now = new Date();
    const lastReset = new Date(this.tracking.lastResetDate);
    
    // Resetiraj ako je prošao mjesec
    if (
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()
    ) {
      console.log(`🔄 Resetiranje mjesečnih Edamam troškova (stari: ${this.tracking.totalRequests} poziva, ${this.tracking.currentCost.toFixed(2)}€)`);
      
      this.tracking = {
        totalRequests: 0,
        freeRequestsUsed: 0,
        paidRequestsUsed: 0,
        currentCost: 0,
        lastResetDate: now,
      };
      
      this.saveTracking();
    }
  }

  /**
   * Učitaj tracking podatke iz localStorage (ili file-a u production)
   */
  private loadTracking(): void {
    try {
      if (typeof window !== 'undefined') {
        // Browser - koristi localStorage
        const stored = localStorage.getItem('edamam_cost_tracking');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.tracking = {
            ...parsed,
            lastResetDate: new Date(parsed.lastResetDate),
          };
        }
      } else {
        // Server-side - koristi file sistem ili bazu
        // Za sada koristimo samo memory (resetira se pri restartu)
        // U production, koristi Supabase ili file sistem
      }
    } catch (error) {
      console.warn('⚠️ Greška pri učitavanju Edamam cost tracking:', error);
    }
  }

  /**
   * Spremi tracking podatke
   */
  private saveTracking(): void {
    try {
      if (typeof window !== 'undefined') {
        // Browser - koristi localStorage
        localStorage.setItem('edamam_cost_tracking', JSON.stringify(this.tracking));
      } else {
        // Server-side - u production, spremi u Supabase ili file sistem
        // Za sada samo logiraj
        console.log(`📊 Edamam troškovi: ${this.tracking.totalRequests} poziva, ${this.tracking.currentCost.toFixed(2)}€`);
      }
    } catch (error) {
      console.warn('⚠️ Greška pri spremanju Edamam cost tracking:', error);
    }
  }

  /**
   * Dohvati trenutni status
   */
  getStatus(): {
    totalRequests: number;
    freeRequestsUsed: number;
    paidRequestsUsed: number;
    currentCost: number;
    maxMonthlyCost: number;
    remainingRequests: number;
    remainingCost: number;
  } {
    this.checkMonthlyReset();
    
    return {
      totalRequests: this.tracking.totalRequests,
      freeRequestsUsed: this.tracking.freeRequestsUsed,
      paidRequestsUsed: this.tracking.paidRequestsUsed,
      currentCost: this.tracking.currentCost,
      maxMonthlyCost: this.MAX_MONTHLY_COST,
      remainingRequests: Math.max(0, this.MAX_REQUESTS_PER_MONTH - this.tracking.totalRequests),
      remainingCost: Math.max(0, this.MAX_MONTHLY_COST - this.tracking.currentCost),
    };
  }

  /**
   * Ručno resetiraj tracking (za testiranje)
   */
  reset(): void {
    this.tracking = {
      totalRequests: 0,
      freeRequestsUsed: 0,
      paidRequestsUsed: 0,
      currentCost: 0,
      lastResetDate: new Date(),
    };
    this.saveTracking();
  }
}

// Singleton instance
export const edamamCostController = new EdamamCostController();

