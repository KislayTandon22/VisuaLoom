import './App.css'
import { SideBar } from './components/SideBar/SideBar'
import { Routes, Route } from "react-router-dom"
import Home from './pages/Home/Home'
import Folder from './pages/Folder/Folder'
import Search from './pages/Search/Search'
import Tags from './pages/Tags/Tags'
import Settings from './pages/Settings/Settings'

function App() {
  return (
    <div className="app-container">
      {/* Sidebar stays on the left */}
      <SideBar />

      {/* Main content area */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/folder" element={<Folder />} />
          <Route path="/search" element={<Search />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
