import React, { useState } from "react";
import { uploadToCloudinary } from "../cloudinary";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { Snackbar, Alert } from "@mui/material";

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

  // ✅ Compress image before upload (to ~5kb)
  const compressImage = (file, maxSizeKB = 5) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scaleFactor = Math.sqrt((maxSizeKB * 1024) / file.size);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) =>
              resolve(new File([blob], file.name, { type: "image/jpeg" })),
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
    const selectedFiles = Array.from(e.target.files);
    const compressedFiles = [];
    for (let file of selectedFiles) {
      const compressed = await compressImage(file);
      compressedFiles.push(compressed);
    }
    setFiles((prev) => [...prev, ...compressedFiles]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!name) return alert("Enter project name");
    if (!files.length) return alert("Select at least one image");

    try {
      setStatus("Uploading...");
      const imageUrls = [];

      for (let i = 0; i < files.length; i++) {
        setStatus(`Uploading image ${i + 1} of ${files.length}...`);
        const res = await uploadToCloudinary(files[i]);
        imageUrls.push(res.secure_url || res.url);
      }

      const projectData = {
        name,
        category,
        description,
        projectType,
        images: imageUrls,
        createdAt: new Date().toISOString(),
      };

      if (projectType === "Ongoing") {
        projectData.progressStatus = progressStatus || "Ongoing";
      } else {
        projectData.completionDate = completionDate || new Date().toISOString();
      }

      await addDoc(collection(db, "projects"), projectData);

      setSnackbar({
        open: true,
        message: "Project uploaded successfully!",
        severity: "success",
      });
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

  return (
    <form
      onSubmit={handleUpload}
      className="card p-5 rounded-2xl shadow bg-white dark:bg-gray-800"
    >
      <h3 className="text-lg font-semibold mb-4">Add Project</h3>

      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="border p-2 rounded"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-2 rounded"
        >
          <option>Residential</option>
          <option>Commercial</option>
          <option>Villas</option>
          <option>Renovation</option>
        </select>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Project description"
        className="border p-2 rounded w-full mt-4"
      ></textarea>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <select
          value={projectType}
          onChange={(e) => setProjectType(e.target.value)}
          className="border p-2 rounded"
        >
          <option>Ongoing</option>
          <option>Completed</option>
        </select>

        {projectType === "Ongoing" ? (
          <input
            value={progressStatus}
            onChange={(e) => setProgressStatus(e.target.value)}
            placeholder="Progressing status"
            className="border p-2 rounded"
          />
        ) : (
          <input
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            className="border p-2 rounded"
          />
        )}
      </div>

      {/* Image Upload */}
      <div className="mt-4">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="border p-2 rounded w-full"
        />

        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {files.map((file, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="rounded-lg object-cover w-full h-25 border"
                />
                {/* ❌ Remove button */}
                <button
                  type="button"
                  onClick={() => {
                    const updated = files.filter((_, i) => i !== idx);
                    setFiles(updated);
                  }}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs rounded-full px-1 opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload button */}
      <div className="mt-4 flex items-center gap-4">
        <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
          Upload
        </button>
        <div className="text-sm text-gray-500">{status}</div>
      </div>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </form>
  );
}
