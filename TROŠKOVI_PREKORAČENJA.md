# 💰 Troškovi Prekoračenja Rate Limita

## Problem
- **Rate limit**: 50 poziva/min
- **Tvoja upotreba**: 225 poziva/min
- **Prekoračenje**: 175 poziva/min (350% više!)

---

## Izračun Troškova

### Scenarij 1: Pay-as-you-go (Ako se naplaćuje)

**Pretpostavka**: Edamam naplaćuje dodatne pozive iznad limita

```
Prekoračenje: 175 poziva/min
Cijena po pozivu: $0.01-0.05
─────────────────────────────────────────────
Trošak po minuti: 175 × $0.02 = $3.50/min
Trošak po satu: $3.50 × 60 = $210/sat
Trošak po danu: $210 × 24 = $5,040/dan
```

**⚠️ OVO JE PREVIŠE!** (vjerojatno se ne naplaćuje ovako)

---

### Scenarij 2: Blokiranje (Najvjerojatnije)

**Pretpostavka**: Edamam **blokira** pozive iznad limita (ne naplaćuje)

```
Prekoračenje: 175 poziva/min
Rezultat: Pozivi se odbijaju (429 Too Many Requests)
Trošak: $0 (ali API ne radi!)
```

**Ovo je vjerojatnije** - Edamam obično blokira, ne naplaćuje.

---

### Scenarij 3: Penalty Fee (Moguće)

**Pretpostavka**: Edamam naplaćuje **penalty fee** za prekoračenje

```
Prekoračenje: 175 poziva/min
Penalty fee: $0.10-1.00 po incidentu
─────────────────────────────────────────────
Ako se naplaćuje svaki put: $0.10-1.00 po prekoračenju
```

**Nije sigurno** - treba provjeriti Edamam terms.

---

## Što Edamam Obično Radi

### 1. **Rate Limiting** (Najčešće)
- Blokira pozive iznad limita
- Vraća **429 Too Many Requests**
- **Ne naplaćuje** dodatno
- **Trošak: $0** (ali API ne radi)

### 2. **Throttling** (Rijetko)
- Usporava pozive umjesto blokiranja
- **Ne naplaćuje** dodatno
- **Trošak: $0**

### 3. **Penalty Fee** (Vrlo rijetko)
- Naplaćuje penalty za prekoračenje
- Obično samo za **Enterprise** planove
- **Trošak: Varijabilno**

---

## Provjera u Edamam Dashboardu

### Kako Provjeriti:

1. **Otvori**: https://developer.edamam.com/buyer/stats
2. **Provjeri**:
   - **Usage**: Koliko poziva si potrošio?
   - **Billing**: Ima li dodatnih troškova?
   - **Rate Limit Errors**: Koliko 429 grešaka?

---

## Najvjerojatniji Scenarij

### Edamam Blokira, Ne Naplaćuje

**Što se dogodilo:**
- ✅ **Pozivi iznad 50/min su odbijeni** (429 error)
- ✅ **Ne naplaćuje se dodatno** (samo blokira)
- ✅ **Trošak: $0** (ali API ne radi kako treba)

**Problem:**
- ❌ API ne radi kako treba
- ❌ Korisnici dobivaju greške
- ❌ Loš user experience

---

## Ako Se Ipak Naplaćuje

### Provjeri Billing:

1. **Edamam Dashboard** → **Billing**
2. **Provjeri**:
   - Ima li dodatnih troškova?
   - Ima li penalty fees?
   - Ima li overage charges?

### Ako Ima Troškova:

**Kontaktiraj Edamam Support:**
- Email: apis@edamam.com
- Pitaj: "Koliko me košta prekoračenje rate limita?"
- Traži: Povrat novca ako je greška

---

## Ušteda s Rate Limiterom

### Prije (Bez Rate Limitera):
```
225 poziva/min → Blokirani pozivi → API ne radi
Trošak: $0 (ali loš user experience)
```

### Sada (S Rate Limiterom):
```
45 poziva/min → Sve pozive prolaze → API radi
Trošak: $0 (i dobar user experience)
```

**Ušteda**: Bolji user experience, API radi kako treba!

---

## Preporuka

### 1. **Provjeri Edamam Dashboard**
- Koliko si potrošio?
- Ima li dodatnih troškova?

### 2. **Ako Ima Troškova**
- Kontaktiraj support
- Traži objašnjenje
- Traži povrat ako je greška

### 3. **Koristi Rate Limiter**
- Spriječi buduća prekoračenja
- API radi kako treba
- Bolji user experience

---

## Sažetak

### Najvjerojatnije:
- ✅ **Trošak: $0** (Edamam blokira, ne naplaćuje)
- ❌ **Problem**: API ne radi kako treba
- ✅ **Rješenje**: Rate limiter (sada implementiran)

### Ako Se Naplaćuje:
- Provjeri Edamam dashboard
- Kontaktiraj support
- Traži objašnjenje

---

## Sljedeći Koraci

1. ✅ **Provjeri Edamam dashboard** - ima li troškova?
2. ✅ **Koristi rate limiter** - spriječi buduća prekoračenja
3. ✅ **Monitoriraj usage** - prati koliko trošiš

