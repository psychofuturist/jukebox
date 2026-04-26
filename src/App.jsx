import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { useWallet } from './store/wallet';
import { GACHA_ADDRESS, submitBuyOne, submitBuyThree, submitBuyFive } from './lib/contract';
import { getBigmapKey } from './lib/tzkt';
import { revealFromOpHash } from './lib/reveal';
import Reveal from './components/Reveal';
import Admin from './pages/Admin';
import Send from './pages/Send';
import Collect from './pages/Collect';
import Library from './pages/Library';

const POOL_ID = 0;
const BUY_FNS = { 1: submitBuyOne, 3: submitBuyThree, 5: submitBuyFive };

const songs = [
  { id: 1, title: 'Psychofuturist - Neretva Han', file: 'Psychofuturist - Neretva Han.wav', duration: '3:05', art: 'neretva han.gif' },
  { id: 2, title: 'Psychofuturist - Salt Kiss', file: 'Psychofuturist - Salt Kiss.wav', duration: '3:24', art: 'salt kiss.gif' },
  { id: 3, title: 'Psychofuturist - Sonder Scavenger', file: 'Psychofuturist - Sonder Scavenger.mp3', duration: '4:11', art: 'sonder scavenger.gif' }
];

const noises = ['noise1.png', 'noise2.png', 'noise3.png', 'noise4.png', 'noise5.png'];

