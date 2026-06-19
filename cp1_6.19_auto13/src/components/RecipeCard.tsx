import { useState } from 'react';

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  matchPercentage: number;
  cookTime: number;
  description: string;
  imageUrl?: string;
  steps?: string;
  categories?: string[];
}

interface RecipeCardProps {
  recipe: Recipe;
  isFavorited: boolean;
  onFavoriteToggle: (recipe: Recipe) => void;
  onViewDetail?: (recipe: Recipe) => void;
}

function getMatchColor(percentage: number): string {
  if (percentage > 80) return 'match-high';
  if (percentage >= 50) return 'match-medium';
  return 'match-low';
}

export default function RecipeCard({
  recipe,
  isFavorited,
  onFavoriteToggle,
  onViewDetail,
}: RecipeCardProps) {
  const [heartAnimating, setHeartAnimating] = useState(false);

  const handleFavorite = () => {
    if (!isFavorited) {
      setHeartAnimating(true);
      setTimeout(() => setHeartAnimating(false), 600);
    }
    onFavoriteToggle(recipe);
  };

  return (
    <div className="recipe-card">
      <div className="recipe-image-wrapper">
        <div className="recipe-match-badge">
          <span className={`match-value ${getMatchColor(recipe.matchPercentage)}`}>
            {recipe.matchPercentage}%
          </span>
          <span className="match-label">匹配度</span>
        </div>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="recipe-image"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="recipe-image-placeholder">
            <span className="placeholder-icon">🍲</span>
          </div>
        )}
      </div>

      <div className="recipe-content">
        <h3 className="recipe-name">{recipe.name}</h3>
        <p className="recipe-description">{recipe.description}</p>

        <div className="recipe-meta">
          <div className="recipe-time">
            <span className="time-icon">⏱</span>
            <span>{recipe.cookTime} 分钟</span>
          </div>
          <div className="recipe-ingredients-count">
            <span>需 {recipe.ingredients.length} 种食材</span>
          </div>
        </div>

        <div className="recipe-ingredients-tags">
          {recipe.ingredients.slice(0, 4).map((ing, idx) => (
            <span key={idx} className="mini-tag">
              {ing}
            </span>
          ))}
          {recipe.ingredients.length > 4 && (
            <span className="mini-tag more-tag">
              +{recipe.ingredients.length - 4}
            </span>
          )}
        </div>
      </div>

      <div className="recipe-actions">
        <button
          type="button"
          className="btn-detail"
          onClick={() => onViewDetail?.(recipe)}
        >
          查看详情
        </button>
        <button
          type="button"
          className={`btn-favorite ${isFavorited ? 'favorited' : ''} ${
            heartAnimating ? 'heart-bounce' : ''
          }`}
          onClick={handleFavorite}
          aria-label={isFavorited ? '取消收藏' : '收藏'}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill={isFavorited ? '#FF4D4F' : 'none'}
            stroke={isFavorited ? '#FF4D4F' : '#999'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}
