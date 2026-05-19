import * as ImagePicker from 'expo-image-picker';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase } from '../supabase';

export type StorageBucket =
  | 'avatars'
  | 'portfolio-photos'
  | 'booking-photos'
  | 'claim-photos'
  | 'verification-docs';

const PUBLIC_BUCKETS: StorageBucket[] = ['avatars', 'portfolio-photos'];

export interface UploadResult {
  path: string;
  bucket: StorageBucket;
  publicUrl: string | null;
}

export async function pickImageFromLibrary(opts?: {
  aspect?: [number, number];
  allowsEditing?: boolean;
}): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.75,
    base64: true,
    allowsEditing: opts?.allowsEditing ?? true,
    aspect: opts?.aspect,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0];
}

export async function pickImageFromCamera(opts?: {
  aspect?: [number, number];
}): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.75,
    base64: true,
    allowsEditing: true,
    aspect: opts?.aspect,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0];
}

export async function uploadAsset(
  bucket: StorageBucket,
  path: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<UploadResult> {
  if (!asset.base64) {
    throw new Error('uploadAsset requires asset.base64 — call pickImageFromLibrary/Camera which sets base64:true');
  }
  const arrayBuffer = decodeBase64(asset.base64);
  const contentType = asset.mimeType ?? 'image/jpeg';
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  if (PUBLIC_BUCKETS.includes(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { path, bucket, publicUrl: data.publicUrl };
  }
  return { path, bucket, publicUrl: null };
}

export async function pickAndUpload(
  bucket: StorageBucket,
  path: string,
  source: 'library' | 'camera' = 'library',
): Promise<UploadResult | null> {
  const asset =
    source === 'camera' ? await pickImageFromCamera() : await pickImageFromLibrary();
  if (!asset) return null;
  return uploadAsset(bucket, path, asset);
}

export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export function getPublicUrl(bucket: StorageBucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
