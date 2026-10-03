"""Map data for the dashboard: nearby opportunities and training centres around a district.

Positions are ILLUSTRATIVE. Each record is placed at its dataset distance from the district HQ at a
deterministic bearing, so the radius and distances are faithful to the data but the exact spot is not a
real address. The API says so in `note`, and the UI shows it.
"""
import math

from app.db import connect
from app.seed_data import DEMO_AS_OF, DEMO_SOURCE, DISTRICT_COORDS, TRADES
from app.services.evidence_engine import JOB_RADIUS_KM

GOLDEN_ANGLE = 137.508
CENTRE_BEARING = 35.0  # degrees; keeps the centre off the HQ point and away from the busiest ring
ROAD_KMH = 18  # rough local road speed for the commute estimate (demo assumption)
NOTE = ("Demo data. Locations are illustrative: each opportunity is placed at its dataset distance from the "
        "district HQ, not at a real address.")


def _offset(lng: float, lat: float, km: float, bearing_deg: float) -> tuple[float, float]:
    b = math.radians(bearing_deg)
    dlat = (km * math.cos(b)) / 110.574
    dlng = (km * math.sin(b)) / (111.320 * math.cos(math.radians(lat)))
    return round(lng + dlng, 5), round(lat + dlat, 5)


def _commute_minutes(km: float) -> int:
    return max(5, int(round(km / ROAD_KMH * 60 / 5.0)) * 5)


def _entry_wages(conn, district: str) -> dict[str, str]:
    rows = conn.execute(
        "SELECT trade, value FROM evidence WHERE district = ? AND category = 'income' AND label LIKE 'Entry-level%'",
        (district,),
    ).fetchall()
    return {r["trade"]: r["value"] for r in rows}


def _courses(conn, district: str) -> dict[str, str]:
    rows = conn.execute(
        "SELECT trade, course_name, nsqf_level FROM training_centres WHERE district = ?", (district,)
    ).fetchall()
    return {r["trade"]: f"{r['course_name']} — NSQF Level {r['nsqf_level']}" for r in rows}


def opportunities(district: str, trade: str | None = None) -> dict | None:
    if district not in DISTRICT_COORDS:
        return None
    if trade and trade not in TRADES:
        trade = None
    hq = DISTRICT_COORDS[district]
    with connect() as conn:
        query = "SELECT * FROM jobs WHERE district = ?"
        params: list = [district]
        if trade:
            query += " AND trade = ?"
            params.append(trade)
        rows = conn.execute(query + " ORDER BY distance_km", params).fetchall()
        wages = _entry_wages(conn, district)
        courses = _courses(conn, district)
        centre = conn.execute(
            "SELECT * FROM training_centres WHERE district = ? ORDER BY distance_km LIMIT 1", (district,)
        ).fetchone()

    opps = []
    for r in rows:
        lng, lat = _offset(hq["lng"], hq["lat"], r["distance_km"], (r["id"] * GOLDEN_ANGLE) % 360)
        opps.append({
            "id": r["id"],
            "employer": r["employer"],
            "role": r["role"],
            "trade": r["trade"],
            "distance_km": r["distance_km"],
            "within_radius": r["distance_km"] <= JOB_RADIUS_KM,
            "commute_min": _commute_minutes(r["distance_km"]),
            "openings": r["openings"],
            "shift": r["shift"],
            "employment_type": r["employment_type"],
            "entry_wage": wages.get(r["trade"]),
            "course": courses.get(r["trade"]),
            "lng": lng,
            "lat": lat,
        })

    inside = [o for o in opps if o["within_radius"]]
    by_trade: dict[str, dict] = {}
    for o in inside:
        t = by_trade.setdefault(o["trade"], {"trade": o["trade"], "count": 0, "openings": 0, "entry_wage": o["entry_wage"]})
        t["count"] += 1
        t["openings"] += o["openings"]

    centres = []
    if centre:
        clng, clat = _offset(hq["lng"], hq["lat"], centre["distance_km"], CENTRE_BEARING)
        centres.append({
            "name": centre["name"],
            "distance_km": centre["distance_km"],
            "commute_min": _commute_minutes(centre["distance_km"]),
            "female_staff": centre["female_staff"],
            "cctv": centre["cctv"],
            "transport": centre["transport"],
            "training_hours": centre["training_hours"],
            "course": courses.get(trade) if trade else None,
            "lng": clng,
            "lat": clat,
        })

    n = len(inside)
    return {
        "district": district,
        "state": hq["state"],
        "trade": trade,
        "center": {"lng": hq["lng"], "lat": hq["lat"]},
        "radius_km": JOB_RADIUS_KM,
        "opportunities": opps,
        "centres": centres,
        "summary": {
            "count": n,
            "openings": sum(o["openings"] for o in inside),
            "nearest_km": inside[0]["distance_km"] if inside else None,
            "apprenticeships": sum(1 for o in inside if o["employment_type"] == "Apprenticeship"),
            "day_shift_pct": round(100 * sum(1 for o in inside if o["shift"] == "Day shift") / n) if n else None,
            "beyond_radius": len(opps) - n,
            "by_trade": sorted(by_trade.values(), key=lambda t: -t["count"]),
        },
        "source": DEMO_SOURCE,
        "as_of": DEMO_AS_OF,
        "demo": True,
        "note": NOTE,
    }
