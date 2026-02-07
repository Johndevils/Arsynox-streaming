import React, { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, ShieldCheck, AlertTriangle, Tv, Wifi } from 'lucide-react';

// TODO: Paste your Cloudflare Worker URL here
const WORKER_URL = "https://arsystream-backend.YOUR_SUBDOMAIN.workers.dev";

function App() {
  const [inputUrl, setInputUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [useProxy, setUseProxy] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const handlePlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;

    setError('');
    setIsPlaying(false);
    setLoading(true);

    // Small delay to reset player UI
    setTimeout(() => loadStream(), 100);
  };

  const loadStream = () => {
    const video = videoRef.current;
    if (!video || !inputUrl) return;

    // Construct the final URL
    const finalUrl = useProxy 
      ? `${WORKER_URL}?url=${encodeURIComponent(inputUrl)}`
      : inputUrl;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    const isHLS = inputUrl.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(finalUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        setIsPlaying(true);
        video.play().catch(() => console.log("Autoplay blocked"));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
           setLoading(false);
           setError(`Stream Error: ${data.details}`);
        }
      });
      
      hlsRef.current = hls;
    } 
    else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHLS) {
      video.src = finalUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        setIsPlaying(true);
      });
    } 
    else {
      setLoading(false);
      setError("Format not supported.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-brand selection:text-white">
      
      {/* Navbar / Header */}
      <nav className="w-full border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="bg-brand p-1.5 rounded-lg">
            <Tv size={24} className="text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            ARSY<span className="text-brand">STREAM</span>
          </h1>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-start p-4 md:p-12 relative overflow-hidden">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-brand/20 blur-[120px] rounded-full pointer-events-none" />

        {/* Input Section */}
        <div className="w-full max-w-4xl relative z-10 mb-8">
          <div className="bg-card border border-white/10 p-1 rounded-2xl shadow-2xl shadow-black">
            <form onSubmit={handlePlay} className="flex flex-col md:flex-row gap-2 p-2">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Wifi size={18} className="text-gray-500 group-focus-within:text-brand transition-colors" />
                </div>
                <input
                  type="url"
                  required
                  placeholder="Paste stream URL (m3u8, mp4, mkv)..."
                  className="w-full bg-surface text-white pl-11 pr-4 py-4 rounded-xl border border-transparent focus:border-brand/50 focus:bg-black focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-gray-600"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                {/* Proxy Toggle */}
                <button
                  type="button"
                  onClick={() => setUseProxy(!useProxy)}
                  className={`px-4 rounded-xl border flex flex-col justify-center items-center min-w-[80px] transition-all ${
                    useProxy 
                      ? 'bg-brand/10 border-brand text-brand' 
                      : 'bg-surface border-white/5 text-gray-500 hover:border-white/20'
                  }`}
                  title="Toggle Proxy"
                >
                  <ShieldCheck size={20} />
                  <span className="text-[10px] font-bold uppercase mt-1">
                    {useProxy ? 'Proxy ON' : 'Direct'}
                  </span>
                </button>

                {/* Play Button */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-brand hover:bg-brand-dark text-white font-bold py-3 px-8 rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play size={20} fill="currentColor" />
                  )}
                  <span className="hidden md:inline">STREAM</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-4xl animate-pulse flex items-center gap-3 bg-red-950/30 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl mb-6 backdrop-blur-sm">
            <AlertTriangle size={20} className="text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Video Player Container */}
        <div className={`w-full max-w-5xl relative group transition-all duration-700 ${isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          {/* Decorative Border Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-b from-brand to-black rounded-2xl opacity-20 blur transition duration-1000 group-hover:opacity-40" />
          
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <video 
              ref={videoRef}
              controls 
              className="w-full h-full object-contain"
              playsInline
            />
            
            {/* Overlay when idle/loading */}
            {!isPlaying && !loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm">
                <div className="text-gray-500 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center">
                    <Play size={24} className="ml-1 opacity-50" />
                  </div>
                  <p className="text-sm uppercase tracking-widest opacity-50">Ready to Stream</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center px-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-xs font-mono text-gray-500 uppercase">
                {isPlaying ? 'Live Connection' : 'Offline'}
              </span>
            </div>
            {useProxy && isPlaying && (
              <span className="text-xs font-mono text-brand border border-brand/30 px-2 py-1 rounded bg-brand/5">
                SECURE PROXY ACTIVE
              </span>
            )}
          </div>
        </div>

      </main>
      
      <footer className="w-full border-t border-white/5 py-6 text-center">
        <p className="text-gray-600 text-sm">
          Arsystream v1.0 &bull; Powered by <span className="text-brand">Cloudflare</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
