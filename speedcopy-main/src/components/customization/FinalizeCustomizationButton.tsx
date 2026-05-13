import React from 'react';

interface FinalizeCustomizationButtonProps {
  onFinalize: () => void;
  disabled?: boolean;
}

const FinalizeCustomizationButton: React.FC<FinalizeCustomizationButtonProps> = ({ onFinalize, disabled }) => (
  <button
    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
    onClick={onFinalize}
    disabled={disabled}
  >
    Finalize Customization
  </button>
);

export default FinalizeCustomizationButton;
