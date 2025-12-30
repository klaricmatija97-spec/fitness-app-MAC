/**
 * PRO Training Generator - Index
 * ===============================
 * Glavni export modul za PRO generator treninga
 */

// Tipovi
export type {
  CiljTreninga,
  RazinaKorisnika,
  TipSplita,
  StatusPrograma,
  TipMezociklusa,
  TipProgresije,
  MisicnaGrupa,
  ObrazacPokreta,
  TipOpreme,
  VjezbaLibrary,
  VjezbaProširena,
  GeneratorInput,
  ValidacijaRezultat,
  TreningProgram,
  Mezociklus,
  Tjedan,
  TrenigSesija,
  VjezbaSesije,
  ZagrijavanjeBlok,
  ZavrsniBlok,
  CiljParametri,
  RazinaParametri,
  GeneratorLog,
  DBTrainingPlan,
  DBMezociklus,
  DBTjedan,
  DBSesija,
  DBVjezbaSesije,
} from './types';

// Konstante
export {
  GENERATOR_VERSION,
  CILJ_PARAMETRI,
  RAZINA_PARAMETRI,
  MEV_PO_GRUPI,
  MAV_PO_GRUPI,
  MRV_PO_GRUPI,
  SPLIT_KONFIGURACIJE,
  MISICNA_GRUPA_PRIJEVOD,
  MISICNA_GRUPA_DISPLAY,
  OPREMA_PRIJEVOD,
  OPREMA_DISPLAY,
  ZAGRIJAVANJE_SABLONE,
  MEZOCIKLUS_TIPOVI,
  PROGRESIJA_MODELI,
} from './constants';

// Generator funkcije
export {
  buildProgram,
  buildMesocycles,
  selectExercises,
  validirajInput,
  odaberiOptimalniSplit,
  dohvatiLogove,
  ocistiLogove,
  fillProgramGaps,
  type HybridGeneratorInput,
} from './generator';

// Exercise loader
export {
  ucitajVjezbe,
  dohvatiVjezbuPoId,
  filtrirajVjezbe,
  dohvatiVjezbeZaGrupu,
  pronadiAlternative,
  dohvatiStatistikeVjezbi,
} from './exercise-loader';

// Database funkcije
export {
  spremiProgram,
  dohvatiProgram,
  dohvatiProgrameZaKlijenta,
  azurirajStatusPrograma,
  obrisiProgram,
} from './database';

// Manual Builder funkcije
export {
  kreirajManualniProgram,
  kreirajManualniMezociklus,
  azurirajMezociklus,
  obrisiMezociklus,
  kreirajManualnuSesiju,
  azurirajSesiju,
  obrisiSesiju,
  dodajManualuVjezbu,
  azurirajVjezbu,
  obrisiVjezbu,
  dohvatiUnifiedProgramView,
  type ProgramSource,
  type ManualProgramInput,
  type ManualMezociklusInput,
  type ManualTjedanInput,
  type ManualSesijaInput,
  type ManualVjezbaInput,
  type UnifiedProgramView,
} from './manual-builder';

// Default export - glavna funkcija
export { buildProgram as default } from './generator';

