import axios from "axios";

const BASE_URL = "http://localhost:8000"; // your FastAPI backend

export const startIndexing = async (baseDir: string, tag?: string) => {
  const formData = new FormData();
  formData.append("base_dir", baseDir);
  if (tag) formData.append("tag", tag);
  const response = await axios.post(`${BASE_URL}/index/`, formData);
  return response.data;
};

export const getIndexStatus = async (jobId: string) => {
  const response = await axios.get(`${BASE_URL}/index/status/${jobId}`);
  return response.data;
};
