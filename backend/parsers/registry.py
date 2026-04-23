from parsers.base_parser import BaseParser

# Import des parsers dispo (on en ajoutera au fur et à mesure)
# from parsers.pap_parser import PapParser
# from parsers.seloger_parser import SeLogerParser
# from parsers.leboncoin_parser import LeboncoinParser

PARSERS: dict[str, BaseParser] = {
    # "pap.fr": PapParser(),
    # "seloger.com": SeLogerParser(),
    # "leboncoin.fr": LeboncoinParser(),
}

SENDER_MAP = {
    # "alerte@pap.fr": "pap.fr",
    # "alertes@seloger.com": "seloger.com",
    # "noreply@leboncoin.fr": "leboncoin.fr",
}


def get_parser(sender: str) -> BaseParser | None:
    """Retourne le bon parser selon l'adresse expéditeur du mail."""
    for known_sender, key in SENDER_MAP.items():
        if known_sender in sender:
            return PARSERS.get(key)
    return None
