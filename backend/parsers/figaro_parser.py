"""
Parser pour les alertes mail de Figaro Immobilier.

Sender: contact@immobilier.lefigaro.fr

Deux formats d'email :
  - Liste  : "Paris 16ème : 10 nouvelles annonces correspondent à votre recherche"
  - Alerte : "Paris 15ème, ... : 1 annonce à considérer"

Structure d'une card dans le HTML :
  <div style="...border:1px solid #e4e7eb...">
    <table style="width:302px">          ← colonne photo
    <table style="...width:303px">       ← colonne infos
      <span style="...color:#151515;font-size:18px"> PRIX </span>
      <div style="color:#8d8d8d;...font-size:15px"> LOCALISATION </div>
      <td style="background-color:#ececec;border-radius:12px..."> TYPE / SURFACE / PIÈCES </td>
"""

import json
import logging
import re
import unicodedata
from datetime import datetime

from bs4 import BeautifulSoup

from models import Annonce, make_id
from .base_parser import BaseParser

logger = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _clean_price(text: str) -> int | None:
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None


def _clean_surface(text: str) -> float | None:
    m = re.search(r"(\d+(?:[,\.]\d+)?)", text)
    return float(m.group(1).replace(",", ".")) if m else None


_CITY_POSTAL: dict[str, str] = {
    # 92 - Hauts-de-Seine
    "nanterre": "92000", "boulogne-billancourt": "92100", "clichy": "92110",
    "montrouge": "92120", "issy-les-moulineaux": "92130", "clamart": "92140",
    "vanves": "92170", "meudon": "92190", "neuilly-sur-seine": "92200",
    "saint-cloud": "92210", "malakoff": "92240", "levallois-perret": "92300",
    "sevres": "92310", "courbevoie": "92400", "rueil-malmaison": "92500",
    "asnieres-sur-seine": "92600", "colombes": "92700", "puteaux": "92800",
    # 93 - Seine-Saint-Denis
    "montreuil": "93100", "bagnolet": "93170", "saint-ouen": "93400", "pantin": "93500",
    # 94 - Val-de-Marne
    "arcueil": "94110", "fontenay-sous-bois": "94120", "nogent-sur-marne": "94130",
    "saint-mande": "94160", "ivry-sur-seine": "94200", "charenton-le-pont": "94220",
    "cachan": "94230", "gentilly": "94250", "le-kremlin-bicetre": "94270",
    "vincennes": "94300", "joinville-le-pont": "94340", "maisons-alfort": "94700",
}


def _normalize_city(name: str) -> str:
    """'Neuilly-sur-Seine' → 'neuilly-sur-seine' (no accent, lowercase, hyphenated)."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    return ascii_str.lower().replace(" ", "-")


def _arrdt_from_location(location: str) -> str | None:
    """'Paris 15ème (75)' → '75015'   |   'Neuilly-sur-Seine (92)' → '92200'"""
    m = re.search(r"Paris\s+(\d{1,2})[eè]", location, re.IGNORECASE)
    if m:
        return f"75{int(m.group(1)):03d}"
    # Suburbs: extract city name before "(" and look up in known cities
    city_m = re.match(r"^(.+?)\s*\(", location)
    if city_m:
        slug = _normalize_city(city_m.group(1).strip())
        if slug in _CITY_POSTAL:
            return _CITY_POSTAL[slug]
    return None


def _real_img_src(img) -> str:
    """
    Dans l'email brut, src = URL figaro directe.
    Dans la page Gmail sauvegardée (tests), src = proxy Google avec vraie URL après '#'.
    """
    if not img:
        return ""
    src = img.get("src", "")
    if "googleusercontent.com" in src and "#" in src:
        src = src.split("#")[-1]
    return src


# ── Parser ─────────────────────────────────────────────────────────────────────

class FigaroParser(BaseParser):
    source = "figaro"
    html_signatures = ["immobilier.lefigaro.fr", "lefigaro.fr/immobilier"]

    def parse(self, mail_html: str, mail_date: datetime) -> list[Annonce]:
        soup = BeautifulSoup(mail_html, "html.parser")
        annonces = []
        seen_ids: set[str] = set()

        # Chaque card d'annonce est un div avec "border:1px solid #e4e7eb"
        cards = soup.find_all(
            "div",
            style=lambda s: s and "#e4e7eb" in s,
        )

        for card in cards:
            try:
                a = self._parse_card(card, mail_date)
                if a and a.id not in seen_ids:
                    seen_ids.add(a.id)
                    annonces.append(a)
            except Exception as exc:
                logger.debug("Figaro: erreur card — %s", exc)

        logger.info("Figaro: %d annonce(s) extraite(s)", len(annonces))
        return annonces

    def _parse_card(self, card, mail_date: datetime) -> Annonce | None:
        # ── Lien ──────────────────────────────────────────────────────────────
        link = card.find("a", title=lambda t: t and "annonce" in t.lower())
        if not link:
            return None
        url = link.get("href", "")
        if not url or "figaro" not in url:
            return None

        # ── Photo ─────────────────────────────────────────────────────────────
        img = card.find("img", alt="Image annonce")
        photo_src = _real_img_src(img)

        # ID stable : hash de l'image (figaro:IMAGEHASH)
        # Pattern src : /im/ALERT_ID/IMAGE_HASH.jpg
        hash_m = re.search(r"/im/\d+/([a-f0-9]{32,})\.", photo_src)
        stable_key = f"figaro:{hash_m.group(1)}" if hash_m else url

        # ── Prix ──────────────────────────────────────────────────────────────
        price_span = card.find(
            "span",
            style=lambda s: s and "color:#151515" in s and "font-size:18px" in s,
        )
        prix = _clean_price(price_span.get_text()) if price_span else None

        # ── Localisation ──────────────────────────────────────────────────────
        loc_div = card.find(
            "div",
            style=lambda s: s and "color:#8d8d8d" in s and "font-size:15px" in s,
        )
        location = loc_div.get_text(strip=True) if loc_div else ""
        arrondissement = _arrdt_from_location(location)

        # ── Tags (type, surface, pièces) ──────────────────────────────────────
        tags = card.find_all(
            "td",
            style=lambda s: s and "#ececec" in s and "border-radius:12px" in s,
        )
        type_bien: str | None = None
        surface: float | None = None
        nb_pieces: int | None = None

        for tag in tags:
            txt = tag.get_text(strip=True)
            if "m²" in txt:
                surface = _clean_surface(txt)
            elif "pièce" in txt.lower():
                m = re.search(r"(\d+)", txt)
                nb_pieces = int(m.group(1)) if m else None
            elif txt and not type_bien:
                type_bien = txt

        if not prix and not surface:
            # Card vide (header, footer…) → on ignore
            return None

        # ── Titre construit ───────────────────────────────────────────────────
        parts = [type_bien or "Appartement"]
        if surface:
            parts.append(f"{int(surface)}m²")
        if location:
            parts.append(location)
        titre = " · ".join(parts)

        photos = json.dumps([photo_src]) if photo_src else None

        return Annonce(
            id=make_id(stable_key),
            source=self.source,
            titre=titre,
            prix=prix,
            surface=surface,
            prix_m2=round(prix / surface, 1) if prix and surface else None,
            arrondissement=arrondissement,
            nb_pieces=nb_pieces,
            description=None,
            url=url,
            photos=photos,
            date_annonce=None,
            date_reception_mail=mail_date,
        )
