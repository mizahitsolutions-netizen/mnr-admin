// cloudinary.js

// If you're using the "public/settings.json" approach:
export async function uploadToCloudinary(file, resourceType = "image") {
  const resSettings = await fetch("/settings.json");
  if (!resSettings.ok) {
    throw new Error("Could not load Cloudinary settings");
  }

  const settings = await resSettings.json();
  const cloudName = settings.cloudinary.cloudName;
  const unsignedPreset = settings.cloudinary.unsignedUploadPreset;

  if (!cloudName || !unsignedPreset) {
    throw new Error("Cloudinary not configured in settings.json");
  }

  // 👇 use resourceType: "image" or "video"
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", unsignedPreset);

  const uploadRes = await fetch(url, { method: "POST", body: form });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    console.error("Cloudinary upload error response:", text);
    throw new Error("Upload failed");
  }

  return uploadRes.json(); // contains secure_url
}
