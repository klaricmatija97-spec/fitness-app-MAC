"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-white font-bold text-xl mb-4">CORPEX</h3>
            <p className="text-zinc-400 text-sm">
              Profesionalna fitness aplikacija za personalizirane 
              planove prehrane i treninga.
            </p>
          </div>

          {/* Pravni dokumenti */}
          <div>
            <h4 className="text-white font-semibold mb-4">Pravno</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/pravno/uvjeti-koristenja" 
                  className="text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Uvjeti korištenja
                </Link>
              </li>
              <li>
                <Link 
                  href="/pravno/privatnost" 
                  className="text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Politika privatnosti
                </Link>
              </li>
              <li>
                <Link 
                  href="/pravno/zdravstveno-upozorenje" 
                  className="text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Zdravstveno upozorenje
                </Link>
              </li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className="text-white font-semibold mb-4">Kontakt</h4>
            <ul className="space-y-2">
              <li className="text-zinc-400 text-sm">
                📧 klaricmatija97@gmail.com
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} CORPEX. Sva prava pridržana.
          </p>
          <p className="text-zinc-600 text-xs mt-2">
            ⚠️ Ova aplikacija ne pruža medicinske savjete. 
            Posavjetujte se s liječnikom prije korištenja.
          </p>
        </div>
      </div>
    </footer>
  );
}

