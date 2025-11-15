import React, { useState } from "react";
import { searchImages } from "../../api/indexApi";
import { Search } from "lucide-react";
import "./Home.css";

const Home = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return setResults([]);
    setLoading(true);
    try {
      const res = await searchImages(query);
      setResults(res.results || []);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="page-container-home">
      {/* Title */}
      <h1 className="text-3xl font-bold text-black dark:text-white text-center mb-2">
        Image Semantic Search
      </h1>

      {/* Subtitle */}
      <p className="text-black/80 dark:text-gray-300 text-center mb-8">
        Search your indexed dataset using NLP embeddings — just describe it.
      </p>

      {/* Search Bar */}
      <div className="w-full max-w-xl">
        <div
          className="
            bg-white dark:bg-neutral-900
            border border-slate-200 dark:border-neutral-800
            shadow-sm rounded-2xl
            px-4 py-3
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex items-center flex-1
                bg-gray-100 dark:bg-neutral-800
                rounded-xl px-3 py-2
                border border-transparent
                focus-within:border-blue-500
                transition
              "
            >
              <Search className="text-gray-500 dark:text-gray-400" size={18} />

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Describe the image… (e.g. “red car in snow”)"
                className="
                  bg-transparent border-none outline-none w-full text-sm
                  text-slate-800 dark:text-slate-100
                  placeholder:text-gray-500 dark:placeholder:text-gray-400
                "
              />
            </div>

            <button
              onClick={doSearch}
              className="
                px-5 py-2 rounded-xl
                bg-blue-600 hover:bg-blue-700
                text-white font-medium text-sm
                transition
              "
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-12 w-full max-w-4xl">
        {loading && (
          <div className="flex flex-col items-center mt-8 text-slate-600 dark:text-slate-300">
            <span className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full mb-2"></span>
            Searching embeddings…
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">
              Results ({results.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {results.map((item, idx) => (
                <div
                  key={idx}
                  className="
                    rounded-xl overflow-hidden
                    bg-white dark:bg-neutral-900
                    shadow border border-slate-200 dark:border-neutral-800
                  "
                >
                  <img
                    src={item.url || item.path}
                    alt=""
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-3 text-sm text-slate-700 dark:text-slate-300">
                    {item.title || item.name || item.path}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
