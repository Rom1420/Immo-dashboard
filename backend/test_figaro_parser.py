"""
Script de test pour le parser Figaro.
Simule ce que fait gmail_fetcher.py : extrait le HTML du mail et appelle le parser.

Usage (depuis backend/) :
    python test_figaro_parser.py

Les .htm fournis sont des pages Gmail complètes sauvegardées depuis le navigateur.
Le HTML du mail est encodé en unicode-escape (\u003c…) à l'intérieur du JSON de la page.
Ce script l'extrait pour reproduire ce que Gmail API renvoie après décodage base64.
"""

import io
import re
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# --- On s'assure que le répertoire backend est dans le path
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(level=logging.DEBUG, format="%(levelname)s %(name)s: %(message)s")

from parsers.figaro_parser import FigaroParser


def extract_email_html_from_gmail_page(html_path: Path) -> list[str]:
    """
    Extrait le(s) corps HTML de mail(s) figaro depuis une page Gmail sauvegardée.
    Retourne une liste de blocs HTML (un par email figaro trouvé dans la page).

    Les pages Gmail sauvegardées stockent le HTML du mail en double-escaped
    JSON dans le JavaScript : \\u003c = < , \\u003e = > , etc.
    """
    raw = html_path.read_text(encoding="utf-8", errors="replace")

    # La page Gmail sauvegardée encapsule le HTML du mail dans du JS avec
    # des escape simples : \u003c = < , \u003e = > , puis \< \> \" \= \/ etc.
    decoded = re.sub(
        r"\\u([0-9a-fA-F]{4})",
        lambda m: chr(int(m.group(1), 16)),
        raw,
    )
    decoded = (decoded
               .replace('\\"', '"')
               .replace("\\<", "<")
               .replace("\\>", ">")
               .replace("\\=", "=")
               .replace("\\/", "/")
               .replace("\\\\", ""))

    # Find each Figaro email body block (starts at "Votre alerte «")
    # and ends before the next Figaro email or at end of file
    email_blocks = []
    positions = [m.start() for m in re.finditer(r"Votre alerte «", decoded)]

    for i, start in enumerate(positions):
        end = positions[i + 1] if i + 1 < len(positions) else len(decoded)
        block = decoded[start:end]

        # Only include Figaro Immobilier blocks (not other "alerte" emails)
        if "immobilier.lefigaro.fr" not in block and "lefigaro" not in block:
            continue

        # Wrap in minimal HTML so BeautifulSoup can parse it
        email_blocks.append(f"<html><body>{block}</body></html>")

    return email_blocks


def run_test(html_file: Path):
    print(f"\n{'='*60}")
    print(f"Fichier : {html_file.name}")
    print("="*60)

    blocks = extract_email_html_from_gmail_page(html_file)
    print(f"→ {len(blocks)} email(s) Figaro trouvé(s) dans la page\n")

    parser = FigaroParser()
    total = 0

    for i, html_block in enumerate(blocks, 1):
        print(f"--- Email {i} ---")
        annonces = parser.parse(html_block, datetime.now(timezone.utc))

        if not annonces:
            print("  ⚠ Aucune annonce extraite")
            continue

        for a in annonces:
            total += 1
            print(f"  [{total}] {a.titre}")
            print(f"       Prix     : {a.prix} €  |  Surface : {a.surface} m²  |  Prix/m² : {a.prix_m2}")
            print(f"       Arrdt    : {a.arrondissement}  |  Pièces : {a.nb_pieces}")
            print(f"       URL      : {a.url[:80]}…")
            print(f"       ID       : {a.id}")
            print()

    print(f"→ Total : {total} annonce(s) extraite(s)")


if __name__ == "__main__":
    mails_dir = Path(__file__).parent.parent / "mails"

    files = list(mails_dir.glob("figaro*.htm"))
    if not files:
        print(f"Aucun fichier figaro*.htm trouvé dans {mails_dir}")
        sys.exit(1)

    for f in sorted(files):
        run_test(f)
