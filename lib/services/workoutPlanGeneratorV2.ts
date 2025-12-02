/**
 * Workout Plan Generator V2
 * 
 * Generira personalizirani tjedni plan treninga na temelju:
 * - Podataka iz upitnika (slajdova)
 * - Spola, dobi, težine, visine
 * - Razine iskustva
 * - Ciljeva treninga
 * - Dostupnog vremena i frekvencije
 * - Preferencija za cardio i pliometriju
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export type Gender = "muško" | "žensko";
export type Level = "početnik" | "srednji" | "napredni";
export type Goal = 
  | "povećati mišićnu masu"
  | "gubiti masnoću"
  | "povećati izdržljivost"
  | "povećati snagu"
  | "povećati brzinu";

export type CardioType = "trčanje" | "hodanje" | null;
export type SessionDuration = 30 | 45 | 60 | 75 | 90;

// Muški programi
export type MaleProgram = "PPL" | "FULL_BODY_AB";
// Ženski programi
export type FemaleProgram = "GLUTE_LEGS" | "UPPER_LOWER";

export interface UserInputs {
  gender: Gender;
  age: number;
  height: number; // cm
  weight: number; // kg
  level: Level;
  primaryGoal: Goal;
  secondaryGoals?: Goal[];
  trainingDaysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionDuration: SessionDuration;
  selectedProgram: MaleProgram | FemaleProgram;
  wantsCardio: boolean;
  cardioType?: CardioType;
  wantsPlyometrics: boolean;
}

export interface ExerciseParams {
  name: string;
  nameHr: string;
  sets: number;
  reps: string; // "8-12" ili "10"
  restSeconds: number;
  rpe: number;
  loadPercent?: string; // "55-70% 1RM"
  notes?: string;
  equipment?: string;
  description?: string;
  musclesWorked?: string;
  tips?: string[];
  commonMistakes?: string[];
}

export interface CardioSession {
  type: "trčanje" | "hodanje";
  duration: number; // minutes
  protocol: string;
  intensity: string;
  notes?: string;
}

export interface PlyometricsSession {
  exercises: {
    name: string;
    nameHr: string;
    sets: number;
    reps: string;
    rest: number;
    notes?: string;
  }[];
  totalDuration: number; // minutes
}

export interface WorkoutDay {
  dayIndex: number;
  dayName: string; // "Ponedjeljak", "Utorak"...
  type: "strength" | "cardio" | "plyometrics" | "rest" | "strength+cardio" | "strength+plyometrics";
  splitName?: string; // "Push", "Pull", "Legs", "Upper", "Lower", "Glute dominant"...
  exercises?: ExerciseParams[];
  cardio?: CardioSession;
  plyometrics?: PlyometricsSession;
  estimatedDuration: number; // minutes
}

export interface WorkoutPlan {
  userId?: string;
  createdAt: string;
  userProfile: {
    gender: Gender;
    age: number;
    weight: number;
    height: number;
    level: Level;
    primaryGoal: Goal;
  };
  programType: string;
  daysPerWeek: number;
  sessionDuration: number;
  days: WorkoutDay[];
  weeklyVolume: {
    strengthDays: number;
    cardioDays: number;
    plyometricsDays: number;
    totalMinutes: number;
  };
  recommendations: string[];
}

// ============================================
// EXERCISE DESCRIPTIONS DATABASE
// ============================================

const EXERCISE_DESCRIPTIONS: Record<string, {
  description: string;
  musclesWorked: string;
  tips: string[];
  commonMistakes: string[];
  videoUrl?: string;
}> = {
  // === PRSA (CHEST) ===
  "Bench press": {
    description: "Lezi na ravnu klupu, stopala na podu. Uhvati šipku širinom ramena ili malo šire. Spusti šipku kontrolirano do sredine prsa, zatim potisni natrag do pune ekstenzije ruku.",
    musclesWorked: "Velika prsna mišića (pectoralis major), prednji deltoid, triceps",
    tips: [
      "Drži lopatice stisnute i povučene prema dolje",
      "Laktovi pod kutom 45-75° od tijela",
      "Šipka ide do sredine prsa, ne do vrata"
    ],
    commonMistakes: [
      "Podizanje stražnjice s klupe",
      "Odbijanje šipke od prsa",
      "Preširoki ili preuski hvat"
    ]
  },
  "Incline dumbbell press": {
    description: "Klupu postavi na nagib 30-45°. Bučice drži iznad ramena, dlanovi okrenuti naprijed. Spusti bučice do razine prsa, zatim potisni gore dok se ruke gotovo ne ispruže.",
    musclesWorked: "Gornji dio prsnog mišića, prednji deltoid, triceps",
    tips: [
      "Nagib klupe 30-45° je optimalan",
      "Bučice spuštaj kontrolirano, ne bacaj",
      "U gornjem položaju bučice ne spajaj - drži ih iznad ramena"
    ],
    commonMistakes: [
      "Prevelik nagib klupe (>45°) prenosi rad na ramena",
      "Prebrzo spuštanje bučica",
      "Spajanje bučica na vrhu (gubi se napetost)"
    ]
  },
  "Cable chest fly": {
    description: "Stani između dva kabela postavljenih u visini ramena. Uhvati ručke, napravi korak naprijed i blago savij laktove. Spoji ruke ispred prsa u luku, zatim kontrolirano vrati.",
    musclesWorked: "Prsni mišići (fokus na rastezanje i kontrakciju)",
    tips: [
      "Drži laktove blago savijene cijelo vrijeme",
      "Fokusiraj se na stiskanje prsa u krajnjem položaju",
      "Kontroliraj povratak - to je jednako važno kao i kontrakcija"
    ],
    commonMistakes: [
      "Previše savijanje lakta (pretvara se u potisak)",
      "Korištenje prevelikog opterećenja",
      "Ljuljanje tijelom za momentum"
    ]
  },

  // === RAMENA (SHOULDERS) ===
  "Overhead shoulder press": {
    description: "Stani ili sjedi s šipkom u visini ramena, hvat malo širi od ramena. Potisni šipku ravno iznad glave dok se ruke ne ispruže, zatim kontrolirano spusti.",
    musclesWorked: "Deltoidni mišići (sva tri snopa), triceps, gornji trapezius",
    tips: [
      "Drži core čvrsto angažiran",
      "Glavu blago povuci natrag dok šipka prolazi",
      "Šipka ide ravno gore, ne naprijed"
    ],
    commonMistakes: [
      "Preveliko zabacivanje leđa",
      "Potiskivanje šipke ispred umjesto iznad glave",
      "Nedovoljna aktivacija corea"
    ]
  },
  "Shoulder press": {
    description: "Sjedi na klupi s naslonom ili stani. Bučice drži u visini ramena, dlanovi naprijed. Potisni bučice iznad glave, zatim kontrolirano spusti do početne pozicije.",
    musclesWorked: "Deltoidni mišići, triceps",
    tips: [
      "Drži leđa ravno uz naslon",
      "Ne zaključavaj laktove potpuno na vrhu",
      "Bučice spuštaj do razine ušiju"
    ],
    commonMistakes: [
      "Korištenje momenta iz nogu",
      "Spuštanje bučica prenisko",
      "Naginjanje trupa unatrag"
    ]
  },
  "Lateral raises": {
    description: "Stani uspravno s bučicama uz tijelo. Podigni ruke u stranu do razine ramena, laktovi blago savijeni. Kontrolirano spusti.",
    musclesWorked: "Lateralni (srednji) deltoid",
    tips: [
      "Vodi pokret laktovima, ne šakama",
      "Zaustavi se u ravnini ramena - ne idi više",
      "Mali prsti blago uzdignuti (kao da izlijevaš vodu iz čaše)"
    ],
    commonMistakes: [
      "Korištenje preteške težine",
      "Zamahivanje tijelom",
      "Podizanje ramena prema ušima"
    ]
  },
  "Face pull": {
    description: "Kabel postavi u visini lica. Uhvati uže hvat, povuci prema licu razdvajajući krajeve užeta. Laktovi idu visoko i široko. Zadrži sekundu, kontrolirano vrati.",
    musclesWorked: "Stražnji deltoid, srednji trapezius, romboidni mišići, rotator cuff",
    tips: [
      "Laktovi uvijek viši od šaka",
      "Povuci do razine lica ili malo iza",
      "Stisni lopatice na kraju pokreta"
    ],
    commonMistakes: [
      "Laktovi prenisko (postaje row)",
      "Korištenje prevelikog opterećenja",
      "Nedostatak pauze u kontrahiranom položaju"
    ]
  },

  // === LEĐA (BACK) ===
  "Lat pulldown": {
    description: "Sjedi na lat spravu, koljena pod jastučićima. Uhvati šipku široko, povuci prema gornjem dijelu prsa spuštajući lopatice dolje i natrag. Kontrolirano vrati.",
    musclesWorked: "Latissimus dorsi, biceps, stražnji deltoid, romboidni mišići",
    tips: [
      "Prsa izbaci prema naprijed",
      "Povlači laktove dolje i natrag, ne samo dolje",
      "Nemoj se previše naginjati unatrag"
    ],
    commonMistakes: [
      "Preagresivno naginjanje trupa unatrag",
      "Povlačenje samo rukama bez aktivacije leđa",
      "Nepotpun opseg pokreta"
    ]
  },
  "Seated cable row": {
    description: "Sjedi na spravu, stopala na platformi, koljena blago savijena. Povuci ručku prema donjem dijelu prsa/trbuhu stiskajući lopatice. Kontrolirano vrati istežući leđa.",
    musclesWorked: "Latissimus dorsi, romboidni mišići, trapezius, biceps",
    tips: [
      "Drži prsa ispod cijelo vrijeme",
      "Stisni lopatice na sekundu u krajnjem položaju",
      "Ne ljuljaj se trupom"
    ],
    commonMistakes: [
      "Pretjerano ljuljanje trupom",
      "Zaokruživanje leđa pri povratku",
      "Podizanje ramena"
    ]
  },
  "T-bar row": {
    description: "Stani iznad T-bar šipke, koljena savijena, trup nagnut naprijed 45°. Povuci šipku prema prsima/trbuhu stiskajući lopatice. Kontrolirano spusti.",
    musclesWorked: "Latissimus dorsi, romboidni mišići, trapezius, erector spinae, biceps",
    tips: [
      "Drži leđa ravna tijekom cijelog pokreta",
      "Povlači laktovima, ne rukama",
      "Koljenima ostani u blagom fleksiji"
    ],
    commonMistakes: [
      "Zaokruživanje leđa",
      "Korištenje momenta (ljuljanja)",
      "Prenisko spuštanje trupom između ponavljanja"
    ]
  },

  // === NOGE (LEGS) ===
  "Back squat": {
    description: "Šipku postavi na gornji dio trapezijusa. Stopala u širini ramena ili malo šire, prsti blago van. Spusti se savijanjem koljena i kukova dok bedra ne budu paralelna s podom ili niže. Potisni se natrag gore.",
    musclesWorked: "Kvadriceps, gluteus, hamstringsi, erector spinae, core",
    tips: [
      "Koljena prate smjer prstiju",
      "Drži prsa ispod i pogled naprijed",
      "Težina na cijelom stopalu, ne samo na prstima"
    ],
    commonMistakes: [
      "Koljena upadaju prema unutra",
      "Pete se podižu s poda",
      "Zaokruživanje donjeg dijela leđa (butt wink)"
    ]
  },
  "Leg press": {
    description: "Sjedi na nožnu prešu, stopala na platformi u širini ramena. Otpusti sigurnosne poluge i kontrolirano spusti platformu savijanjem koljena do 90°. Potisni platformu natrag ne zaključavajući koljena potpuno.",
    musclesWorked: "Kvadriceps, gluteus, hamstringsi",
    tips: [
      "Donji dio leđa uvijek pritisnut uz naslon",
      "Ne zaključavaj koljena na vrhu",
      "Različite pozicije stopala ciljaju različite mišiće"
    ],
    commonMistakes: [
      "Podizanje stražnjice s naslona",
      "Potpuno zaključavanje koljena",
      "Prespuštanje - donji dio leđa se podiže"
    ]
  },
  "Romanian deadlift": {
    description: "Stani sa šipkom u rukama, stopala u širini kukova. Gurajući kukove natrag i držeći leđa ravna, spusti šipku niz noge dok ne osjetiš istezanje hamstringsa. Aktiviraj gluteuse i hamstringse da se vratiš u početni položaj.",
    musclesWorked: "Hamstringsi, gluteus, erector spinae",
    tips: [
      "Šipka klizi niz noge - drži je blizu tijela",
      "Koljena minimalno savijena (nisu zaključana)",
      "Pokreće se iz kukova, ne iz leđa"
    ],
    commonMistakes: [
      "Zaokruživanje leđa",
      "Predaleko šipka od tijela",
      "Previše savijanje koljena (postaje čučanj)"
    ]
  },
  "Leg extension": {
    description: "Sjedi na spravu, stopala iza jastučića, koljena u ravnini s osi rotacije sprave. Ispruži noge kontrakcijom kvadricepsa, zadrži sekundu, kontrolirano spusti.",
    musclesWorked: "Kvadriceps (sva 4 glave)",
    tips: [
      "Kontroliraj cijeli opseg pokreta",
      "Stisni kvadriceps na vrhu",
      "Ne koristi momentum"
    ],
    commonMistakes: [
      "Prebrzo spuštanje težine",
      "Podizanje kukova sa sjedala",
      "Korištenje prevelikog opterećenja"
    ]
  },
  "Leg curl": {
    description: "Lezi ili sjedi na spravu (ovisno o tipu), jastučić iznad peta. Savij koljena povlačeći pete prema stražnjici. Zadrži sekundu, kontrolirano vrati.",
    musclesWorked: "Hamstringsi, gastrocnemius",
    tips: [
      "Kukovi ostaju na jastuku (ležeći varijanta)",
      "Potpuno savij koljena za maksimalnu kontrakciju",
      "Kontrolirano kroz cijeli opseg"
    ],
    commonMistakes: [
      "Podizanje kukova",
      "Nepotpun opseg pokreta",
      "Prebrzi pokreti"
    ]
  },
  "Hip thrust": {
    description: "Nasloni gornji dio leđa na klupu, šipku postavi preko kukova (koristi jastučić). Stopala na podu, koljena savijena 90°. Podigni kukove stiskajući gluteuse dok tijelo ne bude ravno od ramena do koljena. Kontrolirano spusti.",
    musclesWorked: "Gluteus maximus, hamstringsi",
    tips: [
      "Brada prema prsima - ne zabacuj glavu",
      "Stisni gluteuse maksimalno na vrhu",
      "Koljena gurni blago van tijekom pokreta"
    ],
    commonMistakes: [
      "Hiperekstenzija leđa na vrhu",
      "Preuski ili preširoki stav stopala",
      "Aktivacija leđa umjesto gluteusa"
    ]
  },
  "Bulgarian split squat": {
    description: "Stražnju nogu postavi na klupu iza sebe, prednja noga ispred. Spusti se savijanjem prednjeg koljena dok stražnje koljeno gotovo ne dodirne pod. Potisni se natrag gore kroz prednju petu.",
    musclesWorked: "Kvadriceps, gluteus, hamstringsi (unilateralno)",
    tips: [
      "Trup uspravno ili blago nagnut naprijed",
      "Prednje koljeno ne prelazi prste previše",
      "Težina na cijelom stopalu prednje noge"
    ],
    commonMistakes: [
      "Preblizu ili predaleko od klupe",
      "Nestabilnost - počni bez težine",
      "Naginjanje trupa previše naprijed"
    ]
  },
  "Goblet squat": {
    description: "Drži bučicu ili kettlebell ispred prsa, laktovi prema dolje. Stopala u širini ramena ili šire. Spusti se u čučanj držeći prsa ispod, vrati se u početni položaj.",
    musclesWorked: "Kvadriceps, gluteus, core",
    tips: [
      "Laktovi idu između koljena u donjem položaju",
      "Drži trup uspravno",
      "Odlična vježba za učenje pravilnog čučnja"
    ],
    commonMistakes: [
      "Naginjanje naprijed",
      "Koljena upadaju unutra",
      "Nedovoljna dubina"
    ]
  },
  "Calf raises": {
    description: "Stani na rub stepenice ili platforme, pete u zraku. Podigni se na prste maksimalno kontrakcijom listova. Kontrolirano spusti pete ispod razine platforme za puno istezanje.",
    musclesWorked: "Gastrocnemius, soleus",
    tips: [
      "Potpun opseg pokreta - gore do kraja, dolje do kraja",
      "Pauziraj sekundu na vrhu",
      "Ravnomjerno opterećenje na sva tri prsta"
    ],
    commonMistakes: [
      "Nepotpun opseg pokreta",
      "Prebrzi pokreti bez kontrole",
      "Savijanje koljena"
    ]
  },
  "Step-ups": {
    description: "Stani ispred klupe ili kutije. Stavi jednu nogu na klupu i potisni se gore koristeći tu nogu. Kontrolirano se spusti istom nogom. Napravi sve ponavljanja jednom nogom, zatim promijeni.",
    musclesWorked: "Kvadriceps, gluteus, hamstringsi (unilateralno)",
    tips: [
      "Potiskuj se kroz petu gornje noge",
      "Ne odguruj se donjom nogom",
      "Visina kutije - koljeno pod 90° kada je noga gore"
    ],
    commonMistakes: [
      "Odgurivanje s donje noge",
      "Preniska ili previsoka kutija",
      "Naginjanje trupa naprijed"
    ]
  },

  // === RUKE (ARMS) ===
  "Triceps pushdown": {
    description: "Stani ispred kabela s užetom ili ravnom šipkom. Laktove drži uz tijelo, podlaktice ispruži potiskujući šipku/uže prema dolje. Zadrži sekundu, kontrolirano vrati.",
    musclesWorked: "Triceps (sve tri glave)",
    tips: [
      "Laktovi miruju uz tijelo cijelo vrijeme",
      "Potpuno ispruži ruke na dnu",
      "S užetom - razdvoji krajeve na dnu za bolju kontrakciju"
    ],
    commonMistakes: [
      "Pomicanje laktova naprijed-nazad",
      "Naginjanje trupa naprijed",
      "Nepotpuna ekstenzija"
    ]
  },
  "Triceps rope pushdown": {
    description: "Koristi uže na kabelu. Laktove drži fiksno uz tijelo. Potisni uže prema dolje razdvajajući krajeve na dnu za maksimalnu kontrakciju. Kontrolirano vrati.",
    musclesWorked: "Triceps (sve tri glave, naglasak na lateralnu)",
    tips: [
      "Razdvoji krajeve užeta na dnu pokreta",
      "Laktovi uz tijelo - ne smiju se micati",
      "Stisni triceps na sekundu u krajnjem položaju"
    ],
    commonMistakes: [
      "Laktovi se pomiču",
      "Ne razdvaja se uže na dnu",
      "Korištenje trupa za pomoć"
    ]
  },
  "Barbell curls": {
    description: "Stani uspravno, šipku drži podlaktičnim hvatom u širini ramena. Savij laktove podižući šipku prema ramenima. Kontrolirano spusti ne ljuljajući se.",
    musclesWorked: "Biceps brachii, brachialis",
    tips: [
      "Laktovi miruju uz tijelo",
      "Ne ljuljaj se tijelom",
      "Potpuna kontrakcija gore, potpuno istezanje dolje"
    ],
    commonMistakes: [
      "Korištenje momenta (ljuljanje)",
      "Pomicanje laktova naprijed",
      "Nepotpun opseg pokreta"
    ]
  },
  "Biceps curls": {
    description: "Stani ili sjedi s bučicama u rukama, dlanovi naprijed. Savij laktove podižući bučice prema ramenima. Kontrolirano spusti.",
    musclesWorked: "Biceps brachii, brachialis",
    tips: [
      "Supiniraj (rotiraj) dlan tijekom podizanja za bolju kontrakciju",
      "Laktovi miruju",
      "Alternativno ili simultano - oboje djeluje"
    ],
    commonMistakes: [
      "Ljuljanje trupom",
      "Prebrzо spuštanje",
      "Pomicanje laktova naprijed"
    ]
  },
  "Dumbbell curls": {
    description: "Stani ili sjedi s bučicama u rukama. Dlanovi mogu biti okrenuti naprijed cijelo vrijeme ili se rotirati tijekom pokreta. Savij laktove do kraja, kontrolirano spusti.",
    musclesWorked: "Biceps brachii, brachialis, brachioradialis",
    tips: [
      "Kontroliraj težinu - ne bacaj je",
      "Zadrži napetost i u donjem položaju",
      "Različite varijante ciljaju različite dijelove bicepsa"
    ],
    commonMistakes: [
      "Korištenje preteške težine",
      "Ljuljanje tijelom",
      "Nedovoljna kontrola"
    ]
  },
  "Hammer curls": {
    description: "Stani s bučicama uz tijelo, dlanovi okrenuti jedan prema drugom (neutralni hvat). Savij laktove podižući bučice, drži neutralni položaj dlanova. Kontrolirano spusti.",
    musclesWorked: "Brachialis, brachioradialis, biceps",
    tips: [
      "Dlanovi ostaju okrenuti jedan prema drugom cijelo vrijeme",
      "Laktovi fiksno uz tijelo",
      "Odlična vježba za debljinu ruke"
    ],
    commonMistakes: [
      "Rotiranje dlanova",
      "Pomicanje laktova",
      "Pretjerano ljuljanje"
    ]
  },

  // === CORE ===
  "Plank": {
    description: "Zauzmi položaj za sklekove, ali se osloni na podlaktice. Tijelo ravno od glave do peta - kao daska. Drži položaj ne dopuštajući kukovima da padnu ili se dignu.",
    musclesWorked: "Rectus abdominis, transverzus abdominis, kosi trbušni, erector spinae",
    tips: [
      "Aktiviraj gluteuse za stabilnost",
      "Ne drži dah - diši normalno",
      "Pogled prema podu, vrat u neutralnom položaju"
    ],
    commonMistakes: [
      "Kukovi previsoko ili prenisko",
      "Držanje daha",
      "Glava spuštena ili podignuta"
    ]
  },
  "Side plank": {
    description: "Lezi na bok, osloni se na podlakticu. Podigni kukove da tijelo bude ravno. Drži položaj, zatim promijeni stranu.",
    musclesWorked: "Kosi trbušni mišići, quadratus lumborum",
    tips: [
      "Kukovi u ravnini s ramenima i stopalima",
      "Gornja ruka na kuku ili ispružena gore",
      "Počni s kraćim držanjem, povećavaj postupno"
    ],
    commonMistakes: [
      "Kukovi padaju prema dolje",
      "Rotacija trupa naprijed ili nazad",
      "Držanje daha"
    ]
  },
  "Hanging leg raises": {
    description: "Visi na šipki, ruke ispružene. Podigni noge (ravne ili savijene) do horizontale ili više. Kontrolirano spusti.",
    musclesWorked: "Donji trbušni mišići, hip fleksori",
    tips: [
      "Počni sa savijenim koljenima, napreduj do ravnih nogu",
      "Kontroliraj ljuljanje",
      "Za napredne - podizanje iznad horizontale"
    ],
    commonMistakes: [
      "Pretjerano ljuljanje",
      "Korištenje momenta",
      "Nedovoljan opseg pokreta"
    ]
  },
  "Cable crunch": {
    description: "Klekni ispred kabela, uže drži iza glave. Savij trup prema dolje kontrakcijom trbušnih mišića. Kontrolirano vrati u početni položaj.",
    musclesWorked: "Rectus abdominis",
    tips: [
      "Pokreće se samo trup - kukovi miruju",
      "Zaokruži leđa, dovedi rebra prema kukovima",
      "Zadrži kontrakciju sekundu"
    ],
    commonMistakes: [
      "Povlačenje rukama umjesto trupom",
      "Pomicanje kukova",
      "Prebrzi pokreti"
    ]
  },

  // === GLUTEUS SPECIFIČNE ===
  "Cable glute kickbacks": {
    description: "Pričvrsti manžetu na gležanj, stani nasuprot kabela. Povuci nogu natrag držeći koljeno blago savijeno. Stisni gluteus na vrhu, kontrolirano vrati.",
    musclesWorked: "Gluteus maximus",
    tips: [
      "Drži core angažiran za stabilnost",
      "Ne zabacuj leđa - pokret ide iz kuka",
      "Fokusiraj se na stiskanje gluteusa"
    ],
    commonMistakes: [
      "Zabacivanje leđa",
      "Prebrzi pokreti",
      "Rotacija kukova"
    ]
  },
  "Hip abductions": {
    description: "Na spravi: sjedi s nogama unutar jastučića, gurni koljena prema van. Alternativno na kabelu: stani bočno, povuci nogu u stranu. Kontrolirano vrati.",
    musclesWorked: "Gluteus medius, gluteus minimus",
    tips: [
      "Kontroliraj pokret u oba smjera",
      "Drži trup miran",
      "Na spravi - ne koristi momentum"
    ],
    commonMistakes: [
      "Prebrzo puštanje natrag",
      "Naginjanje trupa",
      "Korištenje prevelikog opterećenja"
    ]
  },
  "Reverse lunges": {
    description: "Stani uspravno. Napravi korak nazad jednom nogom i spusti se dok stražnje koljeno gotovo ne dodirne pod. Potisni se natrag u početni položaj kroz prednju petu.",
    musclesWorked: "Kvadriceps, gluteus, hamstringsi",
    tips: [
      "Trup uspravno cijelo vrijeme",
      "Prednje koljeno iznad gležnja",
      "Potisak kroz petu prednje noge"
    ],
    commonMistakes: [
      "Naginjanje naprijed",
      "Prekratak ili predug korak",
      "Nestabilnost - koristi potporu za početak"
    ]
  },
  "Leg press (wide stance)": {
    description: "Kao obična nožna preša, ali stopala visoko i široko na platformi. Prsti blago van. Ova pozicija više aktivira gluteuse i hamstringse.",
    musclesWorked: "Gluteus, hamstringsi, aduktori, kvadriceps",
    tips: [
      "Stopala visoko na platformi",
      "Širi stav od ramena",
      "Prsti upereni blago van"
    ],
    commonMistakes: [
      "Podizanje stražnjice s naslona",
      "Preuski stav",
      "Stopala prenisko"
    ]
  }
};

// ============================================
// EXERCISE DATABASES
// ============================================

// MUŠKI PROGRAM 1: PPL (Push/Pull/Legs)
const MALE_PPL = {
  push: [
    { name: "Bench press", nameHr: "Potisak s klupe", equipment: "barbell", isPrimary: true },
    { name: "Incline dumbbell press", nameHr: "Kosi potisak s bučicama", equipment: "dumbbells", isPrimary: true },
    { name: "Overhead shoulder press", nameHr: "Vojnički potisak", equipment: "barbell/dumbbells", isPrimary: true },
    { name: "Lateral raises", nameHr: "Lateralna odručenja", equipment: "dumbbells", isPrimary: false },
    { name: "Cable chest fly", nameHr: "Kabelska križa za prsa", equipment: "cable", isPrimary: false },
    { name: "Triceps pushdown", nameHr: "Triceps potisak na kabelu", equipment: "cable", isPrimary: false },
  ],
  pull: [
    { name: "Lat pulldown", nameHr: "Povlačenje na lat spravi", equipment: "cable", isPrimary: true },
    { name: "Seated cable row", nameHr: "Veslanje na kabelu sjedeći", equipment: "cable", isPrimary: true },
    { name: "T-bar row", nameHr: "T-bar veslanje", equipment: "barbell", isPrimary: true },
    { name: "Face pull", nameHr: "Face pull", equipment: "cable", isPrimary: false },
    { name: "Barbell curls", nameHr: "Pregib s šipkom za biceps", equipment: "barbell", isPrimary: false },
    { name: "Hammer curls", nameHr: "Hammer pregib za biceps", equipment: "dumbbells", isPrimary: false },
  ],
  legs: [
    { name: "Back squat", nameHr: "Stražnji čučanj", equipment: "barbell", isPrimary: true },
    { name: "Leg press", nameHr: "Nožna preša", equipment: "machine", isPrimary: true },
    { name: "Romanian deadlift", nameHr: "Rumunjsko mrtvo dizanje", equipment: "barbell", isPrimary: true },
    { name: "Leg extension", nameHr: "Ekstenzija nogu", equipment: "machine", isPrimary: false },
    { name: "Leg curl", nameHr: "Pregib nogu", equipment: "machine", isPrimary: false },
    { name: "Hip thrust", nameHr: "Hip thrust", equipment: "barbell", isPrimary: false },
    { name: "Hanging leg raises", nameHr: "Podizanje nogu u visu", equipment: "bodyweight", isPrimary: false },
  ],
};

// MUŠKI PROGRAM 2: Full Body A/B
const MALE_FULL_BODY = {
  dayA: [
    { name: "Back squat", nameHr: "Stražnji čučanj", equipment: "barbell", isPrimary: true },
    { name: "Bench press", nameHr: "Potisak s klupe", equipment: "barbell", isPrimary: true },
    { name: "Seated cable row", nameHr: "Veslanje na kabelu sjedeći", equipment: "cable", isPrimary: true },
    { name: "Lateral raises", nameHr: "Lateralna odručenja", equipment: "dumbbells", isPrimary: false },
    { name: "Biceps curls", nameHr: "Pregib za biceps", equipment: "dumbbells", isPrimary: false },
    { name: "Plank", nameHr: "Plank", equipment: "bodyweight", isPrimary: false },
  ],
  dayB: [
    { name: "Romanian deadlift", nameHr: "Rumunjsko mrtvo dizanje", equipment: "barbell", isPrimary: true },
    { name: "Shoulder press", nameHr: "Potisak za ramena", equipment: "dumbbells", isPrimary: true },
    { name: "Lat pulldown", nameHr: "Povlačenje na lat spravi", equipment: "cable", isPrimary: true },
    { name: "Cable chest fly", nameHr: "Kabelska križa za prsa", equipment: "cable", isPrimary: false },
    { name: "Triceps rope pushdown", nameHr: "Triceps potisak s užetom", equipment: "cable", isPrimary: false },
    { name: "Hanging leg raises", nameHr: "Podizanje nogu u visu", equipment: "bodyweight", isPrimary: false },
  ],
};

// ŽENSKI PROGRAM 1: Glute/Legs fokus
const FEMALE_GLUTE_LEGS = {
  gluteDominant: [
    { name: "Hip thrust", nameHr: "Hip thrust", equipment: "barbell/smith", isPrimary: true },
    { name: "Romanian deadlift", nameHr: "Rumunjsko mrtvo dizanje", equipment: "barbell", isPrimary: true },
    { name: "Cable glute kickbacks", nameHr: "Kabelski kickback za gluteus", equipment: "cable", isPrimary: false },
    { name: "Hip abductions", nameHr: "Abdukcije kukova", equipment: "machine/cable", isPrimary: false },
    { name: "Reverse lunges", nameHr: "Iskoraci unatrag", equipment: "dumbbells", isPrimary: false },
    { name: "Cable crunch", nameHr: "Kabelski crunch", equipment: "cable", isPrimary: false },
  ],
  legsMix: [
    { name: "Leg press (wide stance)", nameHr: "Nožna preša (široki stav)", equipment: "machine", isPrimary: true },
    { name: "Bulgarian split squat", nameHr: "Bugarski split čučanj", equipment: "dumbbells", isPrimary: true },
    { name: "Leg curl", nameHr: "Pregib nogu", equipment: "machine", isPrimary: false },
    { name: "Goblet squat", nameHr: "Goblet čučanj", equipment: "dumbbell", isPrimary: false },
    { name: "Calf raises", nameHr: "Podizanje na prste", equipment: "machine", isPrimary: false },
    { name: "Side plank", nameHr: "Bočni plank", equipment: "bodyweight", isPrimary: false },
  ],
};

// ŽENSKI PROGRAM 2: Upper/Lower
const FEMALE_UPPER_LOWER = {
  upper: [
    { name: "Shoulder press", nameHr: "Potisak za ramena", equipment: "machine/dumbbells", isPrimary: true },
    { name: "Lat pulldown", nameHr: "Povlačenje na lat spravi", equipment: "cable", isPrimary: true },
    { name: "Seated cable row", nameHr: "Veslanje na kabelu sjedeći", equipment: "cable", isPrimary: true },
    { name: "Lateral raises", nameHr: "Lateralna odručenja", equipment: "dumbbells", isPrimary: false },
    { name: "Triceps pushdown", nameHr: "Triceps potisak", equipment: "cable", isPrimary: false },
    { name: "Dumbbell curls", nameHr: "Pregib s bučicama", equipment: "dumbbells", isPrimary: false },
  ],
  lower: [
    { name: "Hip thrust", nameHr: "Hip thrust", equipment: "barbell", isPrimary: true },
    { name: "Back squat", nameHr: "Stražnji čučanj", equipment: "barbell/smith", isPrimary: true },
    { name: "Leg press", nameHr: "Nožna preša", equipment: "machine", isPrimary: true },
    { name: "Step-ups", nameHr: "Step-up na klupu", equipment: "dumbbells", isPrimary: false },
    { name: "Leg extension", nameHr: "Ekstenzija nogu", equipment: "machine", isPrimary: false },
    { name: "Hip abductions", nameHr: "Abdukcije kukova", equipment: "machine/cable", isPrimary: false },
  ],
};

// ============================================
// CARDIO PROTOCOLS
// ============================================

const CARDIO_PROTOCOLS = {
  hodanje: {
    početnik: {
      duration: 30,
      protocol: "5 min lagano zagrijavanje + 20 min brži hod + 5 min hlađenje",
      intensity: "Umjeren tempo, moguće održavati razgovor",
      heartRateZone: "Zone 2 (60-70% max HR)",
    },
    srednji: {
      duration: 30,
      protocol: "Hodanje s nagibom: nagib 6-10%, brzina 5-6 km/h",
      intensity: "Umjeren do viši intenzitet, blago zadihanje",
      heartRateZone: "Zone 2-3 (65-75% max HR)",
    },
    napredni: {
      duration: 40,
      protocol: "Interval nagiba: 5 min nagib 5% + 5 min nagib 12% (×4)",
      intensity: "Visok intenzitet na nagibima",
      heartRateZone: "Zone 3 (70-80% max HR)",
    },
  },
  trčanje: {
    početnik: {
      duration: 20,
      protocol: "Intervali: 1 min trčanje / 1 min hodanje × 10",
      intensity: "Lagano trčanje, brzina kojom možeš pričati",
      heartRateZone: "Zone 2-3 (65-75% max HR)",
    },
    srednji: {
      duration: 25,
      protocol: "Kontinuirano trčanje: lagano do umjereno tempo",
      intensity: "Umjeren tempo, blago zadihanje",
      heartRateZone: "Zone 3 (70-80% max HR)",
    },
    napredni: {
      duration: 20,
      protocol: "HIIT: 30 sek sprint + 90 sek lagano × 10",
      intensity: "Maksimalni napor na sprintovima",
      heartRateZone: "Zone 4-5 (80-95% max HR) na sprintovima",
    },
  },
};

// ============================================
// PLYOMETRICS EXERCISES
// ============================================

const PLYOMETRICS_EXERCISES = {
  početnik: [
    { name: "Box step-up", nameHr: "Step-up na kutiju", notes: "Bez skoka, kontrolirano" },
    { name: "Low skip", nameHr: "Lagani skip", notes: "Low impact, fokus na formu" },
    { name: "Backward lunges", nameHr: "Iskoraci unatrag", notes: "Bez dodatnog opterećenja" },
    { name: "Stair walking", nameHr: "Hodanje po stepenicama", notes: "Umjeren tempo" },
  ],
  srednji: [
    { name: "Box jump (low)", nameHr: "Skok na nisku kutiju", notes: "Kutija 30-40 cm" },
    { name: "Jump squats", nameHr: "Skokovi iz čučnja", notes: "Bodyweight, mekano doskok" },
    { name: "Walking lunges", nameHr: "Hodajući iskoraci", notes: "Može s blagim odrazom" },
    { name: "Short sprints", nameHr: "Kratki sprintovi", notes: "20 m dionice" },
    { name: "Fast stair climbing", nameHr: "Brzo penjanje stepenicama", notes: "1 po 1 stepenicu" },
  ],
  napredni: [
    { name: "Box jump (high)", nameHr: "Skok na visoku kutiju", notes: "Kutija 50-60 cm" },
    { name: "Depth jump", nameHr: "Dubinski skok", notes: "OPREZ: samo uz dobru formu" },
    { name: "Lateral bounds", nameHr: "Bočni skokovi", notes: "Eksplozivno, stabilan doskok" },
    { name: "Sprints 30-60m", nameHr: "Sprintovi 30-60 m", notes: "Maksimalni napor" },
    { name: "Stair sprints", nameHr: "Sprint po stepenicama", notes: "2 po 2, OPREZ na silazak" },
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Izračunaj bazne parametre treninga prema razini
 */
