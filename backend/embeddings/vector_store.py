"""
Layer 3: TrialVectorStore

ChromaDB-backed vector store for trial embeddings.

Key design decisions:
  - Collection name includes the embedding model name so OpenAI (1536-dim)
    and local (384-dim) embeddings never share a collection — ChromaDB
    would reject queries if dimensions were mixed.
  - upsert_trials() checks existing IDs before calling the embedding API
    so restarting the app doesn't re-bill OpenAI for already-embedded trials.
  - query() returns SemanticResult objects with cosine *similarity* [0, 1]
    (not raw ChromaDB cosine *distance* [0, 2]).
"""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from backend.ingestion.models import RawTrial
from .embedding_service import EmbeddingService
from .patient_profile import trial_to_embed_text

# Batch size for embedding API calls — conservative to respect rate limits.
_EMBED_BATCH_SIZE = 50


@dataclass
class SemanticResult:
    nct_id: str
    semantic_score: float   # cosine similarity, [0, 1]
    metadata: dict          # flat ChromaDB metadata dict for this trial


class TrialVectorStore:
    """
    Wraps a ChromaDB collection for semantic trial search.

    Usage:
        svc = EmbeddingService()
        store = TrialVectorStore(Path("data/chroma"), svc)
        await store.upsert_trials(trials)
        results = store.query(patient_embedding, top_k=20)
    """

    def __init__(
        self,
        persist_dir: Path,
        embedding_service: EmbeddingService,
        _chroma_client: Any = None,   # injected in tests (EphemeralClient)
    ):
        self._embed_svc = embedding_service
        self._persist_dir = Path(persist_dir)
        self._persist_dir.mkdir(parents=True, exist_ok=True)

        # Sanitize model name for ChromaDB collection naming rules
        safe_model = (
            embedding_service.model_name
            .replace("/", "_")
            .replace("-", "_")
            .replace(".", "_")
        )
        self._collection_name = f"trials_{safe_model}"

        if _chroma_client is not None:
            self._client = _chroma_client
        else:
            import chromadb
            self._client = chromadb.PersistentClient(path=str(self._persist_dir))

        self._collection = self._client.get_or_create_collection(
            name=self._collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def trial_count(self) -> int:
        return self._collection.count()

    @property
    def is_loaded(self) -> bool:
        return self._collection.count() > 0

    @property
    def collection_name(self) -> str:
        return self._collection_name

    # ------------------------------------------------------------------
    # Upserting trials
    # ------------------------------------------------------------------

    async def upsert_trials(self, trials: list[RawTrial]) -> dict:
        """
        Embed and upsert trials that are not already in the collection.

        Checks existing IDs first so a restart never re-calls the embedding
        API for trials already stored on disk.

        Returns {"embedded": N, "skipped": M}.
        """
        if not trials:
            return {"embedded": 0, "skipped": 0}

        all_ids = [t.nct_id for t in trials]

        # get() with include=[] returns only IDs — fastest existence check.
        existing_ids: set[str] = set(
            self._collection.get(ids=all_ids, include=[])["ids"]
        )

        new_trials = [t for t in trials if t.nct_id not in existing_ids]
        if not new_trials:
            return {"embedded": 0, "skipped": len(existing_ids)}

        new_texts = [trial_to_embed_text(t) for t in new_trials]
        all_embeddings: list[list[float]] = []

        for batch_start in range(0, len(new_texts), _EMBED_BATCH_SIZE):
            batch = new_texts[batch_start: batch_start + _EMBED_BATCH_SIZE]
            embeddings = await self._embed_svc.embed_batch(batch)
            all_embeddings.extend(embeddings)

        self._collection.upsert(
            ids=[t.nct_id for t in new_trials],
            embeddings=all_embeddings,
            documents=new_texts,
            metadatas=[self._trial_metadata(t) for t in new_trials],
        )

        return {"embedded": len(new_trials), "skipped": len(existing_ids)}

    # ------------------------------------------------------------------
    # Querying
    # ------------------------------------------------------------------

    def query(
        self,
        patient_embedding: list[float],
        top_k: int = 20,
    ) -> list[SemanticResult]:
        """
        Return top-K trials ranked by cosine similarity to the patient embedding.

        ChromaDB returns cosine *distance* (0 = identical, 1 = orthogonal).
        We convert: similarity = 1 - distance, clamped to [0, 1].
        """
        if self.trial_count == 0:
            return []

        n = min(top_k, self.trial_count)
        results = self._collection.query(
            query_embeddings=[patient_embedding],
            n_results=n,
            include=["metadatas", "distances"],
        )

        output: list[SemanticResult] = []
        for i, nct_id in enumerate(results["ids"][0]):
            distance = results["distances"][0][i]
            semantic_score = max(0.0, min(1.0, 1.0 - distance))
            output.append(
                SemanticResult(
                    nct_id=nct_id,
                    semantic_score=semantic_score,
                    metadata=results["metadatas"][0][i],
                )
            )

        return sorted(output, key=lambda r: r.semantic_score, reverse=True)

    # ------------------------------------------------------------------
    # Metadata serialization
    # ------------------------------------------------------------------

    @staticmethod
    def _trial_metadata(trial: RawTrial) -> dict:
        """
        Serialize trial fields to ChromaDB-compatible flat key-value pairs.
        ChromaDB metadata values must be str, int, float, or bool — no lists or dicts.
        Lists are JSON-encoded as strings and decoded by the scorer when needed.
        """
        return {
            "nct_id": trial.nct_id,
            "brief_title": trial.brief_title[:500],
            "overall_status": trial.overall_status or "",
            "phases": json.dumps(trial.phases),
            "conditions": json.dumps(trial.conditions[:10]),
            "minimum_age": trial.minimum_age or "",
            "maximum_age": trial.maximum_age or "",
            "sex": trial.sex or "",
            "locations_count": len(trial.locations),
            # True if at least one site has pre-geocoded lat/lon from the API
            "has_geo": any(
                loc.lat is not None and loc.lon is not None
                for loc in trial.locations
            ),
            "start_date": trial.start_date or "",
        }
