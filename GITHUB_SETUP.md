# 🐙 GitHub Account Setup - Korak po Korak

## Korak 1: Kreiraj GitHub Account

1. **Otvori browser** i idi na: https://github.com/signup
2. **Unesi podatke:**
   - Email adresu (npr. tvoj@gmail.com)
   - Lozinku (minimalno 8 znakova, uključi brojeve i slova)
   - Korisničko ime (npr. `tvojeime` ili `tvojeime2024`)
3. **Riješi CAPTCHA** (verifikacija da nisi robot)
4. **Odaberi plan:** Odaberi "Free" (besplatno)
5. **Verifikuj email:** Provjeri inbox i klikni na link za verifikaciju

---

## Korak 2: Nakon Kreiranja Accounta

### Opcija A: Upload Koda na GitHub (Web Interface)

1. **Prijavi se** na GitHub (https://github.com)
2. **Klikni** na zeleni gumb "New" ili "Create repository"
3. **Unesi podatke:**
   - Repository name: `corpex-fitness-app` (ili bilo koje ime)
   - Description: "CORPEX Fitness Application"
   - Public ili Private (tvoj izbor)
   - **NE** označavaj "Initialize with README" (kod već imaš lokalno)
4. **Klikni** "Create repository"
5. **Prati upute** koje GitHub prikaže za "uploading an existing project"

### Opcija B: Push Koda preko Terminala (Git)

**Ako već imaš Git instaliran:**

```bash
cd fitness-app
git init
git add .
git commit -m "Initial commit - CORPEX fitness app"
git branch -M main
git remote add origin https://github.com/TVOJ_USERNAME/corpex-fitness-app.git
git push -u origin main
```

**Zamijeni `TVOJ_USERNAME` sa svojim GitHub korisničkim imenom!**

---

## Korak 3: Poveži s Vercel (Za Automatski Deploy)

1. **Otvori Vercel:** https://vercel.com
2. **Prijavi se** (možeš koristiti GitHub račun)
3. **Klikni** "Add New Project"
4. **Odaberi** svoj GitHub repository (`corpex-fitness-app`)
5. **Deploy!** Vercel će automatski deployati aplikaciju

**Prednosti:**
- Svaki put kad pushaš kod na GitHub, Vercel automatski redeploya
- Ne trebaš ručno uploadati folder
- Sve promjene su verzionirane na GitHub-u

---

## 💡 Savjeti

### Za Početnike:
- **Koristi web interface** (Opcija A) - lakše je za prvi put
- **Ne brini** ako ne znaš Git - možeš sve raditi preko GitHub web stranice

### Za Naprednije:
- **Instaliraj Git:** https://git-scm.com/download/win
- **Koristi terminal** (Opcija B) - brže i profesionalnije
- **Nauči osnovne Git komande:**
  - `git add .` - dodaj sve promjene
  - `git commit -m "Poruka"` - sačuvaj promjene
  - `git push` - pošalji na GitHub

---

## ✅ Provjera

Nakon kreiranja računa, provjeri:
- ✅ Email verifikovan?
- ✅ Možeš li se prijaviti na GitHub?
- ✅ Možeš li kreirati novi repository?

---

## ❓ Problemi?

**Problem: Email već u upotrebi**
- Možda već imaš GitHub account - probaj "Forgot password"

**Problem: Ne mogu se prijaviti**
- Provjeri da li si verifikovao email
- Provjeri da li koristiš ispravno korisničko ime

**Problem: Ne znam korisničko ime**
- Ide na: https://github.com/settings/profile
- Tamo ćeš vidjeti svoje korisničko ime

---

## 🔗 Korisni Linkovi

- **GitHub Signup:** https://github.com/signup
- **GitHub Login:** https://github.com/login
- **Git Download:** https://git-scm.com/download/win
- **Vercel:** https://vercel.com

