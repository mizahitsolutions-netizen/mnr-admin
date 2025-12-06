import React, { useState } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Snackbar,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";

export default function ProjectsGrid({
  projects: initialProjects,
  loading,
  onRefresh,
}) {
  const [projects, setProjects] = useState(initialProjects || []);
  const [editProject, setEditProject] = useState(null);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({}); // per-project media index

  // 🔁 Sync projects when parent updates
  React.useEffect(() => setProjects(initialProjects || []), [initialProjects]);

  if (loading) return <div>Loading...</div>;
  if (!projects || projects.length === 0) return <div>No projects yet.</div>;

  // ✅ Handle Update (Instant update in UI)
  const handleUpdate = async () => {
    try {
      const docRef = doc(db, "projects", editProject.id);
      const data = { ...editProject };
      delete data.id;
      await updateDoc(docRef, data);

      // Update locally without refresh
      setProjects((prev) =>
        prev.map((p) => (p.id === editProject.id ? editProject : p))
      );

      setSnack({
        open: true,
        message: "Project updated successfully!",
        type: "success",
      });
      setEditProject(null);
      onRefresh && onRefresh();
    } catch (error) {
      console.error("Error updating project:", error);
      setSnack({ open: true, message: "Update failed!", type: "error" });
    }
  };

  // ✅ Handle Delete
  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "projects", confirmDelete.id));
      setProjects((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setSnack({
        open: true,
        message: "Project deleted successfully!",
        type: "success",
      });
      setConfirmDelete(null);
      onRefresh && onRefresh();
    } catch (error) {
      console.error("Error deleting project:", error);
      setSnack({ open: true, message: "Delete failed!", type: "error" });
    }
  };

  // ✅ Carousel Controls (for mixed image + video)
  const nextImage = (projectId, total) => {
    setCurrentImageIndex((prev) => {
      const current = prev[projectId] ?? 0;
      return {
        ...prev,
        [projectId]: (current + 1) % total,
      };
    });
  };

  const prevImage = (projectId, total) => {
    setCurrentImageIndex((prev) => {
      const current = prev[projectId] ?? 0;
      return {
        ...prev,
        [projectId]: (current - 1 + total) % total,
      };
    });
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {projects.map((p) => {
        const images = p.images || [];
        const videos = p.videos || [];

        // 🔗 Combine images + videos into one media array
        const media = [
          ...images.map((url) => ({ type: "image", url })),
          ...videos.map((url) => ({ type: "video", url })),
        ];

        const totalMedia = media.length;
        const index = currentImageIndex[p.id] ?? 0;
        const activeMedia = media[index];

        return (
          <div
            key={p.id}
            className="rounded-xl overflow-hidden shadow-lg bg-white dark:bg-gray-800 relative"
          >
            {/* ✅ Media Carousel (Image + Video) */}
            {totalMedia > 0 ? (
              <div className="relative">
                {activeMedia.type === "image" ? (
                  <img
                    src={activeMedia.url}
                    alt={p.name}
                    className="w-full h-48 object-cover transition-all duration-300"
                  />
                ) : (
                  <video
                    src={activeMedia.url}
                    className="w-full h-48 object-cover transition-all duration-300"
                    controls
                  />
                )}

                {/* Navigation arrows if more than 1 media */}
                {totalMedia > 1 && (
                  <>
                    <IconButton
                      className="!absolute top-1/2 left-2 -translate-y-1/2 bg-white/70 hover:bg-white"
                      onClick={() => prevImage(p.id, totalMedia)}
                    >
                      <ArrowBackIos fontSize="small" />
                    </IconButton>
                    <IconButton
                      className="!absolute top-1/2 right-2 -translate-y-1/2 bg-white/70 hover:bg-white"
                      onClick={() => nextImage(p.id, totalMedia)}
                    >
                      <ArrowForwardIos fontSize="small" />
                    </IconButton>

                    {/* Small indicator */}
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {index + 1}/{totalMedia}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-44 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                No media
              </div>
            )}

            {/* ✅ Info Section */}
            <div className="p-4">
              <div className="font-semibold text-lg">{p.name}</div>
              <div className="text-sm text-gray-500 mb-1">{p.category}</div>

              {/* Optional: show counts for images/videos */}
              {(images.length > 0 || videos.length > 0) && (
                <div className="text-xs text-gray-500 mb-1">
                  {images.length > 0 && `${images.length} image(s)`}{" "}
                  {images.length > 0 && videos.length > 0 && "•"}{" "}
                  {videos.length > 0 && `${videos.length} video(s)`}
                </div>
              )}

              {p.description && (
                <div className="text-sm text-gray-600 mb-2 line-clamp-3">
                  {p.description}
                </div>
              )}
              {p.projectType === "Ongoing" && (
                <div className="text-sm text-blue-600">
                  Progress: {p.progressStatus || "Ongoing"}
                </div>
              )}
              {p.projectType === "Completed" && (
                <div className="text-sm text-green-600">
                  Completed: {p.completionDate || "N/A"}
                </div>
              )}

              {/* ✅ Action Buttons */}
              <div className="mt-3 flex gap-3">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setEditProject(p)}
                >
                  Edit
                </button>
                <button
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={() => setConfirmDelete(p)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* ✅ Edit Modal */}
      <Dialog
        open={!!editProject}
        onClose={() => setEditProject(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent dividers>
          {editProject && (
            <div className="flex flex-col gap-3 mt-2">
              <TextField
                label="Project Name"
                value={editProject.name}
                onChange={(e) =>
                  setEditProject({ ...editProject, name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Category"
                value={editProject.category}
                onChange={(e) =>
                  setEditProject({ ...editProject, category: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Description"
                value={editProject.description || ""}
                onChange={(e) =>
                  setEditProject({
                    ...editProject,
                    description: e.target.value,
                  })
                }
                multiline
                rows={3}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="project-type-label">Project Type</InputLabel>
                <Select
                  labelId="project-type-label"
                  label="Project Type"
                  value={editProject.projectType || "Ongoing"}
                  onChange={(e) =>
                    setEditProject({
                      ...editProject,
                      projectType: e.target.value,
                    })
                  }
                >
                  <MenuItem value="Ongoing">Ongoing</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
              {editProject.projectType === "Ongoing" && (
                <TextField
                  label="Progress Status"
                  value={editProject.progressStatus || ""}
                  onChange={(e) =>
                    setEditProject({
                      ...editProject,
                      progressStatus: e.target.value,
                    })
                  }
                  fullWidth
                />
              )}
              {editProject.projectType === "Completed" && (
                <TextField
                  label="Completed Date"
                  type="date"
                  value={editProject.completionDate || ""}
                  onChange={(e) =>
                    setEditProject({
                      ...editProject,
                      completionDate: e.target.value,
                    })
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProject(null)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Delete Confirmation */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{confirmDelete?.name}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.type}
          onClose={() => setSnack({ ...snack, open: false })}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
