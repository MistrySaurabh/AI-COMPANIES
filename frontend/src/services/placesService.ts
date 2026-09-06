import axios from 'axios';

export interface PlaceResult {
  placeId: string;
  companyName: string;
  address: string;
  website: string;
  contactNumber: string | null;
  city: string;
  state: string;
  coreServicesDomain: string | null;
  businessStatus: string | null;
  rating: string | null;
  types: string[];
  mapsUrl?: string;
  // populated after email scrape
  emails?: string[];
}

export interface SavePlacesResponse {
  saved: number;
  updated: number;
  errors: string[];
}

export async function startMapsSearch(
  keyword: string,
  city: string,
  state: string
): Promise<{ sessionId: string }> {
  const { data } = await axios.post('/api/places/search/start', { keyword, city, state });
  return data;
}

export async function stopMapsSearch(sessionId: string): Promise<void> {
  await axios.post('/api/places/search/stop', { sessionId });
}

export async function startEmailScrape(
  sites: Array<{ placeId: string; website: string; companyName: string }>
): Promise<{ sessionId: string }> {
  const { data } = await axios.post('/api/places/scrape-emails/start', { sites });
  return data;
}

export async function stopEmailScrape(sessionId: string): Promise<void> {
  await axios.post('/api/places/scrape-emails/stop', { sessionId });
}

export async function savePlaces(
  places: Array<PlaceResult & { emails: string[] }>
): Promise<SavePlacesResponse> {
  const { data } = await axios.post<SavePlacesResponse>('/api/places/save', { places });
  return data;
}
