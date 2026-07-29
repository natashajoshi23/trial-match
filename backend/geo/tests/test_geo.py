"""
Unit tests for Layer 6: ZipCodeGeocoder and GeoService

No network calls — Nominatim is always replaced with a mock. The _delay=0.0
constructor parameter disables rate-limiting in tests so they run instantly.

Coverage:
  - Valid zip code → returns (lat, lon)
  - Unknown zip → geocoder returns None → lookup returns None
  - GeocoderTimedOut → returns None
  - GeocoderServiceError → returns None
  - Generic exception → returns None (defensive catch)
  - Successful result cached (Nominatim called only once per zip)
  - Failed result cached (no repeated retry on bad zip)
  - lookup_async returns same result as lookup
  - Zip normalization: whitespace stripped, ZIP+4 truncated to 5 digits
  - GeoService.patient_coordinates → (lat, lon) on success
  - GeoService.patient_coordinates → (None, None) on failure
  - GeoService uses injected geocoder (no real Nominatim in tests)
"""

import pytest
from unittest.mock import MagicMock, AsyncMock

from backend.geo.geocoder import ZipCodeGeocoder, _normalize_zip
from backend.geo.geo_service import GeoService

try:
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
except ImportError:
    GeocoderTimedOut = RuntimeError
    GeocoderServiceError = RuntimeError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _Loc:
    """Minimal stand-in for a geopy Location object."""
    def __init__(self, lat: float, lon: float):
        self.latitude = lat
        self.longitude = lon


def make_geocoder(geocode_return=None, geocode_side_effect=None) -> ZipCodeGeocoder:
    """Return a ZipCodeGeocoder with a mocked Nominatim and zero rate-limit delay."""
    mock_nominatim = MagicMock()
    if geocode_side_effect is not None:
        mock_nominatim.geocode.side_effect = geocode_side_effect
    else:
        mock_nominatim.geocode.return_value = geocode_return
    return ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)


# ---------------------------------------------------------------------------
# 1. _normalize_zip helper
# ---------------------------------------------------------------------------

def test_normalize_strips_whitespace():
    assert _normalize_zip("  10001  ") == "10001"


def test_normalize_truncates_zip_plus_4():
    assert _normalize_zip("10001-1234") == "10001"


def test_normalize_truncates_to_5():
    assert _normalize_zip("123456789") == "12345"


def test_normalize_already_clean():
    assert _normalize_zip("94102") == "94102"


# ---------------------------------------------------------------------------
# 2. ZipCodeGeocoder — synchronous lookup
# ---------------------------------------------------------------------------

def test_lookup_valid_zip_returns_lat_lon():
    geo = make_geocoder(geocode_return=_Loc(40.7128, -74.0060))
    result = geo.lookup("10001")
    assert result == (40.7128, -74.0060)


def test_lookup_unknown_zip_returns_none():
    geo = make_geocoder(geocode_return=None)
    result = geo.lookup("00000")
    assert result is None


def test_lookup_timeout_returns_none():
    geo = make_geocoder(geocode_side_effect=GeocoderTimedOut("timeout"))
    result = geo.lookup("10001")
    assert result is None


def test_lookup_service_error_returns_none():
    geo = make_geocoder(geocode_side_effect=GeocoderServiceError("503"))
    result = geo.lookup("10001")
    assert result is None


def test_lookup_generic_exception_returns_none():
    geo = make_geocoder(geocode_side_effect=ConnectionError("network error"))
    result = geo.lookup("10001")
    assert result is None


# ---------------------------------------------------------------------------
# 3. Caching behaviour
# ---------------------------------------------------------------------------

def test_lookup_caches_successful_result():
    mock_nominatim = MagicMock()
    mock_nominatim.geocode.return_value = _Loc(40.7128, -74.0060)
    geo = ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)

    geo.lookup("10001")
    geo.lookup("10001")   # second call

    mock_nominatim.geocode.assert_called_once()   # Nominatim hit only once


def test_lookup_caches_none_result():
    """Failed lookups are cached as None to prevent repeated retries."""
    mock_nominatim = MagicMock()
    mock_nominatim.geocode.return_value = None
    geo = ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)

    geo.lookup("00000")
    geo.lookup("00000")

    mock_nominatim.geocode.assert_called_once()


def test_lookup_different_zips_each_hit_geocoder():
    mock_nominatim = MagicMock()
    mock_nominatim.geocode.return_value = _Loc(40.7128, -74.0060)
    geo = ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)

    geo.lookup("10001")
    geo.lookup("94102")

    assert mock_nominatim.geocode.call_count == 2


