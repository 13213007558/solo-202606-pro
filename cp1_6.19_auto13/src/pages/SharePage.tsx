import { useState } from 'react';
import IngredientInput from '../components/IngredientInput';
import { useApi } from '../hooks/useApi';

interface SharePageProps {}

const CATEGORY_OPTIONS = ['中餐', '西餐', '日料', '韩餐', '烘焙', '甜点', '汤品', '素食', '快手菜', '硬菜'];

interface ShareRequest {
  name: string;
  ingredients: string[];
  steps: string;
  imageUrl?: string;
  categories: string[];
  cookTime: number;
  description: string;
}

export default function SharePage(_props: SharePageProps) {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [steps, setSteps] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [cookTime, setCookTime] = useState(30);
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState(false);

  const { loading, error, execute: submitRecipe } = useApi<{ message: string }>({
    method: 'POST',
    url: '/api/recipes',
  });

  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = '请输入菜谱名称';
  if (ingredients.length === 0) errors.ingredients = '请至少添加一种食材';
  if (!steps.trim()) errors.steps = '请填写烹饪步骤';

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else if (categories.length < 3) {
      setCategories([...categories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, ingredients: true, steps: true });
    if (Object.keys(errors).length > 0) return;

    setSuccess(false);
    const payload: ShareRequest = {
      name: name.trim(),
      ingredients,
      steps: steps.trim(),
      imageUrl: imageUrl.trim() || undefined,
      categories,
      cookTime,
      description: description.trim() || `${name.trim()}的美味做法`,
    };

    const result = await submitRecipe({ data: payload });
    if (result) {
      setSuccess(true);
      setName('');
      setIngredients([]);
      setSteps('');
      setImageUrl('');
      setCategories([]);
      setCookTime(30);
      setDescription('');
      setTouched({});
    }
  };

  const showError = (field: string) => touched[field] && errors[field];

  return (
    <div className="share-page">
      <section className="share-header">
        <h1 className="page-title">📝 分享食谱</h1>
        <p className="page-subtitle">把你的得意之作分享给更多美食爱好者</p>
      </section>

      {success && (
        <div className="success-alert">
          <span>🎉 食谱分享成功！感谢你的贡献</span>
        </div>
      )}
      {error && (
        <div className="error-alert">
          <span>⚠️ {error}</span>
        </div>
      )}

      <form className="share-form card" onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${showError('name') ? 'has-error' : ''}`}>
          <label htmlFor="recipe-name">菜谱名称 *</label>
          <input
            id="recipe-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched({ ...touched, name: true })}
            placeholder="如：西红柿炒鸡蛋"
          />
          {showError('name') && <span className="form-error">{errors.name}</span>}
        </div>

        <div className={`form-group ${showError('ingredients') ? 'has-error' : ''}`}>
          <label>所需食材 *</label>
          <IngredientInput value={ingredients} onChange={setIngredients} maxTags={20} placeholder="输入食材，按回车添加" />
          {showError('ingredients') && (
            <span className="form-error">{errors.ingredients}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cook-time">预估烹饪时间（分钟）</label>
            <input
              id="cook-time"
              type="number"
              className="form-input"
              min={1}
              value={cookTime}
              onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="image-url">菜品图片URL（选填）</label>
            <input
              id="image-url"
              type="url"
              className="form-input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="form-group">
          <label>分类标签（最多选3个）</label>
          <div className="category-options">
            {CATEGORY_OPTIONS.map((cat) => {
              const selected = categories.includes(cat);
              const disabled = !selected && categories.length >= 3;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`category-chip ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => toggleCategory(cat)}
                  disabled={disabled}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          {categories.length > 0 && (
            <div className="selected-categories">
              已选：{categories.join('、')} ({categories.length}/3)
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description">简短描述（选填）</label>
          <textarea
            id="description"
            className="form-textarea small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="一句话介绍这道菜的特点..."
            rows={2}
          />
        </div>

        <div className={`form-group ${showError('steps') ? 'has-error' : ''}`}>
          <label htmlFor="steps">烹饪步骤 *</label>
          <textarea
            id="steps"
            className="form-textarea"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            onBlur={() => setTouched({ ...touched, steps: true })}
            placeholder={`1. 将西红柿切块，鸡蛋打散...\n2. 热锅下油，倒入蛋液...\n3. ...`}
            rows={8}
          />
          <p className="form-hint">支持简短格式，每一行一个步骤会自动分段显示</p>
          {showError('steps') && <span className="form-error">{errors.steps}</span>}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? '提交中...' : '🚀 发布食谱'}
          </button>
        </div>
      </form>
    </div>
  );
}
