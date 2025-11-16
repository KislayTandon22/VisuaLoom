// api.ts
import axios from "axios";

export const BASE_URL = "http://localhost:8000";

/** ✅ Get indexed folders stored in DB */
export const getIndexedFolders = async () => {
  try {
    // Use the exact route without an extra trailing slash to avoid
    // potential redirects or mismatches with the backend routing.
    const response = await axios.get(`${BASE_URL}/folders`);
    return response.data.folders;
  } catch (err) {
    // Re-throw after logging for easier debugging in the UI
    console.error("getIndexedFolders error:", err);
    throw err;
  }
};

/** ✅ Get system root folders (backend returns string[]) */
export const getRootFolders = async () => {
  const response = await axios.get(`${BASE_URL}/folders/roots`);
  // { folders: ["/Users/me/Desktop", ...], system: "Darwin" }
  return response.data.folders;
};

/** ✅ Browse folder (subfolders + images) */
export const browseFolder = async (path: string, includeFiles = true) => {
  const response = await axios.get(`${BASE_URL}/folders/browse`, {
    params: { path, include_files: includeFiles },
  });
  return response.data;
};

/** Search folders (server-side) for folders containing images or matching a query */
export const searchFolders = async (
  basePath: string,
  query = "",
  maxResults = 100,
) => {
  const response = await axios.get(`${BASE_URL}/folders/search`, {
    params: { base_path: basePath, query, max_results: maxResults },
  });
  return response.data;
};

/** ✅ Begin indexing */
export const startIndexing = async (folderPath: string) => {
  const form = new FormData();
  form.append("folder_path", folderPath);

  const response = await axios.post(`${BASE_URL}/index`, form);
  return response.data;
};

/** Index specific files (array of absolute paths) */
export const indexFiles = async (paths: string[]) => {
  const response = await axios.post(`${BASE_URL}/index/files`, {
    files: paths,
  });
  return response.data;
};

/** Search indexed images using backend search engine */
export const searchImages = async (query: string) => {
  const response = await axios.get(`${BASE_URL}/search/`, {
    params: { query },
  });
  return response.data;
};

/** Upload a single image file to be indexed */
export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const response = await axios.post(`${BASE_URL}/upload/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/** ✅ Delete image */
export const deleteImageById = async (id: string) => {
  const res = await axios.delete(`${BASE_URL}/delete/${id}`);
  return res.data;
};
