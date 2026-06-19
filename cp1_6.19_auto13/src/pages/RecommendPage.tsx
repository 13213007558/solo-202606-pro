import { useState, useEffect } from 'react';
import IngredientInput from '../components/IngredientInput';
import RecipeCard, { Recipe } from '../components/RecipeCard';
import { useApi } from '../hooks/useApi';

interface RecommendPageProps {
  favorites: Recipe[];
  onToggleFavorite: (recipe: Recipe) => void;
}

interface RecommendResponse {
  recipes: Recipe[];
}

export default function RecommendPage({
  favorites,
  onToggleFavorite,
}: RecommendPageProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);

  const {
    data,
    loading,
    error,
    execute: fetchRecommendations,
    reset,
  } = useApi<RecommendResponse>({
    method: 'POST',
    url: '/api/recommend',
  });

  useEffect(() => {
    if (data) {
      setRecipes(data.recipes || []);
    }
  }, [data]);

  const handleRecommend = async () => {
    if (ingredients.length === 0) return;
    reset();
    await fetchRecommendations({
      data: { ingredients },
    });
  };

  const isFavorited = (recipe: Recipe) =>
    favorites.some((f) => f.id === recipe.id);

  return (
    <div className="recommend-page">
      <section className="recommend-header">
        <h1 className="page-title">🧑‍🍳 智能推荐</h1>
        <p className="page-subtitle">根据冰箱里的食材，为你匹配最合适的食谱</p>
      </section>

      <section className="ingredient-section card">
        <h2 className="section-title">添加食材</h2>
        <IngredientInput value={ingredients} onChange={setIngredients} />
        <div className="recommend-action">
          <button
            type="button"
            className="btn-primary"
            onClick={handleRecommend}
            disabled={loading || ingredients.length === 0}
          >
            {loading ? '推荐中...' : '✨ 智能推荐'}
          </button>
        </div>
      </section>

      {error && (
        <div className="error-alert">
          <span>⚠️ {error}</span>
          <button type="button" className="btn-text" onClick={handleRecommend}>
            重试
          </button>
        </div>
      )}

      <section className="results-section">
        {loading ? (
          <div className="loading-state">
            <div className="cooking-pot-loader">
              <div className="pot-body">
                <div className="pot-handle-left"></div>
                <div className="pot-handle-right"></div>
                <div className="pot-lid">
                  <div className="lid-knob"></div>
                </div>
              </div>
              <div className="steam steam-1"></div>
              <div className="steam steam-2"></div>
              <div className="steam steam-3"></div>
            </div>
            <p className="loading-text">正在为你挑选最佳食谱...</p>
          </div>
        ) : recipes.length > 0 ? (
          <>
            <h2 className="section-title">推荐结果</h2>
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isFavorited={isFavorited(recipe)}
                  onFavoriteToggle={onToggleFavorite}
                  onViewDetail={setDetailRecipe}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🥗</div>
            <p className="empty-text">
              {ingredients.length === 0
                ? '暂无推荐，快去添加食材吧！'
                : '还没有匹配的食谱，试试添加更多食材？'}
            </p>
          </div>
        )}
      </section>

      {detailRecipe && (
        <div className="modal-overlay" onClick={() => setDetailRecipe(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setDetailRecipe(null)}
            >
              ×
            </button>
            <h2>{detailRecipe.name}</h2>
            <div className="modal-meta">
              <span className="meta-badge">
                ⏱ {detailRecipe.cookTime} 分钟
              </span>
              <span className={`meta-badge match-badge ${getMatchColor(detailRecipe.matchPercentage)}`}>
                匹配度 {detailRecipe.matchPercentage}%
              </span>
            </div>
            <p className="modal-description">{detailRecipe.description}</p>
            <h3>所需食材</h3>
            <ul className="ingredient-list">
              {detailRecipe.ingredients.map((ing, idx) => (
                <li key={idx}>{ing}</li>
              ))}
            </ul>
            {detailRecipe.steps && (
              <>
                <h3>烹饪步骤</h3>
                <div className="cooking-steps">
                  {detailRecipe.steps.split('\n').map((step, idx) => (
                    <p key={idx}>{step}</p>
                  ))}
                </div>
              </>
            )}
            {detailRecipe.categories && detailRecipe.categories.length > 0 && (
              <>
                <h3>分类标签</h3>
                <div className="category-tags">
                  {detailRecipe.categories.map((cat, idx) => (
                    <span key={idx} className="category-tag">
                      {cat}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getMatchColor(percentage: number): string {
  if (percentage > 80) return 'match-high';
  if (percentage >= 50) return 'match-medium';
  return 'match-low';
}
