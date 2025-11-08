import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

export default function StatsCards() {
  const [stats, setStats] = useState({});
  const [displayStats, setDisplayStats] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [newValue, setNewValue] = useState("");
  const previousStats = useRef({});

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Animate number change
  const animateValue = (key, start, end, duration = 600) => {
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const value = Math.floor(start + (end - start) * progress);
      setDisplayStats((prev) => ({ ...prev, [key]: value }));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Firestore listener
  useEffect(() => {
    const docRef = doc(db, "meta", "statsRow");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const newData = docSnap.data();
        setStats(newData);
        Object.keys(newData).forEach((key) => {
          if (typeof newData[key] === "number") {
            const prevValue = previousStats.current[key] ?? newData[key];
            animateValue(key, prevValue, newData[key]);
          }
        });
        previousStats.current = newData;
      }
    });
    return () => unsubscribe();
  }, []);

  // open modal
  const handleAddClick = (field) => {
    setSelectedField(field);
    setNewValue(stats[field] || 0); // show current value in input
    setShowModal(true);
  };

  // save value
  const handleSave = async () => {
    if (!selectedField) return;
    const docRef = doc(db, "meta", "statsRow");

    try {
      await updateDoc(docRef, {
        [selectedField]: Number(newValue),
      });

      // ✅ Show success snackbar
      const formattedName = selectedField.replace("_", " ");
      setSnackbarMessage(`${formattedName} Updated`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error updating:", error);
      setSnackbarMessage("Failed to update value");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }

    setShowModal(false);
  };

  // stat card
  const StatCard = ({ title, value, field }) => (
    <div className="card p-5 rounded-2xl shadow bg-white dark:bg-gray-800 relative transition-transform hover:scale-[1.02]">
      <div className="text-sm text-gray-500 dark:text-gray-300">{title}</div>
      <div className="text-3xl font-bold mt-2">{value ?? 0}</div>
      <button
        className="absolute top-3 right-3 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-md"
        onClick={() => handleAddClick(field)}
      >
        + Add
      </button>
    </div>
  );

  return (
    <>
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-5"> */}
        <StatCard
          title="Total Projects"
          value={displayStats.total_projects}
          field="total_projects"
        />
        <StatCard
          title="Total Clients"
          value={displayStats.total_clients}
          field="total_clients"
        />
        <StatCard
          title="Years Experience"
          value={displayStats.years_experience}
          field="years_experience"
        />
      {/* </div> */}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-80">
            <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
              Edit {selectedField.replace("_", " ")}
            </h2>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <button
                onClick={() => setNewValue((prev) => Number(prev) - 1)}
                className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full text-lg"
              >
                -
              </button>
              <input
                type="number"
                className="w-20 text-center border border-gray-300 dark:border-gray-700 rounded p-2 bg-transparent text-gray-800 dark:text-gray-200"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
              <button
                onClick={() => setNewValue((prev) => Number(prev) + 1)}
                className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full text-lg"
              >
                +
              </button>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MuiAlert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          elevation={6}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>
    </>
  );
}
