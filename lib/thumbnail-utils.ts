export async function generateThumbnail(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // Book-like dimensions (A4 ratio: 210x297mm ≈ 3:4.2)
      const targetWidth = 200
      const targetHeight = 280

      canvas.width = targetWidth
      canvas.height = targetHeight

      if (ctx) {
        // Calculate scaling to fit image while maintaining aspect ratio
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale

        // Center the image
        const x = (targetWidth - scaledWidth) / 2
        const y = (targetHeight - scaledHeight) / 2

        // Fill background with white
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, targetWidth, targetHeight)

        // Draw the scaled image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
      }

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
            resolve(resizedFile)
          }
        },
        "image/jpeg",
        0.8,
      ) // 80% quality
    }

    img.src = URL.createObjectURL(file)
  })
}

export function generateInitialThumbnail(title: string): string {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  // Book-like dimensions
  canvas.width = 200
  canvas.height = 280

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, "#3b82f6")
  gradient.addColorStop(1, "#1e40af")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Add subtle border
  ctx.strokeStyle = "#1e3a8a"
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)

  // Add first letter
  const firstLetter = title.charAt(0).toUpperCase() || "B"
  ctx.fillStyle = "white"
  ctx.font = "bold 80px Arial"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(firstLetter, canvas.width / 2, canvas.height / 2)

  // Add title at bottom
  if (title.length > 0) {
    ctx.font = "bold 14px Arial"
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"

    // Word wrap for title
    const words = title.split(" ")
    const maxWidth = canvas.width - 20
    let line = ""
    let y = canvas.height - 40

    for (let i = 0; i < words.length && y > canvas.height - 80; i++) {
      const testLine = line + words[i] + " "
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), canvas.width / 2, y)
        line = words[i] + " "
        y += 16
      } else {
        line = testLine
      }
    }

    if (line.trim() && y <= canvas.height - 20) {
      ctx.fillText(line.trim(), canvas.width / 2, y)
    }
  }

  return canvas.toDataURL("image/png")
}
