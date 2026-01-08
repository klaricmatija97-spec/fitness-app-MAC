"use client";

import Link from "next/link";

export default function ZdravstvenoUpozorenjePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
            ← Natrag na početnu
          </Link>
          <h1 className="text-4xl font-bold mb-2">⚠️ Zdravstveno upozorenje</h1>
          <p className="text-zinc-400">Zadnje ažuriranje: {new Date().toLocaleDateString('hr-HR')}</p>
        </div>

        {/* Main Warning Box */}
        <div className="mb-10 p-8 bg-red-500/20 border-2 border-red-500 rounded-2xl">
          <h2 className="text-3xl font-bold text-red-400 mb-6 text-center">
            🏥 VAŽNO - MOLIMO PROČITAJTE
          </h2>
          <p className="text-xl text-white text-center leading-relaxed">
            Ova aplikacija <strong>NIJE</strong> zamjena za profesionalni medicinski savjet, 
            dijagnozu ili liječenje.
          </p>
        </div>

        <div className="prose prose-invert prose-zinc max-w-none">
          {/* Konzultacija s liječnikom */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              🩺 Konzultacija s liječnikom
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              <strong>OBAVEZNO</strong> se posavjetujte s liječnikom ili kvalificiranim 
              zdravstvenim djelatnikom prije korištenja ove aplikacije ako:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-3 ml-4">
              <li>Imate bilo kakvo srčano oboljenje ili kardiovaskularnu bolest</li>
              <li>Imate dijabetes tipa 1 ili 2</li>
              <li>Imate povišeni krvni tlak (hipertenziju)</li>
              <li>Imate problema s bubrezima ili jetrom</li>
              <li>Imate poremećaje prehrane (anoreksija, bulimija, ortoreksia)</li>
              <li>Ste trudni ili planirate trudnoću</li>
              <li>Dojite</li>
              <li>Ste nedavno imali operaciju</li>
              <li>Uzimate bilo kakve lijekove na recept</li>
              <li>Imate alergije na hranu ili intolerancije</li>
              <li>Imate problema sa štitnjačom</li>
              <li>Imate autoimune bolesti</li>
              <li>Ste stariji od 65 godina</li>
              <li>Ste mlađi od 18 godina</li>
            </ul>
          </section>

          {/* Vježbanje */}
          <section className="mb-10 p-6 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <h2 className="text-2xl font-semibold text-orange-400 mb-4">
              🏋️ Upozorenje za vježbanje
            </h2>
            <div className="text-zinc-300 space-y-4">
              <p>
                Programi treninga u ovoj aplikaciji mogu biti fizički zahtjevni. 
                <strong> Prestanite s vježbanjem ODMAH</strong> i potražite medicinsku pomoć ako osjetite:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bol u prsima ili pritisak</li>
                <li>Vrtoglavicu ili nesvjesticu</li>
                <li>Izrazitu otežano disanje</li>
                <li>Nepravilne otkucaje srca</li>
                <li>Mučninu ili povraćanje</li>
                <li>Jaku bol u mišićima ili zglobovima</li>
                <li>Utrnulost ili trnce</li>
              </ul>
              <p className="font-semibold text-orange-300">
                Uvijek se zagrijte prije treninga i ohladite nakon treninga. 
                Povećavajte intenzitet postupno.
              </p>
            </div>
          </section>

          {/* Prehrana */}
          <section className="mb-10 p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
            <h2 className="text-2xl font-semibold text-green-400 mb-4">
              🥗 Upozorenje za prehranu
            </h2>
            <div className="text-zinc-300 space-y-4">
              <p>
                Planovi prehrane generirani ovom aplikacijom su opće smjernice i 
                <strong> ne uzimaju u obzir vaše specifične zdravstvene potrebe</strong>.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Preporučene kalorije su procjene bazirane na prosječnim vrijednostima</li>
                <li>Aplikacija ne može zamijeniti savjet nutricionista ili dijetetičara</li>
                <li>Ekstremno smanjenje kalorija može biti opasno</li>
                <li>Nagle promjene prehrane mogu uzrokovati zdravstvene probleme</li>
                <li>Alergije i intolerancije možda nisu potpuno pokrivene</li>
              </ul>
              <p className="font-semibold text-green-300">
                Ako imate specifične dijetetske potrebe, posavjetujte se s nutricionistom.
              </p>
            </div>
          </section>

          {/* Suplementi */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              💊 Suplementi i dodaci prehrani
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              Ako aplikacija spominje suplemente (protein, kreatin, vitamini, itd.):
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4 mt-4">
              <li>Suplementi nisu zamjena za uravnoteženu prehranu</li>
              <li>Posavjetujte se s liječnikom prije uzimanja bilo kakvih suplemenata</li>
              <li>Neki suplementi mogu stupati u interakciju s lijekovima</li>
              <li>Trudnice i dojilje trebaju poseban oprez</li>
            </ul>
          </section>

          {/* Rezultati */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              📊 Očekivanja od rezultata
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Rezultati korištenja ove aplikacije variraju od osobe do osobe. 
              <strong> Ne jamčimo nikakve specifične rezultate.</strong>
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Gubitak/dobitak težine ovisi o mnogo faktora</li>
              <li>Fotografije "prije i poslije" nisu garancija vaših rezultata</li>
              <li>Zdrav gubitak težine je 0.5-1 kg tjedno</li>
              <li>Brzi gubitak težine može biti opasan</li>
            </ul>
          </section>

          {/* Prihvaćanje rizika */}
          <section className="mb-10 p-6 bg-zinc-900 rounded-xl border border-zinc-700">
            <h2 className="text-2xl font-semibold text-white mb-4">
              ✅ Prihvaćanje rizika
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              Korištenjem ove aplikacije potvrđujete da:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-3 ml-4 mt-4">
              <li>
                Ste pročitali i razumjeli ovo zdravstveno upozorenje
              </li>
              <li>
                Razumijete da ova aplikacija ne pruža medicinske savjete
              </li>
              <li>
                Prihvaćate punu odgovornost za svoje zdravstvene odluke
              </li>
              <li>
                Ćete se posavjetovati s liječnikom ako imate bilo kakve zdravstvene nedoumice
              </li>
              <li>
                Koristite aplikaciju na vlastitu odgovornost i rizik
              </li>
            </ul>
          </section>

          {/* Hitni slučajevi */}
          <section className="mb-10 p-6 bg-red-500/20 border-2 border-red-500 rounded-xl">
            <h2 className="text-2xl font-semibold text-red-400 mb-4">
              🚨 U slučaju hitnosti
            </h2>
            <p className="text-xl text-white text-center">
              Ako imate zdravstvenu hitnoću, <strong>ODMAH nazovite 194</strong> (Hitna pomoć) 
              ili se obratite najbližoj hitnoj službi.
            </p>
            <p className="text-zinc-300 text-center mt-4">
              Ova aplikacija nije zamjena za hitnu medicinsku pomoć.
            </p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-wrap gap-4">
          <Link href="/pravno/uvjeti-koristenja" className="text-blue-400 hover:text-blue-300">
            Opći uvjeti korištenja →
          </Link>
          <Link href="/pravno/privatnost" className="text-blue-400 hover:text-blue-300">
            Politika privatnosti →
          </Link>
        </div>
      </div>
    </div>
  );
}

