const MAX_ATTACHMENTS = 4
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB per file (API-friendly)

/**
 * @param {File} file
 * @returns {Promise<{ id: string, mimeType: string, data: string, previewUrl: string }>}
 */
export function readImageAsAttachment(file) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Not an image file."))
  }
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new Error("File too large (max 5 MB)."))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Could not read file."))
        return
      }
      const match = /^data:([^;]+);base64,(.+)$/.exec(result)
      if (!match) {
        reject(new Error("Could not parse image data."))
        return
      }
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random()
      resolve({
        id,
        mimeType: match[1],
        data: match[2],
        previewUrl: result,
      })
    }
    reader.onerror = () => reject(new Error("Read failed."))
    reader.readAsDataURL(file)
  })
}

export { MAX_ATTACHMENTS, MAX_FILE_BYTES }
