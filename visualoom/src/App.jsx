import { useState } from 'react'
import './App.css'
import { SideBar } from './components/SideBar'
import { Routes, Route } from "react-router-dom"

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app-container">
      {/* Sidebar stays on the left */}
      <SideBar />

      {/* Main content area */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<h2>Home Page</h2>} />
          <Route path="/Dashboard" element={<h2>About Page</h2>} />
          <Route path="/AllIma" element={<h2>Page 1</h2>} />
          <Route path="/page" element={<h2>Page 2</h2>} />
        </Routes>
      </div>
    </div>
  )
}

export default App
