"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload as UploadIcon, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserReferenceImages, uploadImage, deleteUpload, type Upload } from "@/lib/actions/uploads";
import { Button } from "@/components/ui/button";

interface ReferenceImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (image: Upload) => void;
  threadId?: string;
}

export function ReferenceImageModal({
  isOpen,
  onClose,
  onSelect,
  threadId,
}: ReferenceImageModalProps) {
  const [images, setImages] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<Upload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  const fetchImages = async () => {
    setIsLoading(true);
    const result = await getUserReferenceImages(50);
    if (result.success && result.data) {
      setImages(result.data);
    }
    setIsLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload JPEG, PNG, or WebP images.");
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "reference");
    if (threadId) {
      formData.append("threadId", threadId);
    }

    const result = await uploadImage(formData);
    
    if (result.success && result.data) {
      // Add to list
      setImages([result.data, ...images]);
      // Auto-select the uploaded image
      handleSelect(result.data);
    } else {
      alert(result.error || "Failed to upload image");
    }

    setIsUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    const result = await deleteUpload(imageId);
    
    if (result.success) {
      setImages(images.filter((img) => img.id !== imageId));
      if (selectedImageId === imageId) {
        setSelectedImageId(null);
      }
    } else {
      alert(result.error || "Failed to delete image");
    }
  };

  const handleSelect = (image: Upload) => {
    onSelect(image);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-heading font-bold">Reference Image Library</h2>
            <p className="text-sm text-text-dim mt-1">
              Select or upload a reference image
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Area */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "w-full p-6 border-2 border-dashed rounded-lg transition-all",
                "hover:border-primary hover:bg-primary/5",
                "flex flex-col items-center gap-3",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <p className="text-sm text-text-dim">Uploading...</p>
                </>
              ) : (
                <>
                  <UploadIcon size={32} className="text-text-dim" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Click to upload</p>
                    <p className="text-xs text-text-dim mt-1">
                      JPEG, PNG, or WebP (Max 10MB)
                    </p>
                  </div>
                </>
              )}
            </button>
          </div>

          {/* Images Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-dim">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon size={48} className="text-text-dim mx-auto mb-3 opacity-50" />
              <p className="text-sm text-text-dim">
                No reference images yet. Upload one to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={cn(
                    "relative group cursor-pointer rounded-lg overflow-hidden",
                    "border-2 transition-all",
                    selectedImageId === image.id
                      ? "border-primary"
                      : "border-transparent hover:border-border"
                  )}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  {/* Image */}
                  <div className="aspect-square bg-surface-2">
                    <img
                      src={image.publicUrl}
                      alt={image.title || "Reference"}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingImage(image);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 bg-surface rounded-lg transition-opacity"
                    >
                      <ImageIcon size={18} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(image.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-2 bg-danger rounded-lg transition-opacity"
                    >
                      <Trash2 size={18} className="text-white" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-xs text-white truncate">
                      {image.title || "Untitled"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between items-center">
          <p className="text-sm text-text-dim">
            {images.length} {images.length === 1 ? "image" : "images"}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {selectedImageId && (
              <Button
                onClick={() => {
                  const selected = images.find((img) => img.id === selectedImageId);
                  if (selected) handleSelect(selected);
                }}
              >
                Select Image
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal - Separate layer */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            e.stopPropagation();
            setViewingImage(null);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewingImage(null);
            }}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
          <img
            src={viewingImage.publicUrl}
            alt={viewingImage.title || "Reference"}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
