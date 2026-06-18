import React, { useState } from 'react';
import IngredientInput from '../components/IngredientInput';
import { useApi, ShareRecipeRequest, ShareRecipeResponse } from '../hooks/useApi';

const AVAILABLE_CATEGORIES = ['中餐', '西餐', '烘焙', '日料', '韩餐', '甜点', '早餐', '汤品'];
const MAX_CATEGORIES = 3;

const SharePage: React.FC = () => {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [steps, setSteps] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { loading, error, request } = useApi<ShareRecipeResponse>();

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      }
      if (prev.length >= MAX_CATEGORIES) {
        return prev;
      }
      return [...prev, category];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || ingredients.length === 0 || !steps.trim()) {
      return;
    }

    const payload: ShareRecipeRequest = {
      name: name.trim(),
      ingredients,
      steps: steps.trim(),
      image_url: imageUrl.trim() || undefined,
      categories: selectedCategories
    };

    const result = await request({
      method: 'POST',
      url: '/api/share',
      data: payload
    });

    if (result && result.success) {
      setSubmitted(true);
      setName('');
      setIngredients([]);
      setSteps('');
      setImageUrl('');
      setSelectedCategories([]);
    }
  };

  const isFormValid = name.trim() && ingredients.length > 0 && steps.trim();

  if (submitted) {
    return (
      <div className="share-page">
        <div className="submit-success">
          <div className="success-icon">🎉</div>
          <h2>分享成功！</h2>
          <p>感谢您分享您的拿手好菜！</p>
          <button
            type="button"
            className="recommend-btn"
            onClick={() => setSubmitted(false)}
          >
            再分享一道
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <section className="recommend-header">
        <h1>📝 分享你的食谱</h1>
        <p className="subtitle">将你的得意之作分享给更多美食爱好者</p>
      </section>

      <form className="share-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="recipe-name">
            菜谱名称 <span className="required">*</span>
          </label>
          <input
            id="recipe-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：番茄炒蛋"
            className="form-input"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label>
            食材列表 <span className="required">*</span>
          </label>
          <IngredientInput ingredients={ingredients} onChange={setIngredients} />
        </div>

        <div className="form-group">
          <label htmlFor="recipe-steps">
            烹饪步骤 <span className="required">*</span>
          </label>
          <textarea
            id="recipe-steps"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="请输入烹饪步骤，支持简单的markdown格式..."
            className="form-textarea"
            rows={8}
          />
        </div>

        <div className="form-group">
          <label htmlFor="recipe-image">
            图片URL <span className="optional">(选填)</span>
          </label>
          <input
            id="recipe-image"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>
            分类标签 <span className="optional">(最多选择{MAX_CATEGORIES}个)</span>
          </label>
          <div className="category-options">
            {AVAILABLE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-option ${selectedCategories.includes(category) ? 'selected' : ''}`}
                onClick={() => toggleCategory(category)}
                disabled={!selectedCategories.includes(category) && selectedCategories.length >= MAX_CATEGORIES}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          className="recommend-btn submit-btn"
          disabled={!isFormValid || loading}
        >
          {loading ? '提交中...' : '🚀 发布食谱'}
        </button>
      </form>
    </div>
  );
};

export default SharePage;
