# 🏠 Dashboard Immo — Plan d'implémentation

> **Concept** : Une boîte Gmail dédiée reçoit toutes les alertes des sites immo. Un pipeline automatique parse ces mails et alimente un dashboard web pour suivre, filtrer et noter les annonces.

---

## Vue d'ensemble de l'architecture

```
Sites immo (SeLoger, PAP, Leboncoin…)
        ↓ alertes mail
  Gmail dédié (ex: recherche.appart@gmail.com)
        ↓ Gmail API / Make
  Parser Python (extraction structurée)
        ↓
  Base de données SQLite / Supabase
        ↓
  API FastAPI
        ↓
  Dashboard React (filtres, statuts, carte)
        ↓ optionnel
  Notification Telegram (nouvelle annonce urgente)
```

---

## Phase 0 — Setup initial (1-2h)

### 0.1 Créer une adresse Gmail dédiée
- Créer `recherche.appart.prenom@gmail.com` (ou utiliser un sous-dossier Gmail existant)
- S'inscrire sur **tous** les sites immo avec cette adresse
- Configurer les alertes avec les filtres souhaités :
  - Paris (arrondissements cibles)
  - Budget max
  - Surface min
  - Type de bien (appartement, meublé…)

**Sites recommandés à couvrir :**
| Site | Qualité alertes mail | Notes |
|------|---------------------|-------|
| PAP | ⭐⭐⭐ Excellente | Format mail propre, pas d'agence |
| SeLoger | ⭐⭐⭐ Très bonne | Couvre bien les agences |
| Leboncoin | ⭐⭐ Correcte | Particuliers + agences |
| BienIci | ⭐⭐ Correcte | Agrège plusieurs sources |
| Logic-Immo | ⭐⭐ Correcte | Agences exclusivement |

