/**
 * Textures and materials for `Image`. A root draws an image's `source` only once a texture is registered under that id, and
 * its `material` only once a material is: registering (or replacing) one lays out and draws again the images that name it,
 * so a picture can be fetched after the UI that shows it has mounted. Registrations are per root, as font faces are.
 */

import { unwrapHost, type GodotHost } from './godot-host';

/** What registers textures and materials: a `ReactUiRoot`. `Texture` is a Godot `Texture2D`, `Material` a Godot `Material`. */
export interface ImageHost<Texture, Material> {
  /** An empty string means success; anything else says why nothing changed. */
  registerTexture(id: string, texture: Texture): string;
  /** Whether the id was registered. */
  unregisterTexture(id: string): boolean;
  /** An empty string means success; anything else says why nothing changed. */
  registerMaterial(id: string, material: Material): string;
  /** Whether the id was registered. */
  unregisterMaterial(id: string): boolean;
}

/** Register `texture` under `id`, replacing what the id had. */
export function registerTexture<Texture>(host: GodotHost<ImageHost<Texture, unknown>>, id: string, texture: Texture): void {
  const root = unwrapHost(host);
  const error = 'registerTexture' in root ? root.registerTexture(id, texture) : root.register_texture(id, texture);
  if (error !== '') throw new Error(`Cannot register the texture ${id}: ${error}`);
}

/** Register `material` under `id`, replacing what the id had. A `ShaderMaterial` sees the picture as `TEXTURE`. */
export function registerMaterial<Material>(host: GodotHost<ImageHost<unknown, Material>>, id: string, material: Material): void {
  const root = unwrapHost(host);
  const error = 'registerMaterial' in root ? root.registerMaterial(id, material) : root.register_material(id, material);
  if (error !== '') throw new Error(`Cannot register the material ${id}: ${error}`);
}
