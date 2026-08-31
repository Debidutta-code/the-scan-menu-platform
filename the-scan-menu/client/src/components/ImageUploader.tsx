import React, { useState, useRef } from 'react';
import axios from 'axios';
import { apiClient } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  restaurantId: string;
  value?: string;
  onChange: (url: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  restaurantId,
  value,
  onChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Fetch signed signature from backend (using the configured apiClient!)
      const sigResponse = await apiClient.post(`/restaurants/${restaurantId}/uploads/signature`);

      const { signature, timestamp, folder, apiKey, cloudName } = sigResponse.data.data;

      // 2. Direct upload to Cloudinary using FormData (direct to Cloudinary endpoint via standard axios)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const uploadResponse = await axios.post(cloudinaryUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
      });

      const uploadedUrl = uploadResponse.data.secure_url;
      onChange(uploadedUrl);
    } catch (err: any) {
      console.error(err);
      setError('Upload failed. Please check credentials or retry.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3 w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all min-h-32 bg-slate-50/50 hover:bg-slate-50 ${
          value ? 'border-slate-200/80 bg-white' : 'border-slate-200 hover:border-amber-400'
        } ${isUploading ? 'pointer-events-none' : ''}`}
      >
        <AnimatePresence mode="wait">
          {value ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center p-1.5"
            >
              <img
                src={value}
                alt="Upload preview"
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2.5 right-2.5 bg-slate-900/80 hover:bg-slate-900 text-white p-1 rounded-lg shadow-2xs transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2.5 bg-slate-900/80 text-white text-[10px] px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-bold backdrop-blur-xs shadow-2xs">
                <RefreshCw className="w-3 h-3" />
                <span>Replace</span>
              </div>
            </motion.div>
          ) : isUploading ? (
            <div className="w-full text-center space-y-3 px-3">
              <Upload className="w-6 h-6 text-amber-500 animate-bounce mx-auto" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-700">Uploading Image...</p>
                <p className="text-[10px] font-mono text-slate-400">{progress}% completed</p>
              </div>

              {/* Animated Progress Bar using Framer Motion width */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="bg-amber-500 h-full rounded-full"
                />
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center space-y-2"
            >
              <div className="h-9 w-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mx-auto shadow-2xs">
                <ImageIcon className="w-4.5 h-4.5" strokeWidth={1.75} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">Upload menu image</p>
                <p className="text-[10px] text-slate-400">Supports PNG, JPG, or WEBP formats</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-600 animate-shake">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-[11px]">{error}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-red-700 underline font-bold hover:text-red-900 text-[10px]"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
export const ImageSkeletonLoader: React.FC = () => (
  <div className="w-full h-32 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-300">
    <ImageIcon className="w-6 h-6" />
  </div>
);
