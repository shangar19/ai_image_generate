import React, { useState } from 'react';
import { Wand2, Download, Share2, Loader2, AlertCircle, Sparkles, Zap, Palette, Clock, Copy, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface GeneratedImage {
  signedUrl: string;
  path: string;
  prompt: string;
  timestamp: number;
}

const ImageGenerator: React.FC = () => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string>('');
  const [waitingForWebhook, setWaitingForWebhook] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  const samplePrompts = [
    "A majestic dragon flying over a mystical forest with glowing mushrooms",
    "Cyberpunk cityscape at night with neon lights and flying cars",
    "A serene mountain lake reflecting snow-capped peaks at sunset",
    "Abstract digital art with vibrant colors and geometric patterns",
    "A cozy cabin in the woods during a snowy winter evening",
    "Futuristic robot in a high-tech laboratory with holographic displays"
  ];

  const loadingMessages = [
    "🎨 Mixing digital paint...",
    "✨ Sprinkling AI magic...",
    "🖼️ Crafting your masterpiece...",
    "🌟 Bringing imagination to life...",
    "🎭 Adding artistic touches...",
    "🔮 Processing creative energy...",
    "⏳ Waiting for image engine response...",
    "🚀 AI engines working hard..."
  ];

  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string>(loadingMessages[0]);

  const saveImageToDatabase = async (imagePath: string, prompt: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('generated_images')
        .insert([{ user_id: user.id, prompt, image_path: imagePath }]);

      if (error) {
        console.error('Error saving image to database:', error);
      }
    } catch (err) {
      console.error('Error saving image to database:', err);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!prompt.trim() || !user) {
      setError('Please enter a prompt to generate an image');
      return;
    }

    setIsGenerating(true);
    setWaitingForWebhook(false);
    setError('');
    setGeneratedImage(null);
    setShareSuccess(false);

    const messageInterval = setInterval(() => {
      setCurrentLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
    }, 2000);

    try {
      const webhookTimeout = setTimeout(() => {
        setWaitingForWebhook(true);
        setCurrentLoadingMessage("⏳ Waiting for image engine response...");
      }, 3000);

      const response = await axios.post('https://n8n.srv834342.hstgr.cloud/webhook-test/create_image', {
        prompt: prompt.trim(),
      }, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' }
      });

      clearTimeout(webhookTimeout);

      if (!response.data?.[0]?.url) {
        throw new Error('Invalid response from webhook');
      }

      const publicUrl = response.data[0].url;

      // Secure the image using the Edge Function
      setCurrentLoadingMessage("🔄 Securing your image...");
      const { data: functionData, error: functionError } = await supabase.functions.invoke('secure-image-uploader', {
        body: { imageUrl: publicUrl },
      });

      if (functionError) throw functionError;
      if (functionData.error) throw new Error(`Edge function error: ${functionData.error}`);

      const filePath = functionData.path;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('generated_images')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      if (signedUrlError) throw signedUrlError;

      const newImage = {
        signedUrl: signedUrlData.signedUrl,
        path: filePath,
        prompt: prompt.trim(),
        timestamp: Date.now(),
      };

      setGeneratedImage(newImage);
      setCurrentLoadingMessage("✅ Image generated successfully!");
      await saveImageToDatabase(newImage.path, newImage.prompt);

    } catch (err: any) {
      console.error('Error generating image:', err);
      let errorMessage = 'Failed to generate image. Please try again.';
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The webhook is taking longer than expected.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      clearInterval(messageInterval);
      setIsGenerating(false);
      setWaitingForWebhook(false);
    }
  };

  const handleSamplePromptClick = (samplePrompt: string): void => {
    setPrompt(samplePrompt);
    setError('');
  };

  const handleDownload = async (): Promise<void> => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-generated-${generatedImage.timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download image.');
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!generatedImage) return;

    setShareSuccess(false);
    setError('');
    
    // Share the temporary signed URL
    const shareUrl = generatedImage.signedUrl;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Generated Image',
          text: `Check out this AI-generated image: "${generatedImage.prompt}"`,
          url: shareUrl,
        });
        setShareSuccess(true);
        return;
      } catch (shareErr) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      setError('Unable to copy the image URL.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-primary rounded-xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          AI Image Generator
        </h1>
        <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto">
          Transform your imagination into stunning visuals with the power of artificial intelligence
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-dark-200 rounded-2xl p-6 sm:p-8 mb-8 border border-dark-300">
        <div className="space-y-6">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-3">
              Describe your image
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A majestic dragon flying over a mystical forest with glowing mushrooms..."
              className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-all duration-200"
              rows={4}
              disabled={isGenerating}
            />
          </div>

          {/* Sample Prompts */}
          <div>
            <p className="text-sm text-gray-400 mb-3">Try these sample prompts:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePrompts.map((samplePrompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSamplePromptClick(samplePrompt)}
                  disabled={isGenerating}
                  className="text-left p-3 text-sm text-gray-300 bg-dark-300 hover:bg-dark-400 rounded-lg transition-colors duration-200 border border-dark-400 hover:border-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {samplePrompt}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {shareSuccess && (
            <div className="flex items-center space-x-2 text-green-400 bg-green-400/10 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Secure image URL copied to clipboard!</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{waitingForWebhook ? 'Waiting for webhook...' : 'Generating...'}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Animation */}
      {isGenerating && (
        <div className="bg-dark-200 rounded-2xl p-6 sm:p-8 mb-8 border border-dark-300">
          <div className="space-y-6">
            {/* Loading Header */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-primary rounded-full animate-ping opacity-75"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {waitingForWebhook ? (
                      <Clock className="w-8 h-8 text-white animate-pulse" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-white animate-spin" />
                    )}
                  </div>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                {waitingForWebhook ? 'Waiting for Webhook Response' : 'Creating Your Masterpiece'}
              </h3>
              <p className="text-primary-300 text-sm font-medium animate-pulse">
                {currentLoadingMessage}
              </p>
              {waitingForWebhook && (
                <p className="text-yellow-400 text-xs mt-2 animate-pulse">
                  Please wait... The webhook is processing your request
                </p>
              )}
            </div>

            {/* Animated Skeleton */}
            <div className="relative">
              <div className="w-full aspect-square bg-gradient-to-br from-dark-300 via-dark-400 to-dark-300 rounded-xl animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/20 to-transparent animate-pulse"></div>
                
                {/* Floating Icons */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-8 opacity-30">
                    <Palette className="w-8 h-8 text-primary-400 animate-bounce" style={{ animationDelay: '0s' }} />
                    <Zap className="w-8 h-8 text-purple-400 animate-bounce" style={{ animationDelay: '0.5s' }} />
                    <Sparkles className="w-8 h-8 text-blue-400 animate-bounce" style={{ animationDelay: '1s' }} />
                  </div>
                </div>

                {/* Progress Bar Effect */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="h-2 bg-dark-500 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full animate-progress"></div>
                  </div>
                </div>
              </div>

              {/* Shimmer Effect */}
              <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer rounded-xl"></div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Image Section */}
      {generatedImage && !isGenerating && (
        <div className="bg-dark-200 rounded-2xl p-6 sm:p-8 border border-dark-300 animate-fade-in">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Your Generated Image
              </h3>
              <p className="text-gray-300 text-sm">
                "{generatedImage.prompt}"
              </p>
            </div>

            <div className="relative group">
              <img
                src={generatedImage.signedUrl}
                alt={generatedImage.prompt}
                className="w-full rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                onError={(e) => {
                  console.error('Error loading image:', e);
                  setError('Failed to load the generated image.');
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={handleDownload}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Download</span>
              </button>
              <button
                onClick={handleShare}
                className="flex-1 bg-dark-400 hover:bg-dark-500 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {shareSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
