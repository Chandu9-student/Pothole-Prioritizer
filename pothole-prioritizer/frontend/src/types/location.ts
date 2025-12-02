// Location and geographic related types

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface AddressInfo {
  formattedAddress: string;
  streetName?: string;
  locality?: string;
  panchayath?: string;
  municipality?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface AdministrativeBoundary {
  panchayath?: string;
  municipality?: string;
  city?: string;
  district: string;
  state: string;
  country: string;
}

export interface JurisdictionInfo {
  level: 'panchayath' | 'municipality' | 'city' | 'district' | 'state' | 'national';
  name: string;
  boundaries?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center?: LocationData;
  population?: number;
}

export interface LocationFilter {
  radius: number; // in kilometers
  center: LocationData;
  administrativeLevel?: string;
  administrativeArea?: string;
}

export interface MapBounds {
  northEast: LocationData;
  southWest: LocationData;
}

export interface GeocodingResult {
  location: LocationData;
  address: AddressInfo;
  administrative: AdministrativeBoundary;
  confidence: number;
}

export interface LocationPermission {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  error?: string;
}
