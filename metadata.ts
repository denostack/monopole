import { Name } from "./interface.ts";

export interface MetadataInjectProp {
  target: any;
  property: PropertyKey;
  name: Name<any>;
  resolver: ((instance: any) => any) | null;
}

export const metadata = {
  inject: new WeakMap<any, MetadataInjectProp[]>(),
};

// internal only
export function _clearMetadata() {
  metadata.inject = new WeakMap();
}
