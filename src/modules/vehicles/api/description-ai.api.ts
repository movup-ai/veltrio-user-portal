import { apiClient } from '@/services/api/client'
import type { DescriptionAiRequest } from '../utils/description-ai.utils'

/**
 * The description writer. The API calls a language model and writes in the company's listing
 * language.
 */
export const descriptionAiApi = {
  generate: (request: DescriptionAiRequest) =>
    apiClient
      .post<{ description: string }>('/ai/vehicle-description', request)
      .then((r) => r.data.description),
}
