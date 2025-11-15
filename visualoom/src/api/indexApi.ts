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

/** ✅ Begin indexing */
export const startIndexing = async (folderPath: string) => {
  const form = new FormData();
  form.append("folder_path", folderPath);

  const response = await axios.post(`${BASE_URL}/index`, form);
  return response.data;
};

/** ✅ Delete image */
export const deleteImageById = async (id: string) => {
  const res = await axios.delete(`${BASE_URL}/delete/${id}`);
  return res.data;
};