function getBaseParamsByLevel(level: Level): {
  reps: { min: number; max: number };
  sets: { min: number; max: number };
  rpe: number;
  loadPercent: { min: number; max: number };
} {
  switch (level) {
    case "početnik":
      return {
        reps: { min: 10, max: 15 },
        sets: { min: 2, max: 3 },
        rpe: 6.5,
        loadPercent: { min: 40, max: 55 },
      };
    case "srednji":
      return {
        reps: { min: 8, max: 12 },
        sets: { min: 3, max: 4 },
        rpe: 7.5,
        loadPercent: { min: 55, max: 70 },
      };
    case "napredni":
      return {
        reps: { min: 6, max: 10 },
        sets: { min: 4, max: 5 },
        rpe: 8.5,
        loadPercent: { min: 70, max: 80 },
      };
  }
}

/**
 * Prilagodi parametre prema cilju
 */
function adjustParamsForGoal(
  baseParams: ReturnType<typeof getBaseParamsByLevel>,
  goal: Goal,
  isPrimaryExercise: boolean
): {
  reps: string;
  sets: number;
  restSeconds: number;
  rpe: number;
  loadPercent: string;
} {
  let reps = baseParams.reps;
  let sets = Math.round((baseParams.sets.min + baseParams.sets.max) / 2);
  let restSeconds = 90;
  let rpe = baseParams.rpe;
  let load = baseParams.loadPercent;

  switch (goal) {
    case "povećati mišićnu masu":
      reps = { min: 8, max: 12 };
      restSeconds = isPrimaryExercise ? 120 : 90;
      sets = isPrimaryExercise ? sets + 1 : sets;
      break;

    case "gubiti masnoću":
      reps = { min: 10, max: 15 };
      restSeconds = isPrimaryExercise ? 90 : 60;
      break;

    case "povećati izdržljivost":
      reps = { min: 12, max: 20 };
      restSeconds = isPrimaryExercise ? 60 : 45;
      break;

    case "povećati snagu":
      if (isPrimaryExercise) {
        reps = { min: 3, max: 6 };
        load = { min: 75, max: 85 };
        restSeconds = 180;
        sets = Math.min(sets + 1, 5);
      } else {
        reps = { min: 8, max: 12 };
        restSeconds = 90;
      }
      break;

    case "povećati brzinu":
      if (isPrimaryExercise) {
        reps = { min: 4, max: 8 };
        restSeconds = 120;
      }
      break;
  }

  return {
    reps: `${reps.min}-${reps.max}`,
    sets,
    restSeconds,
    rpe: Math.round(rpe * 10) / 10,
    loadPercent: `${load.min}-${load.max}% 1RM`,
  };
}

