/** Temporary address selection belongs to one checkout, never to the address default flag. */
const selections = new Map<string, string>()
export const checkoutAddressSelection = {
  get: (key: string) => selections.get(key),
  select: (key: string, addressId: string) => {
    if (!key) throw new Error('结算会话已失效，请返回确认订单页。')
    selections.set(key, addressId)
  },
  clear: (key: string) => selections.delete(key),
}
