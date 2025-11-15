import React from "react";
import { FolderList } from "../../components/FolderList/FolderList";

export const Home = () => {
  return (
    <div className="p-8">
      <FolderList apiBaseUrl="http://127.0.0.1:8000" />
    </div>
  );
};

export default Home;