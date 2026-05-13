import React from 'react';
import CustomizationEditor from '../components/CustomizationEditor';

// Example: get variantId and templateId from route or props
const variantId = 'demo-variant-id'; // Replace with real value from router or state
const templateId = 'demo-template-id'; // Replace with real value from router or state

const CustomizationEditorPage: React.FC = () => {
  // In real app, get these from router params or context
  return (
    <div>
      <h1>Customization Editor (Admin)</h1>
      <CustomizationEditor variantId={variantId} templateId={templateId} />
    </div>
  );
};

export default CustomizationEditorPage;
