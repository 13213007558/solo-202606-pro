import React, { useState, KeyboardEvent } from 'react';

interface IngredientInputProps {
  ingredients: string[];
  onChange: (ingredients: string[]) => void;
  maxItems?: number;
  placeholder?: string;
}

const IngredientInput: React.FC<IngredientInputProps> = ({
  ingredients,
  onChange,
  maxItems = 10,
  placeholder = '输入食材名称，按回车添加...'
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  const addIngredient = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !ingredients.includes(trimmed) && ingredients.length < maxItems) {
      onChange([...ingredients, trimmed]);
      setInputValue('');
    }
  };

  const removeIngredient = (ingredient: string) => {
    onChange(ingredients.filter(i => i !== ingredient));
  };

  return (
    <div className="ingredient-input">
      <div className="ingredient-tags">
        {ingredients.map((ingredient, index) => (
          <span key={index} className="ingredient-tag">
            {ingredient}
            <button
              type="button"
              className="tag-remove"
              onClick={() => removeIngredient(ingredient)}
              aria-label={`删除${ingredient}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="ingredient-input-row">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ingredients.length >= maxItems ? `最多添加${maxItems}种食材` : placeholder}
          disabled={ingredients.length >= maxItems}
          className="ingredient-text-input"
        />
        <button
          type="button"
          className="ingredient-add-btn"
          onClick={addIngredient}
          disabled={!inputValue.trim() || ingredients.length >= maxItems}
        >
          添加
        </button>
      </div>
    </div>
  );
};

export default IngredientInput;
