import { useState, KeyboardEvent, ChangeEvent } from 'react';

interface IngredientInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

export default function IngredientInput({
  value,
  onChange,
  maxTags = 10,
  placeholder = '输入食材名称，按回车添加',
}: IngredientInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.length >= maxTags) return;
    if (value.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="ingredient-input-wrapper">
      <div className="ingredient-tags">
        {value.map((tag, index) => (
          <span key={`${tag}-${index}`} className="ingredient-tag">
            {tag}
            <button
              type="button"
              className="tag-remove"
              onClick={() => removeTag(index)}
              aria-label={`删除 ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {value.length < maxTags && (
          <input
            type="text"
            className="ingredient-input"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
          />
        )}
      </div>
      <div className="tag-count-hint">
        {value.length}/{maxTags} 种食材
      </div>
    </div>
  );
}
