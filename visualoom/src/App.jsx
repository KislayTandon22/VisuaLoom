import { useState } from 'react'
import './App.css'
import { SideBar } from './components/SideBar/SideBar'
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
          <Route path="/dashboard" element={<h2>About Page</h2>} />
          <Route path="/gallery" element={<h2>All images</h2>} />
          <Route path="/favorites" element={<h2>favorites</h2>} />
        </Routes>
      </div>
    </div>
  )
}

export default App
