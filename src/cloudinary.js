// cloudinary.js - unsigned upload helper for Cloudinary (client-side)
// Ensure you create an unsigned upload preset in Cloudinary dashboard and set settings.json accordingly.

export async function uploadToCloudinary(file) {
  // read settings.json for cloud name & preset
  const settings = await fetch('/src/settings.json').then(r=>r.json());
  const cloudName = settings.cloudinary.cloudName;
  const unsignedPreset = settings.cloudinary.unsignedUploadPreset;

  if (!cloudName || !unsignedPreset) throw new Error('Cloudinary not configured in settings.json');

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', unsignedPreset);

  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json(); // contains secure_url
}