/**
 * Prilagodi parametre prema dobi
 */
function adjustForAge(
  params: ReturnType<typeof adjustParamsForGoal>,
  age: number
): ReturnType<typeof adjustParamsForGoal> {
  if (age >= 40) {
    // Smanji RPE za 1
    params.rpe = Math.max(5, params.rpe - 1);
    // Povećaj odmor za 30s
    params.restSeconds += 30;
    // Smanji load za ~5%
    const loadMatch = params.loadPercent.match(/(\d+)-(\d+)/);
    if (loadMatch) {
      const newMin = Math.max(30, parseInt(loadMatch[1]) - 5);
      const newMax = Math.max(40, parseInt(loadMatch[2]) - 5);
      params.loadPercent = `${newMin}-${newMax}% 1RM`;
    }
  }
  return params;
}

/**
 * Prilagodi parametre prema težini
 */
function adjustForWeight(
  params: ReturnType<typeof adjustParamsForGoal>,
  weight: number,
  isPrimaryExercise: boolean
): ReturnType<typeof adjustParamsForGoal> {
  // Teži korisnici (>100kg) - manje ponavljanja na višezglobnim
  if (weight > 100 && isPrimaryExercise) {
    const repsMatch = params.reps.match(/(\d+)-(\d+)/);
    if (repsMatch) {
      const newMin = Math.max(3, parseInt(repsMatch[1]) - 2);
      const newMax = Math.max(6, parseInt(repsMatch[2]) - 2);
      params.reps = `${newMin}-${newMax}`;
    }
  }
  // Lakši korisnici (<65kg) - više ponavljanja
  else if (weight < 65) {
    const repsMatch = params.reps.match(/(\d+)-(\d+)/);
    if (repsMatch) {
      const newMin = parseInt(repsMatch[1]) + 2;
      const newMax = parseInt(repsMatch[2]) + 2;
      params.reps = `${newMin}-${newMax}`;
    }
  }
  return params;
}

