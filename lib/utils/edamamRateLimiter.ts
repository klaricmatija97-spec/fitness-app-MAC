/**
 * Edamam API Rate Limiter
 * 
 * Kontrolira broj poziva po minuti da ne prekoračiš rate limit (50 poziva/min)
 */

class EdamamRateLimiter {
  private queue: Array<{ fn: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private processing = false;
  private readonly maxRequestsPerMinute = 45; // 45 umjesto 50 za sigurnost (10% buffer)
  private readonly requests: number[] = [];

  /**
   * Izvrši funkciju s rate limiting-om
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Obradi queue s rate limiting-om
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Ukloni stare zahtjeve (stariji od 1 minute)
      const oneMinuteAgo = Date.now() - 60000;
      while (this.requests.length > 0 && this.requests[0] < oneMinuteAgo) {
        this.requests.shift();
      }
      
      // Ako smo na limitu, čekaj
      if (this.requests.length >= this.maxRequestsPerMinute) {
        const oldestRequest = this.requests[0];
        const waitTime = 60000 - (Date.now() - oldestRequest) + 100; // +100ms buffer
        if (waitTime > 0) {
          console.log(`⏳ Rate limit: čekam ${Math.round(waitTime)}ms (${this.requests.length}/${this.maxRequestsPerMinute} poziva/min)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // Izvrši zahtjev
      const request = this.queue.shift();
      if (request) {
        this.requests.push(Date.now());
        try {
          const result = await request.fn();
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    }
    
    this.processing = false;
  }

  /**
   * Provjeri trenutni status rate limitera
   */
  getStatus(): { queueLength: number; requestsInLastMinute: number; maxRequests: number } {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requests.filter(timestamp => timestamp > oneMinuteAgo);
    
    return {
      queueLength: this.queue.length,
      requestsInLastMinute: recentRequests.length,
      maxRequests: this.maxRequestsPerMinute,
    };
  }
}

// Singleton instance
export const edamamRateLimiter = new EdamamRateLimiter();

