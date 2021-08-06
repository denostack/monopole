import { Name, ConstructType } from './interface.ts'
import { metadata } from './metadata.ts'
import { UndefinedError } from './error.ts'
import { nameToString } from './_utils.ts'

export class Container  {

  _instances: Map<any, any>
  _resolvers: Map<any, () => any>
  _binds: Map<any, ConstructType<any>>

  _aliases: Map<any, any>

  _freezes: Set<any>


  constructor() {

    this._instances = new Map<any, any>([
      [Container, this],
    ])
    this._resolvers = new Map<any, () => any>()
    this._binds = new Map<any, ConstructType<any>>()

    this._aliases = new Map<any, any>([
      ['container', Container]
    ])

    this._freezes = new Set<any>()
  }

  instance<T>(name: Name<T>, value: T): this {
    this.delete(name)
    this._instances.set(name, value)
    return this
  }

  resolver<T>(name: Name<T>, resolver: () => T): this {
    this.delete(name)
    this._resolvers.set(name, resolver)
    return this
  }

  bind<T>(constructor: ConstructType<T>): this
  bind<T>(name: Name<T>, constructor: ConstructType<T>): this
  bind<T>(name: ConstructType<T> | Name<T>, constructor?: ConstructType<T>): this {
    this.delete(name)
    this._binds.set(name, constructor ?? name as ConstructType<T>)
    return this
  }

  alias(name: Name<any>, target: Name<any>): this {
    this._aliases.set(name, target)
    return this
  }

  create<T>(ctor: ConstructType<T>): T {
    const instance = new ctor()

    for (const { name, resolver, property } of metadata.inject.get(ctor) || []) {
      const prop = this.get(name)
      ;(instance as any)[property] = resolver ? resolver(prop) : prop
    }

    return instance
  }

  get<T>(name: Name<T>): T {
    if (this._aliases.has(name)) {
      name = this._aliases.get(name)
    }
    
    let instance: any | undefined
    if ((instance = this._instances.get(name))) {
      this._freezes.add(name)
      return instance
    }

    let resolver: (() => any) | undefined
    if ((resolver = this._resolvers.get(name))) {
      const instance = resolver()
      this._instances.set(name, instance) // singleton
      this._freezes.add(name)
      return instance
    }

    let ctor: ConstructType<any> | undefined
    if ((ctor = this._binds.get(name))) {
      const instance = this.create(ctor)
      this._instances.set(name, instance)
      this._freezes.add(name)
      return instance
    }

    throw new UndefinedError(name)
  }

  has<T>(name: Name<T>): boolean {
    return this._instances.has(name)
     || this._resolvers.has(name)
     || this._binds.has(name)
     || this._aliases.has(name)
  }

  delete(...names: Name<any>[]): void {
    for (const name of names) {
      this._instances.delete(name)
      this._resolvers.delete(name)
    }
  }
}
