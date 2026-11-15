import { apiClient } from './client'

export interface PlaybackResponse {
  source_id: number
  name: string
  url: string
  type: SourceType
  poster_url?: string
}

export type SourceType = 'hls' | 'dash' | 'mp4' | 'other'

export const playbackApi = {
  async getPlayback(sourceId: number): Promise<PlaybackResponse> {
    return apiClient.get<PlaybackResponse>(`/playback/${sourceId}`)
  },
}
