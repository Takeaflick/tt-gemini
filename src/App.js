import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, Film, Image as ImageIcon, Download, Trash2, Move, ChevronsLeft, ChevronsRight, CornerUpLeft, CornerUpRight, CornerDownLeft, CornerDownRight, Rows, Columns, AlignCenter } from 'lucide-react';

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

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };
    const handleClick = () => {
        fileInputRef.current.click();
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-gray-800' : 'border-gray-600 hover:border-blue-500'}`}
        >
            <input
                type="file"
                ref={fileInputRef}
                id={id}
                onChange={handleFileChange}
                accept={acceptedTypes}
                className="hidden"
            />
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
    const [exportProgress, setExportProgress] = useState(0);

    // Refs
    const mainVideoRef = useRef(null);
    const bottomVideoRef = useRef(null);
    const captionPreviewRef = useRef(null);
    const videoContainerRef = useRef(null);

    // Effect for creating Object URLs
    useEffect(() => {
        if (mainVideo) {
            const url = URL.createObjectURL(mainVideo);
            setMainVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [mainVideo]);

    useEffect(() => {
        if (bottomMedia) {
            setBottomMediaType(bottomMedia.type.startsWith('image/') ? 'image' : 'video');
            const url = URL.createObjectURL(bottomMedia);
            setBottomMediaUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [bottomMedia]);

    useEffect(() => {
        if (logo) {
            const reader = new FileReader();
            reader.onload = (e) => setLogoUrl(e.target.result);
            reader.readAsDataURL(logo);
        }
    }, [logo]);

    // Video Sync & Metadata
    const handleVideoMetadata = () => {
        if (mainVideoRef.current) {
            setVideoDuration(mainVideoRef.current.duration);
        }
    };
    
    const setupSplitScreenSync = useCallback(() => {
        if (currentTemplate === 'split' && mainVideoRef.current && bottomVideoRef.current) {
            const main = mainVideoRef.current;
            const bottom = bottomVideoRef.current;

            const syncPlay = () => !bottom.paused && main.play();
            const syncPause = () => !main.paused && bottom.pause();
            const syncSeek = () => { if (Math.abs(main.currentTime - bottom.currentTime) > 0.1) { bottom.currentTime = main.currentTime; }};
            
            main.addEventListener('play', syncPlay);
            main.addEventListener('pause', syncPause);
            main.addEventListener('seeked', syncSeek);

            return () => {
                main.removeEventListener('play', syncPlay);
                main.removeEventListener('pause', syncPause);
                main.removeEventListener('seeked', syncSeek);
            };
        }
    }, [currentTemplate]);

    useEffect(setupSplitScreenSync, [setupSplitScreenSync]);

    const handleTimeUpdate = () => {
        if (mainVideoRef.current) {
            setCurrentTime(mainVideoRef.current.currentTime);
        }
    };

    // Caption Management
    const addCaption = () => {
        const newCaption = { ...currentCaption, id: Date.now() };
        // Basic validation
        if (!newCaption.text.trim()) {
            alert("Caption text cannot be empty.");
            return;
        }
        if (newCaption.end <= newCaption.start) {
            alert("End time must be after start time.");
            return;
        }

        setCaptions([...captions, newCaption].sort((a, b) => a.start - b.start));

        // Auto-advance time for next caption
        const nextStartTime = newCaption.end;
        const nextEndTime = Math.min(nextStartTime + 3, videoDuration);
        setCurrentCaption(prev => ({
            ...prev,
            text: '',
            start: nextStartTime,
            end: nextEndTime,
        }));
    };

    const removeCaption = (id) => {
        setCaptions(captions.filter(c => c.id !== id));
    };
    
    // Drag & Drop Positioning
    const startDragging = useCallback((e) => {
        if (!isPreviewMode || !captionPreviewRef.current || !videoContainerRef.current) return;
        
        // Use clientX/Y for both mouse and touch events
        const eventX = e.clientX || e.touches[0].clientX;
        const eventY = e.clientY || e.touches[0].clientY;

        const captionRect = captionPreviewRef.current.getBoundingClientRect();
        
        setDragOffset({
            x: eventX - captionRect.left,
            y: eventY - captionRect.top,
        });
        setIsDragging(true);
        // Add listeners to window to capture mouse leaving the element
        window.addEventListener('mousemove', drag);
        window.addEventListener('mouseup', stopDragging);
        window.addEventListener('touchmove', drag, { passive: false });
        window.addEventListener('touchend', stopDragging);
    }, [isPreviewMode]);

    const drag = useCallback((e) => {
        if (!isDragging || !videoContainerRef.current) return;
        e.preventDefault(); // Prevent scrolling on touch devices

        const eventX = e.clientX || e.touches[0].clientX;
        const eventY = e.clientY || e.touches[0].clientY;

        const containerRect = videoContainerRef.current.getBoundingClientRect();

        const x = eventX - containerRect.left - dragOffset.x;
        const y = eventY - containerRect.top - dragOffset.y;

        const newXPercent = Math.max(0, Math.min(100, (x / containerRect.width) * 100));
        const newYPercent = Math.max(0, Math.min(100, (y / containerRect.height) * 100));

        setCurrentCaption(prev => ({ ...prev, x: newXPercent, y: newYPercent }));
    }, [isDragging, dragOffset]);

    const stopDragging = useCallback(() => {
        setIsDragging(false);
        window.removeEventListener('mousemove', drag);
        window.removeEventListener('mouseup', stopDragging);
        window.removeEventListener('touchmove', drag);
        window.removeEventListener('touchend', stopDragging);
    }, [drag]);

    // Export Functionality
    const exportVideo = async () => {
        if (!mainVideo) {
            alert("Please upload a video first.");
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Determine export dimensions
        const outputWidth = currentTemplate === 'split' ? 400 : mainVideoRef.current.videoWidth;
        const outputHeight = currentTemplate === 'split' ? 600 : mainVideoRef.current.videoHeight;
        
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        // Prepare audio stream
        let audioTrack = null;
        if (mainVideoRef.current.captureStream) { // Some browsers might not support this
             const audioStream = mainVideoRef.current.captureStream();
             const tracks = audioStream.getAudioTracks();
             if(tracks.length > 0) audioTrack = tracks[0];
        } else {
             // Fallback for older browsers: use AudioContext
             try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaElementSource(mainVideoRef.current);
                const dest = audioContext.createMediaStreamDestination();
                source.connect(dest);
                audioTrack = dest.stream.getAudioTracks()[0];
             } catch(e) {
                console.error("Audio could not be captured:", e);
                alert("Warning: Audio could not be captured for the export. Your browser might not support the required APIs.");
             }
        }

        // Prepare video stream from canvas
        const videoStream = canvas.captureStream(30); // 30 FPS
        const [videoTrack] = videoStream.getVideoTracks();

        // Combine streams
        const combinedStream = new MediaStream();
        combinedStream.addTrack(videoTrack);
        if (audioTrack) {
            combinedStream.addTrack(audioTrack);
        }
        
        const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9', bitsPerSecond: 8000000 });
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `captioned-video-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            setIsExporting(false);
        };

        recorder.start();
        
        const logoImg = logoUrl ? await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = logoUrl;
        }) : null;

        const bottomMediaImg = (currentTemplate === 'split' && bottomMediaType === 'image' && bottomMediaUrl) ? await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = bottomMediaUrl;
        }) : null;
        
        // Frame-by-frame rendering
        const tempVideoEl = mainVideoRef.current;
        tempVideoEl.pause();
        tempVideoEl.currentTime = 0;

        const duration = tempVideoEl.duration;
        const frameRate = 30;
        let currentTime = 0;

        const renderFrame = async () => {
            if (currentTime >= duration) {
                recorder.stop();
                return;
            }

            tempVideoEl.currentTime = currentTime;
            await new Promise(resolve => tempVideoEl.addEventListener('seeked', resolve, { once: true }));

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);


            // Draw videos/images
            if (currentTemplate === 'standard') {
                ctx.drawImage(tempVideoEl, 0, 0, canvas.width, canvas.height);
            } else { // Split screen
                // Top video
                ctx.drawImage(tempVideoEl, 0, 0, canvas.width, canvas.height / 2);
                
                // Bottom media
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

                if (bottomMediaType === 'video' && bottomVideoRef.current) {
                    bottomVideoRef.current.currentTime = tempVideoEl.currentTime;
                    await new Promise(resolve => bottomVideoRef.current.addEventListener('seeked', resolve, { once: true }));
                    const video = bottomVideoRef.current;
                    // Implement zoom
                    const scale = bottomZoom / 100;
                    const sw = video.videoWidth / scale;
                    const sh = video.videoHeight / scale;
                    const sx = (video.videoWidth - sw) / 2;
                    const sy = (video.videoHeight - sh) / 2;
                    ctx.drawImage(video, sx, sy, sw, sh, 0, canvas.height/2, canvas.width, canvas.height/2);

                } else if (bottomMediaType === 'image' && bottomMediaImg) {
                    const img = bottomMediaImg;
                    const scale = bottomZoom / 100;
                    const sw = img.width / scale;
                    const sh = img.height / scale;
                    const sx = (img.width - sw) / 2;
                    const sy = (img.height - sh) / 2;
                    ctx.drawImage(img, sx, sy, sw, sh, 0, canvas.height/2, canvas.width, canvas.height/2);
                } else {
                     ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                     ctx.font = '16px "SF Pro Display"';
                     ctx.textAlign = 'center';
                     ctx.textBaseline = 'middle';
                     ctx.fillText('No bottom media selected', canvas.width / 2, canvas.height * 0.75);
                }
            }
            
            // Draw captions
            const CAPTION_SCALE_MULTIPLIER = 1.8;
            const activeCaptions = captions.filter(c => currentTime >= c.start && currentTime <= c.end);
            activeCaptions.forEach(caption => {
                const fontSize = caption.fontSize * CAPTION_SCALE_MULTIPLIER;
                ctx.font = `bold ${fontSize}px "${caption.fontFamily}", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const lines = caption.text.split('\n');
                const lineHeight = fontSize * 1.2;
                const totalHeight = lines.length * lineHeight;
                
                const captionBoxWidth = (caption.width / 100) * canvas.width;
                const captionBoxX = ((caption.x / 100) * canvas.width) - (captionBoxWidth / 2);

                const wrapText = (text, maxWidth) => {
                    const words = text.split(' ');
                    let newLines = [];
                    let currentLine = words[0];
                    for(let i=1; i < words.length; i++){
                        const testLine = currentLine + " " + words[i];
                        if(ctx.measureText(testLine).width > maxWidth && i > 0){
                            newLines.push(currentLine);
                            currentLine = words[i];
                        } else {
                            currentLine = testLine;
                        }
                    }
                    newLines.push(currentLine);
                    return newLines;
                }
                
                const wrappedLines = lines.flatMap(line => wrapText(line, captionBoxWidth - 20)); // 20px padding
                const wrappedTotalHeight = wrappedLines.length * lineHeight;
                const captionBoxY = ((caption.y / 100) * canvas.height) - (wrappedTotalHeight / 2);

                // Draw background
                ctx.fillStyle = caption.bgColor;
                ctx.beginPath();
                ctx.roundRect(captionBoxX, captionBoxY - (lineHeight/2) + 5, captionBoxWidth, wrappedTotalHeight, 8 * CAPTION_SCALE_MULTIPLIER);
                ctx.fill();

                // Draw text
                ctx.fillStyle = caption.textColor;
                wrappedLines.forEach((line, index) => {
                     ctx.fillText(line, captionBoxX + captionBoxWidth / 2, captionBoxY + (index * lineHeight));
                });
            });

            // Draw Logo
            if (logoImg) {
                const logoW = logoSize * CAPTION_SCALE_MULTIPLIER;
                const logoH = (logoImg.height / logoImg.width) * logoW;
                const margin = 10 * CAPTION_SCALE_MULTIPLIER;
                let logoX, logoY;
                
                if (logoPosition.includes('left')) logoX = margin;
                else logoX = canvas.width - logoW - margin;

                if (logoPosition.includes('top')) logoY = margin;
                else logoY = canvas.height - logoH - margin;

                ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
            }

            setExportProgress((currentTime / duration) * 100);
            currentTime += 1 / frameRate;
            requestAnimationFrame(renderFrame);
        };
        
        renderFrame();
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
        const { value } = e.target;
        const newTime = parseTimeToSeconds(value);
        if(type === 'start' && newTime >= currentCaption.end) return;
        if(type === 'end' && newTime <= currentCaption.start) return;
        setCurrentCaption(prev => ({...prev, [type]: newTime}));
    }

    // Dynamic styles for preview
    const captionPreviewStyle = {
        left: `${currentCaption.x}%`,
        top: `${currentCaption.y}%`,
        transform: 'translate(-50%, -50%)',
        width: `${currentCaption.width}%`,
        fontSize: `${currentCaption.fontSize}px`,
        fontFamily: `"${currentCaption.fontFamily}", sans-serif`,
        backgroundColor: currentCaption.bgColor,
        color: currentCaption.textColor,
        cursor: isPreviewMode ? 'move' : 'default',
    };

    const logoStyle = {
        width: `${logoSize}px`,
        position: 'absolute',
        ...(logoPosition === 'top-left' && { top: '10px', left: '10px' }),
        ...(logoPosition === 'top-right' && { top: '10px', right: '10px' }),
        ...(logoPosition === 'bottom-left' && { bottom: '10px', left: '10px' }),
        ...(logoPosition === 'bottom-right' && { bottom: '10px', right: '10px' }),
    };
    
    // RENDER
    return (
        <div className="bg-[#0f0f0f] text-white min-h-screen font-sans">
            {isExporting && (
                 <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
                     <h2 className="text-3xl font-bold mb-4">Exporting Video...</h2>
                     <p className="mb-2">This may take a while. Please don't close this tab.</p>
                     <div className="w-1/2 bg-gray-700 rounded-full h-4">
                         <div className="bg-gradient-to-r from-[#0095f6] to-[#00d4ff] h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div>
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
                    {/* Left/Main Column - Video Player & Timeline */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div ref={videoContainerRef} className={`relative w-full mx-auto bg-black rounded-lg overflow-hidden ${currentTemplate === 'split' ? 'aspect-[9/16]' : ''}`} style={{ maxWidth: currentTemplate === 'standard' ? '800px' : '337.5px' }}>
                            {mainVideoUrl ? (
                                <div className="w-full h-full flex flex-col">
                                    <video
                                        ref={mainVideoRef}
                                        src={mainVideoUrl}
                                        controls
                                        className="w-full"
                                        style={{height: currentTemplate === 'split' ? '50%' : '100%'}}
                                        onLoadedMetadata={handleVideoMetadata}
                                        onTimeUpdate={handleTimeUpdate}
                                    />
                                    {currentTemplate === 'split' && (
                                        <div className="relative w-full h-1/2 bg-gray-900 flex items-center justify-center">
                                            {bottomMediaUrl ? (
                                                <>
                                                    {bottomMediaType === 'video' ? (
                                                        <video ref={bottomVideoRef} src={bottomMediaUrl} muted={muteBottomAudio} loop playsInline className="w-full h-full object-cover" style={{transform: `scale(${bottomZoom / 100})`}}/>
                                                    ) : (
                                                        <img src={bottomMediaUrl} alt="Bottom media" className="w-full h-full object-cover" style={{transform: `scale(${bottomZoom / 100})`}}/>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-gray-400">
                                                    <p>Select bottom media</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                 <FileUploader onFileSelect={setMainVideo} acceptedTypes="video/*" id="main-video-upload">
                                    <Film className="w-12 h-12 text-gray-400 mb-2"/>
                                    <p className="font-semibold">Click or Drag & Drop Main Video</p>
                                    <p className="text-sm text-gray-500">MP4, WebM, MOV</p>
                                </FileUploader>
                            )}
                            
                            {/* Caption Preview Overlay */}
                            {isPreviewMode && mainVideoUrl && (
                                <div
                                    ref={captionPreviewRef}
                                    onMouseDown={startDragging}
                                    onTouchStart={startDragging}
                                    style={captionPreviewStyle}
                                    className="absolute p-2 rounded-md shadow-lg break-words text-center leading-tight flex items-center justify-center"
                                >
                                    <p style={{whiteSpace: 'pre-wrap'}}>{currentCaption.text || "Your text here"}</p>
                                </div>
                            )}

                             {/* Logo Preview Overlay */}
                             {logoUrl && mainVideoUrl && (
                                <img src={logoUrl} alt="Logo preview" style={logoStyle} className="opacity-80"/>
                             )}
                        </div>
                        
                        {/* Timeline */}
                         <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-xl font-bold mb-3 border-b border-gray-700 pb-2">Timeline</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {captions.length === 0 && <p className="text-gray-500">No captions added yet.</p>}
                                {captions.map((cap, index) => (
                                    <div key={cap.id} className={`flex justify-between items-center p-2 rounded-md ${currentTime >= cap.start && currentTime <= cap.end ? 'bg-blue-900/50' : 'bg-gray-800'}`}>
                                        <p className="truncate">
                                            <span className="font-mono text-blue-400">[{formatTime(cap.start)} - {formatTime(cap.end)}]</span>
                                            <span className="ml-3">{cap.text}</span>
                                        </p>
                                        <button onClick={() => removeCaption(cap.id)} className="ml-4 p-1 rounded-full text-gray-400 hover:bg-red-500 hover:text-white transition-colors">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Controls Panel */}
                    <div className="bg-gray-900 p-4 lg:p-6 rounded-lg flex flex-col gap-6 h-fit">
                        {/* Caption Text & Timing */}
                        <div>
                            <h3 className="text-xl font-bold mb-3">1. Add Caption Text</h3>
                            <div className="flex gap-2">
                                <textarea
                                    value={currentCaption.text}
                                    onChange={(e) => setCurrentCaption({ ...currentCaption, text: e.target.value })}
                                    placeholder="Enter caption text..."
                                    rows={3}
                                    className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
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

                        {/* Styling & Positioning */}
                        <div>
                           <h3 className="text-xl font-bold mb-3">2. Style & Position</h3>
                           {/* Font Family & Size */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-400 mb-1">Font</label>
                                    <select id="fontFamily" value={currentCaption.fontFamily} onChange={e => setCurrentCaption({...currentCaption, fontFamily: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2">
                                        <option>SF Pro Display Bold</option>
                                        <option>Helvetica Neue Bold</option>
                                        <option>Montserrat</option>
                                        <option>Proxima Nova Semi Bold</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="fontSize" className="block text-sm font-medium text-gray-400 mb-1">Size ({currentCaption.fontSize}px)</label>
                                    <input id="fontSize" type="range" min="16" max="48" value={currentCaption.fontSize} onChange={e => setCurrentCaption({...currentCaption, fontSize: Number(e.target.value)})} className="w-full"/>
                                </div>
                           </div>
                           {/* Colors */}
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
                           {/* Width */}
                           <div className="mt-4">
                                <label htmlFor="captionWidth" className="block text-sm font-medium text-gray-400 mb-1">Width ({currentCaption.width}%)</label>
                                <input id="captionWidth" type="range" min="20" max="100" value={currentCaption.width} onChange={e => setCurrentCaption({...currentCaption, width: Number(e.target.value)})} className="w-full"/>
                           </div>
                           {/* Positioning Grid */}
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
                                    <span>Enable Draggable Preview</span>
                                    <Move size={16} className="text-gray-400"/>
                                </label>
                           </div>
                        </div>

                        <div className="border-t border-gray-700"></div>

                        {/* Optional Settings */}
                        <div>
                            <h3 className="text-xl font-bold mb-3">3. Optional Settings</h3>
                            {currentTemplate === 'split' && (
                                <div className="bg-gray-800 p-3 rounded-md mb-4">
                                    <h4 className="font-semibold mb-2">Split Screen Options</h4>
                                    <FileUploader onFileSelect={setBottomMedia} acceptedTypes="video/*,image/*" id="bottom-media-upload">
                                        <ImageIcon className="w-8 h-8 text-gray-400 mb-1"/>
                                        <p className="font-semibold text-sm">Upload Bottom Media</p>
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
                                     <ImageIcon className="w-8 h-8 text-gray-400 mb-1"/>
                                     <p className="font-semibold text-sm">Upload Logo</p>
                                </FileUploader>
                                 {logoUrl && <>
                                     <div className="mt-3">
                                         <label htmlFor="logoSize" className="block text-sm font-medium text-gray-400 mb-1">Size ({logoSize}px)</label>
                                         <input id="logoSize" type="range" min="50" max="200" value={logoSize} onChange={e => setLogoSize(Number(e.target.value))} className="w-full"/>
                                     </div>
                                      <div className="mt-3">
                                         <label htmlFor="logoPos" className="block text-sm font-medium text-gray-400 mb-1">Position</label>
                                         <select id="logoPos" value={logoPosition} onChange={e => setLogoPosition(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2">
                                            <option value="top-left">Top Left</option>
                                            <option value="top-right">Top Right</option>
                                            <option value="bottom-left">Bottom Left</option>
                                            <option value="bottom-right">Bottom Right</option>
                                         </select>
                                     </div>
                                 </>}
                            </div>
                        </div>

                        <div className="border-t border-gray-700"></div>

                        {/* Export */}
                        <div className="mt-2">
                             <button onClick={exportVideo} disabled={!mainVideoUrl || isExporting} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Download size={20}/> Export Video
                            </button>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
