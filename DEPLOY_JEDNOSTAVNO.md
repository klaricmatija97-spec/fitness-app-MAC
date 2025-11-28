# 🚀 Jednostavno podijeli link - CORPEX Aplikacija

## Metoda 1: Vercel Web Interface (NAJLAKŠE)

### Korak 1: Priprema koda
1. Otvori folder: `fitness-app`
2. Svi fajlovi su spremni za deploy

### Korak 2: Vercel Deploy
1. **Otvori**: https://vercel.com
2. **Klikni**: "Sign Up" (možeš se prijaviti s GitHub, Google ili Email)
3. **Nakon prijave, klikni**: "Add New..." → "Project"
4. **Odaberi**: "Deploy from your computer" ili "Import Git Repository"
   
   **Opcija A - Bez Gita (jednostavnije):**
   - Klikni "Browse" i odaberi `fitness-app` folder
   - Ili drag & drop cijeli `fitness-app` folder
   - Vercel će automatski detektirati da je Next.js aplikacija

5. **Framework Preset**: Automatski će detektirati "Next.js"
6. **Root Directory**: Ostavi prazno ili stavi `fitness-app` ako si izabrao parent folder
7. **Environment Variables** (opcionalno, za preview mod radi i bez njih):
   - `SUPABASE_URL` = (ako imaš, iz env.local)
   - `SUPABASE_SERVICE_ROLE_KEY` = (ako imaš, iz env.local)
   
   **NAPOMENA**: Ako ne dodaješ environment variables, aplikacija će raditi u preview modu koji je dovoljan za pregled.

8. **Klikni**: "Deploy"
9. **Sačekaj**: 2-3 minute dok se build završi
10. **Dobit ćeš link**: `https://corpex-fitness-app.vercel.app` (ili slično)

### Korak 3: Podijeli link
- Kopiraj dobiveni link i podijeli ga
- Aplikacija će biti javno dostupna svima!

---

## Metoda 2: Vercel CLI (Ako imaš Vercel CLI instaliran)

### Instalacija Vercel CLI:
```bash
npm install -g vercel
```

### Deploy:
```bash
cd fitness-app
vercel
```

Slijedi upute u terminalu i odgovori na pitanja. Vercel će ti dati link nakon deploya.

---

## Metoda 3: GitHub + Vercel (Za kontinuirani deploy)

1. **Kreiraj GitHub repository**:
   - Otvori https://github.com/new
   - Ime: `corpex-fitness-app`
   - Klikni "Create repository"

2. **Upload kod na GitHub**:
   - U fitness-app folderu:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TVOJ_USERNAME/corpex-fitness-app.git
   git push -u origin main
   ```

3. **Deploy na Vercel**:
   - Otvori https://vercel.com
   - Klikni "Add New Project"
   - Odaberi GitHub repository `corpex-fitness-app`
   - Klikni "Deploy"

---

## ✅ Nakon Deploya

**Link za podjelu:**
```
https://corpex-fitness-app.vercel.app
```

**Link s preview modom:**
```
https://corpex-fitness-app.vercel.app?preview=true
```

**Direktno u aplikaciju:**
```
https://corpex-fitness-app.vercel.app/app?preview=true
```

---

## 🔄 Ažuriranje aplikacije

**Ako si koristio Metodu 1 (upload folder):**
- Učini promjene lokalno
- Upload ponovno cijeli folder na Vercel

**Ako si koristio Metodu 3 (GitHub):**
- Push promjene na GitHub:
  ```bash
  git add .
  git commit -m "Update"
  git push
  ```
- Vercel će automatski redeployati aplikaciju

---

## 💡 Savjeti

1. **Za brzi test**: Koristi Metodu 1 (web upload) - najbrže
2. **Za produkciju**: Koristi Metodu 3 (GitHub) - automatski deploy
3. **Custom domain**: Možeš dodati vlastitu domenu u Vercel settings

