# CORPEX Fitness App

Aplikacija za fitness i zdravu prehranu sa kalkulatorima kalorija, makrosima, planovima prehrane i treninga.

## 🚀 Glavni URL

**Produkcija:** `/app` - Glavna aplikacija s login sustavom i svim funkcijama

**Preview mode:** `/app?preview=true` - Omogućuje pristup bez login-a za testiranje i pregled

## 📋 Funkcionalnosti

- 🔐 **Login/Registracija** - Korisnički sustav s autentifikacijom
- 📊 **Kalkulatori:**
  - BMR (Bazalni metabolizam)
  - TDEE (Ukupna dnevna potrošnja energije)
  - Cilj kalorija
  - Makrosi (proteini, ugljikohidrati, masti)
- 🍽️ **Plan prehrane** - Personalizirani prehrambeni planovi
- 💪 **Plan treninga** - Trening programi prilagođeni ciljevima
- 🤖 **AI Chat** - Asistent za prehranu i trening
- 📱 **Slide-based UI** - Moderni, minimalistički dizajn s animacijama

## 🛠️ Tehnologije

- **Next.js 16** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **Framer Motion** - Animacije
- **Supabase** - Backend i baza podataka
- **Zod** - Schema validacija

## 📦 Instalacija

```bash
# Kloniraj repozitorij
git clone https://github.com/TvojeKorisnickoIme/fitness-app.git

# Idi u folder
cd fitness-app

# Instaliraj dependencies
npm install

# Kopiraj env.local (kreiraj svoj sa Supabase podacima)
cp env.local.example env.local

# Pokreni development server
npm run dev
```

Otvori [http://localhost:3000/app](http://localhost:3000/app) u browseru.

## 🔑 Environment Variables

Kreiraj `env.local` sa:

```
SUPABASE_URL=tvoj_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tvoj_service_role_key
```

⚠️ **Nikada ne pushaj `env.local` na GitHub!**

## 📁 Struktura projekta

```
fitness-app/
├── app/
│   ├── app/              # Glavna aplikacija (/app)
│   ├── api/              # API endpoints
│   ├── login/            # Login stranica
│   └── payment/          # Payment stranica
├── lib/                  # Utility funkcije
├── public/               # Statički fajlovi
└── data/                 # JSON podaci
```

## 🎨 Dizajn

- **Tema:** Anthracite (#1A1A1A) s bijelim akcentima
- **Font:** Montserrat
- **UI:** Apple-inspired minimalistički dizajn
- **Animacije:** Smooth slide transitions s Framer Motion

## 📝 License

Privatni projekt - sva prava pridržana

## 👤 Autor

CORPEX Team
