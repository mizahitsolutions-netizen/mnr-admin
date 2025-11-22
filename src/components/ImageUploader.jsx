// Responsive ImageUploader with fully responsive dialog/snackbar behavior
// Ensures inputs, grids, previews, and the Snackbar dialog scale properly on all devices

import React, { useState } from "react";
import { uploadToCloudinary } from "../cloudinary";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { Snackbar, Alert } from "@mui/material";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function ImageUploader({ onUploaded }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Residential");
  const [projectType, setProjectType] = useState("Ongoing");
  const [description, setDescription] = useState("");
  const [progressStatus, setProgressStatus] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const compressImage = (file, maxSizeKB = 500) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Basic scale factor based on size
          const scaleFactor = Math.sqrt((maxSizeKB * 1024) / file.size);
          const finalScale = Math.min(1, scaleFactor); // avoid upscaling

          canvas.width = img.width * finalScale;
          canvas.height = img.height * finalScale;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
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

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const compressedFiles = [];

    for (let file of selectedFiles) {
      const compressed = await compressImage(file);
      compressedFiles.push(compressed);
    }

    setFiles((prev) => [...prev, ...compressedFiles]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Enter project name");
      return;
    }
    if (!files.length) {
      alert("Select at least one image");
      return;
    }

    try {
      setStatus("Uploading...");
      const imageUrls = [];

      for (let i = 0; i < files.length; i++) {
        setStatus(`Uploading image ${i + 1} of ${files.length}...`);
        const res = await uploadToCloudinary(files[i]);
        imageUrls.push(res.secure_url || res.url);
      }

      const projectData = {
        name: name.trim(),
        category,
        description: description.trim(),
        projectType,
        images: imageUrls,
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
      setProgressStatus("");
      setCompletionDate("");
      setFiles([]);

      onUploaded && onUploaded();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Upload failed. Try again!",
        severity: "error",
      });
      setStatus("Upload failed");
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
          accept="image/*"
          onChange={handleFileChange}
          className="border p-2 rounded w-full"
        />

        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
            {files.map((file, idx) => (
              <div key={idx} className="relative group w-full">
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="rounded-lg object-cover w-full h-24 sm:h-28 md:h-32 border"
                />
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
            ))}
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
