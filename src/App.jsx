import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const songs = [
    { id: 1, title: 'Psychofuturist - Neretva Han', file: 'Psychofuturist - Neretva Han.wav', duration: '3:05', art: 'neretva han.gif' },
    { id: 2, title: 'Psychofuturist - Salt Kiss', file: 'Psychofuturist - Salt Kiss.wav', duration: '3:24', art: 'salt kiss.gif' },
    { id: 3, title: 'Psychofuturist - Sonder Scavenger', file: 'Psychofuturist - Sonder Scavenger.mp3', duration: '4:11', art: 'sonder scavenger.gif' }
];

const noises = ['noise1.png', 'noise2.png', 'noise3.png', 'noise4.png', 'noise5.png'];

function Soundwave({ analyser }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Resize to container size to maintain pixel resolution natively
        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        let animationFrameId;
        const dataArray = new Uint8Array(2048);

        const render = () => {
            animationFrameId = requestAnimationFrame(render);
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clear the canvas
            if (analyser) {
                analyser.getByteTimeDomainData(dataArray);
                let lastY = Math.round(canvas.height / 2);
                for (let x = 0; x < canvas.width; x++) {
                    const dataIndex = Math.floor((x / canvas.width) * dataArray.length);
                    const v = dataArray[dataIndex] / 128.0;
                    const y = Math.round((v * canvas.height) / 2);

                    const minY = Math.min(y, lastY);
                    const maxY = Math.max(y, lastY);
                    ctx.fillStyle = 'black';
                    ctx.fillRect(x, minY, 1, Math.max(1, maxY - minY + 1));
                    lastY = y;
                }
            } else {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, Math.round(canvas.height / 2), canvas.width, 1);
            }
        };
        render();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [analyser]);

    return (
        <div className="soundwave-container box-border">
            <canvas ref={canvasRef} className="soundwave-canvas top-layer"></canvas>
        </div>
    );
}

function Marquee({ direction, className }) {
    const [bgImage, setBgImage] = useState('');

    useEffect(() => {
        const randomNoise = noises[Math.floor(Math.random() * noises.length)];
        setBgImage(`url('/assets/img/noises/${randomNoise}')`);
    }, []);

    return (
        <div className={`marquee-container box-border ${className}`}>
            <div
                className={`marquee-content ${direction} top-layer`}
                style={{ backgroundImage: bgImage }}
            ></div>
        </div>
    );
}

function App() {
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [audioData, setAudioData] = useState(null);

    const audioRef = useRef(null);
    const currentSong = songs[currentSongIndex];

    const setupAudioContext = () => {
        if (audioData || !audioRef.current) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            const gainNode = ctx.createGain();
            const source = ctx.createMediaElementSource(audioRef.current);

            source.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(ctx.destination);

            setAudioData({ ctx, analyser, gainNode });
        } catch (err) {
            console.error("Audio wiring failed (strict mode?)", err);
        }
    };

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                if (audioData?.ctx.state === 'suspended') {
                    audioData.ctx.resume();
                }
                audioRef.current.play().catch(e => console.error(e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, currentSongIndex, audioData]);

    useEffect(() => {
        if (audioData?.gainNode) {
            audioData.gainNode.gain.value = isMuted ? 0 : 1;
        } else if (audioRef.current) {
            audioRef.current.muted = isMuted;
        }
    }, [isMuted, audioData]);

    const togglePlay = () => { setupAudioContext(); setIsPlaying(!isPlaying); };
    const toggleMute = () => setIsMuted(!isMuted);
    const playNext = () => { setupAudioContext(); setCurrentSongIndex((prev) => (prev + 1) % songs.length); setIsPlaying(true); };
    const playPrev = () => { setupAudioContext(); setCurrentSongIndex((prev) => (prev === 0 ? songs.length - 1 : prev - 1)); setIsPlaying(true); };
    const selectSong = (index) => { setupAudioContext(); setCurrentSongIndex(index); setIsPlaying(true); };

    return (
        <div className="app-container">
            <div className="main-content box-border">

                {/* Header Section */}
                <header className="header-section">
                    <div className="title-area top-layer">
                        <h1>THE LAST JUKEBOX</h1>
                        <p className="subtitle">pay a coin, play a song</p>
                    </div>
                    <div className="header-actions">
                        <span className="about-link top-layer">About</span>
                        <button className="connect-wallet box-border top-layer">
                            Connect wallet
                        </button>
                        <div className="cyan-box-64 box-border cyan-bg">
                            <img src="/assets/img/misc/coin1.png" alt="coin" className="top-layer" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>
                </header>

                {/* Marquee Horizontal */}
                <Marquee direction="horizontal" className="marquee-h" />

                {/* Main Body Layout */}
                <div className="body-layout">
                    <audio ref={audioRef} src={`/assets/songs/${currentSong.file}`} onEnded={playNext} />
                    {/* Background GIF Element */}
                    <div className="graphic-center-bg"></div>

                    {/* Player Section */}
                    <div className="player-section cyan-bg box-border">
                        <div className="player-controls">
                            <button className="control-btn box-border top-layer" onClick={playPrev}>
                                <img src="/assets/img/buttons/previous.png" alt="Prev" />
                            </button>
                            <button className="control-btn box-border top-layer" onClick={togglePlay}>
                                <img src="/assets/img/buttons/play.png" alt="Play/Pause" />
                            </button>
                            <button className="control-btn box-border top-layer" onClick={playNext}>
                                <img src="/assets/img/buttons/next.png" alt="Next" />
                            </button>
                            <button className="control-btn box-border top-layer" onClick={toggleMute}>
                                <img src={`/assets/img/buttons/${isMuted ? 'soundOff.png' : 'soundOn.png'}`} alt="Mute/Unmute" />
                            </button>
                            <Soundwave analyser={audioData?.analyser} />
                        </div>

                        <div className="player-display">
                            <div className="playlist box-border">
                                {songs.map((song, index) => (
                                    <div
                                        key={song.id}
                                        className={`playlist-item ${index === currentSongIndex ? 'active' : ''}`}
                                        onClick={() => selectSong(index)}
                                    >
                                        <span className="top-layer">{index + 1}. {song.title}</span>
                                        <span className="top-layer">{song.duration}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="album-art box-border">
                                {currentSong.art ? (
                                    <img src={`/assets/img/albumArt/${currentSong.art}`} alt="Album Art" className="top-layer" />
                                ) : (
                                    <div className="no-art top-layer">Album art for song playing</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Marquee direction="vertical" className="marquee-v" />

                    {/* Buy Section */}
                    <div className="buy-section cyan-bg box-border">
                        <div className="buy-box box-border">
                            <span className="buy-title top-layer">BUY 1 SONG</span>
                            <span className="buy-price top-layer">9xtz</span>
                        </div>
                        <div className="buy-box box-border">
                            <span className="buy-title top-layer">BUY 2 SONG</span>
                            <span className="buy-price top-layer">15xtz</span>
                        </div>
                        <div className="buy-box box-border">
                            <span className="buy-title top-layer">BUY 3 SONG</span>
                            <span className="buy-price top-layer">21xtz</span>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="footer-section cyan-bg box-border">
                    <h2 className="top-layer">Songs that you can get in the jukebox</h2>
                    <div className="footer-boxes">
                        {songs.map((song) => (
                            <div key={`foot-${song.id}`} className="footer-preview box-border">
                                <img src={`/assets/img/albumArt/${song.art}`} alt="Album Art" className="top-layer" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