const FONT = {
    ' ': [0x00,0x00,0x00,0x00,0x00],
    '!': [0x00,0x5F,0x00,0x00,0x00],
    '"': [0x07,0x00,0x07,0x00,0x00],
    '#': [0x14,0x7F,0x14,0x7F,0x14],
    '$': [0x24,0x2A,0x7F,0x2A,0x12],
    '%': [0x23,0x13,0x08,0x64,0x62],
    '&': [0x36,0x49,0x55,0x22,0x50],
    "'": [0x00,0x05,0x03,0x00,0x00],
    '(': [0x00,0x1C,0x22,0x41,0x00],
    ')': [0x00,0x41,0x22,0x1C,0x00],
    '*': [0x14,0x08,0x3E,0x08,0x14],
    '+': [0x08,0x08,0x3E,0x08,0x08],
    ',': [0x00,0x50,0x30,0x00,0x00],
    '-': [0x08,0x08,0x08,0x08,0x08],
    '.': [0x00,0x60,0x60,0x00,0x00],
    '/': [0x20,0x10,0x08,0x04,0x02],
    '0': [0x3E,0x51,0x49,0x45,0x3E],
    '1': [0x00,0x42,0x7F,0x40,0x00],
    '2': [0x42,0x61,0x51,0x49,0x46],
    '3': [0x21,0x41,0x45,0x4B,0x31],
    '4': [0x18,0x14,0x12,0x7F,0x10],
    '5': [0x27,0x45,0x45,0x45,0x39],
    '6': [0x3C,0x4A,0x49,0x49,0x30],
    '7': [0x01,0x71,0x09,0x05,0x03],
    '8': [0x36,0x49,0x49,0x49,0x36],
    '9': [0x06,0x49,0x49,0x29,0x1E],
    ':': [0x00,0x36,0x36,0x00,0x00],
    ';': [0x00,0x56,0x36,0x00,0x00],
    '<': [0x08,0x14,0x22,0x41,0x00],
    '=': [0x14,0x14,0x14,0x14,0x14],
    '>': [0x00,0x41,0x22,0x14,0x08],
    '?': [0x02,0x01,0x51,0x09,0x06],
    '@': [0x32,0x49,0x79,0x41,0x3E],
    'A': [0x7E,0x11,0x11,0x11,0x7E],
    'B': [0x7F,0x49,0x49,0x49,0x36],
    'C': [0x3E,0x41,0x41,0x41,0x22],
    'D': [0x7F,0x41,0x41,0x22,0x1C],
    'E': [0x7F,0x49,0x49,0x49,0x41],
    'F': [0x7F,0x09,0x09,0x09,0x01],
    'G': [0x3E,0x41,0x49,0x49,0x7A],
    'H': [0x7F,0x08,0x08,0x08,0x7F],
    'I': [0x00,0x41,0x7F,0x41,0x00],
    'J': [0x20,0x40,0x41,0x3F,0x01],
    'K': [0x7F,0x08,0x14,0x22,0x41],
    'L': [0x7F,0x40,0x40,0x40,0x40],
    'M': [0x7F,0x02,0x04,0x02,0x7F],
    'N': [0x7F,0x04,0x08,0x10,0x7F],
    'O': [0x3E,0x41,0x41,0x41,0x3E],
    'P': [0x7F,0x09,0x09,0x09,0x06],
    'Q': [0x3E,0x41,0x51,0x21,0x5E],
    'R': [0x7F,0x09,0x19,0x29,0x46],
    'S': [0x46,0x49,0x49,0x49,0x31],
    'T': [0x01,0x01,0x7F,0x01,0x01],
    'U': [0x3F,0x40,0x40,0x40,0x3F],
    'V': [0x1F,0x20,0x40,0x20,0x1F],
    'W': [0x3F,0x40,0x38,0x40,0x3F],
    'X': [0x63,0x14,0x08,0x14,0x63],
    'Y': [0x07,0x08,0x70,0x08,0x07],
    'Z': [0x61,0x51,0x49,0x45,0x43],
    '[': [0x00,0x7F,0x41,0x41,0x00],
    '\\': [0x02,0x04,0x08,0x10,0x20],
    ']': [0x00,0x41,0x41,0x7F,0x00],
    '^': [0x04,0x02,0x01,0x02,0x04],
    '_': [0x40,0x40,0x40,0x40,0x40],
    '`': [0x00,0x01,0x02,0x04,0x00],
    'a': [0x20,0x54,0x54,0x54,0x78],
    'b': [0x7F,0x48,0x44,0x44,0x38],
    'c': [0x38,0x44,0x44,0x44,0x20],
    'd': [0x38,0x44,0x44,0x48,0x7F],
    'e': [0x38,0x54,0x54,0x54,0x18],
    'f': [0x08,0x7E,0x09,0x01,0x02],
    'g': [0x0C,0x52,0x52,0x52,0x3E],
    'h': [0x7F,0x08,0x04,0x04,0x78],
    'i': [0x00,0x44,0x7D,0x40,0x00],
    'j': [0x20,0x40,0x44,0x3D,0x00],
    'k': [0x7F,0x10,0x28,0x44,0x00],
    'l': [0x00,0x41,0x7F,0x40,0x00],
    'm': [0x7C,0x04,0x18,0x04,0x78],
    'n': [0x7C,0x08,0x04,0x04,0x78],
    'o': [0x38,0x44,0x44,0x44,0x38],
    'p': [0x7C,0x14,0x14,0x14,0x08],
    'q': [0x08,0x14,0x14,0x18,0x7C],
    'r': [0x7C,0x08,0x04,0x04,0x08],
    's': [0x48,0x54,0x54,0x54,0x20],
    't': [0x04,0x3F,0x44,0x40,0x20],
    'u': [0x3C,0x40,0x40,0x20,0x7C],
    'v': [0x1C,0x20,0x40,0x20,0x1C],
    'w': [0x3C,0x40,0x30,0x40,0x3C],
    'x': [0x44,0x28,0x10,0x28,0x44],
    'y': [0x0C,0x50,0x50,0x50,0x3C],
    'z': [0x44,0x64,0x54,0x4C,0x44],
    '{': [0x00,0x08,0x36,0x41,0x00],
    '|': [0x00,0x00,0x7F,0x00,0x00],
    '}': [0x00,0x41,0x36,0x08,0x00],
    '~': [0x10,0x08,0x08,0x10,0x08],
};

function PixelText({ text, scale = 2, color = 'black', className = '' }) {
    if (typeof text !== 'string') text = String(text);
    const charWidth = 5;
    const charHeight = 7;
    const spacing = 1;
    
    if (!text || text.length === 0) return null;
    
    // Calculate total width of all characters
    const totalWidth = text.length * charWidth + (text.length - 1) * spacing;
    
    let rects = [];
    for (let i = 0; i < text.length; i++) {
        const charCode = text[i];
        const bytes = FONT[charCode] || FONT['?'];
        for (let col = 0; col < 5; col++) {
            const byte = bytes[col];
            for (let row = 0; row < 7; row++) {
                if (byte & (1 << row)) {
                    rects.push(
                        <rect 
                            key={`${i}-${col}-${row}`} 
                            x={i * (charWidth + spacing) + col} 
                            y={row} 
                            width="1" 
                            height="1" 
                            fill={color} 
                        />
                    );
                }
            }
        }
    }

    return (
        <svg 
            width={totalWidth * scale} 
            height={charHeight * scale} 
            viewBox={`0 0 ${totalWidth} ${charHeight}`}
            className={className}
            style={{ display: 'inline-block', verticalAlign: 'middle', shapeRendering: 'crispEdges' }}
            xmlns="http://www.w3.org/2000/svg"
        >
            {rects}
        </svg>
    );
}

