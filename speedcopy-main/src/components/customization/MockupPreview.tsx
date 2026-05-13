import React from 'react';

interface MockupPreviewProps {
  mockupUrl: string;
}

const MockupPreview: React.FC<MockupPreviewProps> = ({ mockupUrl }) => {
  if (!mockupUrl) return null;
  return (
    <div className="my-4">
      <h3 className="font-semibold mb-2">Room/Mockup Preview</h3>
      <img src={mockupUrl} alt="Mockup Preview" className="w-full rounded shadow" />
    </div>
  );
};

export default MockupPreview;
