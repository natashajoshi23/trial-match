"""
FastAPI dependency functions for service singletons stored in app.state.

Each function pulls a service from app.state (set during lifespan startup).
Using Depends() instead of globals makes every dependency overridable in
tests via app.dependency_overrides[get_X] = lambda: mock_X.
"""

from fastapi import Request

from backend.ingestion.trial_fetcher import TrialFetcher
from backend.embeddings.embedding_service import EmbeddingService
from backend.embeddings.vector_store import TrialVectorStore
from backend.parser.eligibility_parser import EligibilityCriteriaParser
from backend.scorer.trial_scorer import TrialScorer
from backend.explainability.explainer import MatchExplainer
from backend.geo.geo_service import GeoService


def get_fetcher(request: Request) -> TrialFetcher:
    return request.app.state.fetcher


def get_embed_svc(request: Request) -> EmbeddingService:
    return request.app.state.embed_svc


def get_vector_store(request: Request) -> TrialVectorStore:
    return request.app.state.vector_store


def get_parser(request: Request) -> EligibilityCriteriaParser:
    return request.app.state.parser


def get_scorer(request: Request) -> TrialScorer:
    return request.app.state.scorer


def get_explainer(request: Request) -> MatchExplainer:
    return request.app.state.explainer


def get_geo(request: Request) -> GeoService:
    return request.app.state.geo
