import React, { useState } from 'react';
import { Wand2, Download, Share2, Loader2, AlertCircle, Sparkles, Zap, Palette, Clock, Copy, CheckCircle, Settings, ChevronDown } from 'lucide-react';
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
  const [debugInfo, setDebugInfo] = useState<string>('');

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

  const testEdgeFunction = async (): Promise<boolean> => {
    try {
      console.log('Testing Edge Function connectivity...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session found');
      }

      const { data, error } = await supabase.functions.invoke('secure-image-uploader', {
        body: { test: true },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Edge Function test response:', data);
      console.log('Edge Function test error:', error);
      
      return !error;
    } catch (err) {
      console.error('Edge Function test failed:', err);
      return false;
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
    setDebugInfo('');

    const messageInterval = setInterval(() => {
      setCurrentLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
    }, 2000);

    try {
      // Step 1: Test Edge Function availability
      console.log('Step 1: Testing Edge Function...');
      setCurrentLoadingMessage("🔧 Checking system connectivity...");
      
      const edgeFunctionAvailable = await testEdgeFunction();
      if (!edgeFunctionAvailable) {
        throw new Error('Edge Function is not available. Please ensure it is deployed to your Supabase project.');
      }

      // Step 2: Generate image via webhook
      const webhookTimeout = setTimeout(() => {
        setWaitingForWebhook(true);
        setCurrentLoadingMessage("⏳ Waiting for image engine response...");
      }, 3000);

      console.log('Step 2: Sending request to webhook...');
      setCurrentLoadingMessage("🎨 Generating your image...");
      
      const response = await axios.post('https://n8n.srv834342.hstgr.cloud/webhook-test/create_image', {
        prompt: prompt.trim(),
      }, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' }
      });

      clearTimeout(webhookTimeout);
      console.log('Webhook response received:', response.data);

      if (!response.data?.[0]?.url) {
        throw new Error('Invalid response from webhook - no image URL found');
      }

      const publicUrl = response.data[0].url;
      console.log('Public image URL:', publicUrl);
      setDebugInfo(`Image generated: ${publicUrl}`);

      // Step 3: Get user session for authorization
      console.log('Step 3: Getting user session...');
      setCurrentLoadingMessage("🔐 Preparing secure storage...");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session found. Please try signing out and signing in again.');
      }

      console.log('Session obtained, user ID:', session.user.id);

      // Step 4: Secure the image using Edge Function
      console.log('Step 4: Securing image via Edge Function...');
      setCurrentLoadingMessage("🔄 Securing your image...");
      
      const functionPayload = { imageUrl: publicUrl };
      console.log('Calling Edge Function with payload:', functionPayload);
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('secure-image-uploader', {
        body: functionPayload,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Edge Function response data:', functionData);
      console.log('Edge Function error:', functionError);

      if (functionError) {
        console.error('Edge Function error details:', functionError);
        setDebugInfo(`Edge Function error: ${JSON.stringify(functionError)}`);
        
        if (functionError.message?.includes('Failed to fetch')) {
          throw new Error('Edge Function deployment issue. Please ensure the "secure-image-uploader" function is deployed to your Supabase project.');
        }
        
        throw new Error(`Edge Function failed: ${functionError.message}`);
      }
      
      if (functionData?.error) {
        console.error('Edge Function returned error:', functionData.error);
        setDebugInfo(`Edge Function internal error: ${functionData.error}`);
        throw new Error(`Image security processing failed: ${functionData.error}`);
      }

      if (!functionData?.path) {
        console.error('No path returned from Edge Function:', functionData);
        setDebugInfo(`Invalid Edge Function response: ${JSON.stringify(functionData)}`);
        throw new Error('Edge Function did not return a valid file path');
      }

      const filePath = functionData.path;
      console.log('Image secured at path:', filePath);
      setDebugInfo(`Image secured at: ${filePath}`);

      // Step 5: Create signed URL for access
      console.log('Step 5: Creating signed URL...');
      setCurrentLoadingMessage("🔗 Creating secure access URL...");
      
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('generated_images')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError);
        setDebugInfo(`Signed URL error: ${JSON.stringify(signedUrlError)}`);
        throw new Error(`Failed to create secure access URL: ${signedUrlError.message}`);
      }

      console.log('Signed URL created successfully');
      setDebugInfo('Image generation completed successfully!');

      const newImage = {
        signedUrl: signedUrlData.signedUrl,
        path: filePath,
        prompt: prompt.trim(),
        timestamp: Date.now(),
      };

      setGeneratedImage(newImage);
      setCurrentLoadingMessage("✅ Image generated successfully!");
      
      // Step 6: Save to database
      await saveImageToDatabase(newImage.path, newImage.prompt);

    } catch (err: any) {
      console.error('Error generating image:', err);
      let errorMessage = 'Failed to generate image. Please try again.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The image generation service may be experiencing high load.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Image generation service is currently unavailable. Please try again later.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Image generation service is experiencing technical difficulties.';
      } else if (err.message?.includes('Edge Function')) {
        errorMessage = `${err.message}\n\nTroubleshooting:\n1. Ensure the Edge Function is deployed\n2. Check environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)\n3. Verify storage bucket permissions`;
      } else if (err.message?.includes('session')) {
        errorMessage = `${err.message}\n\nPlease try signing out and signing in again.`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      if (debugInfo) {
        console.log('Debug info:', debugInfo);
      }
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
            <div className="flex items-start space-x-2 text-red-400 bg-red-400/10 p-4 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Generation Failed</p>
                <pre className="whitespace-pre-wrap text-xs">{error}</pre>
                {debugInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-red-300 hover:text-red-200">
                      Debug Information
                    </summary>
                    <pre className="mt-1 text-xs text-red-300 whitespace-pre-wrap">{debugInfo}</pre>
                  </details>
                )}
              </div>
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

      {/* Setup Instructions */}
      {!isGenerating && (
        <div className="bg-dark-200/50 rounded-xl p-4 border border-dark-300/50 mt-8">
          <details className="group">
            <summary className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Setup Instructions</span>
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-400">
              <p><strong>If you're experiencing issues:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ensure the Edge Function "secure-image-uploader" is deployed to your Supabase project</li>
                <li>Set environment variables in Supabase Dashboard → Edge Functions → Settings:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><code>SUPABASE_URL</code>: Your project URL</li>
                    <li><code>SUPABASE_SERVICE_ROLE_KEY</code>: Your service role key</li>
                  </ul>
                </li>
                <li>Create a storage bucket named "generated_images" with private access</li>
                <li>Verify the webhook URL is accessible and returns valid image URLs</li>
              </ol>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