def test_cache_size_grows_with_unique_lookups():
    geo = make_geocoder(geocode_return=_Loc(40.7, -74.0))
    assert geo.cache_size == 0
    geo.lookup("10001")
    assert geo.cache_size == 1
    geo.lookup("94102")
    assert geo.cache_size == 2
    geo.lookup("10001")   # cached — no increment
    assert geo.cache_size == 2


def test_zip_normalization_shares_cache_entry():
    """'10001 ' and '10001-1234' should map to the same cache key."""
    mock_nominatim = MagicMock()
    mock_nominatim.geocode.return_value = _Loc(40.7128, -74.0060)
    geo = ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)

    geo.lookup("10001 ")
    geo.lookup("10001-9999")

    # Both normalize to "10001" — Nominatim called only once
    mock_nominatim.geocode.assert_called_once()
    assert geo.cache_size == 1


# ---------------------------------------------------------------------------
# 4. Async lookup
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_lookup_async_returns_lat_lon():
    geo = make_geocoder(geocode_return=_Loc(37.7749, -122.4194))
    result = await geo.lookup_async("94102")
    assert result == (37.7749, -122.4194)


@pytest.mark.asyncio
async def test_lookup_async_returns_none_on_failure():
    geo = make_geocoder(geocode_return=None)
    result = await geo.lookup_async("00000")
    assert result is None


@pytest.mark.asyncio
async def test_lookup_async_uses_cache():
    mock_nominatim = MagicMock()
    mock_nominatim.geocode.return_value = _Loc(40.7128, -74.0060)
    geo = ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)

    await geo.lookup_async("10001")
    await geo.lookup_async("10001")

    mock_nominatim.geocode.assert_called_once()


# ---------------------------------------------------------------------------
# 5. GeoService
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_geo_service_returns_lat_lon_on_success():
    mock_geocoder = MagicMock(spec=ZipCodeGeocoder)
    mock_geocoder.lookup_async = AsyncMock(return_value=(40.7128, -74.0060))
    svc = GeoService(geocoder=mock_geocoder)

    lat, lon = await svc.patient_coordinates("10001")

    assert lat == pytest.approx(40.7128)
    assert lon == pytest.approx(-74.0060)


@pytest.mark.asyncio
async def test_geo_service_returns_none_none_on_failure():
    mock_geocoder = MagicMock(spec=ZipCodeGeocoder)
    mock_geocoder.lookup_async = AsyncMock(return_value=None)
    svc = GeoService(geocoder=mock_geocoder)

    lat, lon = await svc.patient_coordinates("00000")

    assert lat is None
    assert lon is None


@pytest.mark.asyncio
async def test_geo_service_delegates_to_geocoder():
    mock_geocoder = MagicMock(spec=ZipCodeGeocoder)
    mock_geocoder.lookup_async = AsyncMock(return_value=(34.0522, -118.2437))
    svc = GeoService(geocoder=mock_geocoder)

    await svc.patient_coordinates("90001")

    mock_geocoder.lookup_async.assert_called_once_with("90001")


@pytest.mark.asyncio
async def test_geo_service_returns_tuple_of_two():
    mock_geocoder = MagicMock(spec=ZipCodeGeocoder)
    mock_geocoder.lookup_async = AsyncMock(return_value=(41.8781, -87.6298))
    svc = GeoService(geocoder=mock_geocoder)

    result = await svc.patient_coordinates("60601")

    assert isinstance(result, tuple)
    assert len(result) == 2


@pytest.mark.asyncio
async def test_geo_service_real_geocoder_no_network():
    """GeoService creates ZipCodeGeocoder by default; confirm no errors at init."""
    mock_nominatim = MagicMock()
    mock_nominatim.geocode.return_value = _Loc(47.6062, -122.3321)
    geocoder = ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)
    svc = GeoService(geocoder=geocoder)

    lat, lon = await svc.patient_coordinates("98101")

    assert lat == pytest.approx(47.6062)
    assert lon == pytest.approx(-122.3321)


# ---------------------------------------------------------------------------
# 6. Geocoder returns correct query string to Nominatim
# ---------------------------------------------------------------------------

def test_nominatim_query_includes_usa():
    mock_nominatim = MagicMock()
    mock_nominatim.geocode.return_value = _Loc(40.7128, -74.0060)
    geo = ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)

    geo.lookup("10001")

    call_arg = mock_nominatim.geocode.call_args[0][0]
    assert "10001" in call_arg
    assert "USA" in call_arg


def test_nominatim_query_uses_normalized_zip():
    mock_nominatim = MagicMock()
    mock_nominatim.geocode.return_value = None
    geo = ZipCodeGeocoder(_geocoder=mock_nominatim, _delay=0.0)

    geo.lookup("94102-9999")

    call_arg = mock_nominatim.geocode.call_args[0][0]
    assert "94102" in call_arg
    assert "9999" not in call_arg
