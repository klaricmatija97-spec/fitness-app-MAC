/**
 * PRAVNI DISCLAIMERI I ODRIČANJA OD ODGOVORNOSTI
 * 
 * Sadrži tekstove o zdravstvenim i podatkovnim disclaimerima.
 */

export const HEALTH_DISCLAIMER = `
Ovaj plan prehrane generira automatizirani algoritam na temelju unesenih podataka.

Namjena aplikacije je isključivo edukativna i informativna.



Ova aplikacija NIJE medicinski uređaj i ne služi za:

- dijagnosticiranje bolesti,

- liječenje,

- praćenje zdravstvenih stanja,

- prevenciju bolesti.



Prije donošenja bilo kakvih odluka u vezi prehrane, mršavljenja ili zdravlja,

preporučujemo konzultaciju s liječnikom ili certificiranim nutricionistom.



Upotrebom aplikacije potvrđujete da ste upoznati s ovim uvjetima.

`;

export const DATA_DISCLAIMER = `
Aplikacija ne prikuplja osjetljive osobne podatke i ne koristi nikakve medicinske podatke.

Svi uneseni podaci koriste se isključivo za generiranje prehrambenog plana

i ne spremaju se trajno bez vaše privole.

`;

/**
 * Vraća sve dostupne disclaimere.
 * 
 * @returns Objekt s health i data disclaimerima
 */
export function getAllDisclaimers() {
  return {
    health: HEALTH_DISCLAIMER,
    data: DATA_DISCLAIMER,
  };
}

