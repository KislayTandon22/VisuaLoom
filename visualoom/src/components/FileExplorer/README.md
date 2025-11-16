# FileExplorer Component Documentation

## Overview

The `FileExplorer` component is a powerful file browser that allows users to navigate the file system, search for files/folders, and initiate indexing operations. It integrates seamlessly with the VisuaLoom API.

## Features

✅ **File System Navigation**

- Browse folders from system root
- Navigate using breadcrumb trail
- Parent directory navigation
- Real-time folder content loading

✅ **Search & Filter**

- Search files and folders by name
- Instant client-side filtering
- Clear search functionality

✅ **Pagination**

- Configurable page size (default: 20 items)
- Next/Previous navigation
- Direct page number selection
- Page persistence via URL params

✅ **URL Query Parameters**

- `?path=/Users/name` - Current browsing path
- `?search=query` - Active search term
- `?page=1` - Current page number
- Enables state persistence and deep linking

✅ **Folder Statistics**

- Image count (recursive)
- Thumbnail preview
- Folder validation

✅ **Indexing Integration**

- Start indexing from any folder
- Visual feedback during indexing

## Component Structure

```
FileExplorer/
├── FileExplorer.jsx      # Main component
└── FileExplorer.css      # Styling
```

## API Integration

The component uses these APIs from `indexApi.ts`:

```typescript
// Get system root folders
getRootFolders()

// Browse folder contents
browseFolder(path: string, includeFiles?: boolean)

// Count images in folder
countFolderImages(path: string)

// Get folder thumbnails
getFolderThumbnails(path: string, limit?: number)

// Validate path accessibility
validatePath(path: string)

// Start indexing
startIndexing(folderPath: string)
```

## Usage

### Basic Implementation

```jsx
import FileExplorer from "../../components/FileExplorer/FileExplorer";

function Folder() {
  return <FileExplorer />;
}
```

### URL Query Parameters

The component automatically handles URL state:

```
/folder?path=/Users/john/Pictures&search=vacation&page=2
```

## State Management

### Component States

```javascript
// Current browsing path
const [currentPath, setCurrentPath] = useState(null);

// Root folders list
const [roots, setRoots] = useState([]);

// All items in current folder
const [items, setItems] = useState([]);

// Filtered items (by search)
const [filteredItems, setFilteredItems] = useState([]);

// Search query
const [searchQuery, setSearchQuery] = useState("");

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(20);

// Folder statistics
const [folderStats, setFolderStats] = useState({
  imageCount: 0,
  thumbnails: [],
});

// UI states
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [selectedItems, setSelectedItems] = useState([]);
```

## Key Methods

### Navigation

```javascript
// Navigate to a folder
navigateToFolder(path);

// Go to parent directory
goToParent();

// Get breadcrumb navigation
getBreadcrumbs();
```

### Data Loading

```javascript
// Load root folders
loadRoots();

// Load folder contents with pagination
loadFolderContents();

// Load folder statistics
loadFolderStats();
```

### User Actions

```javascript
// Handle search input
handleSearchChange(e);

// Toggle item selection
toggleItemSelection(path);

// Start indexing
handleIndexFolder();

// Navigate to page
goToPage(page);
```

## Extending the Component

### Add Bulk Actions

```javascript
// Add to component state
const [selectedItems, setSelectedItems] = useState([]);

// Add method for bulk indexing
const handleBulkIndex = async () => {
  try {
    const results = await Promise.all(
      selectedItems.map((path) => startIndexing(path)),
    );
    console.log("Bulk indexing started:", results);
    setSelectedItems([]);
  } catch (err) {
    setError("Bulk indexing failed");
  }
};

// Add button in action-buttons div
<button onClick={handleBulkIndex} disabled={selectedItems.length === 0}>
  📦 Index Selected ({selectedItems.length})
</button>;
```

### Add Folder Favorites

```javascript
// Add to state
const [favorites, setFavorites] = useState([]);

// Save favorite
const addFavorite = (path) => {
  setFavorites((prev) => [...new Set([...prev, path])]);
  localStorage.setItem("favorites", JSON.stringify([...favorites, path]));
};

// Load favorites on mount
useEffect(() => {
  const saved = localStorage.getItem("favorites");
  if (saved) setFavorites(JSON.parse(saved));
}, []);

// Display favorites section
<div className="favorites">
  {favorites.map((fav) => (
    <button key={fav} onClick={() => navigateToFolder(fav)}>
      ⭐ {fav}
    </button>
  ))}
</div>;
```

### Add File Preview