/**
 * Generiraj parametre za vježbu
 */
function generateExerciseParams(
  exercise: { name: string; nameHr: string; equipment?: string; isPrimary: boolean },
  userInputs: UserInputs
): ExerciseParams {
  const baseParams = getBaseParamsByLevel(userInputs.level);
  let params = adjustParamsForGoal(baseParams, userInputs.primaryGoal, exercise.isPrimary);
  params = adjustForAge(params, userInputs.age);
  params = adjustForWeight(params, userInputs.weight, exercise.isPrimary);

  // Dohvati opis vježbe iz baze opisa
  const exerciseInfo = EXERCISE_DESCRIPTIONS[exercise.name];

  return {
    name: exercise.name,
    nameHr: exercise.nameHr,
    sets: params.sets,
    reps: params.reps,
    restSeconds: params.restSeconds,
    rpe: params.rpe,
    loadPercent: params.loadPercent,
    equipment: exercise.equipment,
    description: exerciseInfo?.description,
    musclesWorked: exerciseInfo?.musclesWorked,
    tips: exerciseInfo?.tips,
    commonMistakes: exerciseInfo?.commonMistakes,
  };
}

/**
 * Odredi broj vježbi prema dostupnom vremenu
 */
function getExerciseCountByDuration(duration: SessionDuration, hasCardio: boolean, hasPlyometrics: boolean): number {
  // Oduzmi vrijeme za cardio (15-20 min) i pliometriju (10-15 min)
  let availableTime = duration;
  if (hasCardio) availableTime -= 20;
  if (hasPlyometrics) availableTime -= 12;

  // Prosječno 6-8 min po vježbi (sa odmorom)
  if (availableTime <= 30) return 4;
  if (availableTime <= 45) return 5;
  if (availableTime <= 60) return 6;
  return 7;
}

