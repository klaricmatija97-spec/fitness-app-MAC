"use client";

import Link from "next/link";

export default function UvjetiKoristenjaPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
            ← Natrag na početnu
          </Link>
          <h1 className="text-4xl font-bold mb-2">Opći uvjeti korištenja</h1>
          <p className="text-zinc-400">Zadnje ažuriranje: {new Date().toLocaleDateString('hr-HR')}</p>
        </div>

        <div className="prose prose-invert prose-zinc max-w-none">
          {/* 1. Uvod */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Uvod i prihvaćanje uvjeta</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Dobrodošli u CORPEX fitness aplikaciju ("Aplikacija", "Usluga", "mi", "nas"). 
              Korištenjem ove Aplikacije prihvaćate ove Opće uvjete korištenja ("Uvjeti"). 
              Ako se ne slažete s ovim Uvjetima, molimo vas da ne koristite Aplikaciju.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Ovi Uvjeti predstavljaju pravno obvezujući ugovor između vas ("Korisnik", "vi") i 
              CORPEX-a u vezi s vašim korištenjem Aplikacije i svih povezanih usluga.
            </p>
          </section>

          {/* 2. Opis usluge */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Opis usluge</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              CORPEX pruža digitalne fitness usluge koje uključuju, ali nisu ograničene na:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Personalizirane planove prehrane</li>
              <li>Programe treninga</li>
              <li>Praćenje napretka</li>
              <li>Kalkulatore makronutrijenata i kalorija</li>
              <li>Povezivanje s osobnim trenerima</li>
            </ul>
          </section>

          {/* 3. VAŽNO - Zdravstveno upozorenje */}
          <section className="mb-10 p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
            <h2 className="text-2xl font-semibold text-red-400 mb-4">⚠️ 3. Zdravstveno upozorenje i odricanje odgovornosti</h2>
            <div className="text-zinc-300 space-y-4">
              <p className="font-semibold text-red-300">
                OVA APLIKACIJA NE PRUŽA MEDICINSKE SAVJETE.
              </p>
              <p>
                Sadržaj ove Aplikacije, uključujući planove prehrane i treninga, namijenjen je 
                isključivo u informativne i edukativne svrhe. Nije zamjena za profesionalni 
                medicinski savjet, dijagnozu ili liječenje.
              </p>
              <p>
                <strong>OBAVEZNO se posavjetujte s liječnikom ili kvalificiranim zdravstvenim 
                djelatnikom prije:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Započinjanja bilo kakvog programa vježbanja</li>
                <li>Promjene prehrane</li>
                <li>Korištenja ove Aplikacije ako imate bilo kakvo zdravstveno stanje</li>
                <li>Korištenja ove Aplikacije ako uzimate lijekove</li>
                <li>Korištenja ove Aplikacije ako ste trudni ili dojite</li>
              </ul>
              <p>
                Nikada ne zanemarujte profesionalni medicinski savjet niti odgađajte 
                traženje medicinskog savjeta zbog nečega što ste pročitali u ovoj Aplikaciji.
              </p>
              <p className="font-semibold text-yellow-400">
                Korištenjem ove Aplikacije prihvaćate da to činite na vlastitu odgovornost 
                i rizik.
              </p>
            </div>
          </section>

          {/* 4. Uvjeti korištenja */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Uvjeti korištenja</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Korištenjem Aplikacije izjavljujete i jamčite da:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Imate najmanje 18 godina ili imate pristanak roditelja/skrbnika</li>
              <li>Ste sposobni sklopiti pravno obvezujući ugovor</li>
              <li>Nemate zdravstvenih stanja koja bi vas sprječavala u sigurnom korištenju Aplikacije</li>
              <li>Nećete koristiti Aplikaciju za nezakonite svrhe</li>
              <li>Nećete dijeliti svoj račun s drugim osobama</li>
              <li>Pružate točne i potpune informacije</li>
            </ul>
          </section>

          {/* 5. Korisnički račun */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Korisnički račun</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Za korištenje određenih funkcionalnosti Aplikacije potrebno je kreirati korisnički račun. 
              Odgovorni ste za:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Čuvanje povjerljivosti vaše lozinke</li>
              <li>Sve aktivnosti koje se odvijaju pod vašim računom</li>
              <li>Obavještavanje nas o svakom neovlaštenom korištenju vašeg računa</li>
            </ul>
          </section>

          {/* 6. Plaćanje */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Plaćanje i pretplata</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Određene funkcionalnosti Aplikacije mogu zahtijevati plaćanje. 
              Plaćanjem pristajete na:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Automatsko obnavljanje pretplate osim ako je ne otkažete</li>
              <li>Naplatu putem odabrane metode plaćanja</li>
              <li>Cijene navedene u trenutku kupnje</li>
            </ul>
            <p className="text-zinc-300 leading-relaxed mt-4">
              <strong>Povrat sredstava:</strong> Povrati se razmatraju od slučaja do slučaja. 
              Za zahtjev za povrat kontaktirajte nas unutar 14 dana od kupnje.
            </p>
          </section>

          {/* 7. Intelektualno vlasništvo */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Intelektualno vlasništvo</h2>
            <p className="text-zinc-300 leading-relaxed">
              Sav sadržaj Aplikacije, uključujući ali ne ograničavajući se na tekst, grafiku, 
              logotipe, ikone, slike, audio/video materijale, programe treninga i planove prehrane, 
              vlasništvo je CORPEX-a ili njegovih davatelja licenci i zaštićen je zakonima o 
              autorskim pravima. Zabranjeno je kopiranje, distribuiranje ili modificiranje 
              sadržaja bez našeg izričitog pisanog odobrenja.
            </p>
          </section>

          {/* 8. Ograničenje odgovornosti */}
          <section className="mb-10 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Ograničenje odgovornosti</h2>
            <div className="text-zinc-300 space-y-4">
              <p>
                U MAKSIMALNOJ MJERI DOPUŠTENOJ PRIMJENJIVIM ZAKONOM, CORPEX NEĆE BITI 
                ODGOVORAN ZA BILO KAKVU IZRAVNU, NEIZRAVNU, SLUČAJNU, POSEBNU, POSLJEDIČNU 
                ILI KAZNENU ŠTETU KOJA PROIZLAZI IZ:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Korištenja ili nemogućnosti korištenja Aplikacije</li>
                <li>Tjelesnih ozljeda nastalih tijekom vježbanja</li>
                <li>Zdravstvenih problema povezanih s prehranom</li>
                <li>Gubitka podataka</li>
                <li>Neovlaštenog pristupa vašem računu</li>
              </ul>
              <p className="font-semibold mt-4">
                Ukupna odgovornost CORPEX-a ograničena je na iznos koji ste platili za 
                Uslugu u posljednjih 12 mjeseci.
              </p>
            </div>
          </section>

          {/* 9. Privatnost */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Privatnost podataka</h2>
            <p className="text-zinc-300 leading-relaxed">
              Vaša privatnost nam je važna. Prikupljamo i obrađujemo vaše osobne podatke 
              u skladu s našom{" "}
              <Link href="/pravno/privatnost" className="text-blue-400 hover:text-blue-300 underline">
                Politikom privatnosti
              </Link>
              , koja čini sastavni dio ovih Uvjeta.
            </p>
          </section>

          {/* 10. Izmjene */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Izmjene uvjeta</h2>
            <p className="text-zinc-300 leading-relaxed">
              Zadržavamo pravo izmjene ovih Uvjeta u bilo kojem trenutku. O značajnim 
              promjenama bit ćete obaviješteni putem Aplikacije ili e-pošte. Nastavak 
              korištenja Aplikacije nakon objave izmjena smatra se prihvaćanjem novih Uvjeta.
            </p>
          </section>

          {/* 11. Raskid */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Raskid</h2>
            <p className="text-zinc-300 leading-relaxed">
              Možemo suspendirati ili ukinuti vaš pristup Aplikaciji bez prethodne obavijesti 
              ako prekršite ove Uvjete. Vi možete u bilo kojem trenutku prestati koristiti 
              Aplikaciju i zatražiti brisanje vašeg računa.
            </p>
          </section>

          {/* 12. Mjerodavno pravo */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">12. Mjerodavno pravo</h2>
            <p className="text-zinc-300 leading-relaxed">
              Ovi Uvjeti tumače se i primjenjuju u skladu sa zakonima Republike Hrvatske. 
              Za sve sporove nadležan je sud u Zagrebu.
            </p>
          </section>

          {/* 13. Kontakt */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">13. Kontakt</h2>
            <p className="text-zinc-300 leading-relaxed">
              Za sva pitanja u vezi s ovim Uvjetima, molimo kontaktirajte nas:
            </p>
            <div className="mt-4 p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-300">📧 E-mail: klaricmatija97@gmail.com</p>
            </div>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-wrap gap-4">
          <Link href="/pravno/privatnost" className="text-blue-400 hover:text-blue-300">
            Politika privatnosti →
          </Link>
          <Link href="/pravno/zdravstveno-upozorenje" className="text-blue-400 hover:text-blue-300">
            Zdravstveno upozorenje →
          </Link>
        </div>
      </div>
    </div>
  );
}

