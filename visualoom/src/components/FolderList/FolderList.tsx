// FolderList.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { Card, CardContent, CardHeader } from "@mui/material";

import {
  getIndexedFolders,
  getRootFolders,
  browseFolder,
  startIndexing,
} from "../../api/indexApi";

interface FolderContents {
  path: string;
  items: Array<{
    name: string;
    path: string;
    type: "folder" | "image";
  }>;
  total: number;
}

export const FolderList: React.FC = () => {
  const [indexedFolders, setIndexedFolders] = useState<string[]>([]);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, FolderContents>>({});
  const [loading, setLoading] = useState(false);

  /** ✅ Fetch indexed + root folders */
  const loadFolders = async () => {
    setLoading(true);
    try {
      const indexed = await getIndexedFolders();
      const roots = await getRootFolders(); // returns string[] from backend

      setIndexedFolders(indexed);
      setAvailableFolders(roots);
    } catch (err) {
      console.error("❌ Error loading folders:", err);
    }
    setLoading(false);
  };

  /** ✅ Load subfolder contents */
  const loadContents = async (path: string) => {
    try {
      const res = await browseFolder(path, true);
      setContents((prev) => ({
        ...prev,
        [path]: res,
      }));
    } catch (err) {
      console.error("❌ Failed to load folder:", err);
    }
  };

  /** ✅ Expand/Collapse */
  const toggleFolder = (path: string) => {
    if (expanded === path) {
      setExpanded(null);
      return;
    }
    setExpanded(path);
    loadContents(path);
  };

  /** ✅ Start indexing */
  const indexFolder = async (path: string) => {
    const ok = window.confirm(`Allow indexing of folder?\n${path}`);
    if (!ok) return;

    try {
      await startIndexing(path);
      alert("✅ Indexing started!");
      loadFolders();
    } catch (err) {
      alert("❌ Failed to index folder.");
      console.error(err);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  return (
    <div className="space-y-6 p-4">

      {/* ✅ Indexed Folders */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">📂 Indexed Folders</h2>
        </CardHeader>
        <CardContent>
          {indexedFolders.length > 0 ? (
            <ul className="space-y-2">
              {indexedFolders.map((f, i) => (
                <li
                  key={i}
                  className="p-2 bg-gray-100 rounded flex justify-between"
                >
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No folders indexed yet.</p>
          )}
        </CardContent>
      </Card>

      {/* ✅ Available Folders */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">🗂 Available Folders</h2>
        </CardHeader>
        <CardContent>
          {availableFolders.length > 0 ? (
            <ul className="space-y-4">
              {availableFolders.map((f, i) => (
                <li key={i} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <span>{f}</span>

                    <div className="space-x-2">
                      <Button
                        variant="outlined"
                        onClick={() => toggleFolder(f)}
                      >
                        {expanded === f ? "Hide" : "View"}
                      </Button>

                      <Button variant="contained" onClick={() => indexFolder(f)}>
                        Index
                      </Button>
                    </div>
                  </div>

                  {expanded === f && contents[f] && (
                    <ul className="ml-4 mt-3 space-y-1 text-sm text-gray-700">
                      {contents[f].items.map((item) => (
                        <li key={item.path}>
                          {item.type === "folder" ? "📁 " : "🖼 "} {item.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No folders found.</p>
          )}
        </CardContent>
      </Card>

      {loading && <p className="text-gray-500">Loading...</p>}
    </div>
  );
};
