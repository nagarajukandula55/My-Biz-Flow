export type AttendanceLocation = { lat: number; lng: number; accuracy: number; capturedAt: number };

/** Device evidence is checked for freshness/precision, not claimed spoof-proof. */
export function validateAttendanceLocation(location: AttendanceLocation, now = Date.now()): string | null {
  if (!location || !Number.isFinite(location.lat) || Math.abs(location.lat) > 90 || !Number.isFinite(location.lng) || Math.abs(location.lng) > 180) return "A valid device location is required.";
  if (!Number.isFinite(location.accuracy) || location.accuracy < 0 || location.accuracy > 100) return "Location accuracy must be within 100 metres. Enable precise location and try again.";
  if (!Number.isFinite(location.capturedAt) || now - location.capturedAt > 60000 || location.capturedAt > now + 10000) return "Your location has expired. Please capture it again.";
  return null;
}