function Soundwave({ analyser }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let animationFrameId;
    const dataArray = new Uint8Array(2048);
    const STROBE_COLORS = ['#ff003c', '#ffff00', '#00ff80', '#00ffff', '#0000ff'];
    let colorIdx = 0;
    let lastTime = 0;

    const render = (time) => {
      animationFrameId = requestAnimationFrame(render);
      
      // Strobe at 25fps (approx every 40ms)
      if (time - lastTime > 40) {
          colorIdx = (colorIdx + 1) % STROBE_COLORS.length;
          lastTime = time;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      ctx.fillStyle = STROBE_COLORS[colorIdx];

      if (analyser) {
        analyser.getByteTimeDomainData(dataArray);
        let lastY = Math.round(canvas.height / 2);
        for (let x = 0; x < canvas.width; x++) {
          const dataIndex = Math.floor((x / canvas.width) * dataArray.length);
          const v = dataArray[dataIndex] / 128.0;
          const y = Math.round((v * canvas.height) / 2);
          
          const minY = Math.min(y, lastY);
          const maxY = Math.max(y, lastY);
          ctx.fillRect(x, minY, 1, Math.max(1, maxY - minY + 1));
          lastY = y;
        }
      } else {
        ctx.fillRect(0, Math.round(canvas.height / 2), canvas.width, 1);
      }
    };
    render(performance.now());

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
  const image = direction === 'vertical' ? 'marquee1_v.png' : 'marquee1.png';

  return (
    <div className={`marquee-container ${className}`}>
      <div 
        className={`marquee-content ${direction}`} 
        style={{ backgroundImage: `url('/assets/img/misc/${image}')` }} 
      ></div>
    </div>
  );
}

function SectionBackground({ image, rotation, alignPos, bgColor }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
    }
    parent.style.overflow = 'hidden';
    if (bgColor) parent.style.backgroundColor = bgColor;

    const updateDims = () => {
        setDims({ width: parent.offsetWidth, height: parent.offsetHeight });
    };
    
    const observer = new ResizeObserver(updateDims);
    observer.observe(parent);
    updateDims();
    return () => observer.disconnect();
  }, [bgColor]);

  let width = dims.width;
  let height = dims.height;
  if (rotation === 90 || rotation === -90) {
    width = dims.height;
    height = dims.width;
  }

  return (
    <div 
      className="section-bg"
      ref={containerRef} 
      style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        backgroundImage: `url(${image})`,
        backgroundRepeat: 'repeat-x',
        backgroundPosition: alignPos,
        pointerEvents: 'none',
        zIndex: 0,
        imageRendering: 'pixelated'
      }}
    />
  );
}