### 0.2 Activer l'API Gmail
- Aller sur [Google Cloud Console](https://console.cloud.google.com)
- Créer un projet → activer **Gmail API**
- Créer des credentials OAuth 2.0 (type "Desktop App")
- Télécharger `credentials.json`
- Scope nécessaire : `https://www.googleapis.com/auth/gmail.readonly`

---

## Phase 1 — Backend Python (1 weekend)

### 1.1 Structure du projet

```
immo-dashboard/
├── backend/
│   ├── main.py              # Point d'entrée FastAPI
│   ├── gmail_fetcher.py     # Connexion Gmail API
│   ├── parsers/
│   │   ├── __init__.py
│   │   ├── base_parser.py   # Classe abstraite
│   │   ├── pap_parser.py
│   │   ├── seloger_parser.py
│   │   ├── leboncoin_parser.py
│   │   └── bienici_parser.py
│   ├── database.py          # SQLite avec SQLModel
│   ├── scheduler.py         # APScheduler (polling toutes les 30min)
│   ├── notifier.py          # Telegram optionnel
│   └── models.py            # Schéma de données
├── frontend/                # Phase 2
├── credentials.json         # Gmail OAuth (ne pas commiter !)
├── .env
└── requirements.txt
```

### 1.2 Modèle de données

```python
# models.py
class Annonce(SQLModel, table=True):
    id: str                    # hash unique (url ou id annonce)
    source: str                # "pap", "seloger", etc.
    titre: str
    prix: int                  # en euros
    surface: float             # en m²
    prix_m2: float             # calculé automatiquement
    arrondissement: str        # "75011", "75018", etc.
    nb_pieces: int
    description: str
    url: str
    photos: str                # JSON array d'URLs
    date_annonce: datetime
    date_reception_mail: datetime
    
    # Champs utilisateur
    statut: str = "nouveau"    # nouveau | vu | intéressant | contacté | écarté
    note: str = ""             # commentaire libre
    note_score: int = 0        # 0 à 5 étoiles
```

### 1.3 Gmail Fetcher

```python
# gmail_fetcher.py — logique principale
# 1. S'authentifier via OAuth (token.json en cache)
# 2. Lister les mails non lus depuis la dernière sync
# 3. Pour chaque mail :
#    - Identifier la source (From: header ou sujet)
#    - Déléguer au bon parser
#    - Sauvegarder en BDD si pas déjà présent (dédoublonnage par URL)
# 4. Marquer les mails comme lus
```

**Dépendances :**
```
google-auth-oauthlib
google-api-python-client
beautifulsoup4
sqlmodel
fastapi
uvicorn
apscheduler
python-dotenv
httpx
```

### 1.4 Parsers par site

Chaque parser reçoit le **HTML du mail** et retourne un objet `Annonce`. 

Stratégie de parsing :
- **PAP** : Format très stable, balises claires (`<td class="price">`)
- **SeLoger** : Utilise des spans avec data-attributes
- **Leboncoin** : HTML minifié, cibler les meta og: tags qui sont plus stables
- **BienIci** : Format JSON-LD présent dans le mail (jackpot)

> 💡 **Tip Claude Code** : Faire forward d'un vrai mail d'alerte de chaque site dans un fichier `.html` de test, puis demander à Claude Code de parser chaque fichier. Bien plus efficace que de coder à l'aveugle.

### 1.5 API FastAPI

**Endpoints à implémenter :**

```
GET  /annonces              → liste avec filtres (prix, surface, statut, source, arrdt)
GET  /annonces/:id          → détail d'une annonce
PUT  /annonces/:id/statut   → changer le statut
PUT  /annonces/:id/note     → ajouter commentaire / score
GET  /stats                 → prix médian, nb par source, nb par statut
POST /sync                  → déclencher une sync manuelle
GET  /sync/status           → dernière sync, nb mails traités
```

---

## Phase 2 — Frontend React (1 weekend)

### 2.1 Stack recommandée

```
React + Vite
TailwindCSS (ou shadcn/ui pour aller vite)
TanStack Query (fetch + cache)
Leaflet.js (carte interactive)
```

### 2.2 Vues principales

**Vue Liste** (page principale)
- Tableau des annonces triable (prix, surface, date)
- Filtres latéraux : fourchette de prix, surface min, nb pièces, arrondissements, source, statut
- Badge coloré par statut
- Miniature de la première photo
- Clic → ouvre le détail ou redirige vers l'annonce originale

**Vue Carte**
- Pins sur une carte Leaflet centrée sur Paris
- Couleur du pin = statut de l'annonce
- Popup au survol avec prix + surface
- Filtres synchronisés avec la vue liste

**Vue Détail (modale ou page)**
- Carousel photos
- Toutes les infos de l'annonce
- Sélecteur de statut (boutons)
- Champ note libre + étoiles
- Lien vers l'annonce originale

**Vue Stats** (bonus)
- Prix médian par arrondissement
- Histogram prix/m²
- Répartition par source
- Timeline des annonces reçues

### 2.3 Composants clés

```
<AnnonceCard />         → carte résumé dans la liste
<StatutBadge />         → badge coloré avec dropdown
<FiltrePanel />         → panneau de filtres
<CarteImmo />           → Leaflet wrapper
<StatsBoard />          → graphiques récap
<SyncStatus />          → état de la dernière sync (header)
```

---

## Phase 3 — Déploiement (2-3h)

### Option A — Tout en local (0€)
- Backend Python tourne en arrière-plan sur le PC
- Frontend servi en local
- Sync manuelle ou cron Windows/macOS
- ⚠️ Nécessite que le PC soit allumé

### Option B — VPS Hetzner (2-4€/mois) ✅ Recommandé
```bash
# Sur le VPS Ubuntu
git clone ...
pip install -r requirements.txt
# Configurer credentials Gmail
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend buildé et servi par Nginx
npm run build
# → dist/ servi par Nginx

# Cron toutes les 30min
crontab -e
*/30 * * * * cd /app && python -c "from gmail_fetcher import sync; sync()"
```

### Option C — Railway / Render (0-5€/mois)
- Backend déployé en 1 clic depuis GitHub
- Supabase pour la base de données (free tier)
- Vercel pour le frontend (gratuit)
- Variables d'env pour les credentials

---

## Phase 4 — Notifications Telegram (optionnel, 1-2h)

Pour les annonces vraiment intéressantes (coup de cœur automatique selon critères).

```python
# notifier.py
# Si une annonce dépasse un score seuil (ex: prix/m² < X et surface > Y)
# → envoyer un message Telegram avec lien direct

# Setup :
# 1. Créer un bot via @BotFather
# 2. Récupérer le token + chat_id
# 3. httpx.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", ...)
```

---

## Résumé du planning

| Étape | Durée estimée | Dépendances |
|-------|--------------|-------------|
| Phase 0 — Gmail setup + alertes | 1-2h | Aucune |
| Phase 1 — Backend Python | 1 weekend | Vrais mails reçus pour tester les parsers |
| Phase 2 — Frontend React | 1 weekend | API Phase 1 fonctionnelle |
| Phase 3 — Déploiement | 2-3h | Phase 1 + 2 |
| Phase 4 — Notifs Telegram | 1-2h | Phase 1 |
| **Total** | **~3 weekends** | |

---

## Ordre de vibe coding avec Claude Code

1. `models.py` + `database.py` → base solide
2. `gmail_fetcher.py` → tester avec vrais mails
3. Un parser à la fois (PAP en premier, le plus propre)
4. Endpoints FastAPI basiques (liste + update statut)
5. Frontend : vue liste d'abord, carte après
6. Déploiement
7. Parsers des autres sites au fur et à mesure

> 💡 **Stratégie** : Commencer avec juste PAP et SeLoger. Une fois que le pipeline est stable, ajouter les autres sources prend 1-2h chacune.

---

## Points de vigilance

- **Ne jamais commiter `credentials.json` et `token.json`** → dans `.gitignore`
- **Dédoublonnage** : hasher l'URL de l'annonce comme ID unique (même annonce peut arriver via plusieurs alertes)
- **Rate limiting Gmail API** : 250 quota units/seconde, largement suffisant
- **Maintenance parsers** : si un site change son template mail, le parser casse. Prévoir des logs d'erreur clairs.
