import React, { useEffect, useState } from "react";
import { getRootFolders, browseFolder } from "../../api/indexApi";
import "./Folder.css";

export default function Folder() {
  const [roots, setRoots] = useState([]);
  const [expandedRoot, setExpandedRoot] = useState(null);
  const [rootContents, setRootContents] = useState({});

  useEffect(() => {
    loadRoots();
  }, []);

  const loadRoots = async () => {
    try {
      const r = await getRootFolders();
      setRoots(Array.isArray(r) ? r : r?.folders || []);
    } catch (e) {
      console.error("Failed to load root folders", e);
      setRoots([]);
    }
  };

  const toggleRoot = async (path) => {
    if (expandedRoot === path) {
      setExpandedRoot(null);
      return;
    }
    setExpandedRoot(path);
    if (!rootContents[path]) {
      try {
        const res = await browseFolder(path, true);
        setRootContents((s) => ({ ...s, [path]: res }));
      } catch (e) {
        console.error("Failed to browse root", e);
      }
    }
  };

  return (
    <div className="page-container">
      <h2>Folder</h2>
      <p>Browse your folders and collections here.</p>
      <ul>
        {roots.map((root) => (
          <li key={root.path}>
            <button onClick={() => toggleRoot(root.path)}>
              {expandedRoot === root.path ? "Collapse" : "Expand"} {root.name}
            </button>
            {expandedRoot === root.path && rootContents[root.path] && (
              <ul>
                {rootContents[root.path].items.map((item) => (
                  <li key={item.path}>{item.name}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