/**
 * Generiraj cardio sesiju
 */
function generateCardioSession(level: Level, cardioType: CardioType): CardioSession | undefined {
  if (!cardioType) return undefined;

  const protocol = CARDIO_PROTOCOLS[cardioType][level];
  return {
    type: cardioType,
    duration: protocol.duration,
    protocol: protocol.protocol,
    intensity: protocol.intensity,
    notes: protocol.heartRateZone,
  };
}

/**
 * Generiraj pliometrija sesiju
 */
function generatePlyometricsSession(level: Level, goal: Goal): PlyometricsSession {
  const exercises = PLYOMETRICS_EXERCISES[level];
  
  // Za cilj brzine, koristi sve vježbe
  // Za ostale ciljeve, koristi manje vježbi
  const exerciseCount = goal === "povećati brzinu" ? exercises.length : Math.min(3, exercises.length);
  const selectedExercises = exercises.slice(0, exerciseCount);

  const plyoExercises = selectedExercises.map((ex) => ({
    name: ex.name,
    nameHr: ex.nameHr,
    sets: level === "napredni" ? 4 : level === "srednji" ? 3 : 2,
    reps: level === "napredni" ? "8-10" : level === "srednji" ? "6-8" : "5-6",
    rest: level === "napredni" ? 90 : 60,
    notes: ex.notes,
  }));

  return {
    exercises: plyoExercises,
    totalDuration: exerciseCount * 3 + 5, // ~3 min po vježbi + zagrijavanje
  };
}

