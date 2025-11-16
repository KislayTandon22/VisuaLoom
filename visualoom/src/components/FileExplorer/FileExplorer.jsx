import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getRootFolders,
  browseFolder,
  countFolderImages,
  getFolderThumbnails,
  validatePath,
  startIndexing,
} from "../../api/indexApi";
import "./FileExplorer.css";

/**
 * FileExplorer Component
 *
 * Features:
 * - Browse file system with pagination
 * - Navigate using breadcrumbs
 * - Search/filter files and folders
 * - URL query params for state persistence (e.g., ?path=/Users/name&page=1)
 * - Image count preview
 * - Folder validation
 * - Start indexing from explorer
 */
export default function FileExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page")) || 1,
  );
  const [pageSize, setPageSize] = useState(30); // Changed to 30 for grid view
  const [totalItems, setTotalItems] = useState(0);

  // Folder info
  const [folderStats, setFolderStats] = useState({
    imageCount: 0,
    thumbnails: [],
  });

  // UI state
  const [selectedItems, setSelectedItems] = useState([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [hoveredItem, setHoveredItem] = useState(null);

  /**
   * Update URL query params
   */
  const updateQueryParams = useCallback(
    (params) => {
      setSearchParams(params);
    },
    [setSearchParams],
  );

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
      updateQueryParams({ path: currentPath, page: "1" });
      setCurrentPage(1); // Reset to page 1 when path changes
    }
  }, [currentPath]);

  /**
   * Handle search/filter
   */
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query),
      );
      setFilteredItems(filtered);
    }
    setCurrentPage(1); // Reset to page 1 when search changes
    updateQueryParams({ path: currentPath, search: searchQuery, page: "1" });
  }, [searchQuery, items, currentPath, updateQueryParams]);

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
   * Fetch folder contents with pagination
   */
  const loadFolderContents = async () => {
    if (!currentPath) return;

    try {
      setLoading(true);
      setError(null);

      const response = await browseFolder(currentPath, true);
      const allItems = response.items || [];

      setItems(allItems);
      setFilteredItems(allItems);
      setTotalItems(allItems.length);
    } catch (err) {
      console.error("Failed to load folder contents:", err);
      setError(`Failed to load: ${err.response?.data?.detail || err.message}`);
      setItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load folder statistics (image count, thumbnails)
   */
  const loadFolderStats = async () => {
    if (!currentPath) return;

    try {
      const [countData, thumbnailData] = await Promise.all([
        countFolderImages(currentPath).catch(() => ({ total_images: 0 })),
        getFolderThumbnails(currentPath, 3).catch(() => ({ thumbnails: [] })),
      ]);

      setFolderStats({
        imageCount: countData.total_images || 0,
        thumbnails: thumbnailData.thumbnails || [],
      });
    } catch (err) {
      console.error("Failed to load folder stats:", err);
    }
  };

  /**
   * Navigate to a folder
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
   * Handle folder/file selection (checkbox)
   */
  const toggleItemSelection = (path) => {
    setSelectedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  /**
   * Handle search input
   */
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  /**
   * Start indexing selected folder
   */
  const handleIndexFolder = async () => {
    if (!currentPath) return;

    try {
      setIsIndexing(true);
      const result = await startIndexing(currentPath);
      alert(`Indexing started: ${result.job_id}`);
    } catch (err) {
      console.error("Failed to start indexing:", err);
      alert(`Failed to start indexing: ${err.message}`);
    } finally {
      setIsIndexing(false);
    }
  };

  /**
   * Get breadcrumb navigation
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

  /**
   * Calculate pagination
   */
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /**
   * Handle page change
   */
  const goToPage = (page) => {
    setCurrentPage(page);
    updateQueryParams({
      path: currentPath,
      search: searchQuery,
      page: String(page),
    });
  };

  return (
    <div className="file-explorer">
      {/* Header */}
      <div className="explorer-header">
        <h2>📁 File Explorer</h2>
        <p>Browse and select folders to index</p>
      </div>

      {/* Error Display */}
      {error && <div className="error-banner">{error}</div>}

      {/* Breadcrumb Navigation */}
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

      {/* Root Folders Selection */}
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

      {/* Current Folder View */}
      {currentPath && (
        <>
          {/* Folder Info & Actions */}
          <div className="folder-info">
            <div className="path-display">
              <strong>Current Path:</strong> <code>{currentPath}</code>
            </div>
            <div className="folder-stats">
              📸 {folderStats.imageCount} images found
            </div>
            <div className="action-buttons">
              <button
                className="btn-index"
                onClick={handleIndexFolder}
                disabled={isIndexing || loading}
              >
                {isIndexing ? "Indexing..." : "🔍 Index This Folder"}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-section">
            <input
              type="text"
              className="search-input"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading && <div className="loading">Loading...</div>}

          {/* Items List */}
          {!loading && (
            <>
              <div className="items-section">
                <div className="items-header">
                  <div className="header-left">
                    <span>{filteredItems.length} items</span>
                    <div className="view-toggle">
                      <button
                        className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                        onClick={() => setViewMode("grid")}
                        title="Grid view"
                      >
                        ⊞ Grid
                      </button>
                      <button
                        className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                        onClick={() => setViewMode("list")}
                        title="List view"
                      >
                        ☰ List
                      </button>
                    </div>
                  </div>
                  <span>
                    Page {currentPage} of {totalPages || 1}
                  </span>
                </div>

                {paginatedItems.length > 0 ? (
                  viewMode === "grid" ? (
                    // Grid View
                    <div className="items-grid">
                      {paginatedItems.map((item) => (
                        <div
                          key={item.path}
                          className={`grid-item ${
                            selectedItems.includes(item.path) ? "selected" : ""
                          }`}
                          onClick={() => {
                            if (item.type === "folder") {
                              navigateToFolder(item.path);
                            } else {
                              toggleItemSelection(item.path);
                            }
                          }}
                          onMouseEnter={() => setHoveredItem(item.path)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <div className="grid-item-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.path)}
                              onChange={() => toggleItemSelection(item.path)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="grid-item-icon">
                            {item.type === "folder" ? "📂" : "📄"}
                          </div>
                          <div className="grid-item-name">{item.name}</div>
                          <div className="grid-item-type">{item.type}</div>
                          {hoveredItem === item.path && (
                            <div className="grid-item-hover">
                              {item.type === "folder"
                                ? "Open folder"
                                : "Select file"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // List View
                    <div className="items-list">
                      {paginatedItems.map((item) => (
                        <div
                          key={item.path}
                          className={`item-row ${
                            selectedItems.includes(item.path) ? "selected" : ""
                          }`}
                          onClick={() => {
                            if (item.type === "folder") {
                              navigateToFolder(item.path);
                            } else {
                              toggleItemSelection(item.path);
                            }
                          }}
                          onMouseEnter={() => setHoveredItem(item.path)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.path)}
                            onChange={() => toggleItemSelection(item.path)}
                            onClick={(e) => e.stopPropagation()}
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
                  )
                ) : (
                  <div className="empty-state">
                    {searchQuery
                      ? "No items match your search"
                      : "This folder is empty"}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ← Previous
                  </button>

                  <div className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`page-number ${
                            page === currentPage ? "active" : ""
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Selected Items Info */}
              {selectedItems.length > 0 && (
                <div className="selected-info">
                  <p>Selected: {selectedItems.length} items</p>
                  {/* You can add more actions here in the future */}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
