import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

DATA_DIR = Path(__file__).parent / "data"


def load(name):
    with open(DATA_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


QUESTS = load("quests")
PLACES = load("places")
DEALS = load("deals")
LOCATIONS = load("locations")

CATEGORIES = [
    "Food",
    "Adventure",
    "Culture",
    "Nature",
    "Nightlife",
    "Date",
    "Family",
    "Budget",
]

app = FastAPI(title="Kenya Quest API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def by_id(items, item_id):
    for item in items:
        if item["id"] == item_id:
            return item
    return None


def location_name(location_id):
    location = by_id(LOCATIONS, location_id)
    return location["name"] if location else location_id


def expand_quest(quest):
    return {
        **quest,
        "locationName": location_name(quest["location"]),
        "taskCount": len(quest["tasks"]),
    }


def expand_place(place):
    return {**place, "locationName": location_name(place["location"])}


def expand_deal(deal):
    place = by_id(PLACES, deal["placeId"])
    return {
        **deal,
        "placeName": place["name"] if place else None,
        "location": place["location"] if place else None,
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/categories")
def list_categories():
    counts = {c: 0 for c in CATEGORIES}
    for quest in QUESTS:
        for category in quest["category"]:
            if category in counts:
                counts[category] += 1
    return [{"name": c, "questCount": counts[c]} for c in CATEGORIES]


@app.get("/api/quests")
def list_quests(location: str | None = None, category: str | None = None):
    results = QUESTS
    if location:
        results = [q for q in results if q["location"] == location]
    if category:
        wanted = category.lower()
        results = [q for q in results if any(c.lower() == wanted for c in q["category"])]
    return [expand_quest(q) for q in results]


@app.get("/api/quests/{quest_id}")
def get_quest(quest_id: str):
    quest = by_id(QUESTS, quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    nearby = [expand_place(p) for p in PLACES if p["id"] in quest["nearbyPlaces"]]
    deals = [expand_deal(d) for d in DEALS if d["placeId"] in quest["nearbyPlaces"]]
    return {**expand_quest(quest), "nearby": nearby, "deals": deals}


@app.get("/api/places")
def list_places(location: str | None = None, type: str | None = None):
    results = PLACES
    if location:
        results = [p for p in results if p["location"] == location]
    if type:
        wanted = type.lower()
        results = [p for p in results if p["type"].lower() == wanted]
    return [expand_place(p) for p in results]


@app.get("/api/places/{place_id}")
def get_place(place_id: str):
    place = by_id(PLACES, place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    quests = [expand_quest(q) for q in QUESTS if place_id in q["nearbyPlaces"]]
    deals = [expand_deal(d) for d in DEALS if d["placeId"] == place_id]
    return {**expand_place(place), "quests": quests, "deals": deals}


@app.get("/api/locations")
def list_locations():
    return [
        {
            **location,
            "questCount": len([q for q in QUESTS if q["location"] == location["id"]]),
            "placeCount": len([p for p in PLACES if p["location"] == location["id"]]),
        }
        for location in LOCATIONS
    ]


@app.get("/api/locations/{location_id}")
def get_location(location_id: str):
    location = by_id(LOCATIONS, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    places = [p for p in PLACES if p["location"] == location_id]
    place_ids = {p["id"] for p in places}
    return {
        **location,
        "quests": [expand_quest(q) for q in QUESTS if q["location"] == location_id],
        "places": [expand_place(p) for p in places],
        "deals": [expand_deal(d) for d in DEALS if d["placeId"] in place_ids],
    }


@app.get("/api/deals")
def list_deals(location: str | None = None):
    results = [expand_deal(d) for d in DEALS]
    if location:
        results = [d for d in results if d["location"] == location]
    return results


@app.get("/api/search")
def search(q: str = ""):
    term = q.strip().lower()
    if not term:
        return {"query": q, "quests": [], "places": [], "locations": [], "categories": []}

    def hit(*fields):
        return any(term in str(f).lower() for f in fields if f)

    quests = [
        expand_quest(quest)
        for quest in QUESTS
        if hit(
            quest["title"],
            quest["description"],
            quest["difficulty"],
            location_name(quest["location"]),
            " ".join(quest["category"]),
            " ".join(t["label"] for t in quest["tasks"]),
        )
    ]
    places = [
        expand_place(place)
        for place in PLACES
        if hit(
            place["name"],
            place["description"],
            place["type"],
            place["price"],
            location_name(place["location"]),
        )
    ]
    locations = [
        location
        for location in LOCATIONS
        if hit(location["name"], location["tagline"], location["description"])
    ]
    categories = [c for c in CATEGORIES if term in c.lower()]
    return {
        "query": q,
        "quests": quests,
        "places": places,
        "locations": locations,
        "categories": categories,
    }