```javascript
const [previewPath, setPreviewPath] = useState(null);

// Show preview when item is clicked
const handleItemClick = (item) => {
  if (item.type === "file") {
    setPreviewPath(item.path);
  } else {
    navigateToFolder(item.path);
  }
};

// Add preview modal/panel
{
  previewPath && (
    <FilePreviewModal path={previewPath} onClose={() => setPreviewPath(null)} />
  );
}
```

### Add File Sorting

```javascript
const [sortBy, setSortBy] = useState("name"); // name, type, date

const sortItems = (items) => {
  const sorted = [...items];
  switch (sortBy) {
    case "type":
      return sorted.sort((a, b) => a.type.localeCompare(b.type));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
};

// Apply sort when items load
useEffect(() => {
  setFilteredItems(sortItems(filteredItems));
}, [sortBy]);
```

### Add Infinite Scroll (Instead of Pagination)

```javascript
const [displayCount, setDisplayCount] = useState(20);

// Use Intersection Observer for scroll detection
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      setDisplayCount((prev) => prev + 20);
    }
  });

  const sentinel = document.querySelector(".scroll-sentinel");
  if (sentinel) observer.observe(sentinel);

  return () => observer.disconnect();
}, []);

// Show subset of items
const visibleItems = filteredItems.slice(0, displayCount);

// Add sentinel element
<div className="scroll-sentinel"></div>;
```

## CSS Customization

### Color Scheme Variables

Add to CSS for easy theming:

```css
:root {
  --primary-color: #0066cc;
  --primary-hover: #0052a3;
  --border-color: #ddd;
  --bg-light: #f5f5f5;
  --text-primary: #333;
  --text-secondary: #666;
  --text-tertiary: #999;
}
```

### Responsive Breakpoints

The component includes responsive design for:

- Desktop (1024px+)
- Tablet (768px - 1024px)
- Mobile (< 768px)

## Performance Optimizations

### Implemented

- ✅ Pagination prevents rendering too many items
- ✅ URL params reduce component re-initialization
- ✅ Parallel loading of folder stats (Promise.all)
- ✅ Lazy filtering on search

### Recommended Additions

```javascript
// Memoize expensive computations
const memoizedPaginatedItems = useMemo(
  () =>
    filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  [filteredItems, currentPage, pageSize],
);

// Debounce search input
import { useCallback } from "react";
const debouncedSearch = useCallback(
  debounce((query) => setSearchQuery(query), 300),
  [],
);

// Virtual scrolling for large lists
import { FixedSizeList } from "react-window";
```

## API Reference

### File Structure Response

```javascript
{
  path: "/Users/john/Pictures",
  items: [
    {
      name: "vacation",
      path: "/Users/john/Pictures/vacation",
      type: "folder"
    },
    {
      name: "photo.jpg",
      path: "/Users/john/Pictures/photo.jpg",
      type: "file"
    }
  ],
  total: 45,
  page: 1,
  per_page: 50,
  has_more: false
}
```

### Folder Stats Response

```javascript
// countFolderImages
{
  path: "/Users/john/Pictures",
  total_images: 156
}

// getFolderThumbnails
{
  path: "/Users/john/Pictures",
  thumbnails: [
    "/Users/john/Pictures/img1.jpg",
    "/Users/john/Pictures/img2.jpg"
  ]
}
```

## Troubleshooting

### Items Not Loading

- Check if path is valid
- Verify folder permissions
- Check browser console for errors

### Search Not Working

- Ensure `searchQuery` state is updating
- Check filter logic in `useEffect`

### Pagination Issues

- Verify `pageSize` matches backend
- Check `totalPages` calculation

### URL Params Not Persisting

- Ensure `useSearchParams` is imported
- Check `updateQueryParams` is being called

## Future Enhancements

- [ ] Multi-select bulk operations
- [ ] Folder favorites/bookmarks
- [ ] Recent folders history
- [ ] Folder size calculation
- [ ] File type icons (image, document, etc.)
- [ ] Context menu actions
- [ ] Drag-and-drop support
- [ ] File preview panel
- [ ] Integration with tag system
- [ ] Batch indexing with progress

## Testing

```javascript
// Mock API responses
jest.mock("../../api/indexApi");

describe("FileExplorer", () => {
  it("should load root folders on mount", async () => {
    // Test implementation
  });

  it("should navigate to folder and load contents", async () => {
    // Test implementation
  });

  it("should filter items by search query", () => {
    // Test implementation
  });

  it("should handle pagination correctly", () => {
    // Test implementation
  });
});
```

---

**Last Updated:** November 16, 2025
**Component Version:** 1.0.0
