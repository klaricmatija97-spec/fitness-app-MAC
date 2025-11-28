# 🤖 AI Chat Setup - OpenAI Integracija

## Korak 1: Kreiraj OpenAI Account i API Key

1. **Otvori:** https://platform.openai.com
2. **Kreiraj account** (ili prijavi se)
3. **Idi na:** https://platform.openai.com/api-keys
4. **Klikni:** "Create new secret key"
5. **Ime ključa:** "CORPEX Fitness App" (ili bilo što)
6. **Kopiraj key** - **VAŽNO:** Kopiraj ga odmah jer ga više nećeš moći vidjeti!

---

## Korak 2: Dodaj API Key u Aplikaciju

1. **Otvori fajl:** `env.local` u `fitness-app` folderu
2. **Dodaj novi red:**
   ```
   OPENAI_API_KEY=sk-tvoj-api-key-ovdje
   ```
3. **Zamijeni** `sk-tvoj-api-key-ovdje` sa svojim stvarnim API keyem
4. **Spremi fajl**

---

## Korak 3: Instaliraj OpenAI Package

U PowerShell (u `fitness-app` folderu):
```bash
npm install openai
```

---

## Korak 4: Ažuriraj Chat API

Kod će biti automatski ažuriran. Provjeri `app/api/chat/route.ts` nakon što instaliraš paket.

---

## Korak 5: Testiraj AI Chat

1. Pokreni aplikaciju: `npm run dev`
2. Prijavi se u aplikaciju
3. Idi na "AI Chat"
4. Pošalji poruku (npr. "Koliko proteina trebam?")
5. Trebao bi dobiti AI odgovor!

---

## 💰 Troškovi OpenAI

- **GPT-3.5-turbo:** ~$0.0015 po 1000 tokena (vrlo jeftino)
- **GPT-4:** Skuplje, ali bolje odgovore
- **Preporuka:** Počni s GPT-3.5-turbo

---

## ⚠️ Napomena

- API key je osjetljiv - **NE dijelj ga javno!**
- `env.local` je već u `.gitignore` - neće se commitati
- Možeš postaviti mjesečni limit u OpenAI dashboardu

---

## 🐛 Troubleshooting

### Greška: "Invalid API key"
- Provjeri da li si kopirao cijeli key
- Provjeri da li nema razmaka

### Greška: "Insufficient quota"
- Provjeri da li imaš kredita na OpenAI accountu
- Dodaj payment method u OpenAI dashboardu

### Greška: "Module not found"
- Pokreni: `npm install openai`

