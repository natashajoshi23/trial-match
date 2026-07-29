# Clinical Trial Matcher

An end-to-end AI pipeline that matches a patient profile against recruiting clinical trials from [ClinicalTrials.gov](https://clinicaltrials.gov), ranked by semantic relevance, structured eligibility fit, and geographic proximity.

---

## What it does

Given a patient profile (age, sex, condition, biomarkers, ZIP code, medications, etc.) the system:

1. **Fetches** recruiting trials from the ClinicalTrials.gov v2 API for the patient's condition
2. **Embeds** both the trials and the patient narrative as dense vectors
3. **Retrieves** top candidates via cosine similarity search (ChromaDB)
4. **Scores** each candidate across three independent axes — semantic relevance, structured eligibility, and geographic proximity — then blends them into a single final score
5. **Explains** each match in plain language (why eligible, what's uncertain, why excluded), with optional GPT-4o-mini narrative
6. Returns ranked results through a REST API consumed by a React frontend

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│         (Vite · TypeScript · Tailwind CSS)               │
│                                                          │
│  PatientForm ──► useMatch hook ──► POST /api/match       │
│  MatchCard  ◄── score ring · eligibility sections        │
└────────────────────────┬────────────────────────────────┘
                         │  HTTP / nginx proxy
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                        │
│                                                          │
│  POST /api/match                                         │
│  │                                                       │
│  ├─ 1. GeoService ──► Nominatim (geopy) → lat/lon        │
│  │                                                       │
│  ├─ 2. TrialFetcher ──► clinicaltrials.gov v2 API        │
│  │       └─ JSON cache (backend/data/cache/)             │
│  │                                                       │
│  ├─ 3. EmbeddingService ──► OpenAI text-embedding-3-small│
│  │       └─ fallback: sentence-transformers/MiniLM-L6    │
│  │                                                       │
│  ├─ 4. TrialVectorStore (ChromaDB) ──► cosine similarity │
│  │       └─ persist: backend/data/chroma/                │
│  │                                                       │
│  ├─ 5. EligibilityCriteriaParser (spaCy + regex)         │
│  │       └─ age / sex / ECOG / biomarkers / medications  │
│  │                                                       │
│  ├─ 6. TrialScorer                                       │
│  │       └─ 0.40 × semantic                              │
│  │          0.40 × eligibility                           │
│  │          0.20 × geo (Haversine)                       │
│  │                                                       │
│  └─ 7. MatchExplainer ──► template + optional GPT-4o-mini│
│                                                          │
│  GET /api/health  (liveness probe)                       │
└─────────────────────────────────────────────────────────┘
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| API server | FastAPI 0.115 + Uvicorn |
| Data validation | Pydantic v2 |
| NLP parsing | spaCy `en_core_web_sm` + regex |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) with `all-MiniLM-L6-v2` fallback (384-dim) |
| Vector store | ChromaDB (local persistent) |
| Geocoding | Nominatim via geopy (no API key required) |
| Geo distance | Haversine formula — pure Python, no external service |
| Explainability | Template-based + optional GPT-4o-mini narrative |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| Containerisation | Docker (multi-stage) · docker-compose |
| Testing | pytest · pytest-asyncio (222 tests, 7 layers) |
| Trial data | ClinicalTrials.gov v2 REST API (free, no key) |

---

## Project structure

```
trial-match/
├── backend/
│   ├── api/               # Layer 7 — FastAPI app, routes, DI
│   │   ├── main.py
│   │   ├── models.py
│   │   └── dependencies.py
│   ├── ingestion/         # Layer 1 — TrialFetcher, data models
│   ├── embeddings/        # Layer 2 — EmbeddingService, ChromaDB vector store
│   ├── parser/            # Layer 3 — EligibilityCriteriaParser
│   ├── scorer/            # Layer 4 — TrialScorer, MatchExplanation
│   ├── explainability/    # Layer 5 — MatchExplainer (template + LLM)
│   ├── geo/               # Layer 6 — ZipCodeGeocoder, GeoService
│   └── data/              # runtime — chroma/ and cache/ (git-ignored)
├── frontend/
│   ├── src/
│   │   ├── components/    # PatientForm, MatchCard, MatchResults, ScoreBar, TagInput
│   │   ├── hooks/         # useMatch
│   │   ├── api.ts
│   │   └── types.ts
│   ├── Dockerfile
│   └── nginx.conf
├── backend/Dockerfile
├── docker-compose.yml
├── requirements.txt        # full (dev + test)
├── requirements-prod.txt   # production only
├── pyproject.toml
└── .env.example
```

---

## Scoring model

```
final_score = 0.40 × semantic_score
            + 0.40 × eligibility_score
            + 0.20 × geo_score
```

**Semantic score** — cosine similarity between the patient narrative embedding and the trial embedding, normalised to [0, 1].

**Eligibility score** — structured rule evaluation:

| Constraint | Hard exclusion? |
|-----------|----------------|
| Age out of range | Yes — score = 0.0 |
| Sex mismatch | Yes |
| ECOG exceeds limit | Yes (when both known) |
| Biomarker conflict (e.g. HER2+ vs HER2− required) | Yes |
| Excluded medication match | Yes |
| Other criteria | Soft pass / uncertain |

**Geo score** — nearest trial site to patient ZIP centroid (Haversine):

| Distance | Score |
|----------|-------|
| ≤ 25 mi | 1.0 |
| 25–100 mi | 0.5 |
| > 100 mi | 0.1 |
| Unknown | 0.5 (neutral) |

**Match tiers** — headline label by final score:

| Score | Tier |
|-------|------|
| ≥ 0.80 | Strong match |
| ≥ 0.60 | Potential match |
| ≥ 0.40 | Weak match |
| < 0.40 | Poor match |
| Hard exclusion | Excluded |

---

## Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker + Docker Compose (for containerised run)

### Local development

**Backend**

```bash
cd trial-match

# Create and activate a virtual environment
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download the spaCy model
python -m spacy download en_core_web_sm

# (Optional) set your OpenAI key — falls back to local model if absent
export OPENAI_API_KEY=sk-...

# Run the API server
uvicorn backend.api.main:app --reload --port 8000
```

**Frontend**

```bash
cd trial-match/frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `localhost:8000` automatically.

### Docker (recommended for production-like testing)

```bash
cd trial-match

# (Optional) create .env with your OpenAI key
cp .env.example .env
# edit .env — OPENAI_API_KEY=sk-...

docker compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:8000
- API docs → http://localhost:8000/docs

On subsequent starts the vector store and trial cache are persisted in Docker named volumes (`chroma_data`, `cache_data`).

---

## API reference

### `GET /api/health`

Liveness probe.

```json
{ "status": "ok" }
```

### `POST /api/match`

Match a patient profile against recruiting trials.

**Request body**

```jsonc
{
  "patient": {
    "age": 52,
    "sex": "female",                     // "male" | "female" | "other"
    "condition": "HER2-positive breast cancer",
    "zip_code": "10001",
    "ecog_status": 1,                    // 0–4, or null
    "biomarkers": ["HER2+", "ER-"],      // optional
    "current_medications": ["trastuzumab"],
    "prior_treatments": ["surgery", "radiation"],
    "comorbidities": ["hypertension"],
    "additional_notes": ""
  },
  "top_k": 10,                           // 1–50, default 10
  "max_distance_miles": null             // null = no limit
}
```

**Response body**

```jsonc
{
  "matches": [
    {
      "nct_id": "NCT04567890",
      "brief_title": "...",
      "final_score": 0.87,
      "headline": "Strong match — HER2+ profile aligns with primary eligibility criteria",
      "summary": "...",
      "why_eligible": ["HER2+ biomarker confirmed", "..."],
      "why_uncertain": ["Brain metastasis status not specified"],
      "why_excluded": [],
      "score_breakdown": {
        "semantic": 0.91,
        "eligibility": 0.85,
        "geo": 0.78
      },
      "hard_excluded": false,
      "distance_miles": 2.4,
      "llm_narrative": null,
      "overall_status": "RECRUITING",
      "phases": ["PHASE2"],
      "conditions": ["Breast Cancer"],
      "locations_count": 8
    }
  ],
  "total_trials_fetched": 247,
  "total_trials_scored": 60,
  "patient_lat": 40.7128,
  "patient_lon": -74.006
}
```

---

## Running the tests

```bash
cd trial-match
pip install -r requirements.txt
python -m spacy download en_core_web_sm
pytest                          # runs all 222 tests across 7 layers
pytest backend/scorer/          # single layer
pytest -v --tb=short            # verbose with short tracebacks
```

All tests are fully isolated — no network calls, no shared state between test runs. ChromaDB uses `EphemeralClient` with UUID-based collection names per test.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *(absent)* | Enables OpenAI `text-embedding-3-small`. Falls back to `all-MiniLM-L6-v2` when unset. |
| `CHROMA_DIR` | `backend/data/chroma` | ChromaDB persistence directory |
| `CACHE_DIR` | `backend/data/cache` | Trial JSON cache directory |
