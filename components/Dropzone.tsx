import React, { useCallback } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, disabled }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type === 'application/pdf') {
          onFileSelect(file);
        } else {
          alert('Please upload a PDF file.');
        }
      }
    },
    [onFileSelect, disabled]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`dropzone ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input
        type="file"
        accept="application/pdf"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className={`float-animation p-6 rounded-3xl ${disabled ? 'bg-gray-700' : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl'}`}>
          <UploadCloud className={`w-12 h-12 ${disabled ? 'text-gray-500' : 'text-white'}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-100 mb-2">
            Click to upload or drag & drop
          </p>
          <p className="text-sm text-gray-400">
            PDF files only (max 20MB)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dropzone;