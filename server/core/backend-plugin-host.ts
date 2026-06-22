import type { PluginManager } from './plugin-manager'
import type { BackendPluginContext, BackendPluginDefinition, BackendPluginInstance } from '../plugins/backend'

export class BackendPluginHost {
  private readonly definitions = new Map<string, BackendPluginDefinition>()
  private readonly instances = new Map<string, BackendPluginInstance>()

  constructor(
    private readonly context: BackendPluginContext,
    private readonly plugins: PluginManager,
    definitions: BackendPluginDefinition[],
  ) {
    for (const definition of definitions) {
      this.definitions.set(definition.descriptor.id, definition)
    }
  }

  start() {
    for (const definition of this.definitions.values()) {
      this.sync(definition.descriptor.id)
    }

    this.plugins.onChange((event) => {
      if (!this.definitions.has(event.id)) return
      if (event.type === 'config') this.stop(event.id)
      this.sync(event.id)
    })
  }

  stop(id: string) {
    const instance = this.instances.get(id)
    if (!instance) return

    try {
      instance.stop?.()
    } finally {
      this.instances.delete(id)
    }
  }

  private sync(id: string) {
    const definition = this.definitions.get(id)
    if (!definition) return

    if (!this.plugins.isEnabled(id)) {
      this.stop(id)
      return
    }

    if (this.instances.has(id) || !definition.create) return

    const instance = definition.create(this.context)
    if (instance) this.instances.set(id, instance)
  }
}
