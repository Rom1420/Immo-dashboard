import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from apscheduler.schedulers.background import BackgroundScheduler

from database import init_db, get_session
from models import Annonce
from gmail_fetcher import sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# État de la dernière sync
last_sync: dict = {"date": None, "stats": None, "running": False}

scheduler = BackgroundScheduler()


def scheduled_sync():
    last_sync["running"] = True
    try:
        stats = sync()
        last_sync["date"] = datetime.utcnow().isoformat()
        last_sync["stats"] = stats
    except Exception as e:
        logger.error(f"Erreur sync planifiée : {e}")
    finally:
        last_sync["running"] = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Sync toutes les 30 minutes
    scheduler.add_job(scheduled_sync, "interval", minutes=30, id="gmail_sync")
    scheduler.start()
    logger.info("Scheduler démarré (sync toutes les 30min)")
    yield
    scheduler.shutdown()


app = FastAPI(title="Immo Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Annonces ──────────────────────────────────────────────────────────────────

@app.get("/annonces", response_model=list[Annonce])
def list_annonces(
    statut: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    prix_max: Optional[int] = Query(None),
    prix_min: Optional[int] = Query(None),
    surface_min: Optional[float] = Query(None),
    arrondissement: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    query = select(Annonce)

    if statut:
        query = query.where(Annonce.statut == statut)
    if source:
        query = query.where(Annonce.source == source)
    if prix_max:
        query = query.where(Annonce.prix <= prix_max)
    if prix_min:
        query = query.where(Annonce.prix >= prix_min)
    if surface_min:
        query = query.where(Annonce.surface >= surface_min)
    if arrondissement:
        query = query.where(Annonce.arrondissement == arrondissement)

    query = query.order_by(Annonce.date_reception_mail.desc())
    return session.exec(query).all()


@app.get("/annonces/{annonce_id}", response_model=Annonce)
def get_annonce(annonce_id: str, session: Session = Depends(get_session)):
    annonce = session.get(Annonce, annonce_id)
    if not annonce:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return annonce


@app.put("/annonces/{annonce_id}/statut")
def update_statut(
    annonce_id: str,
    body: dict,
    session: Session = Depends(get_session),
):
    annonce = session.get(Annonce, annonce_id)
    if not annonce:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")

    statuts_valides = {"nouveau", "vu", "intéressant", "contacté", "écarté"}
    nouveau_statut = body.get("statut")
    if nouveau_statut not in statuts_valides:
        raise HTTPException(status_code=400, detail=f"Statut invalide : {nouveau_statut}")

    annonce.statut = nouveau_statut
    session.add(annonce)
    session.commit()
    return {"ok": True, "statut": annonce.statut}


@app.put("/annonces/{annonce_id}/note")
def update_note(
    annonce_id: str,
    body: dict,
    session: Session = Depends(get_session),
):
    annonce = session.get(Annonce, annonce_id)
    if not annonce:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")

    if "note" in body:
        annonce.note = body["note"]
    if "note_score" in body:
        score = int(body["note_score"])
        if not 0 <= score <= 5:
            raise HTTPException(status_code=400, detail="Score doit être entre 0 et 5")
        annonce.note_score = score

    session.add(annonce)
    session.commit()
    return {"ok": True}


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/stats")
def get_stats(session: Session = Depends(get_session)):
    annonces = session.exec(select(Annonce)).all()

    by_statut = {}
    by_source = {}
    prix_list = [a.prix for a in annonces if a.prix]
    prix_m2_list = [a.prix_m2 for a in annonces if a.prix_m2]

    for a in annonces:
        by_statut[a.statut] = by_statut.get(a.statut, 0) + 1
        by_source[a.source] = by_source.get(a.source, 0) + 1

    return {
        "total": len(annonces),
        "by_statut": by_statut,
        "by_source": by_source,
        "prix_median": sorted(prix_list)[len(prix_list) // 2] if prix_list else None,
        "prix_m2_median": sorted(prix_m2_list)[len(prix_m2_list) // 2] if prix_m2_list else None,
    }


# ── Sync ──────────────────────────────────────────────────────────────────────

@app.post("/sync")
def trigger_sync():
    if last_sync["running"]:
        return {"ok": False, "message": "Sync déjà en cours"}
    import threading
    threading.Thread(target=scheduled_sync, daemon=True).start()
    return {"ok": True, "message": "Sync lancée"}


@app.get("/sync/status")
def sync_status():
    return last_sync