/**
 * Generiraj raspored dana u tjednu
 */
function generateWeekSchedule(
  userInputs: UserInputs
): { dayIndex: number; dayName: string; type: WorkoutDay["type"]; splitName?: string }[] {
  const daysOfWeek = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
  const schedule: { dayIndex: number; dayName: string; type: WorkoutDay["type"]; splitName?: string }[] = [];

  const { gender, selectedProgram, trainingDaysPerWeek, wantsCardio, wantsPlyometrics, primaryGoal } = userInputs;

  // Odredi strength dane prema programu
  let strengthDays: string[] = [];

  if (gender === "muško") {
    if (selectedProgram === "PPL") {
      if (trainingDaysPerWeek >= 6) {
        strengthDays = ["Push", "Pull", "Legs", "Push", "Pull", "Legs"];
      } else if (trainingDaysPerWeek >= 5) {
        strengthDays = ["Push", "Pull", "Legs", "Push", "Pull"];
      } else if (trainingDaysPerWeek >= 4) {
        strengthDays = ["Push", "Pull", "Legs", "Push"];
      } else if (trainingDaysPerWeek >= 3) {
        strengthDays = ["Push", "Pull", "Legs"];
      } else {
        strengthDays = ["Push+Pull", "Legs"];
      }
    } else {
      // FULL_BODY_AB
      if (trainingDaysPerWeek >= 4) {
        strengthDays = ["Full Body A", "Full Body B", "Full Body A", "Full Body B"];
      } else if (trainingDaysPerWeek >= 3) {
        strengthDays = ["Full Body A", "Full Body B", "Full Body A"];
      } else {
        strengthDays = ["Full Body A", "Full Body B"];
      }
    }
  } else {
    // Žensko
    if (selectedProgram === "GLUTE_LEGS") {
      if (trainingDaysPerWeek >= 4) {
        strengthDays = ["Glute dominant", "Legs mix", "Glute dominant", "Legs mix"];
      } else if (trainingDaysPerWeek >= 3) {
        strengthDays = ["Glute dominant", "Legs mix", "Glute dominant"];
      } else {
        strengthDays = ["Glute dominant", "Legs mix"];
      }
    } else {
      // UPPER_LOWER
      if (trainingDaysPerWeek >= 4) {
        strengthDays = ["Upper", "Lower", "Upper", "Lower"];
      } else if (trainingDaysPerWeek >= 3) {
        strengthDays = ["Lower", "Upper", "Lower"];
      } else {
        strengthDays = ["Upper", "Lower"];
      }
    }
  }

  // Rasporedi strength dane
  const dayIndices = getDayIndices(trainingDaysPerWeek);
  
  for (let i = 0; i < strengthDays.length; i++) {
    const dayIdx = dayIndices[i];
    let type: WorkoutDay["type"] = "strength";
    
    // Ako je cilj gubitak masnoće i ima cardio, dodaj cardio na strength dane
    if (wantsCardio && primaryGoal === "gubiti masnoću") {
      type = "strength+cardio";
    } else if (wantsPlyometrics && (primaryGoal === "povećati brzinu" || primaryGoal === "povećati snagu")) {
      type = "strength+plyometrics";
    }

    schedule.push({
      dayIndex: dayIdx,
      dayName: daysOfWeek[dayIdx - 1],
      type,
      splitName: strengthDays[i],
    });
  }

  // Dodaj dodatne cardio dane ako je potrebno
  if (wantsCardio && primaryGoal === "gubiti masnoću" && trainingDaysPerWeek < 6) {
    // Dodaj 1-2 dodatna cardio dana
    const usedDays = new Set(schedule.map((s) => s.dayIndex));
    for (let d = 1; d <= 7 && schedule.length < trainingDaysPerWeek + 1; d++) {
      if (!usedDays.has(d)) {
        schedule.push({
          dayIndex: d,
          dayName: daysOfWeek[d - 1],
          type: "cardio",
        });
        break;
      }
    }
  }

  // Sortiraj po danu u tjednu
  schedule.sort((a, b) => a.dayIndex - b.dayIndex);

  return schedule;
}

