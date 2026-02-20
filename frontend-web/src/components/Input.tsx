import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  help?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  help,
  disabled = false,
  icon,
  fullWidth = true,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const displayType = isPassword && showPassword ? 'text' : type;
  const hasError = !!error;
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <label className="block text-sm font-semibold text-neutral-700 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      
      <div className="relative group">
        {/* Input field */}
        <input
          type={displayType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 rounded-lg border-2 transition-all duration-150
            font-medium text-neutral-900 placeholder-neutral-400
            ${ icon ? 'pl-10' : ''}
            ${isPassword && showPassword || isPassword ? 'pr-10' : ''}
            ${hasError 
              ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200' 
              : 'border-neutral-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            }
            ${disabled ? 'bg-neutral-50 cursor-not-allowed opacity-60' : 'bg-white'}
            focus:outline-none
          `}
        />
        
        {/* Icon - Left */}
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 flex items-center">
            {icon}
          </div>
        )}
        
        {/* Password toggle - Right */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      
      {/* Error message */}
      {hasError && (
        <div className="flex items-center gap-1 mt-2 text-red-600 text-sm font-medium">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Help text */}
      {help && !hasError && (
        <p className="mt-1 text-sm text-neutral-500">{help}</p>
      )}
    </div>
  );
}