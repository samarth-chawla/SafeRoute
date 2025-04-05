export interface SafetyReport {
  id: string;
  category: 'safe' | 'caution' | 'danger';
  description: string;
  timestamp: string;
  location: [number, number];
}

export interface RoutePoint {
  lat: number;
  lng: number;
}