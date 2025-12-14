// Responsive ImageUploader with mobile-safe previews

import React, { useState } from "react";
import { uploadToCloudinary } from "../cloudinary";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Snackbar, Alert } from "@mui/material";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { compressVideo } from "../utils/compressVideo";
import slugify from "../utils/slugify";

export default function ImageUploader({ onUploaded }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Residential");
  const [projectType, setProjectType] = useState("Ongoing");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [progressStatus, setProgressStatus] = useState("");
  const [completionDate, setCompletionDate] = useState("");

  // ⬇️ files = [{ file, preview }]
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ---------- IMAGE COMPRESSION ----------
  const compressImage = (file, maxSizeKB = 500) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const scale = Math.min(1, Math.sqrt((maxSizeKB * 1024) / file.size));

          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.7
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  // ---------- FILE SELECT ----------
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);

    const withPreview = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...withPreview]);
  };

  // ---------- UPLOAD ----------
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!name.trim()) return alert("Enter project name");
    if (!files.length) return alert("Select at least one file");

    try {
      setStatus("Uploading...");

      const imageUrls = [];
      const videoUrls = [];

      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i].file;
        const type = originalFile.type.toLowerCase();

        // ❌ Block HEIC / HEIF
        if (type.includes("heic") || type.includes("heif")) {
          throw new Error(
            "HEIC images are not supported. Convert to JPG or PNG."
          );
        }

        const isImage = type.startsWith("image/");
        const isVideo = type.startsWith("video/");

        if (!isImage && !isVideo) {
          throw new Error("Unsupported file type");
        }

        setStatus(
          `Uploading ${isVideo ? "video" : "image"} ${i + 1} of ${
            files.length
          }...`
        );

        let fileToUpload = originalFile;

        try {
          if (isImage && !isMobile) {
            fileToUpload = await compressImage(originalFile);
          }

          if (isVideo) {
            const limit = 100 * 1024 * 1024;
            if (originalFile.size > limit) {
              if (isMobile) {
                throw new Error(
                  "Video too large for mobile upload (max 100MB)"
                );
              }
              fileToUpload = await compressVideo(originalFile);
            }
          }
        } catch {
          fileToUpload = originalFile;
        }

        const res = await uploadToCloudinary(
          fileToUpload,
          isVideo ? "video" : "image"
        );

        const url = res?.secure_url || res?.url;
        if (!url) throw new Error("Upload failed");

        isVideo ? videoUrls.push(url) : imageUrls.push(url);
      }

      // ---------- SLUG ----------
      const baseSlug = slugify(
        `${name.trim()} - ${category.toLowerCase()} building`
      );

      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const q = query(collection(db, "projects"), where("slug", "==", slug));
        const snap = await getDocs(q);
        if (snap.empty) break;
        slug = `${baseSlug}-${counter++}`;
      }

      // ---------- FIRESTORE ----------
      await addDoc(collection(db, "projects"), {
        name: name.trim(),
        slug,
        category,
        description: description.trim(),
        projectType,
        address: location.trim(),
        images: imageUrls,
        videos: videoUrls,
        createdAt: new Date().toISOString(),
        ...(projectType === "Ongoing"
          ? { progressStatus: progressStatus || "Ongoing" }
          : { completionDate }),
      });

      setSnackbar({
        open: true,
        message: "Project uploaded successfully!",
        severity: "success",
      });

      // ---------- CLEANUP ----------
      files.forEach((f) => URL.revokeObjectURL(f.preview));

      setName("");
      setCategory("Residential");
      setProjectType("Ongoing");
      setDescription("");
      setLocation("");
      setProgressStatus("");
      setCompletionDate("");
      setFiles([]);
      setStatus("");

      onUploaded && onUploaded();
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
      setSnackbar({
        open: true,
        message: err.message,
        severity: "error",
      });
    }
  };

  return (
    <form
      onSubmit={handleUpload}
      className="card p-5 rounded-2xl shadow bg-white dark:bg-gray-800 w-full mx-auto"
    >
      <h3 className="text-lg font-semibold mb-4">Add Project</h3>

      {/* Name + Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="border p-2 rounded w-full"
          required
        />

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="border p-2 rounded w-full">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Residential">Residential</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
            <SelectItem value="Villas">Villas</SelectItem>
            <SelectItem value="Renovation">Renovation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Project description"
        className="border p-2 rounded w-full mt-4 min-h-[90px]"
      />

      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Project location"
        className="border p-2 rounded w-full mt-4"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Select value={projectType} onValueChange={setProjectType}>
          <SelectTrigger className="border p-2 rounded w-full">
            <SelectValue placeholder="Project Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ongoing">Ongoing</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {projectType === "Ongoing" ? (
          <input
            value={progressStatus}
            onChange={(e) => setProgressStatus(e.target.value)}
            placeholder="Progress status"
            className="border p-2 rounded w-full"
          />
        ) : (
          <input
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
        )}
      </div>

      {/* FILE INPUT */}
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="border p-2 rounded w-full mt-4"
      />

      {/* PREVIEWS */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
          {files.map(({ file, preview }, idx) => (
            <div key={idx} className="relative group">
              {file.type.startsWith("video/") ? (
                <video
                  src={preview}
                  controls
                  className="w-full h-28 object-cover rounded border"
                />
              ) : (
                <img
                  src={preview}
                  className="w-full h-28 object-cover rounded border"
                />
              )}

              <button
                type="button"
                onClick={() =>
                  setFiles((prev) => {
                    URL.revokeObjectURL(prev[idx].preview);
                    return prev.filter((_, i) => i !== idx);
                  })
                }
                className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1 rounded-full opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <button className="bg-orange-600 text-white px-4 py-2 rounded">
          Upload
        </button>
        <span className="text-sm text-gray-500">{status}</span>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </form>
  );
}
