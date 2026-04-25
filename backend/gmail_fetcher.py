import base64
import os
import json
import logging
from datetime import datetime, timezone
from email import message_from_bytes

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from sqlmodel import Session, select

from database import engine
from models import Annonce
from parsers.registry import get_parser

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

_HERE = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.getenv("GMAIL_CREDENTIALS_FILE", os.path.join(_HERE, "credentials.json"))
TOKEN_FILE = os.getenv("GMAIL_TOKEN_FILE", os.path.join(_HERE, "token.json"))


def get_gmail_service():
    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                raise FileNotFoundError(
                    f"credentials.json introuvable : {CREDENTIALS_FILE}\n"
                    "Télécharge-le depuis Google Cloud Console et place-le dans backend/"
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def get_mail_body(payload) -> str:
    """Extrait le HTML du payload Gmail (gère multipart)."""
    if payload.get("mimeType") == "text/html":
        data = payload.get("body", {}).get("data", "")
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

    if "parts" in payload:
        for part in payload["parts"]:
            result = get_mail_body(part)
            if result:
                return result

    return ""


def sync() -> dict:
    """
    Récupère les nouveaux mails d'alerte et les parse en annonces.
    Retourne un résumé : { fetched, new, skipped, errors }
    """
    logger.info("Démarrage de la sync Gmail...")
    service = get_gmail_service()

    # Récupère les mails non lus dans la boîte de réception
    results = service.users().messages().list(
        userId="me",
        labelIds=["INBOX", "UNREAD"],
        maxResults=50,
    ).execute()

    messages = results.get("messages", [])
    logger.info(f"{len(messages)} mails non lus trouvés")

    stats = {"fetched": len(messages), "new": 0, "skipped": 0, "errors": 0}

    with Session(engine) as session:
        for msg_ref in messages:
            try:
                msg = service.users().messages().get(
                    userId="me", id=msg_ref["id"], format="full"
                ).execute()

                headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
                sender = headers.get("From", "")
                subject = headers.get("Subject", "")
                date_str = headers.get("Date", "")

                mail_html = get_mail_body(msg["payload"])
                parser = get_parser(sender, subject, mail_html)
                if not parser:
                    logger.info(f"Pas de parser pour : {sender} | sujet: {subject}")
                    stats["skipped"] += 1
                    continue
                mail_date = datetime.now(timezone.utc)  # fallback

                annonces = parser.parse(mail_html, mail_date)

                for annonce in annonces:
                    existing = session.get(Annonce, annonce.id)
                    if not existing:
                        session.add(annonce)
                        stats["new"] += 1
                        logger.info(f"Nouvelle annonce : {annonce.titre} ({annonce.source})")
                    else:
                        stats["skipped"] += 1

                session.commit()

            except Exception as e:
                logger.error(f"Erreur sur le mail {msg_ref['id']} : {e}")
                stats["errors"] += 1

    logger.info(f"Sync terminée : {stats}")
    return stats


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = sync()
    print(result)
