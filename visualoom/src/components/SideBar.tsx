
import { Link } from "react-router-dom";

export const SideBar = () => {
    return (
        <div className="">
            <nav>
                <Link to="/">Home</Link>
                <Link to="/Dashboard">About</Link>
                <Link to="/AllIma">Page 1</Link>
                <Link to="/page?page=2">Page 2</Link>
            </nav>
        </div>
    )
}