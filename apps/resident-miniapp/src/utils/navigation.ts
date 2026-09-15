export function openPage(path?: string, available = true) {
  if (!available || !path) {
    return false
  }
  uni.redirectTo({ url: path })
  return true
}

export function formatMoneyFromFen(value: number) {
  return (value / 100).toFixed(2)
}
