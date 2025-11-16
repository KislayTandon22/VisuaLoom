import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  searchImages,
  uploadImage,
  getIndexedFolders,
  browseFolder,
  indexFiles,
} from "../../api/indexApi";
import "./Indexed.css";

export default function Indexed() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState(0);
  const [folders, setFolders] = useState([]);
  const [selectedFolderContents, setSelectedFolderContents] = useState(null);

  const doSearch = async () => {
    try {
      const res = await searchImages(query);
      setResults(res.results || []);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getIndexedFolders();
        setFolders(data || []);
      } catch (e) {
        console.error("Failed to load indexed folders", e);
        setFolders([]);
      }
    };
    if (tab === 1) load();
  }, [tab]);

  const openFolder = async (path) => {
    try {
      const res = await browseFolder(path, true);
      setSelectedFolderContents(res);
    } catch (e) {
      console.error("browse failed", e);
      setSelectedFolderContents(null);
    }
  };

  const handleFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setUploading(true);
    try {
      const res = await uploadImage(f);
      alert("Upload successful");
      doSearch();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="p-8">
      <Card>
        <CardHeader title="Indexed — Search & Add" />
        <CardContent>
          <div className="flex items-center space-x-3 mb-4">
            <TextField
              label="Search indexed images"
              variant="outlined"
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              className="flex-1"
            />
            <Button variant="contained" onClick={doSearch}>
              Search
            </Button>
            <label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                style={{ display: "none" }}
              />
              <Button variant="outlined" component="span" disabled={uploading}>
                {uploading ? "Uploading..." : "Add Image"}
              </Button>
            </label>
          </div>

          <div>
            <Tabs value={tab} onChange={(e, v) => setTab(v)}>
              <Tab label="Files" />
              <Tab label="Folders" />
            </Tabs>

            {tab === 0 && (
              <div className="mt-4">
                <div className="results-grid">
                  {results.length === 0 ? (
                    <div className="text-gray-500">
                      No results. Try a search or add images.
                    </div>
                  ) : (
                    results.map((r) => (
                      <div key={r.id || r.path} className="result-item">
                        <Avatar
                          variant="rounded"
                          sx={{ width: 80, height: 56, bgcolor: "#f3f4f6" }}
                        >
                          🖼
                        </Avatar>
                        <div className="result-meta">
                          <div className="result-title">
                            {r.title || r.path || r.name || r.id}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {r.path}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === 1 && (
              <div className="mt-4">
                <div className="flex gap-6">
                  <div style={{ flex: 1 }}>
                    <Card>
                      <CardHeader title="Indexed Folders" />
                      <CardContent>
                        <List>
                          {Array.isArray(folders) && folders.length === 0 ? (
                            <div className="text-gray-500">
                              No indexed folders.
                            </div>
                          ) : (
                            folders.map((f) => (
                              <ListItem
                                button
                                key={f.path}
                                onClick={() => openFolder(f.path)}
                              >
                                <ListItemText
                                  primary={f.name || f.path}
                                  secondary={f.path}
                                />
                              </ListItem>
                            ))
                          )}
                        </List>
                      </CardContent>
                    </Card>
                  </div>

                  <div style={{ flex: 2 }}>
                    <Card>
                      <CardHeader title="Folder Preview" />
                      <CardContent>
                        {!selectedFolderContents ? (
                          <div className="text-gray-500">
                            Select a folder to preview its indexed files.
                          </div>
                        ) : (
                          <div className="results-grid">
                            {Array.isArray(selectedFolderContents.items) &&
                            selectedFolderContents.items.length === 0 ? (
                              <div className="text-gray-500">
                                No files in this folder.
                              </div>
                            ) : (
                              selectedFolderContents.items.map((it) => (
                                <div
                                  key={it.path}
                                  className="result-item"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Avatar
                                    variant="rounded"
                                    sx={{
                                      width: 80,
                                      height: 56,
                                      bgcolor: "#f3f4f6",
                                    }}
                                  >
                                    🖼
                                  </Avatar>
                                  <div
                                    className="result-meta"
                                    style={{ marginLeft: 12 }}
                                  >
                                    <div className="result-title">
                                      {it.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {it.path}
                                    </div>
                                  </div>
                                  <div style={{ marginLeft: "auto" }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={async () => {
                                        try {
                                          const res = await indexFiles([
                                            it.path,
                                          ]);
                                          alert(
                                            `Indexed ${res.indexed_count || res.indexed || 0} file(s)`,
                                          );
                                        } catch (e) {
                                          console.error(e);
                                          alert("Index failed");
                                        }
                                      }}
                                    >
                                      Index
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
