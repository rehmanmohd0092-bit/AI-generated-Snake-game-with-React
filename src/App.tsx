import { useState, useEffect, useRef, useCallback } from 'react';

const DUMMY_TRACKS = [
  {
    id: '1',
    title: 'SYS.AUDIO_001.WAV',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Synth_pop_loop_with_melody.ogg',
    isCustom: false,
  },
  {
    id: '2',
    title: 'GRID_NODE_SECTOR4.WAV',
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Arpeggiated_synth_chords.ogg',
    isCustom: false,
  },
  {
    id: '3',
    title: 'TURING_SEQUENCE_X.WAV',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Alan_Turing_-_Computer_Music_-_1951.ogg',
    isCustom: false,
  },
];

// --- Snake Game Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 90; // ms per frame

export default function App() {
  // --- Music Player State ---
  const [playlist, setPlaylist] = useState(DUMMY_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Snake Game State ---
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const dirRef = useRef(direction);

  // --- Music Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.log('AUTOPLAY_ERR:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const skipNext = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
  }, [playlist.length]);

  const skipPrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newTrack = {
        id: Math.random().toString(36).substring(7),
        title: file.name.toUpperCase().replace(/\.[^/.]+$/, "") + ".BIN",
        url,
        isCustom: true,
      };
      setPlaylist((prev) => [...prev, newTrack]);
    }
  };

  // --- Snake Game Logic ---
  const generateFood = useCallback((currentSnake: typeof snake) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    setFood(newFood);
  }, []);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    dirRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    generateFood(INITIAL_SNAKE);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (!gameStarted || gameOver) {
         if (e.key === "Enter" || e.key === " ") {
             startGame();
         }
         return;
      }

      const currentDir = dirRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (currentDir.y !== 1) dirRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
          if (currentDir.y !== -1) dirRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
          if (currentDir.x !== 1) dirRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
          if (currentDir.x !== -1) dirRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver]);

  // Game Loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const currentDir = dirRef.current;
        const newHead = {
          x: head.x + currentDir.x,
          y: head.y + currentDir.y,
        };

        // 1. Check Wall Collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          handleGameOver();
          return prevSnake;
        }

        // 2. Check Self Collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
           handleGameOver();
           return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // 3. Check Food Collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((s) => {
            const newScore = s + 10;
            if (newScore > highScore) setHighScore(newScore);
            return newScore;
          });
          generateFood(newSnake);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const gameInterval = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(gameInterval);
  }, [gameStarted, gameOver, food, highScore, generateFood]);

  const handleGameOver = () => {
    setGameOver(true);
    setGameStarted(false);
  };


  return (
    <div className="crt min-h-screen bg-black text-[#00ffff] font-mono selection:bg-[#ff00ff] selection:text-black flex flex-col p-4 md:p-8">
      
      {/* Background static block */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-screen bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwdjRoNHYtNEgweiIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==')]" />

      <div className="tear-box w-full max-w-7xl mx-auto flex flex-col items-stretch relative z-10">
        
        {/* HEADER / OS BAR */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-[#ff00ff] pb-6 mb-8 gap-4 shadow-[0_8px_0_#00ffff]">
          <div>
            <h1 className="glitch font-display text-2xl md:text-3xl text-[#ff00ff] uppercase tracking-widest break-all" data-text="Neon Synth-Snake">
              Neon Synth-Snake
            </h1>
            <p className="text-[#00ffff] mt-4 text-xl bg-[#00ffff] text-black inline-block px-2 transform skew-x-[-10deg]">
              [STATUS: ONLINE]
            </p>
          </div>
          <div className="text-left md:text-right w-full md:w-auto p-4 border-2 border-[#00ffff] bg-black">
            <div className="text-[#ff00ff] text-xl mb-1 uppercase">&gt; SYS_MEM_ALLOC</div>
            <div className="text-4xl font-display tracking-widest">
              0x{score.toString(16).toUpperCase().padStart(4, '0')}
            </div>
            <div className="text-sm mt-2 opacity-80 uppercase">&gt; HIGH_VOLT_MARK: 0x{highScore.toString(16).toUpperCase().padStart(4, '0')}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full items-start">
          
          {/* L COLUMN : GAME AREA */}
          <div className="lg:col-span-2 w-full bg-black border-[6px] border-[#ff00ff] p-4 shadow-[8px_8px_0_#00ffff] relative">
             <div className="absolute top-2 left-2 text-[#ff00ff] font-display text-[10px]">/// SECTOR_ALPHA</div>
             <div className="absolute bottom-2 right-2 text-[#00ffff] font-display text-[10px]">V_1.0.4</div>
             
             {/* GAME BOARD */}
             <div className="relative aspect-square w-full max-w-2xl mx-auto bg-black overflow-hidden border-2 border-[#00ffff] mt-6 mb-2">
                {/* Grid static */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(to right, #00ffff 1px, transparent 1px), linear-gradient(to bottom, #00ffff 1px, transparent 1px)`,
                    backgroundSize: `${100/GRID_SIZE}% ${100/GRID_SIZE}%`
                  }}
                />

                {!gameStarted && !gameOver && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6 text-center border-4 border-dashed border-[#ff00ff] m-4">
                     <h2 className="text-[#00ffff] font-display text-xl md:text-2xl mb-8 animate-pulse text-center leading-[2]">AWAITING USER INPUT...</h2>
                     <button 
                        onClick={startGame}
                        className="px-6 py-4 bg-[#ff00ff] text-black font-display text-sm md:text-base hover:bg-[#00ffff] hover:text-black transition-none uppercase shadow-[4px_4px_0_#00ffff] hover:shadow-[4px_4px_0_#ff00ff] active:translate-y-1 active:translate-x-1 active:shadow-none"
                      >
                       [ EXECUTE_PR0G ]
                     </button>
                     <p className="mt-8 text-[#00ffff] text-lg uppercase opacity-70">W A S D . O R . A R R O W S</p>
                  </div>
                )}

                {gameOver && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-10 p-6 text-center border-[8px] border-[#ff00ff] animate-pulse">
                     <div className="glitch text-[#ff00ff] font-display text-2xl md:text-4xl mb-6 text-center leading-[2]" data-text="FATAL_ERR: CLSN">
                       FATAL_ERR: CLSN
                     </div>
                     <div className="text-[#00ffff] text-2xl mb-12 bg-black px-4 py-2 border-2 border-[#00ffff]">
                       MEM_DUMP: {score}
                     </div>
                     <button 
                        onClick={startGame}
                        className="px-6 py-4 border-4 border-[#00ffff] text-[#00ffff] font-display text-sm md:text-base hover:bg-[#00ffff] hover:text-black uppercase shadow-[-6px_6px_0_#ff00ff]"
                      >
                       [ REBOOT_SEQ ]
                     </button>
                  </div>
                )}

                {/* SNAKE segments */}
                {snake.map((segment, i) => {
                  const isHead = i === 0;
                  return (
                    <div
                      key={`seg-${segment.x}-${segment.y}-${i}`}
                      className={`absolute transition-none ${
                        isHead 
                          ? 'bg-[#ffffff] z-20 border-[2px] border-[#00ffff] shadow-[0_0_15px_#00ffff]' 
                          : 'bg-[#00ffff] border-[1px] border-black opacity-90'
                      }`}
                      style={{
                        width: `${100 / GRID_SIZE}%`,
                        height: `${100 / GRID_SIZE}%`,
                        left: `${(segment.x / GRID_SIZE) * 100}%`,
                        top: `${(segment.y / GRID_SIZE) * 100}%`,
                      }}
                    />
                  );
                })}

                {/* FOOD */}
                <div
                  className="absolute bg-[#ff00ff] shadow-[0_0_20px_#ff00ff] animate-pulse border-2 border-[#ffffff]"
                  style={{
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    left: `${(food.x / GRID_SIZE) * 100}%`,
                    top: `${(food.y / GRID_SIZE) * 100}%`,
                  }}
                />
             </div>
          </div>

          {/* R COLUMN : AUDIO DECK & DATA STREAMS */}
          <div className="lg:col-span-1 w-full flex flex-col gap-8 h-full">
            
            {/* Audio Deck */}
            <div className="bg-black border-[4px] border-[#00ffff] p-6 shadow-[-8px_8px_0_#ff00ff] relative">
              <div className="absolute top-[-14px] left-4 bg-black px-2 text-[#00ffff] font-display text-sm">
                AUDI0_SYS.TERMNL
              </div>

              {/* Now Playing Info */}
              <div className="mt-4 mb-8">
                <div className="text-[#ff00ff] text-xl mb-2 animate-pulse">&gt; ACTIVE_STREAM:</div>
                <div className="font-mono text-2xl text-white truncate border-b-2 border-dashed border-[#00ffff] pb-2">
                  {playlist[currentTrackIndex]?.title || 'AWAITING_DATA'}
                </div>
                {playlist[currentTrackIndex]?.isCustom && (
                  <span className="inline-block mt-3 text-lg bg-[#ff00ff] text-black px-2 py-1 uppercase">
                    !! EXTERNAL_PAYLOAD !!
                  </span>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-6 mb-2 text-2xl">
                <div className="flex justify-between items-center bg-[#002222] border-2 border-[#00ffff] p-2">
                  <button 
                    onClick={skipPrev}
                    className="px-4 py-2 hover:bg-[#00ffff] hover:text-black transition-colors"
                  >
                    [&ltt;PREV]
                  </button>
                  
                  <button 
                    onClick={togglePlay}
                    className="px-6 py-2 bg-[#ff00ff] text-black hover:bg-white transition-colors uppercase font-bold"
                  >
                    {isPlaying ? "[ HALT ]" : "[ PLAY ]"}
                  </button>

                  <button 
                    onClick={skipNext}
                    className="px-4 py-2 hover:bg-[#00ffff] hover:text-black transition-colors"
                  >
                    [NEXT&gt;]
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="flex flex-col gap-4 border-2 border-[#ff00ff] p-4 bg-black">
                  <div className="flex justify-between text-[#00ffff] uppercase text-xl">
                    <span>PWR_LVL</span>
                    <span>{Math.round(volume * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <audio 
                ref={audioRef} 
                src={playlist[currentTrackIndex]?.url} 
                onEnded={skipNext}
              />
            </div>

            {/* Playlist Vault */}
            <div className="bg-black border-[4px] border-[#ff00ff] p-6 shadow-[8px_8px_0_#00ffff] flex-1 flex flex-col relative h-[400px] lg:h-auto min-h-[300px]">
              <div className="absolute top-[-14px] left-4 bg-black px-2 text-[#ff00ff] font-display text-sm">
                DATA_STREAMS
              </div>

              <div className="flex justify-between items-center mb-6 mt-4 pb-4 border-b-4 border-dashed border-[#00ffff]">
                <div className="text-xl text-[#00ffff]">&gt; ALLOC_INDEX</div>
                
                {/* Upload Button */}
                <label className="cursor-pointer inline-flex items-center text-xl bg-transparent text-[#ff00ff] hover:bg-[#ff00ff] hover:text-black border-2 border-[#ff00ff] px-3 py-1 transition-none uppercase">
                  [ INJECT.BIN ]
                  <input 
                    type="file" 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                </label>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                {playlist.map((track, index) => {
                  const isActive = index === currentTrackIndex;
                  return (
                    <button
                      key={track.id}
                      onClick={() => {
                        setCurrentTrackIndex(index);
                        setIsPlaying(true);
                      }}
                      className={`w-full text-left p-3 border-2 transition-none flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xl ${
                        isActive 
                          ? 'border-[#00ffff] bg-[#00ffff] text-black shadow-[4px_4px_0_#ff00ff]' 
                          : 'border-[#333333] hover:border-[#ff00ff] text-[#00ffff]'
                      }`}
                    >
                      <div className="font-display text-xs w-10">
                        {isActive && isPlaying ? "==>" : `[${index.toString().padStart(2, '0')}]`}
                      </div>
                      <div className="truncate flex-1 uppercase tracking-wider font-bold">
                        {track.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
