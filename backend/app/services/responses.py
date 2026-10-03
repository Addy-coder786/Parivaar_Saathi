"""Deterministic reply templates (Demo Scenario Mode) in Hinglish and English.

Templates only point to the proof cards; any number in the text is copied from a card item,
never invented. Hindi (Devanagari) replies are produced by the LLM only; in template mode a
Hindi session falls back to Hinglish.
"""

OBJECTION_LABELS = {
    "income": "Income",
    "employment": "Career viability",
    "safety": "Safety",
    "social_status": "Social status",
    "distance": "Distance",
    "placement": "Placement",
}

_T = {
    "hinglish": {
        "intro": {
            "employment": "Aapki chinta samajh mein aati hai — kya is kaam mein aage future hai. Andaaze ki jagah {district} ka data dekhte hain.",
            "income": "Salary ka sawaal bilkul sahi hai. {district} mein {trade} ki kamai ka data neeche hai.",
            "safety": "Beti ki suraksha sabse pehle hai. Training centre ki safety jaankari neeche di gayi hai.",
            "social_status": "Izzat ka sawaal samajh mein aata hai. Course ke baad aage badhne ka raasta neeche dekhiye.",
            "distance": "Doori ek asli chinta hai. Sabse paas ke training centre ki jaankari neeche hai.",
            "placement": "Placement ke baare mein seedha data dekhna behtar hai. Pichhle batch ke reported results neeche hain.",
        },
        "jobs": "Demo dataset ke hisaab se 15 km ke andar {jobs} opportunities dikh rahi hain.",
        "entry": "Shuruaati kamai: {entry}.",
        "refusal_tail": "Agar phir bhi mann nahi maan raha, toh hum ek human counsellor se baat karwa sakte hain.",
        "source_tail": "Har jaankari ke saath source diya gaya hai.",
        "no_evidence": "{district} mein {trade} ke liye is sawaal ka data abhi hamare demo dataset mein nahi hai. Hum andaaza nahi lagayenge — ek counsellor aapse is baare mein baat kar sakte hain.",
        "learner_goal": "Learner ka goal note kiya: {trade} ({district}). Parent ji, aapki koi bhi chinta ho — salary, naukri, suraksha, izzat ya doori — poochiye. Hum data ke saath jawab denge.",
        "learner_message": "Noted. Aap kaunsa course ya kaam seekhna chahte hain?",
        "parent_message": "Dhanyavaad. Kya aap bata sakte hain aapki chinta kis baare mein hai — salary, naukri, suraksha, izzat, doori ya placement?",
        "refusal_only": "Aapki baat samajh gaye. Kis baat ki chinta sabse zyada hai, bataiye — ya hum ek human counsellor se baat karwa sakte hain.",
        "acceptance": "Dhanyavaad. Aapne jo sawaal poochhe, unka data upar diya gaya hai. Agla kadam: centre visit aur admission ki jaankari counsellor ke saath tay kar sakte hain.",
        "escalation_note": "Humne aapka case ek human counsellor ko bhej diya hai (Case #{case_id}). Woh aapki baaki chintaon par seedhe baat karenge.",
        "manual_escalation": "Bilkul. Ek human counsellor aapse sampark karenge (Case #{case_id}).",
    },
    "english": {
        "intro": {
            "employment": "Your concern makes sense — is there a future in this work? Instead of guessing, let's look at the data for {district}.",
            "income": "Salary is a fair question. The wage data for {trade} in {district} is below.",
            "safety": "Your daughter's safety comes first. The training centre's safety details are below.",
            "social_status": "The question of respect is understandable. The progression after the course is shown below.",
            "distance": "Distance is a real concern. Details of the nearest training centre are below.",
            "placement": "On placement, it is better to look at the data directly. The last batch's reported results are below.",
        },
        "jobs": "The demo dataset shows {jobs} opportunities within 15 km.",
        "entry": "Starting pay: {entry}.",
        "refusal_tail": "If you are still not convinced, we can connect you with a human counsellor.",
        "source_tail": "Every figure comes with its source.",
        "no_evidence": "We do not yet have data on this question for {trade} in {district} in our demo dataset. We will not guess — a counsellor can discuss it with you.",
        "learner_goal": "Learner's goal noted: {trade} ({district}). Parents, please ask any concern you have — salary, jobs, safety, respect or distance. We will answer with data.",
        "learner_message": "Noted. Which course or trade would you like to learn?",
        "parent_message": "Thank you. Could you tell us what your concern is about — salary, jobs, safety, respect, distance or placement?",
        "refusal_only": "We understand. Please tell us which concern matters most — or we can connect you with a human counsellor.",
        "acceptance": "Thank you. The data for the questions you asked is above. Next step: a counsellor can arrange a centre visit and admission details.",
        "escalation_note": "We have passed your case to a human counsellor (Case #{case_id}). They will discuss your remaining concerns directly.",
        "manual_escalation": "Of course. A human counsellor will contact you (Case #{case_id}).",
    },
}


def _t(language: str) -> dict:
    return _T.get(language, _T["hinglish"])


def _first_value(cards: list[dict], label_prefix: str) -> str | None:
    for card in cards:
        for item in card["items"]:
            if item["label"].startswith(label_prefix):
                return item["value"]
    return None


def objection_reply(objection: str, district: str, trade: str, cards: list[dict], refusal: bool, language: str = "hinglish") -> str:
    t = _t(language)
    if not cards:
        return t["no_evidence"].format(district=district, trade=trade)
    parts = [t["intro"][objection].format(district=district, trade=trade)]
    jobs = _first_value(cards, "Active opportunities")
    if jobs:
        parts.append(t["jobs"].format(jobs=jobs))
    entry = _first_value(cards, "Entry-level")
    if entry:
        parts.append(t["entry"].format(entry=entry))
    if refusal:
        parts.append(t["refusal_tail"])
    parts.append(t["source_tail"])
    return " ".join(parts)


def learner_goal_reply(trade: str, district: str, language: str = "hinglish") -> str:
    return _t(language)["learner_goal"].format(trade=trade, district=district)


def learner_message_reply(language: str = "hinglish") -> str:
    return _t(language)["learner_message"]


def parent_message_reply(language: str = "hinglish") -> str:
    return _t(language)["parent_message"]


def refusal_only_reply(language: str = "hinglish") -> str:
    return _t(language)["refusal_only"]


def acceptance_reply(language: str = "hinglish") -> str:
    return _t(language)["acceptance"]


def escalation_note(case_id: int, language: str = "hinglish") -> str:
    return _t(language)["escalation_note"].format(case_id=case_id)


def manual_escalation_reply(case_id: int, language: str = "hinglish") -> str:
    return _t(language)["manual_escalation"].format(case_id=case_id)