/**
 * Odredi indekse dana za trening
 */
function getDayIndices(daysPerWeek: number): number[] {
  switch (daysPerWeek) {
    case 2:
      return [1, 4]; // Pon, Čet
    case 3:
      return [1, 3, 5]; // Pon, Sri, Pet
    case 4:
      return [1, 2, 4, 5]; // Pon, Uto, Čet, Pet
    case 5:
      return [1, 2, 3, 5, 6]; // Pon, Uto, Sri, Pet, Sub
    case 6:
      return [1, 2, 3, 4, 5, 6]; // Pon-Sub
    default:
      return [1, 3, 5];
  }
}

/**
 * Dohvati vježbe za određeni split
 */
function getExercisesForSplit(
  splitName: string,
  gender: Gender,
  program: MaleProgram | FemaleProgram
): { name: string; nameHr: string; equipment?: string; isPrimary: boolean }[] {
  if (gender === "muško") {
    if (program === "PPL") {
      if (splitName === "Push") return MALE_PPL.push;
      if (splitName === "Pull") return MALE_PPL.pull;
      if (splitName === "Legs") return MALE_PPL.legs;
      if (splitName === "Push+Pull") return [...MALE_PPL.push.slice(0, 3), ...MALE_PPL.pull.slice(0, 3)];
    } else {
      if (splitName === "Full Body A") return MALE_FULL_BODY.dayA;
      if (splitName === "Full Body B") return MALE_FULL_BODY.dayB;
    }
  } else {
    if (program === "GLUTE_LEGS") {
      if (splitName === "Glute dominant") return FEMALE_GLUTE_LEGS.gluteDominant;
      if (splitName === "Legs mix") return FEMALE_GLUTE_LEGS.legsMix;
    } else {
      if (splitName === "Upper") return FEMALE_UPPER_LOWER.upper;
      if (splitName === "Lower") return FEMALE_UPPER_LOWER.lower;
    }
  }
  return [];
}

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

