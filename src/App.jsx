import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [manifest, setManifest] = useState(null);
  const [folderList, setFolderList] = useState([]);
  const [currentFolderIndex, setCurrentFolderIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [inputValue, setInputValue] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const [completedChunks, setCompletedChunks] = useState([]);
  const [attemptId, setAttemptId] = useState('');
  
  // Dev Mode State
  const [isDevMode, setIsDevMode] = useState(false);
  const DEV_PASSWORD = "R449";

  const blockStartTime = useRef(null); 
  const currentChunkStartTime = useRef(null);

  // 1. Setup Session and Load Assets
  useEffect(() => {
    const uniqueId = `Attempt-${Date.now()}-${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}`;
    setAttemptId(uniqueId);

    fetch('/manifest.json')
      .then(res => res.json())
      .then(data => {
        const allFolders = Object.keys(data);
        const practiceFolderName = "BrCa(practice)";
        let reordered;
        if (allFolders.includes(practiceFolderName)) {
          const others = allFolders.filter(f => f !== practiceFolderName);
          reordered = [practiceFolderName, ...others];
        } else {
          reordered = allFolders;
        }
        setManifest(data);
        setFolderList(reordered);
      })
      .catch(err => console.error("Manifest load error:", err));
  }, []);

  // 2. Developer Mode Logic
  const toggleDevMode = () => {
    if (!isDevMode) {
      const pass = prompt("Enter Developer Password:");
      if (pass === DEV_PASSWORD) {
        setIsDevMode(true);
      } else {
        alert("Incorrect password.");
      }
    } else {
      setIsDevMode(false);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === '`') toggleDevMode();
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isDevMode]);

  const currentFolderName = folderList[currentFolderIndex];
  const currentImages = manifest && currentFolderName ? manifest[currentFolderName] : [];
  const isPracticeActive = currentFolderName === "BrCa(practice)";

  // 3. Navigation Controls
  const goToNextImage = () => {
    if (currentIndex < currentImages.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      triggerBlockEnd();
    }
  };

  const triggerBlockEnd = () => {
    if (currentFolderIndex < folderList.length - 1) {
      setIsPaused(true);
    } else {
      setIsActive(false);
      setIsFinished(true);
    }
  };

  useEffect(() => {
    if (!isActive || isPaused || currentImages.length === 0) return;
    if (!blockStartTime.current) blockStartTime.current = Date.now();

    const timer = setInterval(() => {
      goToNextImage();
    }, 1500);

    return () => clearInterval(timer);
  }, [isActive, isPaused, currentIndex, currentImages, currentFolderIndex, folderList]);

  const handleContinue = () => {
    blockStartTime.current = null; 
    currentChunkStartTime.current = null;
    setCurrentFolderIndex(prev => prev + 1);
    setCurrentIndex(0);
    setIsPaused(false);
  };

  // 4. Data Saving (Production-Ready)
  const saveToDatabase = async (dataList) => {
    try {
      // Relative path works both on localhost and Render
      await fetch('/api/save-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: attemptId, entries: dataList })
      });
    } catch (error) {
      console.error("Sync Error:", error);
    }
  };

  // 5. Input Handling
  const handleKeyDown = (e) => {
    if (!isActive || isPaused) return;
    const timeInSec = (Date.now() - blockStartTime.current) / 1000;

    if (e.key !== 'Enter' && !currentChunkStartTime.current) {
      currentChunkStartTime.current = timeInSec;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!inputValue.trim()) return; // Prevent empty entries

      const startTime = currentChunkStartTime.current || timeInSec;
      const finishTime = timeInSec;

      const newEntry = {
        text: inputValue.trim(),
        start_time_sec: Number(startTime.toFixed(3)),
        finish_time_sec: Number(finishTime.toFixed(3)),
        duration_sec: Number((finishTime - startTime).toFixed(3)),
        folder: currentFolderName,
        image_index: currentIndex + 1
      };

      const updatedList = [...completedChunks, newEntry];
      setCompletedChunks(updatedList);
      setInputValue('');
      currentChunkStartTime.current = null; 
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);
      saveToDatabase(updatedList);
    }
  };

  // 6. Styles
  const containerStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', width: '100vw', backgroundColor: isPracticeActive ? '#f0f7ff' : '#ffffff', 
    fontFamily: 'Arial, sans-serif', margin: 0, padding: '40px', boxSizing: 'border-box',
    transition: 'background-color 0.5s ease', position: 'relative'
  };

  const cardStyle = {
    maxWidth: '850px', padding: '50px', borderRadius: '20px', backgroundColor: '#ffffff',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)', textAlign: 'left', lineHeight: '1.6'
  };

  // 7. Render UI
  if (!manifest) return <div style={containerStyle}>Loading experiment...</div>;

  if (isFinished) {
    return (
      <div style={containerStyle}>
        <div style={{...cardStyle, textAlign: 'center'}}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
          <h1 style={{ color: '#2c3e50', fontSize: '2.5rem', marginBottom: '10px' }}>Thank You!</h1>
          <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '30px' }}>
            Your participation is greatly appreciated. Your responses have been successfully recorded.
          </p>
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', display: 'inline-block', textAlign: 'left', border: '1px solid #eee' }}>
            <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#888' }}><strong>Participant ID:</strong> {attemptId}</p>
            <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#888' }}><strong>Responses Saved:</strong> {completedChunks.length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
         <button onClick={toggleDevMode} style={{ padding: '5px 10px', fontSize: '10px', opacity: 0.4, cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', background: 'none' }}>
          {isDevMode ? "DISABLE DEV" : "DEV"}
        </button>
      </div>

      <div style={{ position: 'absolute', top: '20px', left: '20px', color: '#bbb', fontSize: '12px' }}>{attemptId}</div>

      {!isActive && (
        <div style={{...cardStyle, textAlign: 'left'}}>
          <h1 style={{ textAlign: 'center', marginTop: 0 }}>Study Instructions</h1>
          <p>In this task, you will be shown a series of image sequences. Each sequence consists of a smooth transition where one object gradually morphs into another object.</p>
          <h3 style={{ marginBottom: '10px' }}>Your Task:</h3>
          <ul style={{ marginBottom: '25px' }}>
            <li style={{ marginBottom: '10px' }}><strong>First Response:</strong> As soon as you clearly recognize the first object, type its name and press the <strong>ENTER</strong> key.</li>
            <li><strong>Second Response:</strong> As the image continues to change, the moment your perception switches to the new object, type its name and press the <strong>ENTER</strong> key.</li>
          </ul>
          <h3 style={{ marginBottom: '10px' }}>Important Notes:</h3>
          <ul style={{ marginBottom: '30px' }}>
            <li>You must press <strong>ENTER</strong> after typing to submit your answer.</li>
            <li>The images will appear one after another automatically.</li>
            <li>There are no correct or incorrect answers. We are interested in your subjective perception.</li>
          </ul>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setIsActive(true)} style={{ padding: '18px 80px', fontSize: '1.4rem', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>
              START PRACTICE
            </button>
          </div>
        </div>
      )}

      {isActive && isPaused && (
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <h2>{currentFolderIndex === 0 ? "Practice Complete" : "Block Complete"}</h2>
          <p>Ready to start the next sequence?</p>
          <button onClick={handleContinue} style={{ padding: '15px 50px', fontSize: '1.2rem', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px' }}>
            {currentFolderIndex === 0 ? "START REAL EXPERIMENT" : "CONTINUE"}
          </button>
        </div>
      )}

      {isActive && !isPaused && (
        <>
          <div style={{ marginBottom: '15px', color: isPracticeActive ? '#007bff' : '#666', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span>{isPracticeActive ? "⚠️ PRACTICE MODE" : `Sequence ${currentFolderIndex} of ${folderList.length - 1}`}</span>
            {isDevMode && <span style={{ color: 'red', fontSize: '0.8rem' }}>DEV: IMG {currentIndex + 1}/{currentImages.length}</span>}
          </div>
          <div style={{ height: '500px', width: '800px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
            <img src={currentImages[currentIndex]} alt="stim" style={{ maxHeight: '100%', maxWidth: '100%', border: isFlashing ? '10px solid #28a745' : '10px solid transparent', transition: 'border 0.1s ease' }} />
          </div>
          <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
            <textarea 
              value={inputValue} 
              onKeyDown={handleKeyDown} 
              onChange={(e) => setInputValue(e.target.value)} 
              placeholder="Type and press Enter..." 
              autoFocus 
              style={{ 
                width: isDevMode ? '550px' : '780px', 
                height: '100px', 
                padding: '20px', 
                fontSize: '1.4rem', 
                borderRadius: '12px', 
                border: '2px solid #ddd', 
                outline: 'none',
                color: '#000',
                backgroundColor: '#fff',
                resize: 'none'
              }} 
            />
            {isDevMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={goToNextImage} style={{ height: '48px', width: '115px', backgroundColor: '#ffc107', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>SKIP IMG</button>
                <button onClick={triggerBlockEnd} style={{ height: '48px', width: '115px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>SKIP BLOCK</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;