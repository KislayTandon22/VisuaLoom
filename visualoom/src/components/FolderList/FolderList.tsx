// FolderList.tsx
import React, { useEffect, useState } from "react";
import {
  Button,
  Collapse,
  Typography,
  Checkbox,
  FormControlLabel,
  Avatar,
  Chip,
  IconButton,
} from "@mui/material";
import { Card, CardContent, CardHeader } from "@mui/material";
import "./FolderList.css";

import {
  getIndexedFolders,
  getRootFolders,
  browseFolder,
  startIndexing,
  indexFiles,
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

interface FolderInfo {
  path: string;
  name: string;
  type?: string;
  readable?: boolean;
  subfolder_count?: number;
  image_count?: number;
  total_items?: number;
}

export const FolderList: React.FC = () => {
  const [indexedFolders, setIndexedFolders] = useState<FolderInfo[]>([]);
  const [availableFolders, setAvailableFolders] = useState<FolderInfo[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, FolderContents>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // indexFiles imported from API module above

  /** ✅ Fetch indexed + root folders */
  const loadFolders = async () => {
    setLoading(true);
    try {
      const indexed = await getIndexedFolders();
      const roots = await getRootFolders(); // returns string[] from backend

      // Normalize root strings into FolderInfo objects
      const rootsInfo: FolderInfo[] = (roots || []).map((p: string) => ({
        path: p,
        name: p.split("/").filter(Boolean).pop() || p,
      }));

      setIndexedFolders(indexed || []);
      setAvailableFolders(rootsInfo);
    } catch (err) {
      console.error("❌ Error loading folders:", err);
    }
    setLoading(false);
  };

  const getFolderIndexStatus = (path: string) => {
    // Determine if the folder is indexed (fully) or partially or none.
    if (!indexedFolders || indexedFolders.length === 0) return "none";
    // Support either array of strings or array of objects with `path`.
    const exact = indexedFolders.find((f: any) =>
      typeof f === "string" ? f === path : f.path === path,
    );
    if (exact) return "indexed";
    const inside = indexedFolders.find((f: any) => {
      const p = typeof f === "string" ? f : f.path;
      return p.startsWith(path.endsWith("/") ? path : path + "/");
    });
    if (inside) return "partial";
    return "none";
  };

  const handleSelectFolder = (path: string) => {
    setSelectedFolder(path);
    loadContents(path);
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

  /** ✅ Index selected files from the UI */
  const indexSelectedFiles = async () => {
    const paths = Object.keys(selectedFiles).filter((p) => selectedFiles[p]);
    if (paths.length === 0) {
      alert("No files selected to index.");
      return;
    }

    const ok = window.confirm(`Index ${paths.length} selected file(s)?`);
    if (!ok) return;

    try {
      const res = await indexFiles(paths);
      alert(`Indexed ${res.indexed} file(s)`);
      // Clear selections and refresh folders/indexed list
      setSelectedFiles({});
      loadFolders();
    } catch (err) {
      console.error(err);
      alert("Failed to index selected files.");
    }
  };

  const toggleFileSelect = (filePath: string) => {
    setSelectedFiles((prev) => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  useEffect(() => {
    loadFolders();
  }, []);
  return (
    <div className="space-y-6 p-4">
      {/* make the list area scrollable when too tall */}
      <div className="folder-list-scroll">
        <div className="folder-list-columns">
          {/* Folder Explorer (left) */}
          <Card className="indexed-column folders-column">
            <CardHeader title={<span className="text-lg">� Folders</span>} />
            <CardContent>
              {availableFolders.length > 0 ? (
                <ul className="folder-tree space-y-2">
                  {availableFolders.map((root) => {
                    const status = getFolderIndexStatus(root.path);
                    return (
                      <li
                        key={root.path}
                        className="folder-row p-2 rounded hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0">
                            <IconButton
                              size="small"
                              onClick={() => toggleFolder(root.path)}
                              aria-label="toggle"
                            >
                              {expanded === root.path ? "▾" : "▸"}
                            </IconButton>
                            <div className="flex flex-col min-w-0">
                              <button
                                className="text-left truncate folder-select-btn"
                                onClick={() => handleSelectFolder(root.path)}
                              >
                                <Typography
                                  variant="subtitle2"
                                  className="font-medium truncate"
                                >
                                  {root.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  className="text-gray-500 truncate"
                                >
                                  {root.path}
                                </Typography>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Chip
                              size="small"
                              label={
                                status === "indexed"
                                  ? "Indexed"
                                  : status === "partial"
                                    ? "Partial"
                                    : "Not indexed"
                              }
                              color={
                                status === "indexed"
                                  ? "success"
                                  : status === "partial"
                                    ? "warning"
                                    : "default"
                              }
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => indexFolder(root.path)}
                            >
                              Index
                            </Button>
                          </div>
                        </div>

                        {/* show children (folders) when expanded */}
                        <Collapse
                          in={expanded === root.path}
                          timeout="auto"
                          unmountOnExit
                        >
                          <div className="ml-8 mt-2">
                            {contents[root.path] &&
                            contents[root.path].items.length > 0 ? (
                              <ul className="space-y-1">
                                {contents[root.path].items
                                  .filter((it) => it.type === "folder")
                                  .map((sub) => (
                                    <li
                                      key={sub.path}
                                      className="flex items-center justify-between py-1"
                                    >
                                      <button
                                        className="text-left truncate folder-select-btn"
                                        onClick={() =>
                                          handleSelectFolder(sub.path)
                                        }
                                      >
                                        <span className="truncate">
                                          {sub.name}
                                        </span>
                                        <div className="text-xs text-gray-500 truncate">
                                          {sub.path}
                                        </div>
                                      </button>
                                      <Chip
                                        size="small"
                                        label={
                                          getFolderIndexStatus(sub.path) ===
                                          "indexed"
                                            ? "Indexed"
                                            : getFolderIndexStatus(sub.path) ===
                                                "partial"
                                              ? "Partial"
                                              : "Not indexed"
                                        }
                                        color={
                                          getFolderIndexStatus(sub.path) ===
                                          "indexed"
                                            ? "success"
                                            : getFolderIndexStatus(sub.path) ===
                                                "partial"
                                              ? "warning"
                                              : "default"
                                        }
                                      />
                                    </li>
                                  ))}
                              </ul>
                            ) : (
                              <div className="text-gray-500">No subfolders</div>
                            )}
                          </div>
                        </Collapse>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">No folders found.</p>
              )}
            </CardContent>
          </Card>

          {/* Content preview (right) - shows selected folder contents */}
          <Card className="available-column">
            <CardHeader
              title={<span className="text-lg">🗂 Folder Contents</span>}
            />
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">View:</div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="small"
                    variant={viewMode === "grid" ? "contained" : "outlined"}
                    onClick={() => setViewMode("grid")}
                  >
                    Grid
                  </Button>
                  <Button
                    size="small"
                    variant={viewMode === "list" ? "contained" : "outlined"}
                    onClick={() => setViewMode("list")}
                  >
                    List
                  </Button>
                </div>
              </div>

              {!selectedFolder ? (
                <div className="text-gray-600">
                  Select a folder on the left to preview its contents.
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <Typography variant="subtitle1" className="font-medium">
                        {selectedFolder}
                      </Typography>
                    </div>
                    <div>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setSelectedFiles({})}
                        className="mr-2"
                      >
                        Clear
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={indexSelectedFiles}
                        disabled={Object.values(selectedFiles).every((v) => !v)}
                      >
                        Index selected
                      </Button>
                    </div>
                  </div>

                  {contents[selectedFolder] &&
                  contents[selectedFolder].items.length > 0 ? (
                    <div>
                      {viewMode === "grid" ? (
                        <div className="items-grid">
                          {contents[selectedFolder].items.map((item) => (
                            <div
                              key={item.path}
                              className="item-tile p-2 border rounded flex flex-col items-start"
                            >
                              <div className="w-full flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="thumb mr-3">
                                    {item.type === "image" ? (
                                      <Avatar
                                        variant="rounded"
                                        sx={{
                                          width: 40,
                                          height: 28,
                                          bgcolor: "#f3f4f6",
                                        }}
                                      >
                                        🖼
                                      </Avatar>
                                    ) : (
                                      <Avatar
                                        variant="rounded"
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          bgcolor: "#f3f4f6",
                                        }}
                                      >
                                        📁
                                      </Avatar>
                                    )}
                                  </div>
                                  <span className="truncate max-w-[180px]">
                                    {item.name}
                                  </span>
                                </div>

                                {item.type === "image" && (
                                  <Checkbox
                                    size="small"
                                    checked={!!selectedFiles[item.path]}
                                    onChange={() => toggleFileSelect(item.path)}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {contents[selectedFolder].items.map((item) => (
                            <li key={item.path} className="flex items-center">
                              {item.type === "image" ? (
                                <input
                                  type="checkbox"
                                  checked={!!selectedFiles[item.path]}
                                  onChange={() => toggleFileSelect(item.path)}
                                  className="mr-2"
                                />
                              ) : (
                                <span className="mr-2">📁</span>
                              )}
                              <span className="truncate">{item.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">No items in this folder</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
    </div>
  );
};
