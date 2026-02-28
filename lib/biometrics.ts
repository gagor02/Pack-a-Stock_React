/**
 * Returns true if the loan/request requires biometric verification.
 * Trigger: total quantity of non-consumable items >= 3.
 * Each item may have a `quantity`, `quantity_requested`, or default 1.
 */
export function requiresBiometricVerification(items: any[]): boolean {
  if (!Array.isArray(items)) return false
  const nonConsumableTotal = items
    .filter((item) => {
      const detail = item.material_detail ?? item
      return detail.is_consumable === false
    })
    .reduce((sum, item) => {
      const qty = item.quantity ?? item.quantity_requested ?? 1
      return sum + (typeof qty === 'number' ? qty : 1)
    }, 0)
  return nonConsumableTotal >= 3
}
