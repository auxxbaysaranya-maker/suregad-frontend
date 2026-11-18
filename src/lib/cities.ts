export interface City {
  city: string;
  state: string;
  lat: number;
  lng: number;
  popular?: boolean;
}

/**
 * Cities used to name a GPS fix and to pick a location by hand.
 * Kerala first (SureGad's launch region), then major Indian cities.
 * Matching is done on the device, so coordinates never leave the browser for this.
 */
export const CITIES: City[] = [
  { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, popular: true },
  { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, popular: true },
  { city: "Kozhikode", state: "Kerala", lat: 11.2588, lng: 75.7804, popular: true },
  { city: "Thrissur", state: "Kerala", lat: 10.5276, lng: 76.2144, popular: true },
  { city: "Kollam", state: "Kerala", lat: 8.8932, lng: 76.6141, popular: true },
  { city: "Kannur", state: "Kerala", lat: 11.8745, lng: 75.3704, popular: true },
  { city: "Alappuzha", state: "Kerala", lat: 9.4981, lng: 76.3388 },
  { city: "Kottayam", state: "Kerala", lat: 9.5916, lng: 76.5222 },
  { city: "Palakkad", state: "Kerala", lat: 10.7867, lng: 76.6548 },
  { city: "Malappuram", state: "Kerala", lat: 11.051, lng: 76.0711 },
  { city: "Pathanamthitta", state: "Kerala", lat: 9.2648, lng: 76.787 },
  { city: "Idukki", state: "Kerala", lat: 9.8494, lng: 76.9719 },
  { city: "Wayanad", state: "Kerala", lat: 11.6854, lng: 76.132 },
  { city: "Kasaragod", state: "Kerala", lat: 12.4996, lng: 74.9869 },
  { city: "Aluva", state: "Kerala", lat: 10.1004, lng: 76.3570 },
  { city: "Kakkanad", state: "Kerala", lat: 10.0159, lng: 76.3419 },
  { city: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, popular: true },
  { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, popular: true },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, popular: true },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, popular: true },
  { city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198 },
  { city: "Mangaluru", state: "Karnataka", lat: 12.9141, lng: 74.856 },
  { city: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
  { city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 },
  { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  { city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  { city: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  { city: "Goa", state: "Goa", lat: 15.4909, lng: 73.8278 },
];

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestCity(point: { lat: number; lng: number }): City {
  return CITIES.reduce((best, city) => (distanceKm(point, city) < distanceKm(point, best) ? city : best), CITIES[0]);
}

export function findCity(name?: string | null): City | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return CITIES.find((city) => city.city.toLowerCase() === key);
}

export function formatDistance(km: number): string {
  if (km < 1) return "Under 1 km";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
