import { Link } from "react-router-dom";
import "./SideBar.css";
import { IoHomeOutline } from "react-icons/io5";
import { IoMdFolderOpen } from "react-icons/io";
import { IoSearch } from "react-icons/io5";
import { IoPricetagOutline } from "react-icons/io5";
import { IoSettingsOutline } from "react-icons/io5";

export const SideBar = () => {
  return (
    <div className="bg-gray-800 text-white h-screen w-60 flex flex-col p-5 space-y-4">
      
      <nav className="flex flex-col space-y-3">
        <div className="navigation-heading">Navigation</div>
        <Link to="/" className="main-navigation-items"> <IoHomeOutline /> Home</Link>
        <Link to="/folder" className="main-navigation-items"> <IoMdFolderOpen />Folder</Link>
        <Link to="/search" className="main-navigation-items"><IoSearch /> Search</Link>
        <Link to="/tags" className="main-navigation-items"><IoPricetagOutline />
 Tags</Link>
        <Link to="/settings" className="main-navigation-items"><IoSettingsOutline />Settings</Link>
        
      </nav>
    </div>
  );
};
