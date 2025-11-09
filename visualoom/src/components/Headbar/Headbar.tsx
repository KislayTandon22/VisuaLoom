import { useState } from "react";
import { Search, Upload } from "lucide-react";

export const HeaderBar = () => {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim()) {
      console.log("🔍 Searching for:", query);
      // Later: call backend /search?query={query}
    }
  };

  const handleUpload = () => {
    // Later: open modal or file picker for upload
    console.log("📤 Open upload dialog");
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-white dark:bg-neutral-900 shadow-sm rounded-2xl p-4">
      {/* App name */}
      <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
        VisuaLoom
      </div>

      {/* Search bar */}
      <div className="flex items-center flex-1 max-w-2xl bg-gray-100 dark:bg-neutral-800 rounded-xl px-3 py-2">
        <Search className="text-gray-500 mr-2 flex-shrink-0" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by tag, text, or @imageID..."
          className="bg-transparent border-none outline-none focus:outline-none w-full text-sm text-slate-800 dark:text-slate-100 placeholder:text-gray-500"
        />
      </div>

      {/* Upload button */}
      <button 
        onClick={handleUpload} 
        className="flex items-center gap-2 whitespace-nowrap bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors font-medium"
      >
        <Upload size={18} />
        Upload
      </button>
    </div>
  );
};