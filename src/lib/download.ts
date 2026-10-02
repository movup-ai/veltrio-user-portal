/** Hands a fetched file to the browser as a download, under the given name. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked on the next tick: some browsers start the download only after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
