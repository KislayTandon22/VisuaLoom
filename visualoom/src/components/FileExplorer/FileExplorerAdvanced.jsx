import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getRootFolders,
  browseFolder,
  countFolderImages,
  getFolderThumbnails,
  validatePath,
  startIndexing,
} from "../../api/indexApi";
import "./FileExplorerAdvanced.css";

/**
 * FileExplorerAdvanced Component - Extended Version with Additional Features
 *
 * Features:
 * - All base FileExplorer features
 * - Sorting (by name, type)
 * - Folder bookmarks (saved to localStorage)
 * - Item details view
 * - Bulk operations (index multiple folders)
 * - Favorites sidebar
 * - Recent folders history
 *
 * This file serves as documentation on how to extend the base component
 */
export default function FileExplorerAdvanced() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== BASE STATE (from FileExplorer) =====
  const [currentPath, setCurrentPath] = useState(
    searchParams.get("path") || null,
  );
  const [roots, setRoots] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page")) || 1,
  );
  const [pageSize, setPageSize] = useState(20);
  const [folderStats, setFolderStats] = useState({
    imageCount: 0,
    thumbnails: [],
  });
  const [selectedItems, setSelectedItems] = useState([]);

  // ===== EXTENDED STATE =====

  // Sorting feature
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "name");

  // Bookmarks feature
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem("fileExplorerBookmarks");
    return saved ? JSON.parse(saved) : [];
  });

  // Recent folders feature
  const [recentFolders, setRecentFolders] = useState(() => {
    const saved = localStorage.getItem("fileExplorerRecent");
    return saved ? JSON.parse(saved) : [];
  });

  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(false);

  // ===== UTILITY FUNCTIONS =====

  /**
   * Update query parameters
   */
  const updateQueryParams = useCallback(
    (params) => {
      setSearchParams(params);
    },
    [setSearchParams],
  );

  /**
   * Add folder to bookmarks
   */
  const addBookmark = useCallback(
    (path) => {
      const newBookmarks = [...new Set([...bookmarks, path])];
      setBookmarks(newBookmarks);
      localStorage.setItem(
        "fileExplorerBookmarks",
        JSON.stringify(newBookmarks),
      );
    },
    [bookmarks],
  );

  /**
   * Remove folder from bookmarks
   */
  const removeBookmark = useCallback(
    (path) => {
      const newBookmarks = bookmarks.filter((b) => b !== path);
      setBookmarks(newBookmarks);
      localStorage.setItem(
        "fileExplorerBookmarks",
        JSON.stringify(newBookmarks),
      );
    },
    [bookmarks],
  );

  /**
   * Add to recent folders (max 10)
   */
  const addToRecent = useCallback(
    (path) => {
      const updated = [path, ...recentFolders.filter((f) => f !== path)].slice(
        0,
        10,
      );
      setRecentFolders(updated);
      localStorage.setItem("fileExplorerRecent", JSON.stringify(updated));
    },
    [recentFolders],
  );

  /**
   * Sort items based on sortBy state
   */
  const sortItems = useCallback(
    (itemsToSort) => {
      const sorted = [...itemsToSort];
      switch (sortBy) {
        case "type":
          // Folders first, then by type
          return sorted.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === "folder" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
        case "name":
        default:
          // Folders first, then alphabetical
          return sorted.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === "folder" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
      }
    },
    [sortBy],
  );

  // ===== EFFECTS =====

  /**
   * Load root folders on mount
   */
  useEffect(() => {
    loadRoots();
  }, []);

  /**
   * Load folder contents when path changes
   */
  useEffect(() => {
    if (currentPath) {
      loadFolderContents();
      loadFolderStats();
      addToRecent(currentPath); // Add to recent
      updateQueryParams({ path: currentPath, page: "1", sort: sortBy });
      setCurrentPage(1);
    }
  }, [currentPath, addToRecent, updateQueryParams, sortBy]);

  /**
   * Handle search and sorting
   */
  useEffect(() => {
    let filtered = items;

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    filtered = sortItems(filtered);

    setFilteredItems(filtered);
    setCurrentPage(1);
    updateQueryParams({
      path: currentPath,
      search: searchQuery,
      sort: sortBy,
      page: "1",
    });
  }, [searchQuery, items, currentPath, sortBy, sortItems, updateQueryParams]);

  // ===== DATA LOADING =====

  /**
   * Fetch root folders
   */
  const loadRoots = async () => {
    try {
      setLoading(true);
      const data = await getRootFolders();
      setRoots(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to load roots:", err);
      setError("Failed to load root folders");
      setRoots([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch folder contents
   */
  const loadFolderContents = async () => {
    if (!currentPath) return;

    try {
      setLoading(true);
      setError(null);
      const response = await browseFolder(currentPath, true);
      setItems(response.items || []);
    } catch (err) {
      console.error("Failed to load folder contents:", err);
      setError(`Failed to load: ${err.response?.data?.detail || err.message}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load folder statistics
   */
  const loadFolderStats = async () => {
    if (!currentPath) return;

    try {
      const [countData, thumbnailData] = await Promise.all([
        countFolderImages(currentPath).catch(() => ({ total_images: 0 })),
        getFolderThumbnails(currentPath, 3).catch(() => ({
          thumbnails: [],
        })),
      ]);

      setFolderStats({
        imageCount: countData.total_images || 0,
        thumbnails: thumbnailData.thumbnails || [],
      });
    } catch (err) {
      console.error("Failed to load folder stats:", err);
    }
  };

  // ===== NAVIGATION =====

  /**
   * Navigate to folder
   */
  const navigateToFolder = (path) => {
    setCurrentPath(path);
    setSelectedItems([]);
  };

  /**
   * Go to parent directory
   */
  const goToParent = () => {
    if (!currentPath) return;
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
    navigateToFolder(parentPath);
  };

  /**
   * Get breadcrumbs
   */
  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    const parts = currentPath.split("/").filter(Boolean);
    return [
      { name: "Home", path: null },
      ...parts.map((part, idx) => ({
        name: part,
        path: "/" + parts.slice(0, idx + 1).join("/"),
      })),
    ];
  };

  // ===== USER ACTIONS =====

  /**
   * Toggle item selection
   */
  const toggleItemSelection = (path) => {
    setSelectedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  /**
   * Handle search change
   */
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  /**
   * Start indexing current folder
   */
  const handleIndexFolder = async () => {
    if (!currentPath) return;

    try {
      const result = await startIndexing(currentPath);
      alert(`Indexing started: ${result.job_id}`);
    } catch (err) {
      console.error("Failed to start indexing:", err);
      alert(`Failed to start indexing: ${err.message}`);
    }
  };

  /**
   * Bulk index selected folders
   * NEW FEATURE EXAMPLE
   */
  const handleBulkIndex = async () => {
    const folders = selectedItems.filter((path) =>
      items.some((item) => item.path === path && item.type === "folder"),
    );

    if (folders.length === 0) {
      alert("Please select at least one folder to index");
      return;
    }

    try {
      const results = await Promise.all(
        folders.map((path) => startIndexing(path)),
      );
      alert(
        `Started indexing ${results.length} folders. Job IDs: ${results
          .map((r) => r.job_id)
          .join(", ")}`,
      );
      setSelectedItems([]);
    } catch (err) {
      console.error("Failed to bulk index:", err);
      alert(`Bulk indexing failed: ${err.message}`);
    }
  };

  // ===== PAGINATION =====

  /**
   * Memoized pagination calculation
   * PERFORMANCE OPTIMIZATION EXAMPLE
   */
  const paginationInfo = useMemo(() => {
    const totalPages = Math.ceil(filteredItems.length / pageSize);
    const paginatedItems = filteredItems.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    );
    return { totalPages, paginatedItems };
  }, [filteredItems, currentPage, pageSize]);

  /**
   * Go to page
   */
  const goToPage = (page) => {
    setCurrentPage(page);
    updateQueryParams({
      path: currentPath,
      search: searchQuery,
      sort: sortBy,
      page: String(page),
    });
  };

  // ===== RENDER =====

  const isBookmarked = currentPath && bookmarks.includes(currentPath);

  return (
    <div className="file-explorer-advanced">
      {/* Sidebar with Bookmarks and Recent Folders */}
      {showSidebar && (
        <div className="explorer-sidebar">
          {/* Bookmarks */}
          <div className="sidebar-section">
            <h4>⭐ Bookmarks</h4>
            {bookmarks.length > 0 ? (
              <div className="sidebar-list">
                {bookmarks.map((path) => (
                  <div key={path} className="sidebar-item">
                    <button
                      className="sidebar-link"
                      onClick={() => {
                        navigateToFolder(path);
                        setShowSidebar(false);
                      }}
                    >
                      📌 {path}
                    </button>
                    <button
                      className="sidebar-remove"
                      onClick={() => removeBookmark(path)}
                      title="Remove bookmark"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sidebar-empty">No bookmarks yet</p>
            )}
          </div>

          {/* Recent Folders */}
          <div className="sidebar-section">
            <h4>🕒 Recent</h4>
            {recentFolders.length > 0 ? (
              <div className="sidebar-list">
                {recentFolders.map((path) => (
                  <button
                    key={path}
                    className="sidebar-link"
                    onClick={() => {
                      navigateToFolder(path);
                      setShowSidebar(false);
                    }}
                  >
                    📂 {path}
                  </button>
                ))}
              </div>
            ) : (
              <p className="sidebar-empty">No recent folders</p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="explorer-main">
        {/* Header */}
        <div className="explorer-header">
          <button
            className="sidebar-toggle"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? "✕" : "☰"}
          </button>
          <h2>📁 File Explorer Pro</h2>
        </div>

        {/* Error Banner */}
        {error && <div className="error-banner">{error}</div>}

        {/* Breadcrumb */}
        {currentPath && (
          <div className="breadcrumb">
            {getBreadcrumbs().map((crumb, idx) => (
              <React.Fragment key={idx}>
                <button
                  className="breadcrumb-item"
                  onClick={() => navigateToFolder(crumb.path || "/")}
                >
                  {crumb.name}
                </button>
                {idx < getBreadcrumbs().length - 1 && <span> / </span>}
              </React.Fragment>
            ))}
            <button className="breadcrumb-btn" onClick={goToParent}>
              ⬆️ Parent
            </button>
          </div>
        )}

        {/* Root Selection */}
        {!currentPath && (
          <div className="roots-section">
            <h3>Select a root folder to start</h3>
            <div className="roots-grid">
              {roots.map((root) => (
                <button
                  key={root}
                  className="root-button"
                  onClick={() => navigateToFolder(root)}
                >
                  📂 {root}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Folder View */}
        {currentPath && (
          <>
            {/* Folder Info */}
            <div className="folder-info">
              <div className="path-display">
                <code>{currentPath}</code>
                <button
                  className={`bookmark-btn ${isBookmarked ? "bookmarked" : ""}`}
                  onClick={() =>
                    isBookmarked
                      ? removeBookmark(currentPath)
                      : addBookmark(currentPath)
                  }
                  title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                >
                  {isBookmarked ? "⭐" : "☆"}
                </button>
              </div>

              <div className="folder-stats">
                📸 {folderStats.imageCount} images found
              </div>

              <div className="action-buttons">
                <button className="btn-index" onClick={handleIndexFolder}>
                  🔍 Index This Folder
                </button>

                {selectedItems.length > 0 && (
                  <button className="btn-bulk" onClick={handleBulkIndex}>
                    📦 Index {selectedItems.length} Folders
                  </button>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="explorer-controls">
              <input
                type="text"
                className="search-input"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={handleSearchChange}
              />

              <select
                className="sort-select"
                value={sortBy}
                onChange={handleSortChange}
              >
                <option value="name">Sort by Name</option>
                <option value="type">Sort by Type</option>
              </select>

              {searchQuery && (
                <button
                  className="clear-search"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Items */}
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                <div className="items-header">
                  <span>
                    {filteredItems.length} items ({selectedItems.length}{" "}
                    selected)
                  </span>
                  <span>
                    Page {currentPage} of {paginationInfo.totalPages || 1}
                  </span>
                </div>

                {paginationInfo.paginatedItems.length > 0 ? (
                  <div className="items-list">
                    {paginationInfo.paginatedItems.map((item) => (
                      <div key={item.path} className="item-row">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.path)}
                          onChange={() => toggleItemSelection(item.path)}
                          className="item-checkbox"
                        />
                        <span className="item-icon">
                          {item.type === "folder" ? "📂" : "📄"}
                        </span>
                        <span className="item-name">{item.name}</span>
                        <span className="item-type">{item.type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    {searchQuery
                      ? "No items match your search"
                      : "This folder is empty"}
                  </div>
                )}

                {/* Pagination */}
                {paginationInfo.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      ← Previous
                    </button>

                    <div className="page-numbers">
                      {Array.from(
                        { length: paginationInfo.totalPages },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`page-number ${
                            page === currentPage ? "active" : ""
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === paginationInfo.totalPages}
                      className="pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
