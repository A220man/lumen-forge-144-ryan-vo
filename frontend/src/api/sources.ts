import { apiClient } from './client'

export type SourceType = 'hls' | 'dash' | 'mp4' | 'other'

export interface Source {
  id: number
  name: string
  url: string
  type: SourceType
  category?: string
  description?: string
  poster_url?: string
  enabled: boolean
  last_tested?: string
  last_status?: number
  last_error?: string
  created_at: string
  updated_at: string
}

export interface SourceCreate {
  name: string
  url: string
  type?: SourceType
  category?: string
  description?: string
  poster_url?: string
  enabled?: boolean
}

export interface SourceUpdate {
  name?: string
  url?: string
  type?: SourceType
  category?: string
  description?: string
  poster_url?: string
  enabled?: boolean
}

export interface SourceList {
  items: Source[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface SourceTestResult {
  success: boolean
  status_code?: number
  content_type?: string
  error?: string
  response_time_ms?: number
}

export const sourcesApi = {
  async list(params?: {
    page?: number
    page_size?: number
    category?: string
    enabled?: boolean
    search?: string
  }): Promise<SourceList> {
    return apiClient.get<SourceList>('/sources', params)
  },

  async get(id: number): Promise<Source> {
    return apiClient.get<Source>(`/sources/${id}`)
  },

  async create(data: SourceCreate): Promise<Source> {
    return apiClient.post<Source>('/sources', data)
  },

  async update(id: number, data: SourceUpdate): Promise<Source> {
    return apiClient.put<Source>(`/sources/${id}`, data)
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete<void>(`/sources/${id}`)
  },

  async test(id: number): Promise<SourceTestResult> {
    return apiClient.post<SourceTestResult>(`/sources/${id}/test`, {})
  },

  async getCategories(): Promise<string[]> {
    return apiClient.get<string[]>('/sources/categories')
  },

  async getTypes(): Promise<string[]> {
    return apiClient.get<string[]>('/sources/types')
  },
}
