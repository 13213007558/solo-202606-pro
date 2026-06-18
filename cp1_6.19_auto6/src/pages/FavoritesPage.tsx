import React, { useState, useEffect } from 'react';
import RecipeCard from '../components/RecipeCard';
import { Recipe } from '../hooks/useApi';

const FAVORITES_KEY = 'reciperadar_favorites';

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  const toggleFavorite = (recipe: Recipe) => {
    setFavorites((prev) => {
      const newFavorites = prev.filter((r) => r.id !== recipe.id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  return (
    <div className="favorites-page">
      <section className="recommend-header">
        <h1>⭐ 我的收藏</h1>
        <p className="subtitle">
          {favorites.length > 0
            ? `您已收藏 ${favorites.length} 道食谱`
            : '收藏喜欢的食谱，随时查看'}
        </p>
      </section>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💝</div>
          <p>还没有收藏任何食谱哦</p>
          <p className="empty-hint">去推荐页面发现美味吧！</p>
        </div>
      ) : (
        <section className="recipes-section">
          <div className="recipes-grid">
            {favorites.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorite={true}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FavoritesPage;
