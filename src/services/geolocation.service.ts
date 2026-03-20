/**
 * geolocation.service.ts
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two coordinates using the
 * Haversine formula. Returns distance in kilometres.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Returns true if the two points are within radiusKm of each other.
 */
export function isWithinRadius(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  radiusKm: number
): boolean {
  return calculateHaversineDistance(lat1, lon1, lat2, lon2) <= radiusKm;
}

/**
 * Builds a composite match score for nurse ranking.
 * Combines distance (closer = better) and rating (higher = better).
 * Returns a score between 0 and 1 — higher is a better match.
 *
 * @param distanceKm   - distance from elderly user to nurse
 * @param maxRadiusKm  - the search radius (used to normalise distance)
 * @param rating       - nurse rating 0–5
 * @param distanceWeight - 0–1, how much to weight distance (default 0.6)
 */
export function calculateMatchScore(
  distanceKm:     number,
  maxRadiusKm:    number,
  rating:         number,
  distanceWeight  = 0.6
): number {
  const ratingWeight  = 1 - distanceWeight;
  const normDistance  = Math.max(0, 1 - distanceKm / maxRadiusKm); // 1 = closest
  const normRating    = Math.min(rating, 5) / 5;                    // 1 = highest

  return distanceWeight * normDistance + ratingWeight * normRating;
}

/**
 * Calculates the bounding box for a given centre + radius.
 * Useful for cheap SQL pre-filter before the precise Haversine check.
 *
 * Returns { minLat, maxLat, minLon, maxLon }
 */
export function getBoundingBox(
  lat: number,
  lon: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const latDelta = radiusKm / EARTH_RADIUS_KM * (180 / Math.PI);
  const lonDelta = radiusKm / EARTH_RADIUS_KM * (180 / Math.PI) / Math.cos((lat * Math.PI) / 180);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}
