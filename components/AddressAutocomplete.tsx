
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { REALISTIC_ADDRESS_DB } from '../constants';

export interface AddressResult {
  fullAddress: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Digite o endereço...", 
  className = "",
  required = false
}) => {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (val.length > 2) {
      setLoading(true);
      setShowSuggestions(true);
      
      // Simulate API Network Delay
      setTimeout(() => {
        // Map realistic DB to the format expected by UI and Filter
        const dbAsResults: AddressResult[] = REALISTIC_ADDRESS_DB.map(a => ({
            fullAddress: `${a.street}, ${a.neighborhood}, ${a.city} - ${a.state}`,
            street: a.street,
            neighborhood: a.neighborhood,
            city: a.city,
            state: a.state
        }));

        const filtered = dbAsResults.filter(item => 
          item.fullAddress.toLowerCase().includes(val.toLowerCase())
        );
        setSuggestions(filtered);
        setLoading(false);
      }, 400); // Slightly faster response
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectItem = (item: AddressResult) => {
    onChange(item.street); // Fills input with Street
    if (onSelect) onSelect(item);
    setShowSuggestions(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-400 z-10" />
        <input
          type="text"
          value={value}
          onChange={handleInput}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-10 bg-white border border-brand-gray-300 rounded-lg py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-brand-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto animate-fade-in">
          {suggestions.map((item, idx) => (
            <li 
              key={idx}
              onClick={() => handleSelectItem(item)}
              className="px-4 py-3 hover:bg-brand-gray-50 cursor-pointer border-b border-brand-gray-50 last:border-0 transition-colors flex items-start gap-3"
            >
              <div className="mt-0.5 bg-brand-gray-100 p-1.5 rounded-full text-brand-gray-500">
                <MapPin className="w-3 h-3" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-gray-800">{item.street}</p>
                <p className="text-xs text-brand-gray-500">{item.neighborhood}, {item.city} - {item.state}</p>
              </div>
            </li>
          ))}
          <li className="px-4 py-2 bg-brand-gray-50 text-[10px] text-brand-gray-400 text-center font-medium uppercase tracking-wider">
            Powered by Google Maps (Simulado)
          </li>
        </ul>
      )}
    </div>
  );
};
