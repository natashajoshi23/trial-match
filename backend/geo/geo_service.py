"""
Layer 6: GeoService

High-level async interface for the trial matching pipeline.

The API layer (Layer 7) calls patient_coordinates() once per request to get
the patient's lat/lon, then passes them directly into TrialScorer.score().
Separating this from ZipCodeGeocoder keeps geocoding swappable (e.g., swap
Nominatim for Google Maps) without changing the API layer.
"""

from typing import Optional

from .geocoder import ZipCodeGeocoder


class GeoService:
    """
    Wraps ZipCodeGeocoder with a clean interface for the API layer.

    Usage:
        geo = GeoService()
        lat, lon = await geo.patient_coordinates("10001")
        match = scorer.score(..., patient_lat=lat, patient_lon=lon)
    """

    def __init__(self, geocoder: Optional[ZipCodeGeocoder] = None):
        self._geocoder = geocoder or ZipCodeGeocoder()

    async def patient_coordinates(
        self, zip_code: str
    ) -> tuple[Optional[float], Optional[float]]:
        """
        Return (lat, lon) for the patient's zip code.

        Returns (None, None) when geocoding fails — TrialScorer treats
        missing coordinates as a neutral geo score (0.5), not a disqualifier.
        """
        coords = await self._geocoder.lookup_async(zip_code)
        if coords is None:
            return None, None
        return coords[0], coords[1]
