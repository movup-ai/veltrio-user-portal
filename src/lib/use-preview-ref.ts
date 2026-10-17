import { useCallback } from 'react'

/**
 * Points an image or link at a local file for as long as that element is on screen.
 *
 * The URL belongs to the element, not to the stored file: a form can outlive the element that
 * shows its file, and a URL revoked on the way out left a broken image on the way back. An object
 * URL rather than a data URL keeps a 10 MB scan out of React state, and the ref's cleanup
 * releases it whenever the file changes or the element goes.
 */
export function usePreviewRef(file: File | undefined) {
  return useCallback(
    (node: HTMLImageElement | HTMLAnchorElement | null) => {
      if (!node || !file) return
      const url = URL.createObjectURL(file)
      if (node instanceof HTMLImageElement) node.src = url
      else node.href = url
      return () => URL.revokeObjectURL(url)
    },
    [file],
  )
}
