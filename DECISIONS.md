# Technical Decisions

Seven design decisions that shaped the architecture of the Clinical Trial Matcher, with the reasoning and trade-offs behind each.

---

## 1. Hybrid scoring (semantic + eligibility + geo) instead of pure semantic search

**Decision:** Final match score is a weighted blend of three independent axes rather than relying on embedding similarity alone.

```
final_score = 0.40 × semantic + 0.40 × eligibility + 0.20 × geo
```

**Why:** Semantic similarity alone is a poor proxy for clinical eligibility. A trial for "HER2-negative breast cancer" can score high semantic similarity against a HER2-positive patient because the condition terms overlap — yet the patient is hard-excluded. Structured eligibility parsing catches hard contradictions that embeddings miss. Geographic proximity matters to real patients and is orthogonal to both other signals. Equal weight on semantic and eligibility reflects that neither alone is sufficient; geo gets a lower weight because location is a practical filter, not a clinical fit criterion.

**Trade-off:** Three scores require three subsystems. The approach is more complex than a single ranking signal, but each component is independently testable (51 scorer tests, 48 explainability tests, etc.) and the weights are easy to tune.

---

## 2. ChromaDB over a managed vector database

**Decision:** Local ChromaDB with file persistence rather than Pinecone, Weaviate, or pgvector.

**Why:** This is a portfolio project meant to run with a single `docker compose up` command. Managed vector DBs require account creation, API keys, and network access, which adds friction for anyone evaluating the project. ChromaDB supports the same cosine-similarity queries with zero external dependencies, persists to a local directory, and can be swapped for a production store without changing the query interface (`TrialVectorStore` is the only class that touches ChromaDB). The collection name includes the embedding model name (`trial-match-{model}`) to prevent dimension-mismatch errors if someone switches models.

**Trade-off:** ChromaDB is not horizontally scalable and has no replication. That is fine here — trials are fetched per-search, embeddings are reused across requests via the persistent collection, and the dataset size (hundreds to a few thousand trials per query) fits easily in local storage.

---

## 3. sentence-transformers fallback so the app works without an OpenAI key

**Decision:** `EmbeddingService` tries OpenAI `text-embedding-3-small` (1536-dim) first; if `OPENAI_API_KEY` is absent it falls back to `sentence-transformers/all-MiniLM-L6-v2` (384-dim, runs locally).

**Why:** Requiring an API key to run a portfolio demo is a significant barrier. The local fallback lets anyone `docker compose up` and get working results immediately. The collection name includes the model name so the two variants never share a ChromaDB collection (different embedding dimensions would cause a silent mismatch that corrupts similarity scores). The OpenAI path gives better semantic quality and is used in production; the local path makes the project self-contained.

**Trade-off:** Maintaining two code paths adds complexity to `EmbeddingService` and requires tests to stub both. The 384-dim MiniLM model is weaker than `text-embedding-3-small`, so result quality degrades without an API key — acceptable for a demo.

---

## 4. spaCy + regex for eligibility parsing instead of an LLM call per trial

**Decision:** `EligibilityCriteriaParser` uses spaCy `en_core_web_sm` for named-entity recognition and hand-written regex patterns to extract age bounds, sex requirements, ECOG limits, biomarker mentions, and medication exclusions from free-text eligibility criteria.

**Why:** Eligibility criteria follow highly regular language patterns ("Age 18–75 years", "ECOG performance status 0 or 1", "HER2-positive tumour confirmed"). Rule-based extraction is fast (< 1 ms per trial), deterministic (100% reproducible for the same input), and requires no API call. Parsing happens inside the per-request pipeline for potentially 60 candidates simultaneously — an LLM call per trial would add 60× network latency. The hard-exclusion checks (age, sex, biomarker conflicts) are the highest-stakes part of the pipeline; rule-based extraction keeps them auditable.

**Trade-off:** The rule engine is brittle on unusual phrasing and will mark constraints as "uncertain" rather than parsed when the pattern doesn't match. An LLM extractor would handle more edge cases but at 100× higher latency and cost. The "uncertain" bucket in the explanation output is the safety valve: it tells the user which criteria could not be confirmed.

---

## 5. Haversine (pure Python) instead of a mapping API for geo distance

**Decision:** Geographic distance between patient ZIP centroid and trial sites is computed with the Haversine great-circle formula implemented in 8 lines of Python, using lat/lon coordinates returned directly by the ClinicalTrials.gov API (`geoPoint.lat`, `geoPoint.lon`).

**Why:** The ClinicalTrials.gov v2 API returns pre-geocoded coordinates on every trial location, so no mapping API is needed to geocode trial sites. Haversine is exact enough for the use case — the geo score uses coarse distance bands (≤ 25 mi / 25–100 mi / > 100 mi), so a few miles of great-circle vs. driving-distance error doesn't change the score. Removing the Google Maps dependency eliminates another API key requirement, another potential rate limit, and another failure mode. Nominatim (via geopy) handles the one geocoding step that is needed: patient ZIP → lat/lon.

**Trade-off:** Haversine is the straight-line distance, not driving distance. A trial 26 miles away across a bay could be unreachable by road. For a clinical context, driving time would be more meaningful — but it would require a routing API and add latency to every request.

---

## 6. FastAPI lifespan for service singletons + `Depends()` for testable dependency injection

**Decision:** Heavy services (EmbeddingService, TrialVectorStore, spaCy parser, TrialScorer, MatchExplainer, GeoService) are initialised once in the FastAPI lifespan startup hook and stored in `app.state`. Test code overrides them via `app.dependency_overrides`.

**Why:** `EmbeddingService` loads a sentence-transformers model into memory on first construction (~200 ms). Constructing it per-request would make the API unusably slow. Storing it in `app.state` and injecting it via `Depends()` gives a clear separation between "singleton that lives for the process" and "value computed per-request". In tests, `dependency_overrides` replaces the real services with lightweight stubs — no actual HTTP calls to ClinicalTrials.gov or OpenAI, no real ChromaDB collection, sub-millisecond test runs.

**Trade-off:** `app.state` is global mutable state, which limits horizontal scaling to shared-nothing deployments (each process holds its own in-memory vector store). For a portfolio project that runs as a single Docker container this is not a concern. If the project were scaled, the right move is to point all replicas at a shared ChromaDB cluster rather than per-process state.

---

## 7. EphemeralClient with UUID collection names for ChromaDB test isolation

**Decision:** In tests, `TrialVectorStore` uses `EphemeralClient()` (in-memory, no disk I/O) with a UUID-based collection name generated fresh per test.

**Why:** ChromaDB's `EphemeralClient` is a process-level singleton — all code in the same process shares the same in-memory store. If two tests create a collection with the same name, one will see the other's data. Using a UUID suffix (`trial-match-{model}-{uuid}`) means each test gets an empty, isolated collection with no teardown required. This was discovered after intermittent test failures caused by cross-test contamination when a fixed collection name was reused.

**Trade-off:** Every test that uses a vector store creates a fresh collection, so there is no warm-up benefit between tests. This is intentional: test isolation is worth more than test speed here. The UUID approach also documents the general pattern: never assume a named collection is empty; always use a name that encodes both the model (for dimension safety) and a uniqueness token (for isolation).