function JukeboxHome() {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioData, setAudioData] = useState(null);
  
  const audioRef = useRef(null);
  const currentSong = songs[currentSongIndex];

  const walletAddress = useWallet((s) => s.address);
  const walletStatus = useWallet((s) => s.status);
  const walletConnect = useWallet((s) => s.connect);
  const walletDisconnect = useWallet((s) => s.disconnect);

  useEffect(() => {
    useWallet.getState().hydrate();
  }, []);

  const walletLabel =
    walletStatus === 'connecting' ? 'Connecting...' :
    walletAddress ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)}` :
    'Connect wallet';

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
          console.error("Audio wiring failed", err);
      }
  };

  const [pool, setPool] = useState(null);
  const [poolErr, setPoolErr] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealTokens, setRevealTokens] = useState([]);

  const loadPool = () => {
    setPoolErr(null);
    return getBigmapKey(GACHA_ADDRESS, 'pools', POOL_ID)
      .then((row) => setPool(row?.value ?? null))
      .catch((err) => setPoolErr(err.message));
  };

  useEffect(() => { loadPool(); }, []);

  const priceMutez = pool ? pool.price_per_nft : null;

  const handleBuy = async (qty) => {
    if (!pool || sending) return;
    if (!walletAddress) { walletConnect(); return; }
    setSending(true);
    setTxStatus(`submitting buy_${qty === 1 ? 'one' : qty === 3 ? 'three' : 'five'}…`);
    try {
      const res = await BUY_FNS[qty](POOL_ID, priceMutez);
      const hash = res?.transactionHash || res?.hash;
      if (!hash) throw new Error('no op hash returned');
      setTxStatus(`sent: ${hash.slice(0, 12)}… — waiting for operation…`);
      const tokens = await revealFromOpHash(hash, (stage) =>
        setTxStatus(`${stage} (${hash.slice(0, 8)}…)`)
      );
      setRevealTokens(tokens);
      setRevealOpen(true);
      setTxStatus(null);
      loadPool();
    } catch (err) {
      console.error('[buy] failed', err);
      setTxStatus(`error: ${err.message || String(err)}`);
    } finally {
      setSending(false);
    }
  };

  const [playerWidth, setPlayerWidth] = useState(624);

  useEffect(() => {
    const handleResize = () => {
      // In desktop, the layout space assigned to player logically was 630. Mobile uses fluid span.
      let avail = window.innerWidth <= 900 ? window.innerWidth - 40 : 630;
      let pWidth = 390 + Math.floor((avail - 390) / 18) * 18;
      if (pWidth < 390) pWidth = 390;
      setPlayerWidth(pWidth);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <Reveal open={revealOpen} tokens={revealTokens} onClose={() => setRevealOpen(false)} />
      <div className="main-content">

        {/* Header Section */}
        <header className="header-section">
          <SectionBackground image="/assets/img/misc/lines1_strip.webp" rotation={-90} alignPos="left bottom" bgColor="#00ffff" />
          <div className="title-area top-layer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PixelText text="THE LAST JUKEBOX" scale={3} color="black" />
            <PixelText text="pay a coin, play a song" scale={1} color="black" className="subtitle top-layer" />
          </div>
          <div className="header-actions">
            <PixelText text="About" scale={2} color="black" className="about-link top-layer" />
            <button
              className="connect-wallet box-border top-layer"
              onClick={walletAddress ? walletDisconnect : walletConnect}
              disabled={walletStatus === 'connecting'}
              aria-label={walletAddress ? 'Disconnect wallet' : 'Connect wallet'}
            >
              <PixelText text={walletLabel} scale={2} color="black" />
            </button>
          </div>
        </header>

        {/* Marquee Horizontal */}
        <Marquee direction="horizontal" className="marquee-h" />

        {/* Main Body Layout */}
        <div className="body-layout">
          <audio ref={audioRef} src={`/assets/songs/${currentSong.file}`} onEnded={playNext} />
          {/* Background Video Elements shifted to webp format per user request for precise pixelated rendering */}
          <img src="/assets/img/gifs/rotorBig1asep.webp" className="rotor-bg" alt="rotor bg" />
          <img src="/assets/img/gifs/graphicCenter1asep.webp" className="graphic-center-bg" alt="graphic center bg" />

          {/* Player Section */}
          <div className="player-wrapper">
            <div className="player-section test-bg-player" style={{ width: playerWidth ? `${playerWidth}px` : undefined }}>
              <SectionBackground image="/assets/img/misc/lines1_strip.webp" rotation={90} alignPos="left top" bgColor="#00ffff" />
              
              <div className="player-box-overlay">
                  <img src="/assets/img/misc/player1_s1.png" className="player-edge left" alt="" />
                  <div className="player-edge-center"></div>
                  <img src="/assets/img/misc/player1_s1.png" className="player-edge right" alt="" />
              </div>

              <div className="player-inner-content">
                <div className="player-controls">
                  <div className="buttons-group">
                      <button className="control-btn top-layer" onClick={playPrev}>
                        <img src="/assets/img/buttons/buttonPrevious.png" alt="Prev" />
                      </button>
                      <button className="control-btn top-layer" onClick={togglePlay}>
                        <img src="/assets/img/buttons/buttonPlay.png" alt="Play/Pause" />
                      </button>
                      <button className="control-btn top-layer" onClick={playNext}>
                        <img src="/assets/img/buttons/buttonNext.png" alt="Next" />
                      </button>
                      <button className="control-btn top-layer" onClick={toggleMute}>
                        <img src={`/assets/img/buttons/${isMuted ? 'buttonSoundOff.png' : 'buttonSoundOn.png'}`} alt="Mute/Unmute" />
                      </button>
                  </div>
                  <Soundwave analyser={audioData?.analyser} />
                </div>

            <div className="player-display">
              {/* Removed box-border class from playlist per instruction */}
              <div className="playlist">
                {songs.map((song, index) => {
                  const textColor = index === currentSongIndex ? 'white' : 'black';
                  return (
                    <div 
                      key={song.id} 
                      className={`playlist-item ${index === currentSongIndex ? 'active' : ''}`}
                      onClick={() => selectSong(index)}
                    >
                      <PixelText text={`${index + 1}. ${song.title}`} scale={1} color={textColor} className="top-layer" />
                      <PixelText text={song.duration} scale={1} color={textColor} className="top-layer" />
                    </div>
                  );
                })}
              </div>
              <div className="album-art box-border">
                {currentSong.art ? (
                  <img src={`/assets/img/albumArt/${currentSong.art}`} alt="Album Art" className="top-layer" />
                ) : (
                  <PixelText text="Album art for song playing" scale={1} color="black" className="no-art top-layer" />
                )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Marquee direction="vertical" className="marquee-v" />
          <Marquee direction="horizontal" className="marquee-h marquee-h-mobile" />

          {/* Buy Section */}
          <div className="buy-section test-bg-buy">
            <SectionBackground image="/assets/img/misc/lines1_strip.webp" rotation={180} alignPos="left top" bgColor="black" />
            {[1, 3, 5].map((qty) => {
              const costXtz = priceMutez ? Number(BigInt(priceMutez) * BigInt(qty)) / 1_000_000 : null;
              const label = `BUY ${qty} ${qty === 1 ? 'SONG' : 'SONGS'}`;
              const price = costXtz != null ? `${costXtz}xtz` : '—';
              return (
                <div
                  key={qty}
                  className="buy-box test-bg-buybox"
                  onClick={() => handleBuy(qty)}
                  style={{ cursor: pool && !sending ? 'pointer' : 'not-allowed', opacity: pool && !sending ? 1 : 0.5 }}
                >
                  <img src="/assets/img/buttons/buttonBuy1_s1.png" className="buy-box-edge left" alt="" />
                  <div className="buy-box-center">
                      <PixelText text={label} scale={2} color="black" className="top-layer" />
                      <PixelText text={price} scale={1} color="black" className="top-layer" />
                  </div>
                  <img src="/assets/img/buttons/buttonBuy1_s1.png" className="buy-box-edge right" alt="" />
                </div>
              );
            })}
            {(poolErr || txStatus) && (
              <div className="top-layer" style={{ width: '100%', textAlign: 'center', marginTop: 10 }}>
                <PixelText text={poolErr ? `pool error: ${poolErr}` : txStatus} scale={1} color="white" />
              </div>
            )}
          </div>
        </div>

        {/* Marquee Horizontal Reverse above footer */}
        <Marquee direction="horizontal-reverse" className="marquee-h" />

        {/* Footer Section */}
        <div className="footer-section cyan-bg">
          <SectionBackground image="/assets/img/misc/lines1_strip.webp" rotation={0} alignPos="left top" bgColor="#00ffff" />
          <div className="top-layer" style={{ display: 'flex', flexWrap: 'wrap', columnGap: '12px', rowGap: '14px', marginBottom: '20px' }}>
            {"Songs that you can get in the jukebox".split(' ').map((word, i) => (
                <PixelText key={i} text={word} scale={2} color="black" />
            ))}
          </div>
          <div className="footer-boxes">
            {songs.map((song, index) => {
                const avails = [4, 12, 7];
                return (
                  <div key={`foot-${song.id}`} className="footer-item" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
                      <div className="footer-preview box-border" onClick={() => selectSong(index)} style={{ cursor: 'pointer' }}>
                          <img src={`/assets/img/albumArt/${song.art}`} alt="Album Art" className="top-layer" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }} className="top-layer">
                          <PixelText text={song.title} scale={1} color="black" />
                          <PixelText text={`Available: ${avails[index]}/15`} scale={1} color="black" />
                          <div style={{ borderBottom: '1px solid black', display: 'flex', cursor: 'pointer', alignSelf: 'flex-start' }}>
                              <PixelText text="view in Objkt" scale={1} color="black" />
                          </div>
                      </div>
                  </div>
                );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JukeboxHome />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/send" element={<Send />} />
        <Route path="/collect/:poolId" element={<Collect />} />
        <Route path="/library" element={<Library />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
