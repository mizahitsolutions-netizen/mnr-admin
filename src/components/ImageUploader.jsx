// Responsive ImageUploader with fully responsive dialog/snackbar behavior

import React, { useState } from "react";
import { uploadToCloudinary } from "../cloudinary";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore"; // ✅ extended imports
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
  const [files, setFiles] = useState([]); // original image/video files
  const [status, setStatus] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ---- IMAGE COMPRESSION (same as before, used only during upload) ----
  const compressImage = (file, maxSizeKB = 500) => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const scaleFactor = Math.sqrt((maxSizeKB * 1024) / file.size);
          const finalScale = Math.min(1, scaleFactor);

          canvas.width = img.width * finalScale;
          canvas.height = img.height * finalScale;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              // ✅ Handle toBlob returning null (fallback to original file)
              if (!blob) {
                console.warn("toBlob returned null, using original file");
                return resolve(file);
              }

              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.7
          );
        };

        img.src = event.target.result;
      };

      reader.readAsDataURL(file);
    });
  };

  // ---- STORE ORIGINAL FILES FOR PREVIEW ----
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  // ---- UPLOAD WITH COMPRESSION ----
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Enter project name");
      return;
    }
    if (!files.length) {
      alert("Select at least one file (image or video)");
      return;
    }

    try {
      setStatus("Uploading...");

      const imageUrls = [];
      const videoUrls = [];

      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i];

        const isVideo = originalFile.type.startsWith("video/");
        const isImage = originalFile.type.startsWith("image/");

        // ✅ Guard unsupported/unknown file types
        if (!isImage && !isVideo) {
          console.warn(
            "Unsupported file type encountered:",
            originalFile,
            "type:",
            originalFile.type
          );
          throw new Error(
            "Unsupported file type detected. Please upload only images or videos."
          );
        }

        let fileToUpload = originalFile;

        setStatus(
          `Uploading ${isVideo ? "video" : "image"} ${i + 1} of ${
            files.length
          }...`
        );

        try {
          if (isImage) {
            // compress all images
            fileToUpload = await compressImage(originalFile);
          } else if (isVideo) {
            const sizeLimit = 100 * 1024 * 1024; // 100MB

            if (originalFile.size > sizeLimit) {
              // Only compress if >100MB
              fileToUpload = await compressVideo(originalFile);
            } else {
              // Under 100MB → upload original
              fileToUpload = originalFile;
            }
          }
        } catch (error) {
          console.error("Compression failed, using original file:", error);
          fileToUpload = originalFile;
        }

        const resourceType = isVideo ? "video" : "image";

        const res = await uploadToCloudinary(fileToUpload, resourceType);

        // ✅ Defensive check on Cloudinary response
        if (!res || (!res.secure_url && !res.url)) {
          console.error("Invalid Cloudinary response:", res);
          throw new Error("Upload failed: No URL returned from Cloudinary.");
        }

        const url = res.secure_url || res.url;

        if (isVideo) videoUrls.push(url);
        else imageUrls.push(url);
      }

      // ✅ Build base slug from name + category
      const baseSlug = slugify(
        `${name.trim()} - ${category.toLowerCase()} building`
      );

      let slug = baseSlug;
      let counter = 1;

      // 🔒 Ensure slug uniqueness (no timestamps, but -1, -2 if needed)
      while (true) {
        const q = query(collection(db, "projects"), where("slug", "==", slug));
        const snap = await getDocs(q);
        if (snap.empty) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const projectData = {
        name: name.trim(),
        slug,
        category,
        description: description.trim(),
        projectType,
        address: location.trim(), // you’re saving it as `address` here
        images: imageUrls,
        videos: videoUrls,
        createdAt: new Date().toISOString(),
      };

      if (projectType === "Ongoing") {
        projectData.progressStatus = progressStatus || "Ongoing";
      } else {
        projectData.completionDate =
          completionDate || new Date().toISOString().slice(0, 10);
      }

      await addDoc(collection(db, "projects"), projectData);

      setSnackbar({
        open: true,
        message: "Project uploaded successfully!",
        severity: "success",
      });

      // Reset form
      setStatus("");
      setName("");
      setCategory("Residential");
      setProjectType("Ongoing");
      setDescription("");
      setLocation("");
      setProgressStatus("");
      setCompletionDate("");
      setFiles([]);

      onUploaded && onUploaded();
    } catch (err) {
      console.error("Upload failed:", err);

      const message =
        err?.message || "Upload failed due to an unexpected error.";

      setSnackbar({
        open: true,
        message,
        severity: "error",
      });

      setStatus(`Upload failed: ${message}`);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
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
          <SelectContent className="w-full">
            <SelectItem value="Residential">Residential</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
            <SelectItem value="Villas">Villas</SelectItem>
            <SelectItem value="Renovation">Renovation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Project description"
        className="border p-2 rounded w-full mt-4 min-h-[90px]"
      ></textarea>

      {/* Location */}
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Project location"
        className="border p-2 rounded w-full mt-4"
      />

      {/* Project Type + Progress/Completion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Select value={projectType} onValueChange={setProjectType}>
          <SelectTrigger className="border p-2 rounded w-full">
            <SelectValue placeholder="Select Project Type" />
          </SelectTrigger>
          <SelectContent className="w-full">
            <SelectItem value="Ongoing">Ongoing</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {projectType === "Ongoing" ? (
          <input
            value={progressStatus}
            onChange={(e) => setProgressStatus(e.target.value)}
            placeholder="Progressing status"
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

      {/* File input + previews */}
      <div className="mt-4 w-full">
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="border p-2 rounded w-full"
        />

        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
            {files.map((file, idx) => {
              const isVideo = file.type.startsWith("video/");
              const previewUrl = URL.createObjectURL(file);

              return (
                <div key={idx} className="relative group w-full">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      className="rounded-lg object-cover w-full h-24 sm:h-28 md:h-32 border"
                      controls
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="rounded-lg object-cover w-full h-24 sm:h-28 md:h-32 border"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1 right-1 bg-red-600 text-white text-xs rounded-full px-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Button + Status */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
        <button
          type="submit"
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 w-full sm:w-auto text-center"
        >
          Upload
        </button>
        <div className="text-sm text-gray-500 break-words max-w-full">
          {status}
        </div>
      </div>

      {/* RESPONSIVE SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ width: "100%", maxWidth: "100vw", px: 2 }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%", maxWidth: "600px", mx: "auto" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </form>
  );
}
