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

# Approximate country centroids for fallback when postal code geocoding fails
_COUNTRY_CENTROIDS: dict[str, tuple[float, float]] = {
    "Argentina": (-38.4, -63.6),
    "Australia": (-25.3, 133.8),
    "Austria": (47.5, 14.5),
    "Belgium": (50.5, 4.5),
    "Brazil": (-14.2, -51.9),
    "Canada": (56.1, -106.3),
    "Chile": (-35.7, -71.5),
    "China": (35.9, 104.2),
    "Colombia": (4.6, -74.1),
    "Czech Republic": (49.8, 15.5),
    "Denmark": (56.3, 9.5),
    "Egypt": (26.8, 30.8),
    "Finland": (61.9, 25.7),
    "France": (46.2, 2.2),
    "Germany": (51.2, 10.4),
    "Greece": (39.1, 21.8),
    "Hungary": (47.2, 19.5),
    "India": (20.6, 79.0),
    "Indonesia": (-0.8, 113.9),
    "Ireland": (53.1, -8.2),
    "Israel": (31.0, 34.9),
    "Italy": (41.9, 12.6),
    "Japan": (36.2, 138.3),
    "Jordan": (30.6, 36.2),
    "Kenya": (-0.0, 37.9),
    "Malaysia": (4.2, 109.5),
    "Mexico": (23.6, -102.6),
    "Netherlands": (52.1, 5.3),
    "New Zealand": (-40.9, 174.9),
    "Nigeria": (9.1, 8.7),
    "Norway": (60.5, 8.5),
    "Pakistan": (30.4, 69.3),
    "Peru": (-9.2, -75.0),
    "Philippines": (12.9, 121.8),
    "Poland": (51.9, 19.1),
    "Portugal": (39.4, -8.2),
    "Romania": (45.9, 24.9),
    "Russia": (61.5, 105.3),
    "Saudi Arabia": (23.9, 45.1),
    "Singapore": (1.4, 103.8),
    "South Africa": (-30.6, 22.9),
    "South Korea": (35.9, 127.8),
    "Spain": (40.5, -3.7),
    "Sweden": (60.1, 18.6),
    "Switzerland": (46.8, 8.2),
    "Taiwan": (23.7, 120.9),
    "Thailand": (15.9, 100.9),
    "Turkey": (38.9, 35.2),
    "Ukraine": (48.4, 31.2),
    "United Arab Emirates": (23.4, 53.8),
    "United Kingdom": (55.4, -3.4),
    "United States": (37.1, -95.7),
    "Vietnam": (14.1, 108.3),
}


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
        self, zip_code: str, country: str = "United States"
    ) -> tuple[Optional[float], Optional[float]]:
        """
        Return (lat, lon) for the patient's postal code and country.

        Returns (None, None) when geocoding fails — TrialScorer treats
        missing coordinates as a neutral geo score (0.5), not a disqualifier.
        """
        lat, lon, _ = await self.patient_coordinates_ex(zip_code, country)
        return lat, lon

    async def patient_coordinates_ex(
        self, zip_code: str, country: str = "United States"
    ) -> tuple[Optional[float], Optional[float], bool]:
        """
        Like patient_coordinates but also returns is_centroid_fallback=True
        when the result is an approximate country centroid rather than the
        actual postal code location. Callers can use this to skip distance
        filters that would be meaningless against a centroid.
        """
        coords = await self._geocoder.lookup_async(zip_code, country)
        if coords is not None:
            return coords[0], coords[1], False
        centroid = _COUNTRY_CENTROIDS.get(country)
        if centroid:
            return centroid[0], centroid[1], True
        return None, None, True
