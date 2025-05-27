import React, { useState, useRef, useEffect } from 'react';
import styles from './MultiSelectDropdown.module.css';

interface MultiSelectDropdownProps {
  label: string;
  options: { label: string; icon?: string }[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, options, selectedOptions, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (option: string) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter(o => o !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  return (
    <div className={styles.dropdown} ref={ref}>
      <div className={styles.label}>{label}</div>
      <button
        type="button"
        className={styles.selectBox}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.selectedText}>
          {selectedOptions.length === 0 ? `Seleziona ${label}` : selectedOptions.join(', ')}
        </span>
        <span className={styles.arrow}>▼</span>
      </button>
      {open && (
        <div className={styles.dropdownMenu}>
          {options.map(option => (
            <label key={option.label} className={styles.option}>
              <input
                type="checkbox"
                checked={selectedOptions.includes(option.label)}
                onChange={() => handleToggle(option.label)}
              />
              {option.icon && <span className={styles.icon}>{option.icon}</span>}
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown; 