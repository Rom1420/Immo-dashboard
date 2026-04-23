# Immo Dashboard

Dashboard centralisé pour suivre les alertes immobilières reçues par mail.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copier `.env.example` → `.env` et y mettre le chemin vers `credentials.json` (téléchargé depuis Google Cloud Console).

## Premier lancement (auth Gmail)

```bash
python gmail_fetcher.py
```

Une fenêtre navigateur s'ouvre pour autoriser l'accès Gmail. Un `token.json` est créé automatiquement — ne pas commiter.

## Lancer l'API

```bash
uvicorn main:app --reload
```

API dispo sur `http://localhost:8000`  
Docs interactives : `http://localhost:8000/docs`

## Ajouter un parser

1. Créer `backend/parsers/nom_parser.py` qui hérite de `BaseParser`
2. Implémenter la méthode `parse(mail_html, mail_date) -> list[Annonce]`
3. Décommenter l'import et l'entrée dans `parsers/registry.py`

## Structure

```
backend/
├── main.py              # API FastAPI
├── gmail_fetcher.py     # Connexion Gmail + orchestration
├── models.py            # Schéma SQLModel
├── database.py          # Engine SQLite
└── parsers/
    ├── base_parser.py   # Classe abstraite
    ├── registry.py      # Dispatch source → parser
    ├── pap_parser.py    # À créer
    └── seloger_parser.py # À créer
```
