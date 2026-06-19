import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import RecommendPage from './pages/RecommendPage';
import SharePage from './pages/SharePage';
import FavoritesPage from './pages/FavoritesPage';
import { Recipe } from './components/RecipeCard';

const FAVORITES_STORAGE_KEY = 'reciperadar_favorites';

function loadFavorites(): Recipe[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Recipe[];
    return [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: Recipe[]) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // ignore storage errors
  }
}

function App() {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setFavorites(loadFavorites());
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      saveFavorites(favorites);
    }
  }, [favorites, initialized]);

  const toggleFavorite = useCallback((recipe: Recipe) => {
    setFavorites((prev) => {
      const exists = prev.some((r) => r.id === recipe.id);
      if (exists) {
        return prev.filter((r) => r.id !== recipe.id);
      }
      return [...prev, recipe];
    });
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="app-logo">
            <span className="logo-emoji">🍳</span>
            <span className="logo-text">RecipeRadar</span>
          </div>
          <nav className="app-nav">
            <NavLink
              to="/recommend"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              推荐
              <span className="nav-underline" />
            </NavLink>
            <NavLink
              to="/share"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              分享
              <span className="nav-underline" />
            </NavLink>
            <NavLink
              to="/favorites"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              收藏
              {favorites.length > 0 && (
                <span className="nav-badge">{favorites.length}</span>
              )}
              <span className="nav-underline" />
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className="main-inner">
          <aside className="app-sidebar">
            <div className="sidebar-card card">
              <h3 className="sidebar-title">💡 使用小贴士</h3>
              <ul className="sidebar-tips">
                <li>输入冰箱里的食材名称，回车添加</li>
                <li>最多添加10种食材，精准度更高</li>
                <li>点击卡片爱心 ❤️ 可收藏喜欢的食谱</li>
                <li>点击"查看详情"可了解完整做法</li>
              </ul>
            </div>
            <div className="sidebar-card card">
              <h3 className="sidebar-title">🏆 今日热点</h3>
              <div className="hot-recipes">
                <div className="hot-item">
                  <span className="hot-rank">1</span>
                  <span>番茄牛腩煲</span>
                </div>
                <div className="hot-item">
                  <span className="hot-rank">2</span>
                  <span>可乐鸡翅</span>
                </div>
                <div className="hot-item">
                  <span className="hot-rank">3</span>
                  <span>蛋炒饭</span>
                </div>
              </div>
            </div>
          </aside>

          <section className="app-content">
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/recommend" replace />}
              />
              <Route
                path="/recommend"
                element={
                  <RecommendPage
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                  />
                }
              />
              <Route path="/share" element={<SharePage />} />
              <Route
                path="/favorites"
                element={
                  <FavoritesPage
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                  />
                }
              />
              <Route
                path="*"
                element={<Navigate to="/recommend" replace />}
              />
            </Routes>
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span>© 2026 RecipeRadar · 用心烹饪，传递美味 ❤️</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
