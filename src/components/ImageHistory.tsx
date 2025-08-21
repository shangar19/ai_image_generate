import React, { useState, useEffect } from 'react';
import { History, Download, Trash2, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

const ImageHistory: React.FC = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchImages();
    }
  }, [user]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setImages(data || []);
    } catch (err: any) {
      console.error('Error fetching images:', err);
      setError('Failed to load image history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-image-${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading image:', err);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      setDeletingIds(prev => new Set(prev).add(imageId));

      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err: any) {
      console.error('Error deleting image:', err);
      setError('Failed to delete image');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-dark-200 rounded-2xl p-6 sm:p-8 border border-dark-300">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300">Loading your image history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-dark-200 rounded-2xl p-6 sm:p-8 border border-dark-300">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Your Generated Images</h2>
              <p className="text-gray-400">View and manage your AI artwork collection</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 p-3 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-dark-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-12 h-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No images yet</h3>
            <p className="text-gray-500">
              Start generating some amazing AI images to see them here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-dark-300 rounded-xl overflow-hidden border border-dark-400 hover:border-primary-500/50 transition-all duration-200"
              >
                <div className="aspect-square relative group">
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(image)}
                        className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-all duration-200"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(image.id)}
                        disabled={deletingIds.has(image.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg backdrop-blur-sm transition-all duration-200 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingIds.has(image.id) ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <p className="text-white text-sm font-medium mb-2 line-clamp-2">
                    {image.prompt}
                  </p>
                  <div className="flex items-center space-x-1 text-gray-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(image.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageHistory;
