import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div className="main-container">
      <div className="flex-container">
        <div className="content">
          <h1>Test Content</h1>
        </div>
      </div>
      
      {/* Modals */}
      <div className="modal">
        <div>Modal Content</div>
      </div>
    </div>
  );
};

export default TestComponent;