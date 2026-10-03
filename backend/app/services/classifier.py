"""Deterministic Hinglish classifier (Demo Scenario Mode).

Persona comes from the UI selector; the classifier only determines intent/objection.
Output shape matches the master context:
{persona, intent, objection, severity, needs_evidence, refusal, trade}
"""
import re

# Order matters: the first matching category wins when several match.
OBJECTION_PATTERNS: list[tuple[str, list[str]]] = [
    ("safety", [r"safe", r"surakshit", r"suraksha", r"ladki", r"beti", r"betiyon", r"khatra", r"\bdar\b", r"raat",
                r"harass", r"daughter", r"\bgirl"]),
    ("social_status", [r"izzat", r"degree", r"log kya", r"\bsamaj\b", r"status", r"rishta", r"chhota kaam", r"sharam",
                       r"\brespect", r"people (will )?say", r"marriage", r"\bshame"]),
    ("placement", [r"placement", r"guarantee", r"pakki naukri", r"certificate ke baad"]),
    ("income", [r"salary", r"paisa", r"paise", r"kamai", r"income", r"kitna milega", r"tankhwah", r"tankha", r"wage", r"kamayega", r"kamayegi",
                r"\bearn", r"\bpay\b", r"\bmoney\b"]),
    ("distance", [r"\bdoor\b", r"\bdur\b", r"\bpaas\b", r"distance", r"aana jaana", r"travel", r"kitni door", r"\bfar\b", r"commute"]),
    ("employment", [r"\bjob", r"naukri", r"future", r"scope", r"kaam milega", r"rozgar", r"bhavishya", r"career", r"\bemploy"]),
]

REFUSAL_PATTERNS = [r"phir bhi", r"bilkul nahi", r"nahi karne denge", r"nahi karegi", r"nahi karega", r"nahi chahiye", r"mana hai", r"allow nahi",
                    r"\bstill no\b", r"not allow", r"won'?t let", r"\brefuse", r"\bnever\b"]

TRADE_PATTERNS = [
    ("Solar Technician", [r"solar"]),
    ("Electrician", [r"electrician", r"bijli", r"wireman"]),
    ("Welder", [r"weld"]),
    ("CNC Operator", [r"\bcnc\b"]),
    ("Healthcare Assistant", [r"healthcare", r"nurse", r"nursing", r"health"]),
]

ACCEPTANCE_PATTERNS = [r"theek hai", r"thik hai", r"samajh gay", r"\baccha\b", r"\bachha\b", r"\bhaan\b", r"manzoor",
                       r"kar sakti hai", r"kar sakta hai", r"ijazat", r"\bok\b", r"bhej denge", r"join kar",
                       r"\bokay\b", r"\bfine\b", r"\bagree", r"\bconvinced\b", r"\bunderstood\b", r"\bthank", r"go ahead",
                       r"let (her|him|them) join", r"\byes\b", r"makes sense"]

GOAL_PATTERNS = [r"karna hai", r"karni hai", r"banna hai", r"banana hai", r"seekhna hai", r"join", r"chahta", r"chahti", r"want"]


def _match(text: str, patterns: list[str]) -> bool:
    return any(re.search(p, text) for p in patterns)


def classify(persona: str, text: str) -> dict:
    t = text.lower()
    trade = next((name for name, pats in TRADE_PATTERNS if _match(t, pats)), None)

    if persona == "learner":
        is_goal = trade is not None or _match(t, GOAL_PATTERNS)
        return {
            "persona": "learner",
            "intent": "learner_goal" if is_goal else "learner_message",
            "objection": None,
            "severity": None,
            "needs_evidence": False,
            "refusal": False,
            "trade": trade,
        }

    objection = next((cat for cat, pats in OBJECTION_PATTERNS if _match(t, pats)), None)
    refusal = _match(t, REFUSAL_PATTERNS)
    accepted = not objection and not refusal and _match(t, ACCEPTANCE_PATTERNS)
    if objection:
        intent = "objection"
    elif refusal:
        intent = "refusal"
    elif accepted:
        intent = "acceptance"
    else:
        intent = "parent_message"
    return {
        "persona": "parent",
        "intent": intent,
        "objection": objection,
        "severity": "high" if refusal else ("medium" if objection else None),
        "needs_evidence": objection is not None,
        "refusal": refusal,
        "trade": trade,
    }
