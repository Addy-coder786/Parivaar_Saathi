from typing import Literal

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    district: str
    trade: str
    learner_gender: Literal["female", "male", "other"]
    parent_relation: Literal["mother", "father", "guardian"]
    language: Literal["hinglish", "hindi", "english"] = "hinglish"
    # False = deterministic Demo Scenario Mode for this session even when an LLM key is configured.
    use_llm: bool = True


class MessageCreate(BaseModel):
    session_id: str
    persona: Literal["learner", "parent"]
    text: str = Field(min_length=1, max_length=1000)


class EscalationCreate(BaseModel):
    session_id: str
    reason: str = "Family asked to talk to a counsellor"


class EscalationUpdate(BaseModel):
    status: Literal["open", "in_progress", "closed"]


class ChannelSimulate(BaseModel):
    sender: str = Field(min_length=3, max_length=40)   # simulated phone number
    text: str = Field(default="", max_length=1000)


class SurveyResponse(BaseModel):
    district: str
    trade: str
    gender: Literal["female", "male", "other"] = "female"
    language: Literal["hi", "en"] = "hi"
    # keypad digits keyed by question: consent, working, pay_band, same_district, recommend
    answers: dict[str, Literal["1", "2", "3", "4", "5"]]


class SurveyRound(BaseModel):
    n: int = Field(default=12, ge=1, le=50)
    district: str | None = None
    trade: str | None = None


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    language: str = "hi"
