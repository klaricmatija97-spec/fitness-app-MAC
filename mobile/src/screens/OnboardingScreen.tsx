/**
 * Onboarding Screen
 * Mentalna priprema korisnika - jedna poruka po ekranu
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Platform,
  PanResponder,
  Easing,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Premium sportske slike - Olympic lifting / F1 trening stil
const backgroundImages = [
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80',
];

const messages = [
  {
    headline: 'Mnogi se boje da će se "nabildati"?',
    explanation: 'Mnogi se boje prevelikog mišićnog rasta.\n\nVažno je znati da se to ne događa preko noći, i nije nešto od čega treba strahovati.\n\nMišićna masa se razvija postupno, uz vrijeme, dosljedan trening, kvalitetnu prehranu te dovoljno odmora i discipline.',
    images: [
      'https://unsplash.com/photos/L3QG_OBluT0/download?force=true&w=1200', // Statua - Hercules (https://unsplash.com/photos/naked-man-statue-L3QG_OBluT0)
      'https://unsplash.com/photos/UP-Tj0bQARQ/download?force=true&w=1200', // Žena s kovrčavom kosom (https://unsplash.com/photos/a-black-and-white-photo-of-a-woman-with-curly-hair-UP-Tj0bQARQ)
    ],
  },
  {
    headline: 'Ne dobivaš na težini?',
    explanation: 'Najčešći razlog je nedovoljan unos kalorija.\n\nBez dovoljno energije tijelo nema od čega graditi mišićnu masu.\n\nZa napredak je važno:\n• unositi dovoljno kalorija i hranjivih tvari\n• jesti više ugljikohidrata kroz redovite obroke\n• birati energetski bogatiju pripremu hrane\n• jesti redovito, ne samo kada si gladan — već i kada si sit\n• uključiti kratki kardio koji može pomoći potaknuti apetit\n\nDosljedan unos hrane tijekom dana jednako je važan kao i trening.',
    images: [
      'https://unsplash.com/photos/iPPEshWJpn8/download?force=true&w=1200', // Muškarac uživa u tanjuru paste (https://unsplash.com/photos/man-enjoys-a-plate-of-delicious-pasta-iPPEshWJpn8)
      'https://unsplash.com/photos/1V2NHwCcuk0/download?force=true&w=1200', // Žena jede rezance iz ružičaste zdjele (https://unsplash.com/photos/woman-eating-noodles-from-a-pink-bowl-1V2NHwCcuk0)
    ],
  },
  {
    headline: 'Ubaci ove namirnice',
    explanation: 'U prehranu uključi namirnice poput tjestenine, riže, krumpira, kruha, zobenih pahuljica, griza, tortilja i ostalih izvora ugljikohidrata. Dodaj punomasne mliječne proizvode kao što su punomasno mlijeko, jogurt, sir, svježi sir, mozzarella i vrhnje. Koristi i zdrave izvore masnoća poput maslinovog ulja, maslaca, orašastih plodova, kikiriki maslaca, avokada i sjemenki. Ne zaboravi ni proteinske namirnice: jaja, meso, riba, mljeveno meso, losos, tuna, mahunarke i proteinski napitci.\n\nJednako je važno kako pripremaš hranu. Jela pripremaj s dodatkom ulja, maslaca, sira ili umaka, kuhaj, pirjaj ili peci umjesto da sve bude kuhano „na vodi". Kombiniraj namirnice tako da dobiješ više kalorija u manjem volumenu — npr. tjesteninu sa sirom i maslinovim uljem, krumpir s maslacem i vrhnjem ili zobene pahuljice s punomasnim mlijekom i orašastim plodovima.\n\nCilj je stvoriti okruženje i obroke koji ti olakšavaju dosljedan kalorijski suficit, bez osjećaja da se moraš prejedati.',
    images: [
      'https://unsplash.com/photos/CAhjZmVk5H4/download?force=true&w=1200', // Žena u bijeloj košulji jede (https://unsplash.com/photos/woman-in-white-shirt-eating-CAhjZmVk5H4)
      'https://unsplash.com/photos/R3LEjNmGj6Q/download?force=true&w=1200', // Panda na drvenoj platformi (https://unsplash.com/photos/a-panda-bear-sitting-on-top-of-a-wooden-platform-R3LEjNmGj6Q)
    ],
  },
  {
    headline: 'Ne gubiš kilograme?',
    explanation: 'Nisi u kalorijskom deficitu. Važno je birati hranu većeg volumena, a manje kalorija. Takva hrana stvara osjećaj sitosti i olakšava kontrolu unosa.\n\nPrimjer: Krumpir vs. Riža\n• Krumpir (100g): ~77 kalorija, veći volumen\n• Riža (100g): ~130 kalorija, manji volumen\n\nKrumpir ima manje kalorija po gramu, ali zauzima više prostora, što daje osjećaj sitosti. Riža ima više kalorija u manjem volumenu, pa je lakše pojesti više kalorija bez osjećaja sitosti.',
      images: [
        'https://unsplash.com/photos/fp1x-X7DwDs/download?force=true&w=1200', // Krumpir - ruke koje drže svježe iskopani krumpir (https://unsplash.com/photos/bunch-of-potatoes-fp1x-X7DwDs)
        'https://unsplash.com/photos/f9my1cgdwu4/download?force=true&w=1200', // Riža - kupa kuhane riže s parom (https://unsplash.com/photos/cooked-rice-f9my1cgdwu4)
      ],
  },
  {
    headline: 'Izbjegavaj ove namirnice:',
    explanation: 'Šećer, masnu i prerađenu hranu, pekarske proizvode, zaslađene sokove, alkohol, konzerviranu hranu, fast food i junk food.\n\nOve namirnice lako povećavaju kalorijski unos, ali pritom slabo zasićuju i često narušavaju osjećaj kontrole nad prehranom. Redovita konzumacija može usporiti napredak i otežati postizanje ciljeva.\n\nPotrebu za takvom hranom bolje je zadovoljiti kroz planirani "cheat meal" jednom tjedno, kao nagradu za trud i dosljednost. Takav pristup donosi veće zadovoljstvo nego svakodnevna konzumacija i pomaže dugoročno zadržati balans u prehrani.\n\nNajbolji način da izbjegneš štetne namirnice je da ih ne kupuješ i ne držiš kod kuće. Ako nisu prisutne u tvom okruženju, manja je šansa da ćeš ih konzumirati. Dom treba podržavati tvoje zdravlje, zato je važno da i ukućani poštuju ovu odluku. Izbjegavaj gomilanje velikih zaliha hrane koja vodi lošim izborima.',
    images: [
      'https://unsplash.com/photos/jxMURaM7icw/download?force=true&w=1200', // Osoba u crnoj košulji s burgerom (https://unsplash.com/photos/person-in-black-button-up-shirt-with-burger-jxMURaM7icw)
      'https://unsplash.com/photos/QvRttnSKBRA/download?force=true&w=1200', // Dvije žene sjede za stolom s tanjurima hrane (https://unsplash.com/photos/two-women-sitting-at-a-table-with-plates-of-food-QvRttnSKBRA)
    ],
  },
  {
    headline: 'Nedostatak vremena je izgovor!',
    explanation: 'Nedostatak vremena često je samo osjećaj.\n\nZa napredak nije potrebno provoditi sate u teretani svaki dan.\n\nTri treninga tjedno po otprilike sat vremena dovoljna su za vidljive i održive rezultate. Učenje nečeg novog, pa tako i samog vježbanja, nije toliko strašno ni zahtjevno kako se često čini na početku.\n\nUz malo strpljenja i upornosti, trening postaje navika, a svjesnost da radiš nešto dobro za sebe dodatno jača motivaciju. S vremenom, redovito vježbanje donosi pozitivne promjene i izvan teretane — više energije tijekom dana, veću produktivnost i lakši pristup svakodnevnim obavezama.\n\nKako rezultati dolaze, raste i samopouzdanje te osjećaj poštovanja prema samome sebi.',
    images: [
      'https://unsplash.com/photos/oORcW5Uc0dM/download?force=true&w=1200', // Dvije žene stoje jedna pored druge u teretani (https://unsplash.com/photos/a-couple-of-women-standing-next-to-each-other-oORcW5Uc0dM)
      'https://unsplash.com/photos/nlZTjUZX2qo/download?force=true&w=1200', // Muškarac daje fist bump muškarcu koji leži na podu (https://unsplash.com/photos/man-fist-bump-to-man-laying-on-ground-nlZTjUZX2qo)
    ],
  },
  {
    headline: 'Suplementacija - Whey protein',
    explanation: 'Whey protein je dodatak prehrani, a ne zamjena za obroke. Visoko je kvalitetan protein dobiven iz mlijeka, točnije sirutke, sadrži sve esencijalne aminokiseline koje tijelo ne može same proizvesti a ključne su za izgradnju, oporavak i očuvanje mišićne mase.\n\nNjegova uloga nije zamijeniti kvalitetnu prehranu, već pomoći u postizanju dnevnog cilja unosa proteina.\n\nBez redovitog unosa namirnica bogatih proteinima tijekom dana, suplementacija sama po sebi neće donijeti rezultate. U takvim situacijama whey se često pogrešno doživljava kao marketinška prevara, iako se problem najčešće nalazi u nepravilnoj primjeni.\n\nZa održavanje i napredak u mišićnoj masi, snazi, jakosti, eksplozivnosti i estetskom izgledu tijela, preporučeni dnevni unos proteina iznosi približno 1,8 do 2,2 grama po kilogramu tjelesne mase.\n\nWhey protein služi kao praktičan i učinkovit način da taj cilj lakše postigneš, posebno kada prehrana tijekom dana ne osigurava dovoljan unos proteina. Može ga se konzumirati u bilo koje doba dana između obroka, ovisno o potrebama i prehrani a najčešće nakon treninga.',
    images: [
      'https://unsplash.com/photos/_a6dW14spss/download?force=true&w=1200', // Staklenka proteina pored žlice (https://unsplash.com/photos/a-jar-of-protein-powder-next-to-a-spoon-_a6dW14spss)
      'https://unsplash.com/photos/p_JJZdNOPIU/download?force=true&w=1200', // Close-up rezanja fileta od bifteka (https://unsplash.com/photos/close-up-of-a-cutting-a-fillet-steak-food-photography-recipe-idea-p_JJZdNOPIU)
    ],
  },
  {
    headline: 'Kreatin monohidrat',
    explanation: 'Kreatin je prirodna tvar prisutna u tijelu i u namirnicama poput mesa i ribe, gdje sudjeluje u opskrbi mišića energijom. Unosom hrane obično se ne postižu količine dovoljne za značajniji učinak tijekom fizičke aktivnosti.\n\nSuplementacija kreatinom monohidratom povećava dostupnost ATP-a, glavnog izvora energije za mišićne kontrakcije, što podržava veću snagu, izdržljivost i učinkovitiji trening.\n\nRedovitom upotrebom kreatin doprinosi održavanju mišićnog volumena i bržem oporavku.\n\nPreporučena dnevna doza iznosi 3–5 g i može se uzimati svakodnevno uz dovoljan unos tekućine. Kod nekih osoba mogu se javiti blago zadržavanje vode u mišićima, češći odlazak na WC ili povremene probavne smetnje.',
    images: [
      'https://unsplash.com/photos/1JS6n1uT-uI/download?force=true&w=1200', // Muškarac udara u pod (https://unsplash.com/photos/man-smash-the-ground-1JS6n1uT-uI)
      'https://unsplash.com/photos/BpH--upRlCs/download?force=true&w=1200', // Fotografija smeđeg lava (https://unsplash.com/photos/photo-of-brown-lion-BpH--upRlCs)
    ],
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

export default function OnboardingScreen({ onComplete, onBack }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const currentIndexRef = useRef(0);
  const isAnimating = useRef(false);
  const imageOpacities = useRef<Animated.Value[]>([]);
  
  // Scroll tracking za Whey protein poruku
  const scrollYRef = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const maxScrollYRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  
  // Animacije - gesture-driven
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const messageTranslateY = useRef(new Animated.Value(0)).current;

  // Sync ref s state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
    const currentMessage = messages[currentIndex];
    const hasMultipleImages = currentMessage.images && currentMessage.images.length > 0;
    const imagesToShow = hasMultipleImages ? currentMessage.images : backgroundImages;
    
    // Reset animacije za slike - instantno bez fade-a
    imageOpacities.current = imagesToShow.map((_, idx) => 
      new Animated.Value(idx === 0 ? 1 : 0)
    );
    
    setCurrentBgImage(0); // Reset na prvu sliku kada se promijeni slide
    // Reset scroll kada se promijeni slide
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
      scrollYRef.current = 0;
      isScrollingRef.current = false;
      maxScrollYRef.current = 0;
      scrollViewHeightRef.current = 0;
      contentHeightRef.current = 0;
    }
  }, [currentIndex]);

  // Rotiraj pozadinske slike svakih 8 sekundi
  useEffect(() => {
    const currentMessage = messages[currentIndex];
    const hasMultipleImages = currentMessage.images && currentMessage.images.length > 0;
    const imagesToShow = hasMultipleImages ? currentMessage.images : backgroundImages;
    
    // Osiguraj da animacije postoje i da je prva slika vidljiva
    if (imageOpacities.current.length !== imagesToShow.length) {
      imageOpacities.current = imagesToShow.map((_, idx) => 
        new Animated.Value(idx === 0 ? 1 : 0)
      );
    } else {
      // Reset animacije instantno - prva slika vidljiva, ostale nevidljive
      imageOpacities.current.forEach((anim, idx) => {
        anim.setValue(idx === 0 ? 1 : 0);
      });
    }
    
    if (hasMultipleImages) {
      // Za poruku s više slika, rotiraj svakih 4 sekunde s brzom fade animacijom
      const interval = setInterval(() => {
        const nextIndex = (currentBgImage + 1) % currentMessage.images.length;
        
        // Brza fade out trenutne slike
        Animated.timing(imageOpacities.current[currentBgImage], {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
        
        // Brza fade in nove slike
        Animated.timing(imageOpacities.current[nextIndex], {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
        
        setCurrentBgImage(nextIndex);
      }, 4000);
      return () => clearInterval(interval);
    } else {
      // Za ostale poruke, rotiraj pozadinske slike svakih 8 sekundi s brzom fade animacijom
      const interval = setInterval(() => {
        const nextIndex = (currentBgImage + 1) % backgroundImages.length;
        
        // Brza fade out trenutne slike
        Animated.timing(imageOpacities.current[currentBgImage], {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
        
        // Brza fade in nove slike
        Animated.timing(imageOpacities.current[nextIndex], {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
        
        setCurrentBgImage(nextIndex);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [currentIndex, currentBgImage]);

  // Funkcija za završetak onboardinga s animacijom
  const handleCompleteWithAnimation = () => {
    if (isAnimating.current) {
      return;
    }
    
    isAnimating.current = true;
    
    // Animacija fade out prije prelaska na sljedeći ekran
    Animated.parallel([
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(messageTranslateY, {
        toValue: -30,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
      onComplete();
    });
  };

  const goToNext = () => {
    const idx = currentIndexRef.current;
    
    if (idx >= messages.length - 1) {
      return;
    }
    
    if (isAnimating.current) {
      return;
    }
    
    isAnimating.current = true;
    const nextIndex = idx + 1;
    
    // Blaža animacija - manji pomak, kraće trajanje, glatki easing
    Animated.parallel([
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(messageTranslateY, {
        toValue: -30,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      if (!finished) {
        isAnimating.current = false;
        return;
      }
      
      // Promijeni poruku odmah - bez čekanja
      setCurrentIndex(nextIndex);
      currentIndexRef.current = nextIndex;
      
      // Reset animacije za novu poruku - pomak dolje
      messageTranslateY.setValue(30);
      messageOpacity.setValue(0);
      
      // Blaža animacija - fade in i pomak dolje
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  };

  // Swipe gesture handler - gesture-driven animacije
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        if (isAnimating.current) return false;
        // Blokiraj swipe ako se scrolla kroz Whey protein poruku
        const currentMessage = messages[currentIndexRef.current];
        if (currentMessage.headline === 'Suplementacija - Whey protein') {
          // Ako se trenutno scrolla, ne hvataj gesture
          if (isScrollingRef.current) return false;
          // Omogući swipe samo ako je scroll na vrhu (y === 0) ILI na dnu (y === maxScrollY)
          const isAtTop = scrollYRef.current === 0;
          const isAtBottom = maxScrollYRef.current > 0 && 
            Math.abs(scrollYRef.current - maxScrollYRef.current) < 5;
          return (isAtTop || isAtBottom);
        }
        return true;
      },
      onStartShouldSetPanResponderCapture: () => {
        // Ne hvataj gesture-e unutar ScrollView-a
        const currentMessage = messages[currentIndexRef.current];
        if (currentMessage.headline === 'Suplementacija - Whey protein') {
          return false; // ScrollView će sam upravljati gesture-ima
        }
        return false;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating.current) return false;
        // Blokiraj swipe ako se scrolla kroz Whey protein poruku
        const currentMessage = messages[currentIndexRef.current];
        if (currentMessage.headline === 'Suplementacija - Whey protein') {
          // Ako se trenutno scrolla, ne hvataj gesture
          if (isScrollingRef.current) return false;
          // Omogući swipe samo ako je scroll na vrhu (y === 0) ILI na dnu (y === maxScrollY)
          const isAtTop = scrollYRef.current === 0;
          const isAtBottom = maxScrollYRef.current > 0 && 
            Math.abs(scrollYRef.current - maxScrollYRef.current) < 5;
          if (!isAtTop && !isAtBottom) return false;
        }
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: () => {
        // Ne hvataj gesture-e unutar ScrollView-a
        const currentMessage = messages[currentIndexRef.current];
        if (currentMessage.headline === 'Suplementacija - Whey protein') {
          return false; // ScrollView će sam upravljati gesture-ima
        }
        return false;
      },
      onPanResponderGrant: () => {
        // Zaustavi sve aktivne animacije
        messageOpacity.stopAnimation();
        messageTranslateY.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isAnimating.current) return;
        
        const idx = currentIndexRef.current;
        const { dy } = gestureState;
        
        // Ograniči pomak na razumnu vrijednost (30px za blažu animaciju)
        const clampedDy = Math.max(-30, Math.min(30, dy));
        
        // Ažuriraj animacije u realnom vremenu - blaže vrijednosti
        if (dy < 0) {
          // Swipe prema gore - priprema za sljedeću poruku ili završetak onboardinga
          const progress = Math.min(1, Math.abs(dy) / 30);
          messageOpacity.setValue(1 - progress);
          messageTranslateY.setValue(-clampedDy);
        } else if (dy > 0) {
          // Swipe prema dolje - priprema za povratak na login (fade out, pomak dolje)
          const progress = Math.min(1, Math.abs(dy) / 30);
          messageOpacity.setValue(1 - progress);
          messageTranslateY.setValue(clampedDy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;
        
        const idx = currentIndexRef.current;
        const currentMessage = messages[idx];
        const { dy, vy } = gestureState;
        
        // Blokiraj swipe ako se scrolla kroz Whey protein poruku
        if (currentMessage.headline === 'Suplementacija - Whey protein') {
          // Omogući swipe samo ako je scroll na vrhu (y === 0) ILI na dnu (y === maxScrollY)
          const isAtTop = scrollYRef.current === 0;
          const isAtBottom = maxScrollYRef.current > 0 && 
            Math.abs(scrollYRef.current - maxScrollYRef.current) < 5;
          if (isScrollingRef.current || (!isAtTop && !isAtBottom)) {
            // Vrati na početnu poziciju
            Animated.parallel([
              Animated.timing(messageOpacity, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(messageTranslateY, {
                toValue: 0,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
            ]).start();
            return;
          }
        }
        
        // Provjeri brzinu i pomak za odluku o navigaciji
        // POVEĆANI PRAGOVI - sprječava slučajne prelaze
        const threshold = 150; // Povećano sa 50 na 150px
        const velocityThreshold = 1.2; // Povećano sa 0.5 na 1.2
        
        // Swipe prema gore - sljedeća poruka ili završetak onboardinga
        if (dy < -threshold || vy < -velocityThreshold) {
          // Ako je Whey protein poruka i scroll je na dnu, omogući swipe gore
          if (currentMessage.headline === 'Suplementacija - Whey protein') {
            const isAtBottom = maxScrollYRef.current > 0 && 
              Math.abs(scrollYRef.current - maxScrollYRef.current) < 5;
            if (!isAtBottom) {
              // Vrati na početnu poziciju ako nije na dnu
              Animated.parallel([
                Animated.timing(messageOpacity, {
                  toValue: 1,
                  duration: 300,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: true,
                }),
                Animated.timing(messageTranslateY, {
                  toValue: 0,
                  duration: 300,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: true,
                }),
              ]).start();
              return;
            }
          }
          if (idx < messages.length - 1) {
            goToNext();
          } else {
            // Na zadnjoj poruci, swipe gore završava onboarding s animacijom
            handleCompleteWithAnimation();
          }
        }
        // ONEMOGUĆEN swipe dolje za povratak na login - previše osjetljivo
        // Korisnik može koristiti back gumb ako želi natrag
        // else if ((dy > threshold || vy > velocityThreshold)) { ... }
        
        // Ako nije dovoljno pomaknuto prema gore, vrati na početnu poziciju
        else {
          // Vrati na početnu poziciju ako nije dovoljno pomaknuto - blaža animacija
          Animated.parallel([
            Animated.timing(messageOpacity, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(messageTranslateY, {
              toValue: 0,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const goToPrevious = () => {
    const idx = currentIndexRef.current;
    
    if (idx <= 0) {
      return;
    }
    
    if (isAnimating.current) {
      return;
    }
    
    isAnimating.current = true;
    const prevIndex = idx - 1;
    
    // Ista animacija kao goToNext - fade out i pomak dolje
    Animated.parallel([
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(messageTranslateY, {
        toValue: 30,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      if (!finished) {
        isAnimating.current = false;
        return;
      }
      
      // Promijeni poruku odmah - bez čekanja
      setCurrentIndex(prevIndex);
      currentIndexRef.current = prevIndex;
      
      // Reset animacije za novu poruku - pomak gore (suprotno od goToNext)
      messageTranslateY.setValue(-30);
      messageOpacity.setValue(0);
      
      // Ista animacija kao goToNext - fade in i pomak gore
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  };

  const handleNext = () => {
    if (isAnimating.current) {
      return;
    }
    
    const idx = currentIndexRef.current;
    if (idx < messages.length - 1) {
      goToNext();
    } else {
      // Na zadnjoj poruci, swipe ili tap završava onboarding s animacijom
      handleCompleteWithAnimation();
    }
  };

  const messageAnimatedStyle = {
    opacity: messageOpacity,
    transform: [{ translateY: messageTranslateY }],
  };

  // Poseban PanResponder za Whey protein slide - omogući swipe samo kada je scroll na dnu
  const wheyProteinPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        if (isAnimating.current) return false;
        const isAtBottom = maxScrollYRef.current > 0 && 
          Math.abs(scrollYRef.current - maxScrollYRef.current) < 5;
        return isAtBottom && !isScrollingRef.current;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating.current) return false;
        if (isScrollingRef.current) return false;
        const isAtBottom = maxScrollYRef.current > 0 && 
          Math.abs(scrollYRef.current - maxScrollYRef.current) < 5;
        if (!isAtBottom) return false;
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy < -5;
      },
      onPanResponderGrant: () => {
        messageOpacity.stopAnimation();
        messageTranslateY.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isAnimating.current) return;
        const { dy } = gestureState;
        if (dy >= 0) return; // Samo swipe gore
        
        const clampedDy = Math.max(-30, dy);
        const progress = Math.min(1, Math.abs(dy) / 30);
        messageOpacity.setValue(1 - progress);
        messageTranslateY.setValue(-clampedDy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;
        const { dy, vy } = gestureState;
        const threshold = 50;
        const velocityThreshold = 0.5;
        
        if (dy < -threshold || vy < -velocityThreshold) {
          const idx = currentIndexRef.current;
          if (idx < messages.length - 1) {
            goToNext();
          } else {
            handleCompleteWithAnimation();
          }
        } else {
          Animated.parallel([
            Animated.timing(messageOpacity, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(messageTranslateY, {
              toValue: 0,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const isWheyProteinSlide = messages[currentIndex].headline === 'Suplementacija - Whey protein';

  return (
    <View style={styles.container} {...(!isWheyProteinSlide ? panResponder.panHandlers : wheyProteinPanResponder.panHandlers)}>
      {/* Rotirajuće pozadinske slike */}
      <View style={styles.backgroundContainer}>
        {(() => {
          const currentMessage = messages[currentIndex];
          const imagesToShow = currentMessage.images && currentMessage.images.length > 0 
            ? currentMessage.images 
            : backgroundImages;
          
          // Inicijaliziraj animacije ako ne postoje
          if (imageOpacities.current.length !== imagesToShow.length) {
            imageOpacities.current = imagesToShow.map((_, idx) => 
              new Animated.Value(idx === 0 ? 1 : 0)
            );
          }
          
          return imagesToShow.map((img, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.backgroundImage,
                { 
                  opacity: imageOpacities.current[idx] || new Animated.Value(idx === 0 ? 1 : 0),
                },
              ]}
            >
              <Image
                source={{ uri: img }}
                style={styles.image}
                resizeMode="cover"
                onError={(error) => {
                  console.log('Image load error:', error.nativeEvent.error, 'URL:', img);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', img);
                }}
              />
              <View style={styles.imageOverlay} />
            </Animated.View>
          ));
        })()}
      </View>

      {/* Tamni gradient overlay - poboljšana čitljivost */}
      <LinearGradient
        colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Poruka - centrirana */}
        <View style={styles.messageContainer}>
          {messages[currentIndex].headline === 'Suplementacija - Whey protein' ? (
            <Animated.View style={[styles.messageWrapper, messageAnimatedStyle]}>
              <Text style={styles.headlineText}>{messages[currentIndex].headline}</Text>
              <View style={[
                styles.spacing,
                styles.spacingCompact
              ]} />
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                onScroll={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  scrollYRef.current = contentOffset.y;
                  scrollViewHeightRef.current = layoutMeasurement.height;
                  contentHeightRef.current = contentSize.height;
                  maxScrollYRef.current = Math.max(0, contentSize.height - layoutMeasurement.height);
                }}
                onScrollBeginDrag={() => {
                  isScrollingRef.current = true;
                }}
                onScrollEndDrag={() => {
                  setTimeout(() => {
                    isScrollingRef.current = false;
                  }, 150);
                }}
                onMomentumScrollBegin={() => {
                  isScrollingRef.current = true;
                }}
                onMomentumScrollEnd={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  scrollYRef.current = contentOffset.y;
                  maxScrollYRef.current = Math.max(0, contentSize.height - layoutMeasurement.height);
                  isScrollingRef.current = false;
                }}
              >
                <Text style={[styles.explanationText, styles.explanationTextCompact]}>
                  {messages[currentIndex].explanation}
                </Text>
              </ScrollView>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={styles.messageTouchable}
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <Animated.View style={[styles.messageWrapper, messageAnimatedStyle]}>
                <Text style={styles.headlineText}>{messages[currentIndex].headline}</Text>
                <View style={[
                  styles.spacing,
                  messages[currentIndex].headline === 'Nedostatak vremena je izgovor!' && styles.spacingCompact
                ]} />
                <Text style={[
                  styles.explanationText,
                  messages[currentIndex].headline === 'Nedostatak vremena je izgovor!' && styles.explanationTextCompact
                ]}>{messages[currentIndex].explanation}</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* Bottom decoration line */}
      <View style={styles.bottomLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
    zIndex: 10,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  messageTouchable: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageWrapper: {
    maxWidth: 600,
    alignItems: 'center',
  },
  headlineText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  spacing: {
    height: 32, // Prazan prostor između headlinea i objašnjenja
  },
  spacingCompact: {
    height: 20, // Smanjeni razmak za "Nedostatak vremena"
  },
  explanationText: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  explanationTextCompact: {
    lineHeight: 24, // Smanjeni line height za "Nedostatak vremena" i "Whey protein"
    fontSize: 17, // Malo manji font
  },
  scrollView: {
    maxHeight: 400, // Maksimalna visina scroll viewa
    width: '100%',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    minWidth: 200,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

