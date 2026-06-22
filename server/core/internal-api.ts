export type InternalApiHandler = (...args: any[]) => any

export class InternalApiRegistry {
  private readonly apis = new Map<string, InternalApiHandler>()

  register(name: string, handler: InternalApiHandler) {
    this.apis.set(name, handler)
  }

  get(name: string) {
    return this.apis.get(name)
  }

  list() {
    return [...this.apis.keys()].sort()
  }
}
