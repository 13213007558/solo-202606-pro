import React, { useState } from 'react';
import IngredientInput from '../components/IngredientInput';
import RecipeCard from '../components/RecipeCard';
import { useApi, Recipe, RecommendResponse } from '../hooks/useApi';

const FAVORITES_KEY = 'reciperadar_favorites';

const RecommendPage: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { loading, error, request } = useApi<RecommendResponse>();

  const [favorites, setFavorites] = useState<Recipe[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (recipe: Recipe) => {
    setFavorites((prev) => {
      const exists = prev.find((r) => r.id === recipe.id);
      let newFavorites;
      if (exists) {
        newFavorites = prev.filter((r) => r.id !== recipe.id);
      } else {
        newFavorites = [...prev, recipe];
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const isFavorite = (recipeId: number): boolean => {
    return favorites.some((r) => r.id === recipeId);
  };

  const handleRecommend = async () => {
    if (ingredients.length === 0) return;
    setHasSearched(true);
    const result = await request({
      method: 'POST',
      url: '/api/recommend',
      data: { ingredients }
    });
    if (result) {
      setRecipes(result.recipes);
    }
  };

  return (
    <div className="recommend-page">
      <section className="recommend-header">
        <h1>🍳 智能食谱推荐</h1>
        <p className="subtitle">根据冰箱里的食材，为你推荐最合适的菜谱</p>
      </section>

      <section className="input-section">
        <h2>添加食材</h2>
        <IngredientInput ingredients={ingredients} onChange={setIngredients} />
        <button
          type="button"
          className="recommend-btn"
          onClick={handleRecommend}
          disabled={ingredients.length === 0 || loading}
        >
          {loading ? '推荐中...' : '✨ 智能推荐'}
        </button>
      </section>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="cooking-pot-spinner">
            <div className="pot">
              <div className="pot-handle left"></div>
              <div className="pot-handle right"></div>
              <div className="pot-lid"></div>
              <div className="steam steam-1"></div>
              <div className="steam steam-2"></div>
              <div className="steam steam-3"></div>
            </div>
          </div>
          <p>正在为您匹配最佳食谱...</p>
        </div>
      )}

      {!loading && hasSearched && recipes.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <p>暂无推荐，快去添加食材吧！</p>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <section className="recipes-section">
          <h2>为您推荐 ({recipes.length})</h2>
          <div className="recipes-grid">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorite={isFavorite(recipe.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default RecommendPage;
