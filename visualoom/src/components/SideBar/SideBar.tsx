import { Link, useLocation } from "react-router-dom";
import "./SideBar.css";
import { IoHomeOutline, IoFolderOpen, IoSearch, IoPricetagOutline, IoSettingsOutline } from "react-icons/io5";

export const SideBar = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: <IoHomeOutline /> },
    { path: "/folder", label: "Folder", icon: <IoFolderOpen /> },
    { path: "/search", label: "Search", icon: <IoSearch /> },
    { path: "/tags", label: "Tags", icon: <IoPricetagOutline /> },
    { path: "/settings", label: "Settings", icon: <IoSettingsOutline /> },
  ];

  return (
    <div className="sidebar">
      <nav className="flex flex-col space-y-3">
        <div className="navigation-heading">Navigation</div>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`main-navigation-items ${
              location.pathname === item.path ? "active" : ""
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};
