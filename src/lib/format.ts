/**
 * Formatage des nombres pour les documents PDF et PNG.
 * jsPDF ne sait pas afficher les espaces insécables que produit Intl : on les remplace
 * par une espace normale, sinon les montants apparaissent décalés ou illisibles.
 */
export function pdfNum(value: number | string | null | undefined): string {
  const v = Number(value)
  if (!Number.isFinite(v)) return ''
  return Math.round(v).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')
}

export function pdfXOF(value: number | string | null | undefined): string {
  return `${pdfNum(value)} F`
}

/** Charge une image distante et la redessine en PNG. Retourne aussi ses dimensions. */
export async function loadImageAsPng(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const blob = await (await fetch(url)).blob()
    const objectUrl = URL.createObjectURL(blob)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = objectUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || 200
    canvas.height = img.naturalHeight || 100
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    URL.revokeObjectURL(objectUrl)
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
  } catch {
    return null
  }
}
