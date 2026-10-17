/**
 * Uygulamadan dışarı sürüklenen videolar bazen kendi penceremizin üstünden geçiyor.
 * Bu sırada "içe aktar" kaplaması açılmasın diye son iç sürükleme zamanı tutulur.
 */
let lastInternalDragAt = 0

export function markInternalDrag(): void {
  lastInternalDragAt = Date.now()
}

export function isInternalDrag(): boolean {
  return Date.now() - lastInternalDragAt < 2000
}
