# Kako deployati CORPEX aplikaciju na Vercel

## Korak 1: Git Setup

U terminalu (u fitness-app folderu):

```bash
git init
git add .
git commit -m "Initial commit - CORPEX fitness app"
git branch -M main
git remote add origin https://github.com/TVOJ_USERNAME/corpex-fitness-app.git
git push -u origin main
```

Zamijeni `TVOJ_USERNAME` sa svojim GitHub username-om.

## Korak 2: Vercel Deployment

1. Otvori https://vercel.com
2. Klikni "Sign Up" i prijavi se s GitHub računom
3. Klikni "Add New Project"
4. Odaberi svoj repository (`corpex-fitness-app`)
5. **VAŽNO**: Dodaj Environment Variables:
   - `SUPABASE_URL` = tvoj Supabase URL (iz env.local)
   - `SUPABASE_SERVICE_ROLE_KEY` = tvoj service role key (iz env.local)
6. Klikni "Deploy"
7. Sačekaj 2-3 minute
8. Dobit ćeš link poput: `https://corpex-fitness-app.vercel.app`

## Korak 3: Podijeli link

Link možeš podijeliti s bilo kim - aplikacija će biti javno dostupna!

## Ažuriranje aplikacije

Kad napraviš promjene:
```bash
git add .
git commit -m "Update"
git push
```

Vercel će automatski redeployati aplikaciju.

