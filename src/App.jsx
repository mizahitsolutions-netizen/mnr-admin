import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import StatsCards from "./components/StatsCards";
import ProjectsGrid from "./components/ProjectsGrid";
import ImageUploader from "./components/ImageUploader";
import { autoSeedIfNeeded } from "./firebase";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import ContactsAdmin from "./components/ContactsAdmin";

export default function App() {
  const [stats, setStats] = useState({
    total_clients: 0,
    total_projects: 0,
    years_experience: 0,
  });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const statsDoc = await getDoc(doc(db, "meta", "statsRow"));
      if (statsDoc.exists()) setStats(statsDoc.data());
      const projSnap = await getDocs(collection(db, "projects"));
      const projList = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProjects(projList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // auto-seed if needed (runs once)
    autoSeedIfNeeded().then(() => fetchData());
  }, []);

  const onUploaded = () => fetchData();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <section className="grid grid-cols-1 gap-6 mb-6">
          <StatsCards stats={stats} />
        </section>

        <section className="mb-8">
          <ImageUploader onUploaded={onUploaded} />
        </section>

        <section className="mb-8">
          <ContactsAdmin />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Projects</h2>
          <ProjectsGrid projects={projects} loading={loading} />
        </section>
      </main>
    </div>
  );
}
