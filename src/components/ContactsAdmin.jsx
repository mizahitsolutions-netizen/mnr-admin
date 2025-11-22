// Updated responsive ContactsAdmin component
// Your design is preserved, only responsive classes added

import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Trash2, CheckCircle, Download } from "lucide-react";

export default function ContactsAdmin() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "contactMessages"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return messages;
    const s = search.toLowerCase();
    return messages.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(s) ||
        (m.email || "").toLowerCase().includes(s) ||
        (m.message || "").toLowerCase().includes(s) ||
        (m.phone || "").toLowerCase().includes(s)
    );
  }, [messages, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = async (id) => {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    await deleteDoc(doc(db, "contactMessages", id));
  };

  const markResponded = async (id, current) => {
    await updateDoc(doc(db, "contactMessages", id), { responded: !current });
  };

  const exportCsv = () => {
    const rows = filtered.map((m) => ({
      id: m.id,
      name: m.name || "",
      email: m.email || "",
      phone: m.phone || "",
      message: m.message || "",
      responded: m.responded ? "yes" : "no",
      createdAt: m.createdAt?.seconds
        ? new Date(m.createdAt.seconds * 1000).toISOString()
        : "",
    }));

    if (rows.length === 0) return;

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact_messages_${new Date()
      .toISOString()
      .slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900 text-white rounded-lg shadow p-4 md:p-6 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h3 className="text-xl font-semibold">Contact Messages</h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / email / message"
            className="px-3 py-2 rounded bg-gray-800 border border-gray-700 placeholder-gray-400 focus:outline-none text-sm w-full sm:w-64"
          />
          <button
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded text-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-gray-300">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Message</th>
              <th className="py-2">Created</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-gray-400">
                  No messages found.
                </td>
              </tr>
            ) : (
              paginated.map((m) => (
                <tr key={m.id} className="border-t border-gray-800">
                  <td className="py-3 align-top max-w-[140px] truncate">
                    {m.name || "-"}
                  </td>
                  <td className="py-3 align-top max-w-[180px] truncate">
                    {m.email || "-"}
                  </td>
                  <td className="py-3 align-top">{m.phone || "-"}</td>
                  <td className="py-3 align-top break-words max-w-[260px]">
                    {m.message || "-"}
                  </td>
                  <td className="py-3 align-top text-xs text-gray-400">
                    {m.createdAt?.seconds
                      ? new Date(m.createdAt.seconds * 1000).toLocaleString()
                      : "-"}
                  </td>
                  <td className="py-3 align-top">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <button
                        onClick={() => markResponded(m.id, !!m.responded)}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded ${
                          m.responded
                            ? "bg-green-700"
                            : "bg-gray-800 hover:bg-gray-700"
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">
                          {m.responded ? "Responded" : "Mark"}
                        </span>
                      </button>

                      <button
                        onClick={() => handleDelete(m.id)}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-700 hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between mt-4 text-sm text-gray-300 gap-3">
        <div>
          Showing {(page - 1) * perPage + 1} -{" "}
          {Math.min(page * perPage, filtered.length)} of {filtered.length}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <div>
            Page {page} / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
