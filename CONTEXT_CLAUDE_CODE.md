# Contexte pour Claude Code — Immo Dashboard

## Ce qu'on construit
Un dashboard web pour centraliser les alertes immobilières reçues par mail.
La personne cherche un appartement à Paris et s'est inscrite aux alertes sur PAP, SeLoger, Leboncoin, BienIci.

## Architecture
```
Gmail dédié (alertes immo) 
  → Gmail API (lecture mails)
  → Parsers Python (extraction structurée)
  → SQLite (stockage)
  → API FastAPI (backend)
  → React + Vite (dashboard frontend, à faire)
```

## Stack technique
- **Backend** : Python, FastAPI, SQLModel, SQLite
- **Auth Gmail** : OAuth2 via google-auth-oauthlib
- **Scheduler** : APScheduler (sync toutes les 30min)
- **Frontend** : React + Vite + TailwindCSS (pas encore créé)

## État actuel du projet
Le backend est scaffoldé et fonctionnel SAUF les parsers.
Les parsers seront ajoutés plus tard quand on aura de vrais mails d'alerte à analyser.

## Ce qui reste à faire
1. Initialiser le frontend React (Vite + Tailwind)
2. Créer les parsers quand les vrais mails arrivent
3. Déployer sur VPS Hetzner (2€/mois)

## Structure des fichiers
```
backend/
├── main.py              → API FastAPI (tous les endpoints)
├── gmail_fetcher.py     → Auth Gmail + lecture + dispatch
├── models.py            → Schéma SQLModel (Annonce)
├── database.py          → Engine SQLite
├── requirements.txt
└── parsers/
    ├── __init__.py
    ├── base_parser.py   → Classe abstraite à hériter
    └── registry.py      → Dispatch sender → parser (tout commenté pour l'instant)
```

## Comment ajouter un parser
1. Créer `backend/parsers/pap_parser.py` qui hérite de `BaseParser`
2. Implémenter `parse(mail_html: str, mail_date: datetime) -> list[Annonce]`
3. Décommenter l'import dans `parsers/registry.py`
4. Ajouter l'adresse expéditeur dans `SENDER_MAP`

## Endpoints API disponibles
- GET  /annonces          → liste avec filtres (prix, surface, statut, source, arrdt)
- GET  /annonces/:id      → détail
- PUT  /annonces/:id/statut → changer statut (nouveau|vu|intéressant|contacté|écarté)
- PUT  /annonces/:id/note   → ajouter commentaire + score étoiles
- GET  /stats             → stats globales
- POST /sync              → sync manuelle
- GET  /sync/status       → état dernière sync

## Ne pas oublier
- credentials.json et token.json sont dans .gitignore (ne jamais commiter)
- Copier .env.example → .env avant de lancer
- Premier lancement : `python gmail_fetcher.py` pour faire l'auth OAuth (ouvre le navigateur)
