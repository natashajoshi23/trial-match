"""
Layer 6: ZipCodeGeocoder

Converts US zip codes to (lat, lon) coordinates using the Nominatim geocoding
service (OpenStreetMap), with in-memory caching and rate limiting.

Design notes:
  - Nominatim's usage policy requires a maximum of 1 request/second and a
    descriptive user-agent string. Both are enforced here.
  - Successful AND failed lookups are cached so a bad zip code doesn't trigger
    repeated network calls in a single session.
  - The Nominatim client and rate-limit delay are injectable via constructor
    parameters so unit tests run without any network access.
  - lookup_async() runs the synchronous lookup in a thread-pool executor to
    keep the FastAPI event loop unblocked.
"""

import asyncio
import time
from typing import Optional

try:
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
except ImportError:
    Nominatim = None  # type: ignore[assignment,misc]
    GeocoderTimedOut = Exception  # type: ignore[assignment,misc]
    GeocoderServiceError = Exception  # type: ignore[assignment,misc]

# Nominatim usage policy: 1 request per second
_NOMINATIM_DELAY = 1.0


class ZipCodeGeocoder:
    """
    US zip code → (lat, lon) with Nominatim, caching, and rate limiting.

    Usage:
        geo = ZipCodeGeocoder()
        coords = geo.lookup("10001")          # ("New York" → (40.75, -73.99))
        coords = await geo.lookup_async("10001")

    Test usage (no network):
        mock = MagicMock(); mock.geocode.return_value = MockLocation(40.7, -74.0)
        geo = ZipCodeGeocoder(_geocoder=mock, _delay=0.0)
    """

    def __init__(
        self,
        user_agent: str = "trial-match-portfolio",
        _geocoder=None,
        _delay: float = _NOMINATIM_DELAY,
    ):
        if _geocoder is not None:
            self._nominatim = _geocoder
        elif Nominatim is not None:
            self._nominatim = Nominatim(user_agent=user_agent, timeout=5)
        else:
            self._nominatim = None

        self._cache: dict[str, Optional[tuple[float, float]]] = {}
        self._last_request: float = 0.0
        self._delay = _delay

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def lookup(self, zip_code: str, country: str = "United States") -> Optional[tuple[float, float]]:
        """
        Return (lat, lon) for a postal code + country, or None if not found.

        Caches both successful and failed results. Raises nothing —
        all geocoding errors are caught and returned as None.
        """
        clean = _normalize_postal_code(zip_code, country)
        cache_key = f"{clean}|{country}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        result = self._geocode(clean, country)
        self._cache[cache_key] = result
        return result

    async def lookup_async(self, zip_code: str, country: str = "United States") -> Optional[tuple[float, float]]:
        """Non-blocking wrapper — runs lookup() in a thread-pool executor."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.lookup, zip_code, country)

    @property
    def cache_size(self) -> int:
        return len(self._cache)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _geocode(self, clean_postal: str, country: str = "United States") -> Optional[tuple[float, float]]:
        if self._nominatim is None:
            return None

        self._enforce_rate_limit()
        try:
            location = self._nominatim.geocode(f"{clean_postal}, {country}")
            self._last_request = time.monotonic()
            return (location.latitude, location.longitude) if location else None
        except (GeocoderTimedOut, GeocoderServiceError):
            return None
        except Exception:
            return None

    def _enforce_rate_limit(self) -> None:
        if self._delay <= 0:
            return
        elapsed = time.monotonic() - self._last_request
        wait = self._delay - elapsed
        if wait > 0:
            time.sleep(wait)


def _normalize_postal_code(postal_code: str, country: str = "United States") -> str:
    """Strip whitespace; truncate to 5 digits only for US ZIP codes."""
    clean = postal_code.strip()
    if country in ("United States", "US", "USA"):
        clean = clean.split("-")[0][:5]
    return clean


def _normalize_zip(zip_code: str) -> str:
    """Legacy alias kept for existing tests."""
    return _normalize_postal_code(zip_code, "United States")
