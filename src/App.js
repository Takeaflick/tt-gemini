import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, Film, Image as ImageIcon, Download, Trash2, Move, ChevronsLeft, ChevronsRight, CornerUpLeft, CornerUpRight, CornerDownLeft, CornerDownRight, Rows, Columns, AlignCenter, Loader2 } from 'lucide-react';

// --- Helper Functions ---
const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00:00";
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return [hours, minutes, seconds]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
};

const parseTimeToSeconds = (timeString) => {
  const parts = timeString.split(':').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

// --- Child Components ---

const Notification = ({ message, onDismiss }) => {
    if (!message) return null;
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [message, onDismiss]);

    return (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white py-2 px-6 rounded-lg shadow-lg z-50 animate-fade-in-down">
            {message}
        </div>
    );
};

const EmojiPicker = ({ onSelect }) => {
    const emojis = ['😊', '😂', '❤️', '👍', '🔥', '🎉', '🤯', '🤔', '👀', '💯', '✨', '🙏', '🙌', '💀', '😭', '👇', '👉', '👈', '👆', '✅', '❌', '➡️', '⬅️', '⬆️', '⬇️', '🚀', '💡', '💰', '📈', '📉', '⚠️', 'TikTok'];
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
                aria-label="Pick an emoji"
            >
                😊
            </button>
            {isOpen && (
                <div className="absolute bottom-full mb-2 left-0 grid grid-cols-8 gap-1 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20 w-64">
                    {emojis.map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                                onSelect(emoji);
                                setIsOpen(false);
                            }}
                            className="text-2xl rounded-md hover:bg-gray-700 transition-colors"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const FileUploader = ({ onFileSelect, acceptedTypes, children, id }) => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) onFileSelect(e.dataTransfer.files[0]);
    };
    const handleFileChange = (e) => { if (e.target.files && e.target.files[0]) onFileSelect(e.target.files[0]); };
    const handleClick = () => fileInputRef.current.click();

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-gray-800' : 'border-gray-600 hover:border-blue-500'}`}
        >
            <input type="file" ref={fileInputRef} id={id} onChange={handleFileChange} accept={acceptedTypes} className="hidden" />
            {children}
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    // State Management
    const [captions, setCaptions] = useState([]);
    const [currentCaption, setCurrentCaption] = useState({
        text: '', start: 0, end: 3, x: 50, y: 50, fontSize: 24, fontFamily: 'SF Pro Display Bold', bgColor: '#ffffff', textColor: '#000000', width: 60,
    });
    
    const [mainVideo, setMainVideo] = useState(null);
    const [bottomMedia, setBottomMedia] = useState(null);
    const [logo, setLogo] = useState(null);

    const [mainVideoUrl, setMainVideoUrl] = useState('');
    const [bottomMediaUrl, setBottomMediaUrl] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    const [videoDuration, setVideoDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const [currentTemplate, setCurrentTemplate] = useState('standard');
    const [bottomMediaType, setBottomMediaType] = useState('video');
    const [bottomZoom, setBottomZoom] = useState(100);
    const [muteBottomAudio, setMuteBottomAudio] = useState(true);
    const [logoPosition, setLogoPosition] = useState('top-left');
    const [logoSize, setLogoSize] = useState(100);

    const [isPreviewMode, setIsPreviewMode] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [isExporting, setIsExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState('');
    const [exportProgress, setExportProgress] = useState(0);

    const [notification, setNotification] = useState('');
    
    const ffmpegRef = useRef(null);

    // Refs
    const mainVideoRef = useRef(null);
    const bottomVideoRef = useRef(null);
    const captionPreviewRef = useRef(null);
    const videoContainerRef = useRef(null);
    
    // Object URL Effects
    useEffect(() => { if (mainVideo) { const url = URL.createObjectURL(mainVideo); setMainVideoUrl(url); return () => URL.revokeObjectURL(url); } }, [mainVideo]);
    useEffect(() => { if (bottomMedia) { setBottomMediaType(bottomMedia.type.startsWith('image/') ? 'image' : 'video'); const url = URL.createObjectURL(bottomMedia); setBottomMediaUrl(url); return () => URL.revokeObjectURL(url); } }, [bottomMedia]);
    useEffect(() => { if (logo) { const reader = new FileReader(); reader.onload = (e) => setLogoUrl(e.target.result); reader.readAsDataURL(logo); } }, [logo]);

    // Video Sync & Metadata
    const handleVideoMetadata = () => { if (mainVideoRef.current) setVideoDuration(mainVideoRef.current.duration); };
    useEffect(() => {
        if (currentTemplate === 'split' && mainVideoRef.current && bottomVideoRef.current) {
            const main = mainVideoRef.current;
            const bottom = bottomVideoRef.current;
            const syncPlay = () => !bottom.paused && main.play().catch(console.error);
            const syncPause = () => !main.paused && bottom.pause();
            const syncSeek = () => { if (Math.abs(main.currentTime - bottom.currentTime) > 0.15) { bottom.currentTime = main.currentTime; }};
            main.addEventListener('play', syncPlay);
            main.addEventListener('pause', syncPause);
            main.addEventListener('seeked', syncSeek);
            return () => { main.removeEventListener('play', syncPlay); main.removeEventListener('pause', syncPause); main.removeEventListener('seeked', syncSeek); };
        }
    }, [mainVideoUrl, bottomMediaUrl, currentTemplate]);
    const handleTimeUpdate = () => { if (mainVideoRef.current) setCurrentTime(mainVideoRef.current.currentTime); };

    // Caption Management
    const addCaption = () => {
        if (!currentCaption.text.trim()) { setNotification("Caption text cannot be empty."); return; }
        if (currentCaption.end <= currentCaption.start) { setNotification("End time must be after start time."); return; }
        const newCaption = { ...currentCaption, id: Date.now() };
        setCaptions(prev => [...prev, newCaption].sort((a, b) => a.start - b.start));
        const nextStartTime = newCaption.end;
        const nextEndTime = Math.min(nextStartTime + 3, videoDuration);
        setCurrentCaption(prev => ({ ...prev, text: '', start: nextStartTime, end: nextEndTime, }));
    };
    const removeCaption = (id) => setCaptions(captions.filter(c => c.id !== id));
    
    // --- DRAG AND DROP LOGIC (FIXED) ---
    const startDragging = useCallback((e) => {
        if (!isPreviewMode || !captionPreviewRef.current) return;
        const event = e.nativeEvent.touches ? e.nativeEvent.touches[0] : e;
        const captionRect = captionPreviewRef.current.getBoundingClientRect();
        setDragOffset({ x: event.clientX - captionRect.left, y: event.clientY - captionRect.top });
        setIsDragging(true);
    }, [isPreviewMode]);

    useEffect(() => {
        const handleDrag = (e) => {
            if (!isDragging || !videoContainerRef.current) return;
            e.preventDefault(); 
            const event = e.touches ? e.touches[0] : e;
            const containerRect = videoContainerRef.current.getBoundingClientRect();
            
            const x = event.clientX - containerRect.left - dragOffset.x;
            const y = event.clientY - containerRect.top - dragOffset.y;
            
            const newXPercent = Math.max(0, Math.min(100, (x / containerRect.width) * 100));
            const newYPercent = Math.max(0, Math.min(100, (y / containerRect.height) * 100));
            
            setCurrentCaption(prev => ({ ...prev, x: newXPercent, y: newYPercent }));
        };

        const handleStopDragging = () => setIsDragging(false);
        
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleStopDragging);
            window.addEventListener('touchmove', handleDrag, { passive: false });
            window.addEventListener('touchend', handleStopDragging);
        }

        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleStopDragging);
            window.removeEventListener('touchmove', handleDrag);
            window.removeEventListener('touchend', handleStopDragging);
        };
    }, [isDragging, dragOffset]);

    // --- EXPORT FUNCTIONALITY (FIXED) ---
    const exportVideo = async () => {
        if (!mainVideo) {
            setNotification("Please upload a video first.");
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        try {
            setExportMessage('Loading encoder...');
            if (!ffmpegRef.current) {
                const { FFmpeg } = await import('@ffmpeg/ffmpeg');
                const { toBlobURL } = await import('@ffmpeg/util');
                const ffmpegInstance = new FFmpeg();
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                await ffmpegInstance.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
                ffmpegRef.current = ffmpegInstance;
            }
            const ffmpeg = ffmpegRef.current;
            
            setExportMessage('Step 1/2: Rendering video frames...');
            const videoBlob = await renderToBlob();
            if (!videoBlob) throw new Error("Video rendering failed and produced an empty file.");
            
            setExportMessage('Step 2/2: Encoding to MP4...');
            setExportProgress(0); 

            ffmpeg.on('progress', ({ progress }) => {
                setExportProgress(Math.min(100, progress * 100));
            });
            
            const { fetchFile } = await import('@ffmpeg/util');
            await ffmpeg.writeFile('video.webm', await fetchFile(videoBlob));
            await ffmpeg.writeFile('audio.mp4', await fetchFile(mainVideo));

            await ffmpeg.exec(['-i', 'video.webm', '-i', 'audio.mp4', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', 'output.mp4']);

            const data = await ffmpeg.readFile('output.mp4');
            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `captioned-video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            await ffmpeg.deleteFile('video.webm');
            await ffmpeg.deleteFile('audio.mp4');
            await ffmpeg.deleteFile('output.mp4');

        } catch (error) {
            console.error("Export failed:", error);
            setNotification("An error occurred during export. See console for details.");
        } finally {
            setIsExporting(false);
            setExportMessage('');
        }
    };

    const renderToBlob = () => {
        return new Promise(async (resolve, reject) => {
            const videoForRendering = document.createElement('video');
            videoForRendering.src = mainVideoUrl;
            videoForRendering.muted = true;
            videoForRendering.crossOrigin = "anonymous"; // CRITICAL FIX

            videoForRendering.onloadedmetadata = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const outputWidth = currentTemplate === 'split' ? 400 : videoForRendering.videoWidth;
                const outputHeight = currentTemplate === 'split' ? 600 : videoForRendering.videoHeight;
                canvas.width = outputWidth;
                canvas.height = outputHeight;

                const stream = canvas.captureStream(30);
                const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
                const chunks = [];
                recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
                recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
                recorder.onerror = (e) => reject(new Error("MediaRecorder error: " + e.message));
                
                recorder.start();

                const logoImg = logoUrl ? await new Promise(res => { const i = new Image(); i.crossOrigin="anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = logoUrl; }) : null;
                const bottomMediaImg = (currentTemplate === 'split' && bottomMediaType === 'image' && bottomMediaUrl) ? await new Promise(res => { const i = new Image(); i.crossOrigin="anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = bottomMediaUrl; }) : null;
                const bottomVideoForRendering = (currentTemplate === 'split' && bottomMediaType === 'video' && bottomMediaUrl) ? document.createElement('video') : null;
                if(bottomVideoForRendering) { bottomVideoForRendering.src = bottomMediaUrl; bottomVideoForRendering.muted = true; bottomVideoForRendering.crossOrigin = "anonymous"; } // CRITICAL FIX
                
                const duration = videoForRendering.duration;
                const frameRate = 30;
                let currentTime = 0;

                const renderFrame = async () => {
                    if (currentTime >= duration) {
                        setTimeout(() => recorder.stop(), 100);
                        return;
                    }

                    videoForRendering.currentTime = currentTime;
                    await new Promise(res => videoForRendering.addEventListener('seeked', res, { once: true }));
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#0f0f0f';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    if (currentTemplate === 'standard') {
                        ctx.drawImage(videoForRendering, 0, 0, canvas.width, canvas.height);
                    } else {
                        ctx.drawImage(videoForRendering, 0, 0, canvas.width, canvas.height / 2);
                        ctx.fillStyle = '#1a1a1a';
                        ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);
                        if (bottomMediaType === 'video' && bottomVideoForRendering) {
                             bottomVideoForRendering.currentTime = currentTime;
                             await new Promise(res => bottomVideoForRendering.addEventListener('seeked', res, { once: true }));
                             const v = bottomVideoForRendering;
                             const s = bottomZoom / 100, sw = v.videoWidth / s, sh = v.videoHeight / s, sx = (v.videoWidth - sw) / 2, sy = (v.videoHeight - sh) / 2;
                             ctx.drawImage(v, sx, sy, sw, sh, 0, canvas.height / 2, canvas.width, canvas.height / 2);
                        } else if (bottomMediaType === 'image' && bottomMediaImg) {
                             const img = bottomMediaImg;
                             const s = bottomZoom / 100, sw = img.width / s, sh = img.height / s, sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
                             ctx.drawImage(img, sx, sy, sw, sh, 0, canvas.height / 2, canvas.width, canvas.height / 2);
                        }
                    }

                    const CAPTION_SCALE = 1.8;
                    captions.filter(c => currentTime >= c.start && currentTime <= c.end).forEach(cap => {
                        const fontSize = cap.fontSize * CAPTION_SCALE;
                        ctx.font = `bold ${fontSize}px "${cap.fontFamily}", sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        const capBoxWidth = (cap.width / 100) * canvas.width;
                        const capBoxX = ((cap.x / 100) * canvas.width) - (capBoxWidth / 2);
                        const wrapText = (text, maxWidth) => { 
                            const words = text.split(' '); let lines = []; let currentLine = words[0] || '';
                            for (let i = 1; i < words.length; i++) {
                                let testLine = currentLine + " " + words[i];
                                if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) { lines.push(currentLine); currentLine = words[i]; } else { currentLine = testLine; }
                            }
                            lines.push(currentLine); return lines;
                        };
                        const lines = cap.text.split('\n').flatMap(line => wrapText(line, capBoxWidth - 20));
                        const lineHeight = fontSize * 1.2;
                        const totalHeight = lines.length * lineHeight;
                        const capBoxY = ((cap.y / 100) * canvas.height) - (totalHeight / 2);
                        ctx.fillStyle = cap.bgColor;
                        ctx.beginPath();
                        ctx.roundRect(capBoxX, capBoxY, capBoxWidth, totalHeight, 8 * CAPTION_SCALE);
                        ctx.fill();
                        ctx.fillStyle = cap.textColor;
                        lines.forEach((line, i) => ctx.fillText(line, capBoxX + capBoxWidth / 2, capBoxY + (i * lineHeight) + (lineHeight / 2)));
                    });

                    if (logoImg) {
                        const w = logoSize * CAPTION_SCALE, h = (logoImg.height / logoImg.width) * w, m = 10 * CAPTION_SCALE;
                        let x, y;
                        if (logoPosition.includes('left')) x = m; else x = canvas.width - w - m;
                        if (logoPosition.includes('top')) y = m; else y = canvas.height - h - m;
                        ctx.drawImage(logoImg, x, y, w, h);
                    }

                    setExportProgress((currentTime / duration) * 100);
                    currentTime += 1 / frameRate;
                    requestAnimationFrame(renderFrame);
                };
                renderFrame();
            };
            videoForRendering.onerror = (e) => reject(new Error("Video element for rendering failed to load."));
        });
    };
    
    const setPositionPreset = (preset) => {
        const positions = {
            'top-left': {x: 25, y: 15}, 'top-center': {x: 50, y: 15}, 'top-right': {x: 75, y: 15},
            'mid-left': {x: 25, y: 50}, 'mid-center': {x: 50, y: 50}, 'mid-right': {x: 75, y: 50},
            'bottom-left': {x: 25, y: 85}, 'bottom-center': {x: 50, y: 85}, 'bottom-right': {x: 75, y: 85},
            'split-center': {x: 50, y: 50}
        };
        setCurrentCaption(prev => ({...prev, ...positions[preset]}));
    };
    const handleTimeInputChange = (e, type) => {
        const newTime = parseTimeToSeconds(e.target.value);
        if((type === 'start' && newTime >= currentCaption.end) || (type === 'end' && newTime <= currentCaption.start)) return;
        setCurrentCaption(prev => ({...prev, [type]: newTime}));
    };
    const captionPreviewStyle = {
        left: `${currentCaption.x}%`, top: `${currentCaption.y}%`, transform: 'translate(-50%, -50%)',
        width: `${currentCaption.width}%`, fontSize: `${currentCaption.fontSize}px`, fontFamily: `"${currentCaption.fontFamily}", sans-serif`,
        backgroundColor: currentCaption.bgColor, color: currentCaption.textColor, cursor: isPreviewMode ? 'move' : 'default',
    };
    const logoStyle = {
        width: `${logoSize}px`, position: 'absolute',
        ...(logoPosition === 'top-left' && { top: '10px', left: '10px' }), ...(logoPosition === 'top-right' && { top: '10px', right: '10px' }),
        ...(logoPosition === 'bottom-left' && { bottom: '10px', left: '10px' }), ...(logoPosition === 'bottom-right' && { bottom: '10px', right: '10px' }),
    };
    
    // RENDER
    return (
        <div className="bg-[#0f0f0f] text-white min-h-screen font-sans">
            <Notification message={notification} onDismiss={() => setNotification('')} />
            {isExporting && (
                 <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
                    <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-4"/>
                    <h2 className="text-3xl font-bold mb-4">{exportMessage || 'Exporting Video...'}</h2>
                    <p className="mb-2 text-gray-300">This may take a while. Please don't close this tab.</p>
                    <div className="w-1/2 bg-gray-700 rounded-full h-4">
                        <div className="bg-gradient-to-r from-[#0095f6] to-[#00d4ff] h-4 rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                    </div>
                    <p className="mt-2 text-xl">{Math.round(exportProgress)}%</p>
                 </div>
            )}
            <div className="container mx-auto p-4 lg:p-8">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
                    <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#0095f6] to-[#00d4ff] mb-4 sm:mb-0">
                        TikTok Caption Editor
                    </h1>
                    <div className="flex items-center gap-2">
                         <span className="text-gray-400">Template:</span>
                         <button onClick={() => setCurrentTemplate('standard')} className={`px-4 py-2 rounded-md transition-colors ${currentTemplate === 'standard' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Standard</button>
                         <button onClick={() => setCurrentTemplate('split')} className={`px-4 py-2 rounded-md transition-colors ${currentTemplate === 'split' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Split Screen</button>
                    </div>
                </header>
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div ref={videoContainerRef} className={`relative w-full mx-auto bg-black rounded-lg overflow-hidden ${currentTemplate === 'split' ? 'aspect-[9/16]' : ''}`} style={{ maxWidth: currentTemplate === 'standard' ? '800px' : '337.5px' }}>
                            {mainVideoUrl ? (
                                <div className="w-full h-full flex flex-col">
                                    <video ref={mainVideoRef} src={mainVideoUrl} controls className="w-full" style={{height: currentTemplate === 'split' ? '50%' : '100%'}} onLoadedMetadata={handleVideoMetadata} onTimeUpdate={handleTimeUpdate} crossOrigin="anonymous"/>
                                    {currentTemplate === 'split' && (
                                        <div className="relative w-full h-1/2 bg-gray-900 flex items-center justify-center overflow-hidden">
                                            {bottomMediaUrl ? (
                                                bottomMediaType === 'video' ? 
                                                    <video ref={bottomVideoRef} src={bottomMediaUrl} muted={muteBottomAudio} loop playsInline className="absolute w-full h-full object-cover" style={{transform: `scale(${bottomZoom / 100})`}}/> : 
                                                    <img src={bottomMediaUrl} alt="Bottom media" className="absolute w-full h-full object-cover" style={{transform: `scale(${bottomZoom / 100})`}}/>
                                            ) : <p className="text-gray-400">Select bottom media</p>
                                            }
                                        </div>
                                    )}
                                </div>
                            ) : (
                                 <FileUploader onFileSelect={setMainVideo} acceptedTypes="video/*" id="main-video-upload">
                                    <Film className="w-12 h-12 text-gray-400 mb-2"/><p className="font-semibold">Click or Drag & Drop Main Video</p><p className="text-sm text-gray-500">MP4, WebM, MOV</p>
                                </FileUploader>
                            )}
                            {isPreviewMode && mainVideoUrl && (
                                <div ref={captionPreviewRef} onMouseDown={startDragging} onTouchStart={startDragging} style={captionPreviewStyle} className="absolute p-2 rounded-md shadow-lg break-words text-center leading-tight flex items-center justify-center select-none">
                                    <p style={{whiteSpace: 'pre-wrap'}}>{currentCaption.text || "Your text here"}</p>
                                </div>
                            )}
                             {logoUrl && mainVideoUrl && (<img src={logoUrl} alt="Logo preview" style={logoStyle} className="opacity-80 select-none pointer-events-none"/>)}
                        </div>
                         <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-xl font-bold mb-3 border-b border-gray-700 pb-2">Timeline</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {captions.length === 0 && <p className="text-gray-500">No captions added yet.</p>}
                                {captions.map((cap) => (
                                    <div key={cap.id} className={`flex justify-between items-center p-2 rounded-md ${currentTime >= cap.start && currentTime <= cap.end ? 'bg-blue-900/50' : 'bg-gray-800'}`}>
                                        <p className="truncate"><span className="font-mono text-blue-400">[{formatTime(cap.start)} - {formatTime(cap.end)}]</span><span className="ml-3">{cap.text}</span></p>
                                        <button onClick={() => removeCaption(cap.id)} className="ml-4 p-1 rounded-full text-gray-400 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900 p-4 lg:p-6 rounded-lg flex flex-col gap-6 h-fit">
                        <div>
                            <h3 className="text-xl font-bold mb-3">1. Add Caption Text</h3>
                            <div className="flex gap-2">
                                <textarea value={currentCaption.text} onChange={(e) => setCurrentCaption({ ...currentCaption, text: e.target.value })} placeholder="Enter caption text..." rows={3} className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                <EmojiPicker onSelect={(emoji) => setCurrentCaption(prev => ({...prev, text: prev.text + emoji}))} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                                    <input id="startTime" type="text" value={formatTime(currentCaption.start)} onChange={(e) => handleTimeInputChange(e, 'start')} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 font-mono" />
                                </div>
                                <div>
                                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                                    <input id="endTime" type="text" value={formatTime(currentCaption.end)} onChange={(e) => handleTimeInputChange(e, 'end')} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 font-mono" />
                                </div>
                            </div>
                            <button onClick={addCaption} disabled={!mainVideoUrl} className="mt-4 w-full bg-gradient-to-r from-[#0095f6] to-[#00d4ff] text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                                <Plus size={20}/> Add to Timeline
                            </button>
                        </div>
                        <div className="border-t border-gray-700"></div>
                        <div>
                           <h3 className="text-xl font-bold mb-3">2. Style & Position</h3>
                           <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-400 mb-1">Font</label>
                                    <select 
                                        id="fontFamily" 
                                        value={currentCaption.fontFamily} 
                                        onChange={e => setCurrentCaption({...currentCaption, fontFamily: e.target.value})} 
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md p-2"
                                    >
                                        <option>SF Pro Display Bold</option>
                                        <option>Helvetica Neue Bold</option>
                                        <option>Inter</option>
                                        <option>Roboto</option>
                                        <option>Montserrat</option>
                                        <option>Lato</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="fontSize" className="block text-sm font-medium text-gray-400 mb-1">Size ({currentCaption.fontSize}px)</label>
                                    <input id="fontSize" type="range" min="16" max="48" value={currentCaption.fontSize} onChange={e => setCurrentCaption({...currentCaption, fontSize: Number(e.target.value)})} className="w-full"/>
                                </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label htmlFor="textColor" className="block text-sm font-medium text-gray-400 mb-1">Text Color</label>
                                    <input id="textColor" type="color" value={currentCaption.textColor} onChange={e => setCurrentCaption({...currentCaption, textColor: e.target.value})} className="w-full h-10 bg-gray-800 border border-gray-700 rounded-md p-1"/>
                                </div>
                                <div>
                                    <label htmlFor="bgColor" className="block text-sm font-medium text-gray-400 mb-1">Background</label>
                                    <input id="bgColor" type="color" value={currentCaption.bgColor} onChange={e => setCurrentCaption({...currentCaption, bgColor: e.target.value})} className="w-full h-10 bg-gray-800 border border-gray-700 rounded-md p-1"/>
                                </div>
                           </div>
                           <div className="mt-4">
                                <label htmlFor="captionWidth" className="block text-sm font-medium text-gray-400 mb-1">Width ({currentCaption.width}%)</label>
                                <input id="captionWidth" type="range" min="20" max="100" value={currentCaption.width} onChange={e => setCurrentCaption({...currentCaption, width: Number(e.target.value)})} className="w-full"/>
                           </div>
                           <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Position Presets</label>
                                <div className="grid grid-cols-3 gap-2">
                                   {['top-left', 'top-center', 'top-right', 'mid-left', 'mid-center', 'mid-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(pos => (
                                       <button key={pos} onClick={()=>setPositionPreset(pos)} className="bg-gray-800 aspect-square rounded-md flex items-center justify-center hover:bg-blue-600 transition-colors">
                                            {pos === 'top-left' && <CornerUpLeft/>} {pos === 'top-center' && <Rows/>} {pos === 'top-right' && <CornerUpRight/>}
                                            {pos === 'mid-left' && <ChevronsLeft/>} {pos === 'mid-center' && <AlignCenter/>} {pos === 'mid-right' && <ChevronsRight/>}
                                            {pos === 'bottom-left' && <CornerDownLeft/>} {pos === 'bottom-center' && <Columns transform="rotate(90)"/>} {pos === 'bottom-right' && <CornerDownRight/>}
                                       </button>
                                   ))}
                                </div>
                                {currentTemplate === 'split' && <button onClick={()=>setPositionPreset('split-center')} className="mt-2 w-full bg-gray-800 p-2 rounded-md hover:bg-blue-600 transition-colors">Center on Split</button>}
                           </div>
                           <div className="mt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={isPreviewMode} onChange={() => setIsPreviewMode(!isPreviewMode)} className="w-4 h-4" />
                                    <span>Enable Draggable Preview</span><Move size={16} className="text-gray-400"/>
                                </label>
                           </div>
                        </div>
                        <div className="border-t border-gray-700"></div>
                        <div>
                            <h3 className="text-xl font-bold mb-3">3. Optional Settings</h3>
                            {currentTemplate === 'split' && (
                                <div className="bg-gray-800 p-3 rounded-md mb-4">
                                    <h4 className="font-semibold mb-2">Split Screen Options</h4>
                                    <FileUploader onFileSelect={setBottomMedia} acceptedTypes="video/*,image/*" id="bottom-media-upload">
                                        <ImageIcon className="w-8 h-8 text-gray-400 mb-1"/><p className="font-semibold text-sm">Upload Bottom Media</p>
                                    </FileUploader>
                                    <div className="mt-3">
                                        <label htmlFor="bottomZoom" className="block text-sm font-medium text-gray-400 mb-1">Zoom ({bottomZoom}%)</label>
                                        <input id="bottomZoom" type="range" min="100" max="200" value={bottomZoom} onChange={e => setBottomZoom(Number(e.target.value))} className="w-full"/>
                                    </div>
                                    <label className="mt-3 flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={muteBottomAudio} onChange={e => setMuteBottomAudio(e.target.checked)} className="w-4 h-4" />
                                        <span>Mute bottom video audio</span>
                                    </label>
                                </div>
                            )}
                             <div className="bg-gray-800 p-3 rounded-md">
                                <h4 className="font-semibold mb-2">Logo Overlay</h4>
                                 <FileUploader onFileSelect={setLogo} acceptedTypes="image/png,image/jpeg" id="logo-upload">
                                     <ImageIcon className="w-8 h-8 text-gray-400 mb-1"/><p className="font-semibold text-sm">Upload Logo</p>
                                 </FileUploader>
                                 {logoUrl && <>
                                     <div className="mt-3">
                                         <label htmlFor="logoSize" className="block text-sm font-medium text-gray-400 mb-1">Size ({logoSize}px)</label>
                                         <input id="logoSize" type="range" min="50" max="200" value={logoSize} onChange={e => setLogoSize(Number(e.target.value))} className="w-full"/>
                                     </div>
                                      <div className="mt-3">
                                         <label htmlFor="logoPos" className="block text-sm font-medium text-gray-400 mb-1">Position</label>
                                         <select id="logoPos" value={logoPosition} onChange={e => setLogoPosition(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2">
                                            <option value="top-left">Top Left</option><option value="top-right">Top Right</option><option value="bottom-left">Bottom Left</option><option value="bottom-right">Bottom Right</option>
                                         </select>
                                     </div>
                                 </>}
                            </div>
                        </div>
                        <div className="border-t border-gray-700"></div>
                        <div className="mt-2">
                             <button onClick={exportVideo} disabled={!mainVideoUrl || isExporting} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Download size={20}/> Export to MP4
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
