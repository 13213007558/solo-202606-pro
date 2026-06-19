import { useState } from 'react';
import RecipeCard, { Recipe } from '../components/RecipeCard';

interface FavoritesPageProps {
  favorites: Recipe[];
  onToggleFavorite: (recipe: Recipe) => void;
}

export default function FavoritesPage({
  favorites,
  onToggleFavorite,
}: FavoritesPageProps) {
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);

  return (
    <div className="favorites-page">
      <section className="favorites-header">
        <h1 className="page-title">❤️ 我的收藏</h1>
        <p className="page-subtitle">
          这里收藏了你最爱的食谱，共 {favorites.length} 道
        </p>
      </section>

      {favorites.length > 0 ? (
        <div className="recipe-grid">
          {favorites.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorited={true}
              onFavoriteToggle={onToggleFavorite}
              onViewDetail={setDetailRecipe}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p className="empty-text">还没有收藏的食谱，快去推荐页收藏几道吧！</p>
        </div>
      )}

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
              <span className="meta-badge">⏱ {detailRecipe.cookTime} 分钟</span>
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
