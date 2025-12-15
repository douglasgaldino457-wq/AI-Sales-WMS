
import React from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number | string | undefined;
  onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, className, onFocus, ...props }) => {
  
  // Format the numeric value into R$ string for display
  const formatDisplay = (val: number | string | undefined) => {
    if (val === undefined || val === '' || val === null) return '';
    
    // Ensure we are working with a number
    const numberVal = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(numberVal)) return '';

    return numberVal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get raw digits
    const rawValue = e.target.value.replace(/\D/g, '');
    
    // Convert to float (divide by 100 to handle cents)
    const numericValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
    
    onChange(numericValue);
  };

  // Keyboard UX: Select all text on focus to allow immediate overwriting
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (onFocus) onFocus(e);
  };

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={formatDisplay(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      className={className}
    />
  );
};
