import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import RecommendPage from './pages/RecommendPage';
import SharePage from './pages/SharePage';
import FavoritesPage from './pages/FavoritesPage';
import './App.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <span className="logo-icon">🍽️</span>
              <span className="logo-text">RecipeRadar</span>
            </div>
            <nav className="main-nav">
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                推荐
              </NavLink>
              <NavLink
                to="/share"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                分享
              </NavLink>
              <NavLink
                to="/favorites"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                收藏
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <div className="main-content">
            <Routes>
              <Route path="/" element={<RecommendPage />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
            </Routes>
          </div>
        </main>

        <footer className="app-footer">
          <p>© 2024 RecipeRadar - 发现美食的乐趣</p>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
