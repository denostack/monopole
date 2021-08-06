import { Name } from './interface.ts'

export function nameToString(name: Name<any>): string {
  if (typeof name === 'symbol') {
    return name.toString()
  }
  if (typeof name === 'function') {
    return name.name ? `${name.name}` : '(anonymous class)'
  }
  return `"${name.replace(/"/g, '\\"')}"`
}
