from parsers.base_parser import BaseParser
from parsers.figaro_parser import FigaroParser

# Import des parsers dispo (on en ajoutera au fur et à mesure)
# from parsers.pap_parser import PapParser
# from parsers.seloger_parser import SeLogerParser
# from parsers.leboncoin_parser import LeboncoinParser

PARSERS: dict[str, BaseParser] = {
    "figaro": FigaroParser(),
    # "pap.fr": PapParser(),
    # "seloger.com": SeLogerParser(),
    # "leboncoin.fr": LeboncoinParser(),
}

SENDER_MAP = {
    # Figaro Immobilier – list email  : contact@immobilier.lefigaro.fr
    # Figaro Immobilier – single alert: noreply@email2.immobilier.lefigaro.fr
    "immobilier.lefigaro.fr": "figaro",
    # "alerte@pap.fr": "pap.fr",
    # "alertes@seloger.com": "seloger.com",
    # "noreply@leboncoin.fr": "leboncoin.fr",
}

# Fallback sur le sujet du mail (pour forwards, redirections, etc.)
SUBJECT_KEYWORDS: list[tuple[str, str]] = [
    ("figaro", "figaro"),
    # ("pap.fr", "pap.fr"),
    # ("seloger", "seloger.com"),
    # ("leboncoin", "leboncoin.fr"),
]


def get_parser(sender: str, subject: str = "", html: str = "") -> BaseParser | None:
    """Retourne le bon parser : sender → subject → contenu HTML."""
    for known_sender, key in SENDER_MAP.items():
        if known_sender in sender:
            return PARSERS.get(key)
    subject_lower = subject.lower()
    for keyword, key in SUBJECT_KEYWORDS:
        if keyword in subject_lower:
            return PARSERS.get(key)
    if html:
        for parser in PARSERS.values():
            if parser.can_handle(html):
                return parser
    return None
