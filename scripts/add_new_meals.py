#!/usr/bin/env python3
"""
Skripta za dodavanje 50 novih jela u meal_components.json
"""

import json
import os

# Path to the meal_components.json file
MEAL_FILE = os.path.join(os.path.dirname(__file__), '..', 'lib', 'data', 'meal_components.json')

# ========================================
# 10 NOVIH DORUČAKA
# ========================================
NEW_BREAKFAST = [
    {
        "id": "breakfast_lose_5",
        "name": "Shakshuka s bjelanjcima",
        "description": "Mediteranski doručak bogat proteinima. Bjelanjci u umaku od rajčice i paprike s kuminom i paprikom. Niskokalorično a zasitno.",
        "image": "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=400&h=300&fit=crop",
        "preparationTip": "Na malo maslinovog ulja prodinstaj luk 3 min, dodaj papriku i češnjak još 2 min. Ulij pelate, začini kuminom i ljutom paprikom, kuhaj 10 min. Žlicom napravi udubine, ulij bjelanjke, poklopljeno kuhaj 5-7 min dok bjelanjci ne stegnu. Pospi peršinom.",
        "components": [
            {"food": "Egg white", "grams": 150, "displayName": "Bjelanjci (5 kom)"},
            {"food": "Tomato", "grams": 200, "displayName": "Rajčica (pelati)"},
            {"food": "Bell pepper", "grams": 50, "displayName": "Crvena paprika"},
            {"food": "Onion", "grams": 40, "displayName": "Luk"}
        ],
        "tags": ["high-protein", "low-calorie", "mediterranean"],
        "suitableFor": ["lose"]
    },
    {
        "id": "breakfast_lose_6",
        "name": "Proteinski smoothie bowl",
        "description": "Kremasti smoothie bowl s grčkim jogurtom i proteinom. Borovnice pružaju antioksidanse, chia sjemenke vlakna. Savršen za vruće dane.",
        "image": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=300&fit=crop",
        "preparationTip": "U blender stavi smrznute borovnice i grčki jogurt 0%. Dodaj protein prah, miksaj 30 sek dok ne postane gusto. Prebaci u zdjelu, posloži svježe borovnice, chia sjemenke i prelij medom.",
        "components": [
            {"food": "Greek yogurt", "grams": 200, "displayName": "Grčki jogurt 0%"},
            {"food": "Whey", "grams": 25, "displayName": "Protein prah"},
            {"food": "Blueberries", "grams": 80, "displayName": "Borovnice"},
            {"food": "Chia seeds", "grams": 10, "displayName": "Chia sjemenke"},
            {"food": "Honey", "grams": 10, "displayName": "Med"}
        ],
        "tags": ["high-protein", "low-fat", "smoothie"],
        "suitableFor": ["lose"]
    },
    {
        "id": "breakfast_lose_7",
        "name": "Omlet s tikvicama i feta sirom",
        "description": "Lagani mediteranski omlet. Tikvice dodaju volumen bez kalorija, feta intenzivan okus. Savršen za ljeto.",
        "image": "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400&h=300&fit=crop",
        "preparationTip": "Tikvicu naribaj, posoli, ostavi 5 min pa iscijedi. Umuti jaja i bjelanjak. Na malo ulja pirjaj tikvicu 2-3 min. Ulij jaja, na sredinu stavi fetu. Kad rubovi stegnu, preklopi na pola, peci još 1 min.",
        "components": [
            {"food": "Egg", "grams": 100, "displayName": "Jaja (2 kom)"},
            {"food": "Egg white", "grams": 30, "displayName": "Bjelanjak (1 kom)"},
            {"food": "Zucchini", "grams": 80, "displayName": "Tikvica"},
            {"food": "Feta cheese", "grams": 30, "displayName": "Feta sir"}
        ],
        "tags": ["high-protein", "mediterranean", "eggs-daily"],
        "suitableFor": ["lose"]
    },
    {
        "id": "breakfast_maintain_4",
        "name": "Avokado tost s jajima",
        "description": "Trendy doručak bogat zdravim mastima. Kremasti avokado s jajima na tostiranom integralnom kruhu. Omega masne kiseline za mozak.",
        "image": "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop",
        "preparationTip": "Kruh toastiraj. Avokado izgnječi, dodaj limunov sok, sol i papar. Namazi na tost. Jaja isprži na oko 3 min. Stavi na tost, pospi chili pahuljicama.",
        "components": [
            {"food": "Toast", "grams": 70, "displayName": "Integralni kruh (2 kriške)"},
            {"food": "Avocado", "grams": 80, "displayName": "Avokado"},
            {"food": "Egg", "grams": 100, "displayName": "Jaja (2 kom)"}
        ],
        "tags": ["healthy-fats", "trendy", "eggs-daily"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "breakfast_maintain_5",
        "name": "Overnight oats s bademima",
        "description": "Pripremi večer prije, ujutro samo uzmi iz frižidera. Zobene upiju mlijeko i jogurt, postaju kremaste. Bademi dodaju hrskavost i proteine.",
        "image": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
        "preparationTip": "U staklenku stavi zobene, mlijeko i jogurt. Promiješaj, zatvori, ostavi u hladnjaku preko noći (min 6 sati). Ujutro dodaj nasjeckane bademe, prelij medom, pospi cimetom.",
        "components": [
            {"food": "Oats", "grams": 60, "displayName": "Zobene pahuljice"},
            {"food": "Milk", "grams": 150, "displayName": "Mlijeko"},
            {"food": "Greek yogurt", "grams": 50, "displayName": "Grčki jogurt"},
            {"food": "Almonds", "grams": 20, "displayName": "Bademi"},
            {"food": "Honey", "grams": 15, "displayName": "Med"}
        ],
        "tags": ["meal-prep", "no-cook", "practical"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "breakfast_maintain_6",
        "name": "Palačinke od banane i jaja",
        "description": "Zdrave palačinke bez brašna! Samo banana i jaja - jednostavno i ukusno. Cimet pojačava okus, med daje prirodnu slatkoću.",
        "image": "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=300&fit=crop",
        "preparationTip": "Bananu izgnječi vilicom do kaše. Dodaj jaja i cimet, dobro promiješaj. Na lagano nauljenu tavu stavljaj male palačinke. Peci 2 min dok ne porumene, okreni, peci još 1 min. Posluži s medom i voćem.",
        "components": [
            {"food": "Banana", "grams": 120, "displayName": "Zrela banana"},
            {"food": "Egg", "grams": 100, "displayName": "Jaja (2 kom)"},
            {"food": "Honey", "grams": 15, "displayName": "Med"},
            {"food": "Strawberries", "grams": 50, "displayName": "Svježe jagode"}
        ],
        "tags": ["gluten-free", "simple", "eggs-daily"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "breakfast_gain_13",
        "name": "Proteinska zobena kaša s kikiriki maslacem",
        "description": "Kalorijski gust doručak za masu. Zobene s mlijekom, protein prah i kikiriki maslac daju preko 600 kcal. Banana dodaje ugljikohidrate.",
        "image": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
        "preparationTip": "Mlijeko zagrijavaj, dodaj zobene, kuhaj 5 min uz miješanje. Skini s vatre, ostavi 2 min. Umiješaj protein prah. Prebaci u zdjelu, dodaj kikiriki maslac i nasjeckanu bananu, prelij medom.",
        "components": [
            {"food": "Oats", "grams": 80, "displayName": "Zobene pahuljice"},
            {"food": "Milk", "grams": 250, "displayName": "Mlijeko 3.2%"},
            {"food": "Whey", "grams": 30, "displayName": "Protein prah"},
            {"food": "Peanut butter", "grams": 25, "displayName": "Kikiriki maslac"},
            {"food": "Banana", "grams": 100, "displayName": "Banana"},
            {"food": "Honey", "grams": 10, "displayName": "Med"}
        ],
        "tags": ["high-calorie", "high-protein", "mass-gain"],
        "suitableFor": ["gain"]
    },
    {
        "id": "breakfast_gain_14",
        "name": "Sendvič s jajima i slaninom",
        "description": "Klasični američki doručak sendvič. Hrskava slanina, kremasta jaja na oko i topljeni sir između prepečenog kruha. Puno proteina i kalorija.",
        "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop",
        "preparationTip": "Slaninu peci na suhoj tavi dok ne postane hrskava. U istoj tavi isprži jaja na oko. Kruh toastiraj, namazi maslac. Posloži: kruh, sir, jaja, slanina, sir, kruh. Prižmi sendvič 1 min sa svake strane.",
        "components": [
            {"food": "Toast", "grams": 80, "displayName": "Integralni kruh (2 kriške)"},
            {"food": "Egg", "grams": 100, "displayName": "Jaja (2 kom)"},
            {"food": "Bacon", "grams": 40, "displayName": "Slanina (2 kriške)"},
            {"food": "Cheese", "grams": 30, "displayName": "Sir (edamer)"},
            {"food": "Butter", "grams": 10, "displayName": "Maslac"}
        ],
        "tags": ["high-calorie", "classic", "eggs-daily"],
        "suitableFor": ["gain"]
    },
    {
        "id": "breakfast_gain_15",
        "name": "Smoothie za masu",
        "description": "Tekuće kalorije - najlakši način za unos u bulk fazi. Mlijeko, banana, zobene, protein i maslac od badema. Preko 700 kcal u čaši.",
        "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop",
        "preparationTip": "U blender ulij mlijeko, dodaj narezanu bananu, zobene, protein prah i maslac od badema. Ulij med. Miksaj 60 sek na visokoj brzini. Dodaj mlijeka ako je pregusto.",
        "components": [
            {"food": "Milk", "grams": 300, "displayName": "Mlijeko 3.2%"},
            {"food": "Banana", "grams": 120, "displayName": "Banana"},
            {"food": "Oats", "grams": 40, "displayName": "Zobene pahuljice"},
            {"food": "Whey", "grams": 30, "displayName": "Protein prah"},
            {"food": "Almond butter", "grams": 20, "displayName": "Maslac od badema"},
            {"food": "Honey", "grams": 15, "displayName": "Med"}
        ],
        "tags": ["liquid-calories", "high-calorie", "mass-gain"],
        "suitableFor": ["gain"]
    },
    {
        "id": "breakfast_gain_16",
        "name": "Burrito s jajima i grahom",
        "description": "Meksički doručak pun proteina i ugljikohidrata. Kajgana, crni grah i avokado u velikoj tortilji. Salsa daje začin.",
        "image": "https://images.unsplash.com/photo-1584031379040-e7b5d7d47ed4?w=400&h=300&fit=crop",
        "preparationTip": "Grah ocijedi i zagrijavaj s kuminom. Jaja umuti i isprži kao kajganu. Tortilju zagrijavaj 30 sek. Na tortilju posloži kajganu, grah, salsu, avokado i sir. Zarolaj: savij strane pa rolaj prema gore. Po želji zapeci na tavi 1 min sa svake strane.",
        "components": [
            {"food": "Tortilla", "grams": 70, "displayName": "Velika tortilja"},
            {"food": "Egg", "grams": 100, "displayName": "Jaja (2 kom)"},
            {"food": "Black beans", "grams": 80, "displayName": "Crni grah"},
            {"food": "Salsa", "grams": 40, "displayName": "Salsa"},
            {"food": "Cheese", "grams": 30, "displayName": "Sir ribanac"},
            {"food": "Avocado", "grams": 40, "displayName": "Avokado"}
        ],
        "tags": ["high-calorie", "mexican", "eggs-daily"],
        "suitableFor": ["gain"]
    }
]

# ========================================
# 12+ NOVIH RUČKOVA (uključujući tradicionalna)
# ========================================
NEW_LUNCH = [
    {
        "id": "lunch_lose_10",
        "name": "Piletina u zelenom curry umaku",
        "description": "Azijski low-cal obrok. Piletina u light kokosovom mlijeku s curry pastom i povrćem. Začin pojačava metabolizam.",
        "image": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop",
        "preparationTip": "Piletinu nasjeckaj na trakice, propeci u woku 5 min, izvadi. U isti wok dodaj curry pastu, prži 1 min. Ulij light kokosovo mlijeko, dodaj papriku i tikvicu, kuhaj 5 min. Vrati piletinu, dodaj špinat dok ne uvene. Posluži preko riže.",
        "components": [
            {"food": "Chicken breast", "grams": 150, "displayName": "Pileća prsa"},
            {"food": "Coconut milk", "grams": 100, "displayName": "Kokosovo mlijeko light"},
            {"food": "Spinach", "grams": 80, "displayName": "Špinat"},
            {"food": "Bell pepper", "grams": 50, "displayName": "Paprika"},
            {"food": "Zucchini", "grams": 50, "displayName": "Tikvica"},
            {"food": "Rice", "grams": 60, "displayName": "Basmati riža"}
        ],
        "tags": ["asian", "spicy", "high-protein"],
        "suitableFor": ["lose"]
    },
    {
        "id": "lunch_lose_11",
        "name": "Salata s tunjevinom i jajetom",
        "description": "Mediteranska proteinska salata. Tuna iz konzerve, tvrdo kuhana jaja, masline i svježe povrće. Jednostavno i zasitno.",
        "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
        "preparationTip": "Jaja tvrdo kuhaj 10 min, ohladi, oguli. Zelenu salatu operi, osuši, natrgaj. Rajčice prepolovi. Tunu ocijedi i razdvoji vilicom. Sve posloži u zdjelu, prelij uljem i limunom.",
        "components": [
            {"food": "Tuna", "grams": 120, "displayName": "Tuna u vlastitom soku"},
            {"food": "Egg", "grams": 100, "displayName": "Kuhana jaja (2 kom)"},
            {"food": "Lettuce", "grams": 100, "displayName": "Zelena salata"},
            {"food": "Cherry tomatoes", "grams": 80, "displayName": "Cherry rajčice"},
            {"food": "Olives", "grams": 30, "displayName": "Masline"},
            {"food": "Olive oil", "grams": 10, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["mediterranean", "high-protein", "no-cook"],
        "suitableFor": ["lose"]
    },
    {
        "id": "lunch_lose_12",
        "name": "Tikvice punjene mljevenom puretinom",
        "description": "Niskokalorične punjene tikvice. Mljevena puretina s rajčicom i začinima. Malo ugljikohidrata, puno proteina.",
        "image": "https://images.unsplash.com/photo-1571945192246-b9f1b6a7a0bc?w=400&h=300&fit=crop",
        "preparationTip": "Tikvice prepolovi, žlicom izvadi meso. Prodinstaj luk i češnjak, dodaj puretinu 5 min. Dodaj pelate i meso tikvice, kuhaj 5 min. Napuni tikvice, pospi parmezanom. Peci 200°C, 25 min.",
        "components": [
            {"food": "Zucchini", "grams": 300, "displayName": "Tikvice (2 velike)"},
            {"food": "Ground turkey", "grams": 150, "displayName": "Mljevena puretina"},
            {"food": "Tomato", "grams": 100, "displayName": "Rajčica (pelati)"},
            {"food": "Onion", "grams": 40, "displayName": "Luk"},
            {"food": "Parmesan", "grams": 20, "displayName": "Parmezan"}
        ],
        "tags": ["low-carb", "high-protein", "stuffed"],
        "suitableFor": ["lose"]
    },
    {
        "id": "lunch_lose_13",
        "name": "Juha od piletine i povrća",
        "description": "Topla, zasitna juha niska kalorijama. Pileći temeljac s komadicima mesa i povrćem. Idealno za zimske dane.",
        "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
        "preparationTip": "Piletinu kuhaj u 1L vode s lukom i lovorom 20 min. Izvadi, procijedi temeljac. Dodaj narezano povrće (mrkva, celer, krumpir), kuhaj 15 min. Piletinu nasjeckaj, vrati u juhu. Pospi peršinom.",
        "components": [
            {"food": "Chicken breast", "grams": 120, "displayName": "Pileća prsa"},
            {"food": "Potatoes", "grams": 80, "displayName": "Krumpir"},
            {"food": "Carrot", "grams": 60, "displayName": "Mrkva"},
            {"food": "Celery", "grams": 40, "displayName": "Celer"},
            {"food": "Onion", "grams": 40, "displayName": "Luk"}
        ],
        "tags": ["soup", "comfort-food", "low-calorie"],
        "suitableFor": ["lose"]
    },
    {
        "id": "lunch_maintain_10",
        "name": "Buddha bowl s tofuom",
        "description": "Vegetarijanski bowl pun hranjivih tvari. Tofu, kvinoja, edamame i avokado. Kompletni proteini iz biljnih izvora.",
        "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
        "preparationTip": "Kvinoju isperi i kuhaj 15 min. Tofu nasjeckaj, mariniraj u soja sosu, propeci 5 min. Edamame kuhaj 3 min. Avokado i kupus nasjeckaj. U zdjelu posloži sve u sekcijama, pospi sezamom.",
        "components": [
            {"food": "Tofu", "grams": 100, "displayName": "Tofu"},
            {"food": "Quinoa", "grams": 60, "displayName": "Kvinoja (suha)"},
            {"food": "Edamame", "grams": 50, "displayName": "Edamame"},
            {"food": "Avocado", "grams": 50, "displayName": "Avokado"},
            {"food": "Red cabbage", "grams": 50, "displayName": "Crveni kupus"},
            {"food": "Sesame seeds", "grams": 10, "displayName": "Sezam"}
        ],
        "tags": ["vegetarian", "balanced", "bowl"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "lunch_maintain_11",
        "name": "Piletina s batatom i brokulom",
        "description": "Klasičan fitness obrok. Pečena pileća prsa s batatom (slatki krumpir) i brokulom. Uravnoteženi makrosi.",
        "image": "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop",
        "preparationTip": "Batat nasjeckaj na kockice, promiješaj s uljem i ružmarinom, peci 200°C 20 min. Piletinu začini, peci na tavi 6-7 min sa svake strane. Brokulu kuhaj na pari 5 min, propržI s češnjakom.",
        "components": [
            {"food": "Chicken breast", "grams": 150, "displayName": "Pileća prsa"},
            {"food": "Sweet potato", "grams": 150, "displayName": "Batat"},
            {"food": "Broccoli", "grams": 120, "displayName": "Brokula"},
            {"food": "Olive oil", "grams": 15, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["fitness", "balanced", "classic"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "lunch_maintain_12",
        "name": "Wrap s puretinom i humusom",
        "description": "Praktičan obrok za van. Pureća prsa s humusom i svježim povrćem u integralnoj tortilji.",
        "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop",
        "preparationTip": "Tortilju zagrijavaj na tavi. Namazi humus po cijeloj površini. Posloži puretinu, rajčicu, krastavac i salatu. Zarolaj čvrsto, prereži dijagonalno.",
        "components": [
            {"food": "Tortilla", "grams": 65, "displayName": "Integralna tortilja"},
            {"food": "Turkey breast", "grams": 100, "displayName": "Pureća prsa"},
            {"food": "Hummus", "grams": 50, "displayName": "Humus"},
            {"food": "Lettuce", "grams": 40, "displayName": "Zelena salata"},
            {"food": "Tomato", "grams": 50, "displayName": "Rajčica"},
            {"food": "Cucumber", "grams": 40, "displayName": "Krastavac"}
        ],
        "tags": ["practical", "portable", "balanced"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "lunch_gain_18",
        "name": "Govedina s rižom i povrćem stir-fry",
        "description": "Azijski wok obrok bogat proteinima i ugljikohidratima. Govedina s rižom i hrskavim povrćem u soja umaku.",
        "image": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
        "preparationTip": "Rižu skuhaj. Govedinu nasjeckaj tanko, mariniraj u soji. U woku na jakoj vatri brzo prži meso 2-3 min, izvadi. Dodaj povrće, prži 3-4 min. Vrati meso, dodaj češnjak i đumbir. Posluži preko riže.",
        "components": [
            {"food": "Beef", "grams": 150, "displayName": "Biftek (flank)"},
            {"food": "Rice", "grams": 100, "displayName": "Bijela riža (suha)"},
            {"food": "Bell pepper", "grams": 80, "displayName": "Paprika"},
            {"food": "Zucchini", "grams": 60, "displayName": "Tikvica"},
            {"food": "Soy sauce", "grams": 20, "displayName": "Soja sos"},
            {"food": "Sesame oil", "grams": 10, "displayName": "Sezamovo ulje"}
        ],
        "tags": ["asian", "high-protein", "high-carb"],
        "suitableFor": ["gain"]
    },
    {
        "id": "lunch_gain_19",
        "name": "Piletina Alfredo s tjesteninom",
        "description": "Kremasta tjestenina za masu. Fettuccine u bijelom umaku s pilećim prsima i parmezanom. Kalorijski gust obrok.",
        "image": "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400&h=300&fit=crop",
        "preparationTip": "Tjesteninu kuhaj al dente, sačuvaj 100ml vode. Piletinu propeci 6 min. U tavi otopi maslac, prodinstaj češnjak. Ulij vrhnje, kuhaj 2 min. Dodaj parmezan. Umiješaj tjesteninu i piletinu. Pospi peršinom.",
        "components": [
            {"food": "Chicken breast", "grams": 150, "displayName": "Pileća prsa"},
            {"food": "Pasta", "grams": 100, "displayName": "Fettuccine"},
            {"food": "Heavy cream", "grams": 100, "displayName": "Vrhnje za kuhanje"},
            {"food": "Parmesan", "grams": 30, "displayName": "Parmezan"},
            {"food": "Butter", "grams": 15, "displayName": "Maslac"}
        ],
        "tags": ["high-calorie", "pasta", "creamy"],
        "suitableFor": ["gain"]
    },
    {
        "id": "lunch_gain_20",
        "name": "Burrito bowl s govedinom",
        "description": "Meksički bowl pun kalorija. Mljevena govedina, riža, grah, kukuruz i guacamole. Kompletan obrok u zdjeli.",
        "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
        "preparationTip": "Rižu skuhaj s malo limuna. Govedinu prži 7 min s kuminom i čilijem. Grah i kukuruz zagrijavaj. U zdjelu stavi rižu, posloži meso, grah-kukuruz, salsu, sir i kiselo vrhnje.",
        "components": [
            {"food": "Ground beef", "grams": 150, "displayName": "Mljevena govedina"},
            {"food": "Rice", "grams": 80, "displayName": "Riža (suha)"},
            {"food": "Black beans", "grams": 60, "displayName": "Crni grah"},
            {"food": "Corn", "grams": 50, "displayName": "Kukuruz"},
            {"food": "Cheese", "grams": 40, "displayName": "Sir ribanac"},
            {"food": "Sour cream", "grams": 30, "displayName": "Kiselo vrhnje"},
            {"food": "Salsa", "grams": 40, "displayName": "Salsa"}
        ],
        "tags": ["mexican", "high-calorie", "bowl"],
        "suitableFor": ["gain"]
    },
    # TRADICIONALNA HRVATSKA JELA - RUČAK
    {
        "id": "lunch_trad_1",
        "name": "Kuhani grah sa zeljem i kobasicom",
        "description": "Tradicionalno hrvatsko jelo. Bijeli grah s kiselim kupusom i domaćom kobasicom. Bogat proteinima i vlaknima, idealno za zimu.",
        "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
        "preparationTip": "Grah namači preko noći, kuhaj 40-50 min dok ne omekša. Kobasicu nasjeckaj na kolutiće, propeci 3 min, izvadi. Prodinstaj luk i češnjak. U grah dodaj povrće, isprani kupus i kobasicu. Kuhaj 15 min, začini lovorom i paprom.",
        "components": [
            {"food": "White beans", "grams": 200, "displayName": "Bijeli grah"},
            {"food": "Sauerkraut", "grams": 150, "displayName": "Kiseli kupus"},
            {"food": "Sausage", "grams": 50, "displayName": "Domaća kobasica"},
            {"food": "Onion", "grams": 40, "displayName": "Luk"},
            {"food": "Garlic", "grams": 5, "displayName": "Češnjak"}
        ],
        "tags": ["traditional", "croatian", "winter-food"],
        "suitableFor": ["maintain", "gain"]
    },
    {
        "id": "lunch_trad_2",
        "name": "Varivo od graha i zelja",
        "description": "Posna verzija tradicionalnog graha. Bez mesa, samo bijeli grah, kiseli kupus i povrće. Bogat biljnim proteinima.",
        "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
        "preparationTip": "Grah namači preko noći, kuhaj u svježoj vodi 45 min. Na malo ulja prodinstaj luk, mrkvu i celer 5 min. Dodaj povrće u grah, pa isprani kiseli kupus. Kuhaj 20 min. Začini lovorom, soli i paprom. Ostavi 10 min prije posluživanja.",
        "components": [
            {"food": "White beans", "grams": 180, "displayName": "Bijeli grah"},
            {"food": "Sauerkraut", "grams": 150, "displayName": "Kiseli kupus"},
            {"food": "Carrot", "grams": 50, "displayName": "Mrkva"},
            {"food": "Celery", "grams": 30, "displayName": "Celer"},
            {"food": "Onion", "grams": 40, "displayName": "Luk"},
            {"food": "Olive oil", "grams": 10, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["traditional", "vegetarian", "high-fiber"],
        "suitableFor": ["lose", "maintain"]
    },
    {
        "id": "lunch_trad_3",
        "name": "Maneštra",
        "description": "Istarska gusta juha/varivo. Grah, krumpir, kukuruzna krupica i sezonsko povrće. Kalorijski gust, zasitan obrok.",
        "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
        "preparationTip": "Grah namači preko noći, kuhaj 30 min. Krumpir nasjeckaj na kockice, dodaj u grah s mrkvu i celerom. Kuhaj 15 min. Dodaj kukuruznu krupicu uz stalno miješanje da ne budu grudice. Kuhaj još 10 min. Dodaj blitvu zadnjih 5 min. Začini lovorom, maslinovim uljem i paprom.",
        "components": [
            {"food": "White beans", "grams": 100, "displayName": "Bijeli grah"},
            {"food": "Potatoes", "grams": 100, "displayName": "Krumpir"},
            {"food": "Cornmeal", "grams": 40, "displayName": "Kukuruzna krupica"},
            {"food": "Chard", "grams": 80, "displayName": "Blitva"},
            {"food": "Carrot", "grams": 40, "displayName": "Mrkva"},
            {"food": "Olive oil", "grams": 15, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["traditional", "istrian", "comfort-food"],
        "suitableFor": ["maintain", "gain"]
    },
    {
        "id": "lunch_trad_4",
        "name": "Rižot od povrća s piletinom",
        "description": "Hrvatska verzija rižota. Riža arborio s pilećim prsima i sezonskim povrćem. Kremasto i zasitno, puno proteina.",
        "image": "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=400&h=300&fit=crop",
        "preparationTip": "Pileći temeljac drži toplim. Piletinu propeci, nasjeckaj, stavi sa strane. Na maslacu prodinstaj luk, dodaj rižu, prži 1 min. Postupno dodaj temeljac uz stalno miješanje. Nakon 10 min dodaj mrkvu, nakon 5 min grašak i piletinu. Umiješaj parmezan.",
        "components": [
            {"food": "Chicken breast", "grams": 130, "displayName": "Pileća prsa"},
            {"food": "Arborio rice", "grams": 90, "displayName": "Riža arborio"},
            {"food": "Peas", "grams": 50, "displayName": "Grašak"},
            {"food": "Carrot", "grams": 50, "displayName": "Mrkva"},
            {"food": "Parmesan", "grams": 25, "displayName": "Parmezan"},
            {"food": "Butter", "grams": 15, "displayName": "Maslac"},
            {"food": "Chicken broth", "grams": 300, "displayName": "Pileći temeljac"}
        ],
        "tags": ["traditional", "risotto", "creamy"],
        "suitableFor": ["maintain", "gain"]
    }
]

# ========================================
# 13+ NOVIH VEČERA (uključujući tradicionalna)
# ========================================
NEW_DINNER = [
    {
        "id": "dinner_lose_10",
        "name": "Pečeni brancin s mladim krumpirom",
        "description": "Mediteranska riba bogata omega-3 mastima. Brancin pečen s limunom i začinskim biljem. Nizak unos kalorija, visoka nutritivna vrijednost.",
        "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop",
        "preparationTip": "Krumpir opere, prepolovi, kuhaj 10 min. Brancina očisti, napravI zareze, utrljaj sol. U trbuh stavi limun, ružmarin i češnjak. U pleh stavi krumpir s uljem, položi ribu. Peci 200°C 20-25 min. Špinat kratko prodinstaj, posluži uz ribu.",
        "components": [
            {"food": "Sea bass", "grams": 150, "displayName": "Brancin"},
            {"food": "New potatoes", "grams": 150, "displayName": "Mladi krumpir"},
            {"food": "Spinach", "grams": 80, "displayName": "Špinat"},
            {"food": "Lemon", "grams": 30, "displayName": "Limun"},
            {"food": "Olive oil", "grams": 15, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["mediterranean", "fish", "omega-3"],
        "suitableFor": ["lose"]
    },
    {
        "id": "dinner_lose_11",
        "name": "Pureća prsa s gljivama i pireom",
        "description": "Posna puretina s niskom masnoćom. Gljive dodaju mesonosnost bez kalorija. Lagani pire od krumpira za sitost.",
        "image": "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop",
        "preparationTip": "Krumpir kuhaj 20 min, ocijedi, izgnječi s toplim mlijekom. Pureća prsa začini, peci 5-6 min sa svake strane. Gljive nasjeckaj, propržI na istoj tavi. Dodaj češnjak i timijan, ulij 50ml vode za umak. Posluži s pireom.",
        "components": [
            {"food": "Turkey breast", "grams": 150, "displayName": "Pureća prsa"},
            {"food": "Mushrooms", "grams": 100, "displayName": "Šampinjoni"},
            {"food": "Potatoes", "grams": 150, "displayName": "Krumpir za pire"},
            {"food": "Milk", "grams": 30, "displayName": "Mlijeko"}
        ],
        "tags": ["lean", "low-fat", "comfort-food"],
        "suitableFor": ["lose"]
    },
    {
        "id": "dinner_lose_12",
        "name": "Salata s piletinom i avokadom",
        "description": "Lagana večera idealna za deficit. Pileća prsa na žaru s avokadom i svježim povrćem. Zdrave masti iz avokada.",
        "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
        "preparationTip": "Piletinu začini, peči na roštilju ili tavi 6-7 min sa strane. Odmori 5 min, nasjeckaj. Salatu natrgaj, dodaj rajčice i krastavac. Avokado nasjeckaj. Rasporedi sve u zdjeli, prelij uljem i limunom.",
        "components": [
            {"food": "Chicken breast", "grams": 140, "displayName": "Pileća prsa"},
            {"food": "Avocado", "grams": 80, "displayName": "Avokado"},
            {"food": "Cherry tomatoes", "grams": 80, "displayName": "Cherry rajčice"},
            {"food": "Cucumber", "grams": 60, "displayName": "Krastavac"},
            {"food": "Lettuce", "grams": 80, "displayName": "Zelena salata"},
            {"food": "Olive oil", "grams": 10, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["salad", "light", "healthy-fats"],
        "suitableFor": ["lose"]
    },
    {
        "id": "dinner_lose_13",
        "name": "Oslić u foliji s povrćem",
        "description": "Riba pečena u foliji zadržava sve sokove i okuse. Oslić s krumpirom i povrćem - kompletan lagani obrok.",
        "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop",
        "preparationTip": "Krumpir nasjeckaj tanko, stavi na foliju kao bazu. Povrće nasjeckaj, posloži na krumpir. Položi oslić filet, začini, dodaj limun. Prelij vinom, zatvori foliju. Peci 200°C 25 min. Otvori, pospi peršinom.",
        "components": [
            {"food": "Hake", "grams": 150, "displayName": "Oslić filet"},
            {"food": "Potatoes", "grams": 120, "displayName": "Krumpir"},
            {"food": "Zucchini", "grams": 60, "displayName": "Tikvica"},
            {"food": "Carrot", "grams": 40, "displayName": "Mrkva"},
            {"food": "White wine", "grams": 30, "displayName": "Bijelo vino"}
        ],
        "tags": ["fish", "en-papillote", "light"],
        "suitableFor": ["lose"]
    },
    {
        "id": "dinner_maintain_8",
        "name": "Losos s kvinojom i šparogama",
        "description": "Premium obrok bogat omega-3. Losos je jedan od najboljih izvora zdravih masti. Kvinoja pruža kompletne proteine, šparoge vlakna.",
        "image": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
        "preparationTip": "Kvinoju isperi i kuhaj 15 min. Lososa začini, peci kožom dolje 4 min, okreni, peci još 3 min. Šparogama odlomi drvenaste krajeve, blanširaj 2 min, propržI na tavi s uljem. Posluži zajedno, iscijedi limun, pospi koparom.",
        "components": [
            {"food": "Salmon", "grams": 150, "displayName": "Losos filet"},
            {"food": "Quinoa", "grams": 60, "displayName": "Kvinoja (suha)"},
            {"food": "Asparagus", "grams": 100, "displayName": "Šparoge"},
            {"food": "Olive oil", "grams": 15, "displayName": "Maslinovo ulje"},
            {"food": "Lemon", "grams": 20, "displayName": "Limun"}
        ],
        "tags": ["omega-3", "premium", "balanced"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "dinner_maintain_9",
        "name": "Piletina s mediteranskim povrćem",
        "description": "Pečena piletina s mediteranskim povrćem i krumpirom. Sve se peče zajedno u pećnici - jednostavno i ukusno.",
        "image": "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop",
        "preparationTip": "Povrće i krumpir nasjeckaj na jednake kockice, stavi u pleh s uljem i začinima. Peci 200°C 20 min, promiješaj. Piletinu začini, položi na povrće. Peci još 20-25 min. Provjeri je li meso gotovo.",
        "components": [
            {"food": "Chicken breast", "grams": 150, "displayName": "Pileća prsa"},
            {"food": "Potatoes", "grams": 120, "displayName": "Krumpir"},
            {"food": "Bell pepper", "grams": 60, "displayName": "Paprika"},
            {"food": "Zucchini", "grams": 60, "displayName": "Tikvica"},
            {"food": "Eggplant", "grams": 50, "displayName": "Patlidžan"},
            {"food": "Olive oil", "grams": 15, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["mediterranean", "one-pan", "balanced"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "dinner_maintain_10",
        "name": "Pečena orada s batatom",
        "description": "Mediteranska riba s batatom. Orada je niskokaloična riba bogatog okusa. Batat pruža složene ugljikohidrate.",
        "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop",
        "preparationTip": "Batat nasjeckaj na kockice, stavi u pleh s polovicom ulja, peci 15 min. Oradu očisti, zarezi, utrljaj sol. U trbuh stavi ružmarin i limun. Položi na batat, okruži rajčicama. Peci 200°C 20-25 min.",
        "components": [
            {"food": "Sea bream", "grams": 150, "displayName": "Orada"},
            {"food": "Sweet potato", "grams": 150, "displayName": "Batat"},
            {"food": "Cherry tomatoes", "grams": 80, "displayName": "Cherry rajčice"},
            {"food": "Olive oil", "grams": 15, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["mediterranean", "fish", "healthy"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "dinner_gain_18",
        "name": "Biftek s pireom i gljivama",
        "description": "Klasičan steak obrok. Biftek s gljivama u umaku i kremastim pireom. Visoko proteinski i kalorijski gust.",
        "image": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop",
        "preparationTip": "Biftek izvadi 30 min prije. Krumpir kuhaj 20 min, izgnječi s maslacem i mlijekom. Biftek osoli, popapri, peci na jakoj vatri 3-4 min sa strane (medium rare). Odmori 5 min. Na istoj tavi propržI gljive.",
        "components": [
            {"food": "Ribeye steak", "grams": 180, "displayName": "Biftek (rib-eye)"},
            {"food": "Potatoes", "grams": 200, "displayName": "Krumpir za pire"},
            {"food": "Mushrooms", "grams": 100, "displayName": "Šampinjoni"},
            {"food": "Butter", "grams": 20, "displayName": "Maslac"},
            {"food": "Milk", "grams": 40, "displayName": "Mlijeko"}
        ],
        "tags": ["steak", "high-protein", "mass-gain"],
        "suitableFor": ["gain"]
    },
    {
        "id": "dinner_gain_19",
        "name": "Lazanje s govedinom",
        "description": "Klasične talijanske lazanje. Slojevi tjestenine, bolognese umaka od govedine, bešamela i sira. Kalorijska bomba.",
        "image": "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop",
        "preparationTip": "Prodinstaj luk, dodaj meso, prži 7 min. Dodaj pelate, origano, lovor, kuhaj 15 min. U posudu stavi sloj umaka, listovi, meso, bešamel - ponovi. Završi bešamelom i parmezanom. Peci 180°C 30 min pod folijom, 15 min bez.",
        "components": [
            {"food": "Lasagna sheets", "grams": 150, "displayName": "Listovi za lazanje"},
            {"food": "Ground beef", "grams": 150, "displayName": "Mljevena govedina"},
            {"food": "Bechamel sauce", "grams": 150, "displayName": "Bešamel"},
            {"food": "Tomato", "grams": 200, "displayName": "Rajčica (pelati)"},
            {"food": "Parmesan", "grams": 40, "displayName": "Parmezan"}
        ],
        "tags": ["italian", "pasta", "high-calorie"],
        "suitableFor": ["gain"]
    },
    {
        "id": "dinner_gain_20",
        "name": "Piletina s tjesteninom i pestom",
        "description": "Brza i ukusna tjestenina za masu. Piletina s pestom, cherry rajčicama i parmezanom. Preko 700 kcal.",
        "image": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        "preparationTip": "Tjesteninu kuhaj al dente, sačuvaj vode. Piletinu nasjeckaj, propeci 6 min. Rajčice prepolovi, kratko propržI. U zdjelu stavi tjesteninu, dodaj pesto i malo vode. Umiješaj piletinu i rajčice. Pospi parmezanom i pinijama.",
        "components": [
            {"food": "Chicken breast", "grams": 150, "displayName": "Pileća prsa"},
            {"food": "Pasta", "grams": 100, "displayName": "Penne tjestenina"},
            {"food": "Pesto", "grams": 40, "displayName": "Pesto genovese"},
            {"food": "Cherry tomatoes", "grams": 60, "displayName": "Cherry rajčice"},
            {"food": "Parmesan", "grams": 20, "displayName": "Parmezan"},
            {"food": "Pine nuts", "grams": 15, "displayName": "Pinija"}
        ],
        "tags": ["italian", "pasta", "quick"],
        "suitableFor": ["gain"]
    },
    # TRADICIONALNA HRVATSKA JELA - VEČERA
    {
        "id": "dinner_trad_1",
        "name": "Pašticada s njokima",
        "description": "Dalmatinsko svečano jelo. Govedina pirjana u aromatičnom umaku od vina, suhe šljive i začina. Tradicionalno se služi s njokima ili njukima. Dugo pirjanje čini meso iznimno mekkim.",
        "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
        "preparationTip": "Govedinu nafilaj češnjakom i slaninom, marinira 24h u vinu s lovorom. Prodinstaj luk i korjenasto povrće 10 min. Dodaj meso, podlij marinadu, kuhaj poklopljeno na tihoj vatri 3-4 sata. Dodaj suhe šljive i rajčicu zadnji sat. Umak pasira. Njoke kuhaj u slanoj vodi. Posluži meso narezano s njokima i umakom.",
        "components": [
            {"food": "Beef", "grams": 150, "displayName": "Govedina (but)"},
            {"food": "Gnocchi", "grams": 150, "displayName": "Njoki"},
            {"food": "Red wine", "grams": 50, "displayName": "Crno vino"},
            {"food": "Prunes", "grams": 30, "displayName": "Suhe šljive"},
            {"food": "Carrot", "grams": 40, "displayName": "Mrkva"},
            {"food": "Tomato paste", "grams": 20, "displayName": "Koncentrat rajčice"}
        ],
        "tags": ["traditional", "dalmatian", "special-occasion"],
        "suitableFor": ["gain"]
    },
    {
        "id": "dinner_trad_2",
        "name": "Gulaš s krumpirom",
        "description": "Kontinentalna klasika. Govedina pirjana s lukom i paprikom u gustom umaku. Krumpir upija sve okuse umaka. Zdrava verzija bez previše masti.",
        "image": "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400&h=300&fit=crop",
        "preparationTip": "Na malo ulja prodinstaj puno luka (200g) dok ne postane staklast - to je baza okusa. Dodaj govedinu narezanu na kocke, pirjaj 10 min. Dodaj papriku, čili, kumin. Podlij vodom da prekrije meso. Kuhaj poklopljeno 1.5-2 sata dok meso ne omekša. Krumpir nasjeckaj, dodaj zadnjih 30 min. Posluži s kruhom.",
        "components": [
            {"food": "Beef", "grams": 140, "displayName": "Govedina (but)"},
            {"food": "Potatoes", "grams": 150, "displayName": "Krumpir"},
            {"food": "Onion", "grams": 100, "displayName": "Luk (puno!)"},
            {"food": "Paprika powder", "grams": 10, "displayName": "Paprika mljevena"},
            {"food": "Olive oil", "grams": 15, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["traditional", "stew", "comfort-food"],
        "suitableFor": ["maintain", "gain"]
    },
    {
        "id": "dinner_trad_3",
        "name": "Saft od junetine s rižom",
        "description": "Tradicionalni pirjani saft. Junetina polako pirjana s lukom i rajčicom daje bogat umak. Posluži se s bijelom rižom koja upija sve sokove. Zdrava priprema bez pohanja.",
        "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
        "preparationTip": "Junetinu nasjeckaj na kocke, posoli. Na malo ulja prodinstaj luk i češnjak 5 min. Dodaj meso, pirjaj dok ne promijeni boju. Dodaj rajčicu, papriku, lovor. Podlij vodom, kuhaj poklopljeno na tihoj vatri 2 sata. Rižu skuhaj. Posluži meso s umakom preko riže.",
        "components": [
            {"food": "Beef", "grams": 140, "displayName": "Junetina"},
            {"food": "Rice", "grams": 80, "displayName": "Bijela riža"},
            {"food": "Onion", "grams": 60, "displayName": "Luk"},
            {"food": "Tomato", "grams": 100, "displayName": "Rajčica"},
            {"food": "Olive oil", "grams": 15, "displayName": "Maslinovo ulje"}
        ],
        "tags": ["traditional", "stew", "saft"],
        "suitableFor": ["maintain", "gain"]
    },
    {
        "id": "dinner_trad_4",
        "name": "Piletina tikka masala s rižom",
        "description": "Indijski klasik za ljubitelje začinjene hrane. Piletina u kremastom umaku od rajčice i jogurta sa začinima. Rižom basmati upijate umak.",
        "image": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
        "preparationTip": "Piletinu nasjeckaj, mariniraj u jogurtu i pola tikka paste 30 min. Propeci piletinu 5 min. Zasebno prodinstaj luk, dodaj ostatak paste 1 min. Ulij pasiranu rajčicu, kuhaj 5 min. Dodaj piletinu, kuhaj još 5 min. Posluži preko basmati riže s korihjandrom.",
        "components": [
            {"food": "Chicken breast", "grams": 150, "displayName": "Pileća prsa"},
            {"food": "Basmati rice", "grams": 60, "displayName": "Basmati riža"},
            {"food": "Greek yogurt", "grams": 50, "displayName": "Jogurt za marinadu"},
            {"food": "Tomato", "grams": 100, "displayName": "Pasirana rajčica"},
            {"food": "Tikka masala paste", "grams": 30, "displayName": "Tikka masala pasta"}
        ],
        "tags": ["indian", "spicy", "creamy"],
        "suitableFor": ["maintain"]
    }
]

# ========================================
# 7 NOVIH UŽINA
# ========================================
NEW_SNACK = [
    {
        "id": "snack_lose_7",
        "name": "Štapići od krastavca s humusom",
        "description": "Hrskava i osvježavajuća užina. Krastavac je 95% vode, humus pruža proteine i vlakna iz slanutka. Minimalne kalorije.",
        "image": "https://images.unsplash.com/photo-1628191139360-4083564d03fd?w=400&h=300&fit=crop",
        "preparationTip": "Krastavac operi, nasjeckaj na štapiće. Lagano posoli, ostavi 5 min, ocijedi. Humus stavi u zdjelicu, pospi paprikom. Umači štapiće.",
        "components": [
            {"food": "Cucumber", "grams": 150, "displayName": "Krastavac"},
            {"food": "Hummus", "grams": 60, "displayName": "Humus"}
        ],
        "tags": ["low-calorie", "vegetarian", "quick"],
        "suitableFor": ["lose"]
    },
    {
        "id": "snack_lose_8",
        "name": "Skyr s borovnicama",
        "description": "Islandski mliječni proizvod s najviše proteina. Skyr 0% mm s borovnicama i sjemenkama bundeve. Nizak šećer, visoki proteini.",
        "image": "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=400&h=300&fit=crop",
        "preparationTip": "Skyr stavi u zdjelu. Operi borovnice i rasporedi na vrh. Prelij medom, pospi sjemenkama. Posluži hladno.",
        "components": [
            {"food": "Skyr", "grams": 150, "displayName": "Skyr 0%"},
            {"food": "Blueberries", "grams": 80, "displayName": "Borovnice"},
            {"food": "Honey", "grams": 10, "displayName": "Med"},
            {"food": "Pumpkin seeds", "grams": 10, "displayName": "Sjemenke bundeve"}
        ],
        "tags": ["high-protein", "low-fat", "antioxidants"],
        "suitableFor": ["lose"]
    },
    {
        "id": "snack_lose_9",
        "name": "Zrnati sir s paprikom",
        "description": "Slana proteinska užina. Zrnati sir (cottage cheese) s hrskavom paprikom i vlascem. Puno proteina, malo kalorija.",
        "image": "https://images.unsplash.com/photo-1628191139360-4083564d03fd?w=400&h=300&fit=crop",
        "preparationTip": "Papriku operi, nasjeckaj na kockice. Zrnati sir stavi u zdjelu, dodaj papriku. Pospi nasjeckanim vlascem, lagano posoli i popapri. Promiješaj.",
        "components": [
            {"food": "Cottage cheese", "grams": 150, "displayName": "Zrnati sir"},
            {"food": "Bell pepper", "grams": 80, "displayName": "Crvena paprika"},
            {"food": "Chives", "grams": 5, "displayName": "Vlasac"}
        ],
        "tags": ["high-protein", "savory", "quick"],
        "suitableFor": ["lose"]
    },
    {
        "id": "snack_maintain_6",
        "name": "Jabuka s maslacem od badema",
        "description": "Klasična kombinacija jabuke i orašastog maslaca. Jabuka pruža vlakna i vitamine, maslac od badema zdrave masti i proteine.",
        "image": "https://images.unsplash.com/photo-1568702846914-96b305d2uj8f?w=400&h=300&fit=crop",
        "preparationTip": "Jabuku operi, nasjeckaj na kriške. Maslac od badema stavi u zdjelicu. Pospi cimetom. Umači kriške ili namazi maslac direktno.",
        "components": [
            {"food": "Apple", "grams": 180, "displayName": "Jabuka (veća)"},
            {"food": "Almond butter", "grams": 25, "displayName": "Maslac od badema"}
        ],
        "tags": ["healthy-fats", "fruit", "balanced"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "snack_maintain_7",
        "name": "Mix orašastih plodova",
        "description": "Klasični trail mix. Bademi, orasi, lješnjaci, sušene brusnice i tamna čokolada. Energetski gust, idealan za aktivne dane.",
        "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
        "preparationTip": "Bademe i lješnjake lagano tostraj na suhoj tavi. Ohladi. Pomiješaj s orasima, brusnicama i nasjeckanom čokoladom. Čuvaj u zatvorenoj posudi.",
        "components": [
            {"food": "Almonds", "grams": 20, "displayName": "Bademi"},
            {"food": "Walnuts", "grams": 15, "displayName": "Orasi"},
            {"food": "Hazelnuts", "grams": 15, "displayName": "Lješnjaci"},
            {"food": "Dried cranberries", "grams": 15, "displayName": "Sušene brusnice"},
            {"food": "Dark chocolate", "grams": 10, "displayName": "Tamna čokolada 70%+"}
        ],
        "tags": ["trail-mix", "portable", "energy"],
        "suitableFor": ["maintain"]
    },
    {
        "id": "snack_gain_11",
        "name": "Proteinski shake s bananom",
        "description": "Klasičan mass gainer shake. Mlijeko, protein prah, banana, zobene i kikiriki maslac. Preko 500 kcal u čaši.",
        "image": "https://images.unsplash.com/photo-1594498653385-d5172c532c00?w=400&h=300&fit=crop",
        "preparationTip": "U blender ulij mlijeko, dodaj protein prah, oguljenu bananu, zobene i kikiriki maslac. Miksaj 45 sek. Posluži odmah.",
        "components": [
            {"food": "Whey", "grams": 30, "displayName": "Protein prah"},
            {"food": "Milk", "grams": 300, "displayName": "Mlijeko 3.2%"},
            {"food": "Banana", "grams": 100, "displayName": "Banana"},
            {"food": "Oats", "grams": 20, "displayName": "Zobene pahuljice"},
            {"food": "Peanut butter", "grams": 15, "displayName": "Kikiriki maslac"}
        ],
        "tags": ["liquid-calories", "mass-gain", "shake"],
        "suitableFor": ["gain"]
    },
    {
        "id": "snack_gain_12",
        "name": "Rižini kolačići s kikiriki maslacem i bananom",
        "description": "Brza kalorična užina. Rižini kolačići namzani kikiriki maslacem, prekriveni bananom i prelijeveni medom.",
        "image": "https://images.unsplash.com/photo-1558745087-0cc0a3339c87?w=400&h=300&fit=crop",
        "preparationTip": "Rižine kolačiće položi na tanjur. Namazi kikiriki maslac. Bananu nasjeckaj na kolutiće, posloži na maslac. Prelij medom.",
        "components": [
            {"food": "Rice cakes", "grams": 20, "displayName": "Rižini kolačići (2 kom)"},
            {"food": "Peanut butter", "grams": 30, "displayName": "Kikiriki maslac"},
            {"food": "Banana", "grams": 50, "displayName": "Banana"},
            {"food": "Honey", "grams": 15, "displayName": "Med"}
        ],
        "tags": ["quick", "high-carb", "sweet"],
        "suitableFor": ["gain"]
    }
]


def main():
    print("📖 Učitavam postojeću bazu jela...")
    
    with open(MEAL_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"   Breakfast: {len(data['breakfast'])} jela")
    print(f"   Lunch: {len(data['lunch'])} jela")
    print(f"   Dinner: {len(data['dinner'])} jela")
    print(f"   Snack: {len(data['snack'])} jela")
    print(f"   UKUPNO: {len(data['breakfast']) + len(data['lunch']) + len(data['dinner']) + len(data['snack'])} jela")
    
    print("\n➕ Dodajem nova jela...")
    
    # Dodaj nova jela
    data['breakfast'].extend(NEW_BREAKFAST)
    data['lunch'].extend(NEW_LUNCH)
    data['dinner'].extend(NEW_DINNER)
    data['snack'].extend(NEW_SNACK)
    
    print(f"   +{len(NEW_BREAKFAST)} doručaka")
    print(f"   +{len(NEW_LUNCH)} ručkova")
    print(f"   +{len(NEW_DINNER)} večera")
    print(f"   +{len(NEW_SNACK)} užina")
    
    print("\n💾 Spremam ažuriranu bazu...")
    
    with open(MEAL_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    total_new = len(NEW_BREAKFAST) + len(NEW_LUNCH) + len(NEW_DINNER) + len(NEW_SNACK)
    total_final = len(data['breakfast']) + len(data['lunch']) + len(data['dinner']) + len(data['snack'])
    
    print("\n✅ ZAVRŠENO!")
    print(f"   Dodano: {total_new} novih jela")
    print(f"   Breakfast: {len(data['breakfast'])} jela")
    print(f"   Lunch: {len(data['lunch'])} jela")
    print(f"   Dinner: {len(data['dinner'])} jela")
    print(f"   Snack: {len(data['snack'])} jela")
    print(f"   NOVA UKUPNA BAZA: {total_final} jela")


if __name__ == "__main__":
    main()

