// sessionStorage (not localStorage): the token disappears when the tab closes.
const KEY = 'wb.token'

export const tokenStore = {
  get(): string | null {
    try {
      return sessionStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      sessionStorage.setItem(KEY, token)
    } catch {
      /* storage unavailable: the session simply will not survive a reload */
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  },
}
