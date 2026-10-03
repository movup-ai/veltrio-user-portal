import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { brandApi } from '../api/brand.api'
import type { Brand, BrandAsset, BrandValues } from '../types/brand.types'

export const brandKeys = {
  detail: ['company', 'brand'] as const,
}

/** Owner-only on the API; callers without `settings.manage` should not enable it. */
export function useBrand(enabled = true) {
  return useQuery({ queryKey: brandKeys.detail, queryFn: brandApi.get, enabled })
}

function useBrandMutation<TArgs>(mutationFn: (args: TArgs) => Promise<Brand>, success?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (brand) => {
      queryClient.setQueryData(brandKeys.detail, brand)
      if (success) toast({ title: success, variant: 'success' })
    },
    onError: (error) =>
      toast({
        title: i18n.t('settings:brand.toast.failed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      }),
  })
}

export function useUpdateBrand() {
  return useBrandMutation((patch: Partial<BrandValues>) => brandApi.update(patch), i18n.t('settings:company.toast.saved'))
}

/** No success toast: the new image appearing is the confirmation. */
export function useUploadBrandAsset() {
  return useBrandMutation(({ asset, file }: { asset: BrandAsset; file: File }) => brandApi.upload(asset, file))
}

export function useRemoveBrandAsset() {
  return useBrandMutation((asset: BrandAsset) => brandApi.remove(asset))
}
