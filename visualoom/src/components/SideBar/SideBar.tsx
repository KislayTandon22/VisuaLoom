import { Link } from "react-router-dom";
import "./SideBar.css";
export const SideBar = () => {
  return (
    <div className="bg-gray-800 text-white h-screen w-60 flex flex-col p-5 space-y-4">
      
      <nav className="flex flex-col space-y-3">
        <div className="navigation-heading">Navigation</div>
        <Link to="/" className="main-navigation-items">Home</Link>
        <Link to="/dashboard" className="main-navigation-items">Dashboard</Link>
        <Link to="/gallery" className="main-navigation-items">All Images</Link>
        <Link to="/favorites" className="main-navigation-items">Favourites</Link>
      </nav>
    </div>
  );
};
