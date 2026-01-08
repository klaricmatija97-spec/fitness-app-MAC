"use client";

import Link from "next/link";

export default function PolitikaPrivatnostiPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
            ← Natrag na početnu
          </Link>
          <h1 className="text-4xl font-bold mb-2">Politika privatnosti</h1>
          <p className="text-zinc-400">Zadnje ažuriranje: {new Date().toLocaleDateString('hr-HR')}</p>
        </div>

        <div className="prose prose-invert prose-zinc max-w-none">
          {/* 1. Uvod */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Uvod</h2>
            <p className="text-zinc-300 leading-relaxed">
              CORPEX ("mi", "nas", "naš") poštuje vašu privatnost i obvezuje se zaštititi 
              vaše osobne podatke. Ova Politika privatnosti objašnjava kako prikupljamo, 
              koristimo, obrađujemo i štitimo vaše podatke kada koristite našu fitness aplikaciju.
            </p>
          </section>

          {/* 2. Podaci koje prikupljamo */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Podaci koje prikupljamo</h2>
            
            <h3 className="text-xl font-medium text-white mt-6 mb-3">2.1 Podaci koje nam izravno pružate:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li><strong>Identifikacijski podaci:</strong> ime, prezime, korisničko ime, e-mail adresa</li>
              <li><strong>Tjelesni podaci:</strong> visina, težina, dob, spol</li>
              <li><strong>Zdravstveni podaci:</strong> alergije na hranu, zdravstvena stanja, ograničenja</li>
              <li><strong>Fitness podaci:</strong> razina aktivnosti, fitness ciljevi, povijest treninga</li>
              <li><strong>Prehrambene preferencije:</strong> dijetetska ograničenja, omiljene namirnice</li>
            </ul>

            <h3 className="text-xl font-medium text-white mt-6 mb-3">2.2 Podaci koje automatski prikupljamo:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Podaci o korištenju aplikacije</li>
              <li>IP adresa i podaci o uređaju</li>
              <li>Podaci o pregledniku</li>
              <li>Vrijeme i datum pristupa</li>
            </ul>
          </section>

          {/* 3. Svrha obrade */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Zašto koristimo vaše podatke</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">Vaše podatke koristimo za:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Kreiranje personaliziranih planova prehrane</li>
              <li>Generiranje prilagođenih programa treninga</li>
              <li>Izračun kalorija i makronutrijenata</li>
              <li>Praćenje vašeg napretka</li>
              <li>Komunikaciju s vama o usluzi</li>
              <li>Poboljšanje naše aplikacije i usluga</li>
              <li>Sprječavanje prijevara i zloupotrebe</li>
              <li>Ispunjavanje zakonskih obveza</li>
            </ul>
          </section>

          {/* 4. Pravna osnova */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Pravna osnova obrade (GDPR)</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Obrađujemo vaše podatke na temelju:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li><strong>Izvršenje ugovora:</strong> obrada nužna za pružanje usluge koju ste zatražili</li>
              <li><strong>Privola:</strong> za obradu osjetljivih zdravstvenih podataka</li>
              <li><strong>Legitimni interes:</strong> za poboljšanje usluge i sigurnost</li>
              <li><strong>Zakonska obveza:</strong> kada je obrada zakonom propisana</li>
            </ul>
          </section>

          {/* 5. Osjetljivi podaci */}
          <section className="mb-10 p-6 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <h2 className="text-2xl font-semibold text-amber-400 mb-4">5. Osjetljivi zdravstveni podaci</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Neki podaci koje prikupljamo (npr. zdravstvena stanja, alergije) smatraju se 
              "posebnim kategorijama osobnih podataka" prema GDPR-u. Za obradu ovih podataka 
              tražimo vašu izričitu privolu.
            </p>
            <p className="text-zinc-300">
              <strong>Imate pravo povući privolu u bilo kojem trenutku</strong> kontaktiranjem 
              na klaricmatija97@gmail.com ili kroz postavke aplikacije.
            </p>
          </section>

          {/* 6. Dijeljenje podataka */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">6. S kim dijelimo vaše podatke</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Vaše podatke možemo dijeliti s:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li><strong>Vašim trenerom:</strong> ako ste povezani s osobnim trenerom u aplikaciji</li>
              <li><strong>Pružateljima usluga:</strong> hosting, analitika, obrada plaćanja</li>
              <li><strong>Edamam API:</strong> za analizu nutritivnih vrijednosti (anonimno)</li>
              <li><strong>Državnim tijelima:</strong> kada je zakonom propisano</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>Ne prodajemo vaše osobne podatke trećim stranama.</strong>
            </p>
          </section>

          {/* 7. Pohrana */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Pohrana i sigurnost podataka</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Vaši podaci pohranjeni su na sigurnim serverima uz primjenu:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>SSL/TLS enkripcije za prijenos podataka</li>
              <li>Bcrypt enkripcije za lozinke</li>
              <li>JWT tokena za autentifikaciju</li>
              <li>Redovitih sigurnosnih provjera</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              Podaci se čuvaju dok ne zatražite brisanje računa ili maksimalno 3 godine 
              od posljednjeg korištenja.
            </p>
          </section>

          {/* 8. Vaša prava */}
          <section className="mb-10 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">8. Vaša prava (GDPR)</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Imate sljedeća prava u vezi s vašim osobnim podacima:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li><strong>Pravo pristupa:</strong> zatražiti kopiju vaših podataka</li>
              <li><strong>Pravo ispravka:</strong> ispraviti netočne podatke</li>
              <li><strong>Pravo brisanja:</strong> zatražiti brisanje podataka ("pravo na zaborav")</li>
              <li><strong>Pravo ograničenja:</strong> ograničiti obradu podataka</li>
              <li><strong>Pravo prijenosa:</strong> dobiti podatke u strojno čitljivom formatu</li>
              <li><strong>Pravo prigovora:</strong> prigovoriti obradi podataka</li>
              <li><strong>Pravo povlačenja privole:</strong> u bilo kojem trenutku</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              Za ostvarivanje prava kontaktirajte: <strong>klaricmatija97@gmail.com</strong>
            </p>
          </section>

          {/* 9. Kolačići */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Kolačići i lokalna pohrana</h2>
            <p className="text-zinc-300 leading-relaxed">
              Koristimo lokalnu pohranu preglednika (localStorage) za spremanje vaših 
              preferencija i podataka o sesiji. Ovi podaci ostaju na vašem uređaju i 
              omogućuju rad aplikacije offline.
            </p>
          </section>

          {/* 10. Maloljetnici */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Djeca i maloljetnici</h2>
            <p className="text-zinc-300 leading-relaxed">
              Naša usluga nije namijenjena osobama mlađim od 16 godina. Ne prikupljamo 
              svjesno podatke djece. Ako saznamo da smo prikupili podatke maloljetnika 
              bez roditeljske privole, izbrisat ćemo ih.
            </p>
          </section>

          {/* 11. Izmjene */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Izmjene ove politike</h2>
            <p className="text-zinc-300 leading-relaxed">
              Možemo povremeno ažurirati ovu Politiku privatnosti. O značajnim promjenama 
              bit ćete obaviješteni putem aplikacije ili e-pošte. Preporučujemo redovitu 
              provjeru ove stranice.
            </p>
          </section>

          {/* 12. Kontakt */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">12. Kontakt za pitanja o privatnosti</h2>
            <div className="p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-300">📧 E-mail: klaricmatija97@gmail.com</p>
            </div>
            <p className="text-zinc-300 mt-4">
              Također imate pravo podnijeti pritužbu nadzornom tijelu - 
              <strong> Agencija za zaštitu osobnih podataka (AZOP)</strong>, 
              www.azop.hr
            </p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-wrap gap-4">
          <Link href="/pravno/uvjeti-koristenja" className="text-blue-400 hover:text-blue-300">
            Opći uvjeti korištenja →
          </Link>
          <Link href="/pravno/zdravstveno-upozorenje" className="text-blue-400 hover:text-blue-300">
            Zdravstveno upozorenje →
          </Link>
        </div>
      </div>
    </div>
  );
}

