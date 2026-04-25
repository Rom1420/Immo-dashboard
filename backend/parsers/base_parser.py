from abc import ABC, abstractmethod
from typing import Optional
from models import Annonce, make_id
from datetime import datetime


class BaseParser(ABC):
    """
    Classe de base pour tous les parsers de mails immo.
    Chaque site hérite de cette classe et implémente `parse`.
    """

    source: str = "unknown"

    # Chaînes recherchées dans le HTML pour détecter la source (fallback forward)
    html_signatures: list[str] = []

    def can_handle(self, html: str) -> bool:
        """Retourne True si le HTML contient une signature connue de cette source."""
        return any(sig in html for sig in self.html_signatures)

    def parse(self, mail_html: str, mail_date: datetime) -> list[Annonce]:
        """
        Reçoit le HTML brut du mail et la date de réception.
        Retourne une liste d'annonces (un mail peut contenir plusieurs annonces).
        """
        raise NotImplementedError

    def build_annonce(
        self,
        url: str,
        titre: str,
        prix: Optional[int] = None,
        surface: Optional[float] = None,
        arrondissement: Optional[str] = None,
        nb_pieces: Optional[int] = None,
        description: Optional[str] = None,
        photos: Optional[str] = None,
        date_annonce: Optional[datetime] = None,
        mail_date: Optional[datetime] = None,
    ) -> Annonce:
        prix_m2 = round(prix / surface, 1) if prix and surface else None
        return Annonce(
            id=make_id(url),
            source=self.source,
            titre=titre,
            prix=prix,
            surface=surface,
            prix_m2=prix_m2,
            arrondissement=arrondissement,
            nb_pieces=nb_pieces,
            description=description,
            url=url,
            photos=photos,
            date_annonce=date_annonce,
            date_reception_mail=mail_date or datetime.utcnow(),
        )
