/**
 * Meme yazısı, video çözünürlüğündeki bir canvas'a çizilir. Aynı canvas hem
 * önizlemede gösterilir hem de PNG olarak ffmpeg'e gider; böylece gördüğün
 * şey çıktıyla birebir aynı olur.
 */
export interface MemeText {
  top: string
  bottom: string
}

/** Klasik meme görünümü: Impact, beyaz dolgu, kalın siyah kontur. */
const FONT_STACK = 'Impact, "Arial Black", "Haettenschweiler", sans-serif'
const FONT_RATIO = 0.115
const LINE_RATIO = 1.14
const STROKE_RATIO = 0.15
const SIDE_PADDING = 0.05

export function hasMemeText(text: MemeText): boolean {
  return text.top.trim().length > 0 || text.bottom.trim().length > 0
}

export function drawMemeText(
  canvas: HTMLCanvasElement,
  text: MemeText,
  width: number,
  height: number
): void {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  const fontSize = Math.max(16, Math.round(height * FONT_RATIO))
  const lineHeight = fontSize * LINE_RATIO
  const maxWidth = width * (1 - SIDE_PADDING * 2)
  const padding = height * 0.035

  ctx.font = `${fontSize}px ${FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = fontSize * STROKE_RATIO
  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#fff'

  const write = (line: string, y: number): void => {
    ctx.strokeText(line, width / 2, y)
    ctx.fillText(line, width / 2, y)
  }

  const top = wrap(ctx, text.top, maxWidth)
  ctx.textBaseline = 'top'
  top.forEach((line, index) => write(line, padding + index * lineHeight))

  const bottom = wrap(ctx, text.bottom, maxWidth)
  ctx.textBaseline = 'alphabetic'
  bottom.forEach((line, index) =>
    write(line, height - padding - (bottom.length - 1 - index) * lineHeight)
  )
}

/** Satırları kutuya sığdırır; tek kelime sığmazsa harf harf böler. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const source = text.trim().toLocaleUpperCase()
  if (!source) return []
  const lines: string[] = []
  let line = ''
  for (const word of source.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      if (ctx.measureText(candidate).width > maxWidth && !line) {
        // Tek kelime bile sığmıyor: sığan kadarını alıp kalanını alta at.
        let piece = ''
        for (const letter of candidate) {
          if (ctx.measureText(piece + letter).width > maxWidth && piece) {
            lines.push(piece)
            piece = letter
          } else piece += letter
        }
        line = piece
        continue
      }
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Canvas'ı ffmpeg'in okuyabileceği PNG baytlarına çevirir. */
export async function overlayBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('png')
  return new Uint8Array(await blob.arrayBuffer())
}
