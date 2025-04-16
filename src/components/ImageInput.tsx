import { useState, useRef, MouseEvent } from "react";
import React from "react";

const EXAMPLE_URL =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/beetle.png";
  

interface ImageInputProps extends React.HTMLAttributes<HTMLDivElement> {
  onImageChange?: (file: File | null, dataUrl: string) => void;
}

const ImageInput: React.FC<ImageInputProps> = ({ onImageChange, ...props }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      if (onImageChange) {
        onImageChange(file, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      readFile(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      readFile(files[0]);
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleExampleClick = (e: MouseEvent) => {
    e.stopPropagation();
    setImagePreview(EXAMPLE_URL);
    if (onImageChange) {
      onImageChange(null, EXAMPLE_URL);
    }
  };

  
  return (
    <div
      {...props}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        ref={fileInputRef}
        className="hidden"
      />
      {imagePreview ? (
      <img
        src={imagePreview}
        alt="Selected"
        className="w-full max-h-[250px] h-full object-contain rounded-md"
      />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <span className="text-gray-600 text-center m-3">
            <u>Drag & drop</u> or <u>click</u>
            <br />
            to select an image
          </span>
          <span
            className="text-gray-500 text-sm hover:text-gray-800 dark:hover:text-gray-300"
            onClick={handleExampleClick}
          >
            (or <u>try an example</u>)
          </span>
        </div>
      )}
    </div>
  );
};

export default ImageInput;