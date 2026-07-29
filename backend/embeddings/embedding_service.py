"""
Layer 3: EmbeddingService

Embeds text using OpenAI text-embedding-3-small.
Falls back to sentence-transformers/all-MiniLM-L6-v2 when:
  - No OPENAI_API_KEY is set, OR
  - force_local=True is passed, OR
  - OpenAI raises RateLimitError or APIError after 3 retries.

IMPORTANT: all embeddings in a single ChromaDB collection must share the same
dimension (OpenAI=1536, local=384). TrialVectorStore includes the model name in
its collection name so mixing never occurs — but callers should use one
EmbeddingService instance per session and not switch backends mid-run.
"""

import asyncio
import os
from typing import Optional

OPENAI_MODEL = "text-embedding-3-small"
LOCAL_MODEL = "all-MiniLM-L6-v2"

OPENAI_EMBED_DIM = 1536
LOCAL_EMBED_DIM = 384

# Retry delays: 2s → 4s → 8s (exponential backoff, per spec)
_RETRY_DELAYS = (2.0, 4.0, 8.0)


class EmbeddingService:
    """
    Thin wrapper around OpenAI embeddings with a sentence-transformers fallback.

    Both the OpenAI client and the local SentenceTransformer model are
    lazily initialized on first use so importing this module is cheap (no
    heavy model download at import time).
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        force_local: bool = False,
    ):
        self._api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self._force_local = force_local

        # Choose the active backend now so callers can read .model_name
        # before making any API calls.
        self._backend = "local" if (force_local or not self._api_key) else "openai"

        # Lazily initialized
        self._openai_client = None
        self._local_model = None

    # ------------------------------------------------------------------
    # Public properties
    # ------------------------------------------------------------------

    @property
    def model_name(self) -> str:
        return OPENAI_MODEL if self._backend == "openai" else LOCAL_MODEL

    @property
    def embedding_dim(self) -> int:
        return OPENAI_EMBED_DIM if self._backend == "openai" else LOCAL_EMBED_DIM

    @property
    def using_local(self) -> bool:
        return self._backend == "local"

    # ------------------------------------------------------------------
    # Public embedding interface
    # ------------------------------------------------------------------

    async def embed(self, text: str) -> list[float]:
        results = await self.embed_batch([text])
        return results[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if self._backend == "openai":
            return await self._embed_openai(texts)
        return await self._embed_local(texts)

    # ------------------------------------------------------------------
    # OpenAI backend
    # ------------------------------------------------------------------

    def _get_openai_client(self):
        if self._openai_client is None:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(api_key=self._api_key)
        return self._openai_client

    async def _embed_openai(self, texts: list[str]) -> list[list[float]]:
        import openai

        client = self._get_openai_client()
        last_error: Optional[Exception] = None

        for attempt, delay in enumerate(_RETRY_DELAYS):
            try:
                response = await client.embeddings.create(
                    input=texts,
                    model=OPENAI_MODEL,
                )
                return [item.embedding for item in response.data]
            except (openai.RateLimitError, openai.APIError) as exc:
                last_error = exc
                if attempt < len(_RETRY_DELAYS) - 1:
                    await asyncio.sleep(delay)
                else:
                    # All retries exhausted — switch to local fallback for this session.
                    print(
                        f"[EmbeddingService] OpenAI failed after {len(_RETRY_DELAYS)} "
                        f"retries ({exc}). Falling back to sentence-transformers."
                    )
                    self._backend = "local"
                    return await self._embed_local(texts)

        raise RuntimeError("Unreachable") from last_error

    # ------------------------------------------------------------------
    # Local (sentence-transformers) backend
    # ------------------------------------------------------------------

    def _get_local_model(self):
        if self._local_model is None:
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer(LOCAL_MODEL)
        return self._local_model

    async def _embed_local(self, texts: list[str]) -> list[list[float]]:
        """
        Run sentence-transformers in a thread pool.
        SentenceTransformer.encode() is synchronous and CPU-bound;
        run_in_executor keeps the event loop unblocked during encoding.
        """
        model = self._get_local_model()
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: model.encode(texts, convert_to_numpy=True).tolist(),
        )
        return embeddings
