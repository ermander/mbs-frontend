import { apiClient } from './client'

export interface BackofficeScraper {
  id: string
  name: string
  slug: string
  adapter_type: 'api' | 'playwright' | 'websocket'
  is_active: boolean
  scrape_enabled: boolean
  scrape_interval_seconds: number
  enabled_sports: string[] | null
  mapped_sports: string[]
  created_at: string
  updated_at: string
}

export interface SportMapping {
  id: string
  sport_id: string
  bookmaker_id: string
  bookmaker_sport_code: string
  bookmaker_sport_name: string | null
  sport_name: string
  bookmaker_name: string
  bookmaker_slug: string
  created_at: string
  updated_at: string
}

export interface CanonicalSport {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive'
}

export async function getScrapers(): Promise<BackofficeScraper[]> {
  const { data } = await apiClient.get<{ scrapers: BackofficeScraper[] }>('/backoffice/scrapers')
  return data.scrapers
}

export async function toggleScraper(
  id: string,
  scrapeEnabled: boolean,
): Promise<BackofficeScraper> {
  const { data } = await apiClient.patch<{ scraper: BackofficeScraper }>(
    `/backoffice/scrapers/${id}/toggle`,
    { scrape_enabled: scrapeEnabled },
  )
  return data.scraper
}

export async function updateEnabledSports(
  id: string,
  enabledSports: string[] | null,
): Promise<BackofficeScraper> {
  const { data } = await apiClient.patch<{ scraper: BackofficeScraper }>(
    `/backoffice/scrapers/${id}/sports`,
    { enabled_sports: enabledSports },
  )
  return data.scraper
}

// --- Global scraping kill switch ---

export interface GlobalScrapingStatus {
  enabled: boolean
  updated_at: string
  updated_by: string | null
}

export async function getGlobalScrapingStatus(): Promise<GlobalScrapingStatus> {
  const { data } = await apiClient.get<{ status: GlobalScrapingStatus }>(
    '/backoffice/scraping/global-status',
  )
  return data.status
}

export async function setGlobalScrapingStatus(enabled: boolean): Promise<GlobalScrapingStatus> {
  const { data } = await apiClient.patch<{ status: GlobalScrapingStatus }>(
    '/backoffice/scraping/global-status',
    { enabled },
  )
  return data.status
}

// --- Sport-bookmaker mappings ---

export async function getSportMappings(): Promise<SportMapping[]> {
  const { data } = await apiClient.get<{ mappings: SportMapping[] }>('/backoffice/sport-mappings')
  return data.mappings
}

export async function getCanonicalSports(): Promise<CanonicalSport[]> {
  const { data } = await apiClient.get<{ sports: CanonicalSport[] }>(
    '/backoffice/sport-mappings/sports',
  )
  return data.sports
}

export async function createSportMapping(params: {
  sport_id: string
  bookmaker_id: string
  bookmaker_sport_code: string
  bookmaker_sport_name?: string
}): Promise<SportMapping> {
  const { data } = await apiClient.post<{ mapping: SportMapping }>(
    '/backoffice/sport-mappings',
    params,
  )
  return data.mapping
}

export async function updateSportMapping(
  id: string,
  params: { bookmaker_sport_code: string; bookmaker_sport_name?: string },
): Promise<SportMapping> {
  const { data } = await apiClient.put<{ mapping: SportMapping }>(
    `/backoffice/sport-mappings/${id}`,
    params,
  )
  return data.mapping
}

export async function deleteSportMapping(id: string): Promise<void> {
  await apiClient.delete(`/backoffice/sport-mappings/${id}`)
}