/**
 * Glavna funkcija za generiranje personaliziranog plana treninga
 */
export function generateWorkoutPlan(userInputs: UserInputs): WorkoutPlan {
  const {
    gender,
    age,
    height,
    weight,
    level,
    primaryGoal,
    trainingDaysPerWeek,
    sessionDuration,
    selectedProgram,
    wantsCardio,
    cardioType,
    wantsPlyometrics,
  } = userInputs;

  // 1. Generiraj raspored tjedna
  const weekSchedule = generateWeekSchedule(userInputs);

  // 2. Odredi broj vježbi po danu
  const exerciseCount = getExerciseCountByDuration(
    sessionDuration,
    wantsCardio && primaryGoal === "gubiti masnoću",
    wantsPlyometrics
  );

  // 3. Generiraj dane treninga
  const workoutDays: WorkoutDay[] = weekSchedule.map((dayConfig) => {
    const day: WorkoutDay = {
      dayIndex: dayConfig.dayIndex,
      dayName: dayConfig.dayName,
      type: dayConfig.type,
      splitName: dayConfig.splitName,
      estimatedDuration: 0,
    };

    // Strength vježbe
    if (dayConfig.type !== "cardio" && dayConfig.splitName) {
      const exercises = getExercisesForSplit(dayConfig.splitName, gender, selectedProgram);
      const selectedExercises = exercises.slice(0, exerciseCount);
      
      day.exercises = selectedExercises.map((ex) => generateExerciseParams(ex, userInputs));
      
      // Procjena vremena: ~5-7 min po vježbi
      day.estimatedDuration += day.exercises.length * 6;
    }

    // Cardio
    if (dayConfig.type === "cardio" || dayConfig.type === "strength+cardio") {
      day.cardio = generateCardioSession(level, cardioType || "hodanje");
      day.estimatedDuration += day.cardio?.duration || 0;
    }

    // Pliometrija
    if (dayConfig.type === "strength+plyometrics" || wantsPlyometrics) {
      if (dayConfig.type !== "cardio") {
        day.plyometrics = generatePlyometricsSession(level, primaryGoal);
        day.estimatedDuration += day.plyometrics.totalDuration;
      }
    }

    return day;
  });

  // 4. Izračunaj tjedni volumen
  const strengthDays = workoutDays.filter((d) => d.exercises && d.exercises.length > 0).length;
  const cardioDays = workoutDays.filter((d) => d.cardio).length;
  const plyoDays = workoutDays.filter((d) => d.plyometrics).length;
  const totalMinutes = workoutDays.reduce((sum, d) => sum + d.estimatedDuration, 0);

  // 5. Generiraj preporuke
  const recommendations = generateRecommendations(userInputs, workoutDays);

  // 6. Vrati kompletan plan
  return {
    createdAt: new Date().toISOString(),
    userProfile: {
      gender,
      age,
      weight,
      height,
      level,
      primaryGoal,
    },
    programType: getProgramTypeName(gender, selectedProgram),
    daysPerWeek: trainingDaysPerWeek,
    sessionDuration,
    days: workoutDays,
    weeklyVolume: {
      strengthDays,
      cardioDays,
      plyometricsDays: plyoDays,
      totalMinutes,
    },
    recommendations,
  };
}

/**
 * Dohvati naziv tipa programa
 */
function getProgramTypeName(gender: Gender, program: MaleProgram | FemaleProgram): string {
  if (gender === "muško") {
    return program === "PPL" ? "Push/Pull/Legs" : "Full Body A/B";
  } else {
    return program === "GLUTE_LEGS" ? "Glute/Legs fokus" : "Upper/Lower";
  }
}

/**
 * Generiraj preporuke za korisnika
 */
function generateRecommendations(userInputs: UserInputs, days: WorkoutDay[]): string[] {
  const recommendations: string[] = [];
  const { age, level, primaryGoal, wantsCardio, wantsPlyometrics } = userInputs;

  // Zagrijavanje
  recommendations.push("🔥 Uvijek se zagrij 5-10 min laganim kardiom i dinamičkim istezanjem prije treninga.");

  // Po dobi
  if (age >= 40) {
    recommendations.push("⚠️ S obzirom na dob, fokusiraj se na kvalitetu pokreta i izbjegavaj preopterećenje zglobova.");
  }

  // Po razini
  if (level === "početnik") {
    recommendations.push("📚 Kao početnik, fokusiraj se na učenje pravilne tehnike prije povećanja opterećenja.");
    recommendations.push("💡 Prvi mjesec koristi lakša opterećenja dok ne savladaš pokrete.");
  }

  // Po cilju
  if (primaryGoal === "povećati mišićnu masu") {
    recommendations.push("🍗 Za rast mišića, unosi 1.6-2.2g proteina po kg tjelesne težine dnevno.");
    recommendations.push("😴 Spavaj minimalno 7-8 sati za optimalnu regeneraciju i rast mišića.");
  } else if (primaryGoal === "gubiti masnoću") {
    recommendations.push("🥗 Za gubitak masnoće, održavaj umjeren kalorijski deficit (300-500 kcal).");
    if (wantsCardio) {
      recommendations.push("🏃 Cardio nakon snage ili na zasebne dane maksimizira sagorijevanje masti.");
    }
  } else if (primaryGoal === "povećati snagu") {
    recommendations.push("💪 Za snagu, fokusiraj se na progresivno povećanje težine na višezglobnim vježbama.");
  } else if (primaryGoal === "povećati brzinu" && wantsPlyometrics) {
    recommendations.push("⚡ Pliometriju radi na početku treninga kada si svjež za maksimalnu eksplozivnost.");
  }

  // Općenito
  recommendations.push("💧 Pij dovoljno vode - minimalno 2-3L dnevno, više na dane treninga.");
  recommendations.push("📈 Vodi dnevnik treninga i prati progres opterećenja tjedno.");

  return recommendations;
}

// ============================================
// AVAILABLE PROGRAMS HELPER
// ============================================

/**
 * Dohvati dostupne programe prema spolu
 */
export function getAvailablePrograms(gender: Gender): { id: string; name: string; description: string }[] {
  if (gender === "muško") {
    return [
      {
        id: "PPL",
        name: "Push/Pull/Legs",
        description: "Klasična podjela po mišićnim grupama. Idealno za 3-6 treninga tjedno. Fokus na sve mišićne grupe.",
      },
      {
        id: "FULL_BODY_AB",
        name: "Full Body A/B",
        description: "Dva različita treninga cijelog tijela. Idealno za 2-4 treninga tjedno. Efikasan za početnike i srednju razinu.",
      },
    ];
  } else {
    return [
      {
        id: "GLUTE_LEGS",
        name: "Glute/Legs fokus",
        description: "Fokus na gluteus i noge. Idealno za oblikovanje stražnjice i nogu. 2-4 treninga tjedno.",
      },
      {
        id: "UPPER_LOWER",
        name: "Upper/Lower",
        description: "Podjela na gornji i donji dio tijela. Balansiran razvoj cijelog tijela. 2-4 treninga tjedno.",
      },
    ];
  }
}

// ============================================
// EXPORT
// ============================================

export default {
  generateWorkoutPlan,
  getAvailablePrograms,
};

