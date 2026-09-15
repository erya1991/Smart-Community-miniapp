export function openPage(path?: string, available = true) {
  if (!available || !path) {
    uni.showToast({ title: '该功能建设中', icon: 'none' })
    return
  }
  uni.redirectTo({ url: path })
}

export function formatMoneyFromFen(value: number) {
  return (value / 100).toFixed(2)
}

