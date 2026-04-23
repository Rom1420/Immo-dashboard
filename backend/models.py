from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import hashlib


class Annonce(SQLModel, table=True):
    id: str = Field(primary_key=True)  # hash de l'URL
    source: str                         # "pap", "seloger", "leboncoin", etc.
    titre: str
    prix: Optional[int] = None          # en euros
    surface: Optional[float] = None     # en m²
    prix_m2: Optional[float] = None     # calculé auto
    arrondissement: Optional[str] = None  # "75011", "75018", etc.
    nb_pieces: Optional[int] = None
    description: Optional[str] = None
    url: str
    photos: Optional[str] = None        # JSON array d'URLs
    date_annonce: Optional[datetime] = None
    date_reception_mail: datetime = Field(default_factory=datetime.utcnow)

    # Champs utilisateur
    statut: str = "nouveau"             # nouveau | vu | intéressant | contacté | écarté
    note: str = ""
    note_score: int = 0                 # 0 à 5


def make_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()
