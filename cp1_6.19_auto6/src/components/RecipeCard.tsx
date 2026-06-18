import React, { useState } from 'react';
import { Recipe } from '../hooks/useApi';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isFavorite, onToggleFavorite }) => {
  const [showDetail, setShowDetail] = useState(false);

  const getMatchColor = (percentage: number): string => {
    if (percentage > 80) return '#2E8B57';
    if (percentage >= 50) return '#FF8C00';
    return '#DC143C';
  };

  const matchColor = getMatchColor(recipe.match_percentage);

  return (
    <div className="recipe-card">
      <div
        className="match-badge"
        style={{ backgroundColor: matchColor }}
      >
        {recipe.match_percentage}% 匹配
      </div>

      <div className="recipe-image">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.name} />
        ) : (
          <div className="image-placeholder">🍳</div>
        )}
      </div>

      <div className="recipe-content">
        <h3 className="recipe-name">{recipe.name}</h3>

        <div className="recipe-meta">
          <span className="cook-time">⏱ {recipe.cook_time}分钟</span>
        </div>

        <p className="recipe-description">{recipe.description}</p>

        <div className="recipe-ingredients">
          {recipe.ingredients.slice(0, 4).map((ing, idx) => (
            <span key={idx} className="mini-tag">{ing}</span>
          ))}
          {recipe.ingredients.length > 4 && (
            <span className="mini-tag more">+{recipe.ingredients.length - 4}</span>
          )}
        </div>

        <div className="recipe-actions">
          <button
            type="button"
            className="detail-btn"
            onClick={() => setShowDetail(!showDetail)}
          >
            {showDetail ? '收起' : '查看详情'}
          </button>
          <button
            type="button"
            className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(recipe)}
            aria-label={isFavorite ? '取消收藏' : '收藏'}
          >
            <span className="heart-icon">{isFavorite ? '❤' : '♡'}</span>
          </button>
        </div>

        {showDetail && (
          <div className="recipe-detail">
            <h4>所需食材：</h4>
            <ul>
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx}>{ing}</li>
              ))}
            </ul>
            {recipe.steps && (
              <>
                <h4>烹饪步骤：</h4>
                <p className="recipe-steps">{recipe.steps}</p>
              </>
            )}
            {recipe.categories && recipe.categories.length > 0 && (
              <>
                <h4>分类：</h4>
                <div className="recipe-categories">
                  {recipe.categories.map((cat, idx) => (
                    <span key={idx} className="category-tag">{cat}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;
