'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Upload, File, Trash2, RefreshCcw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getHeaders } from '@/services/realcollab';
import { AppSidebar } from '@/components/app-sidebar';
 function FileRight() {
  const API = process.env.NEXT_PUBLIC_API_URL;
    const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
// Toast component
// TypeScript interfaces and types
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

interface FileType {
  _id: string;
  filename: string;
  size: number;
  mimetype: string;
  createdAt: string;
}

interface FileUploaderProps {
  onUploadSuccess: (file: FileType) => void;
  onError: (errorMessage: string) => void;
}

interface FileItemProps {
  file: FileType;
  onDelete: (fileId: string) => void;
}

interface FileListProps {
  files: FileType[];
  onDelete: (fileId: string) => void;
  onRefresh: () => void;
   onImageClick?: (file: FileType) => void;
}

// Get AUTH_TOKEN from localStorage or context as needed
 
// Toast component
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-md flex items-center space-x-2 ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? 
        <CheckCircle2 className="h-5 w-5" /> : 
        <AlertCircle className="h-5 w-5" />
      }
      <p>{message}</p>
    </div>
  );
};
const handleImageClick = (file: FileType) => {
    setSelectedFile(file); // 👈 Show on the right
  };
// FileUploader component
const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Get headers from service
      const headers = getHeaders();
      console.log()
      const response = await fetch(`${API}/files/upload`, {
        method: 'POST',
        headers: {Authorization:headers["Authorization"]},
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }
      
      const data = await response.json();
      setIsUploading(false);
      onUploadSuccess(data.file as FileType);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setIsUploading(false);
      let errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      onError(errorMessage);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Upload className="mr-2 h-5 w-5" />
        Upload Files
      </h2>
      
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">Any file type (MAX. 10MB)</p>
              </>
            )}
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            onChange={handleFileChange} 
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
};

// FileItem component
const FileItem: React.FC<FileItemProps> = ({ file, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      setIsDeleting(true);
      try {
        const response = await fetch(`${API}/files/get/${file._id}`, {
          method: 'DELETE',
         headers:getHeaders()
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete file');
        }
        
        onDelete(file._id);
      } catch (error) {
        console.error('Failed to delete file:', error);
        alert('Failed to delete file');
        setIsDeleting(false);
      }
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.startsWith('video/')) return '🎬';
    if (mimetype.startsWith('audio/')) return '🔊';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('sheet')) return '📊';
    if (mimetype.includes('zip') || mimetype.includes('compressed')) return '🗜️';
    return '📁';
  };

  return (
    <div className="flex items-center p-3 border rounded-lg mb-3 bg-white hover:bg-gray-50 transition-colors duration-150">
      {/* File Type Icon */}
      <div className="text-2xl mr-3">
        {getFileIcon(file.mimetype)}
      </div>
      
      {/* File Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{file.filename}</p>
        <div className="flex text-xs text-gray-500 mt-0.5 items-center">
          <span className="mr-3">{formatFileSize(file.size)}</span>
          <span>{format(parseISO(file.createdAt), 'PPp')}</span>
        </div>
      </div>
      
      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
        aria-label="Delete file"
      >
        {isDeleting ? 
          <Loader2 className="h-4 w-4 animate-spin" /> : 
          <Trash2 className="h-4 w-4" />
        }
      </button>
    </div>
  );
};

// FileList component
const FileList: React.FC<FileListProps> = ({ files, onDelete, onRefresh,onImageClick  }) => {
  if (!files.length) {
    return (
      <div className="text-center py-6 bg-white rounded-lg shadow-md">
        <div className="text-gray-400 mb-2">📂</div>
        <p className="text-gray-600">No files uploaded yet</p>
        <p className="text-xs text-gray-500 mt-1">Upload a file to get started</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {files.map((file) => (
        <div
          key={file._id}
          className="bg-white rounded shadow p-2 cursor-pointer hover:ring"
          onClick={() => {
            if (file.mimetype.startsWith("image/") && onImageClick) {
              onImageClick(file); // 👈 Trigger preview
            }
          }}
        >
          <p className="text-sm font-medium truncate">{file.filename}</p>
          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
        </div>
      ))}
    </div>
  );
};


  const [files, setFiles] = useState<FileType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ visible: boolean, message: string, type: 'success' | 'error' }>({ 
    visible: false, 
    message: '', 
    type: 'success' 
  });
  
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/files/get/all`, {
        headers:getHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      showToast('Failed to fetch files', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);
  
  const handleFileUploadSuccess = (file: FileType) => {
    showToast('File uploaded successfully', 'success');
    fetchFiles();
  };
  
  const handleFileDeleteSuccess = (fileId: string) => {
    setFiles(files.filter(file => file._id !== fileId));
    showToast('File deleted successfully', 'success');
  };
  
  const handleError = (errorMessage: string) => {
    showToast(errorMessage, 'error');
  };
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };
  
  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            File Sharing System
          </h1>
          <p className="text-gray-600">Upload, manage, and share your files securely</p>
        </header>
        
        <FileUploader 
          onUploadSuccess={handleFileUploadSuccess} 
          onError={handleError} 
        />
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12 bg-white rounded-lg shadow-md">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-2" />
            <p>Loading files...</p>
          </div>
        ) : (
          <FileList 
            files={files} 
            onDelete={handleFileDeleteSuccess} 
            onRefresh={fetchFiles} 
            onImageClick={handleImageClick}
          />
        )}
      </div>
      {selectedFile && selectedFile.mimetype.startsWith("image/") && (
          <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Image Preview</h2>
            <img 
              src={`${API}/files/get/${selectedFile.filename}`} 
              alt={selectedFile.filename} 
              className="w-full h-auto object-contain border rounded" 
            />
            <p className="mt-2 text-sm text-gray-500">{selectedFile.filename}</p>
          </div>
        )}
      
      
      {toast.visible && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
    </div>
  );
}
 
export default function FilePage(){
  return (
     <div className="flex h-screen">
    <AppSidebar />
    <main className="flex-1 overflow-y-auto flex flex-col">
            <FileRight />
        </main>
       
    </div>
  )
}