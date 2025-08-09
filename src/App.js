import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

// Hook personalizado para detectar o tamanho da janela
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    // Adiciona event listener
    window.addEventListener("resize", handleResize);
    
    // Remove event listener quando o componente é desmontado
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  return windowSize;
}

function App() {
  const { width } = useWindowSize(); // Hook para detectar o tamanho da tela
  const isMobile = width < 768; // Define se é uma tela de celular
  const isExtraSmall = width <= 400; // Define se é uma tela muito pequena

  const [resultado, setResultado] = useState("");
  const [raspou, setRaspou] = useState(false);
  const [saldo, setSaldo] = useState(0);
  const [valorDeposito, setValorDeposito] = useState("");
  const [aposta, setAposta] = useState("");
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [valorPremio, setValorPremio] = useState(0);
  const [premioResgatado, setPremioResgatado] = useState(false);
  const [modoOffline, setModoOffline] = useState(true); // Modo offline ativado por padrão
  const [processandoAposta, setProcessandoAposta] = useState(false);
  const canvasRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Efeitos sonoros usando Web Audio API
  const playSound = (type) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch(type) {
        case 'bet':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'win':
          // Notas ascendentes alegres
          [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.2);
            osc.start(audioContext.currentTime + i * 0.1);
            osc.stop(audioContext.currentTime + i * 0.1 + 0.2);
          });
          break;
        case 'lose':
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.5);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
          break;
        case 'scratch':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(200 + Math.random() * 100, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.05);
          break;
        default:
          break;
      }
    } catch (error) {
      console.log('Áudio não suportado neste navegador');
    }
  };

  // Inicializar canvas para raspadinha
  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 150;
    
    // Criar superfície de raspagem
    const gradient = ctx.createLinearGradient(0, 0, 300, 150);
    gradient.addColorStop(0, '#c0c0c0');
    gradient.addColorStop(1, '#a0a0a0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Adicionar padrão de raspagem
    ctx.fillStyle = '#888';
    for (let i = 0; i < canvas.width; i += 15) {
      for (let j = 0; j < canvas.height; j += 15) {
        if ((i + j) % 30 === 0) {
          ctx.fillRect(i, j, 8, 8);
        }
      }
    }
    
    // Adicionar texto
    ctx.fillStyle = '#666';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎰 RASPE AQUI! 🎰', canvas.width / 2, canvas.height / 2);
  };

  // Função para raspar
  const handleScratch = (e) => {
    if (!isMouseDown || showResult || !isScratching) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 35, 0, 2 * Math.PI); // Aumentado de 25 para 35
    ctx.fill();
    
    playSound('scratch');
    
    // Calcular progresso da raspagem
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const progress = transparent / (imageData.data.length / 4);
    setScratchProgress(progress);
    
    if (progress > 0.7 && !showResult) { // Reduzido de 0.5 para 0.4
      setShowResult(true);
      setRaspou(true);
      
      // Determinar vitória/derrota e tocar som apropriado
      const ganhou = resultado.includes('Parabéns') || resultado.includes('Ganhou') || resultado.includes('R$');
      setIsWin(ganhou);
      
      // Extrair valor do prêmio se ganhou
      if (ganhou) {
        // Procurar padrão R$ XX,XX no resultado
        const regex = /R\$\s?(\d+[.,]\d+)/;
        const match = resultado.match(regex);
        if (match) {
          // Extrair o valor do prêmio e converter para número
          const valorStr = match[1].replace(',', '.');
          const valor = parseFloat(valorStr);
          setValorPremio(valor);
        }
      } else {
        setValorPremio(0);
      }
      setPremioResgatado(false);
      
      setTimeout(() => playSound(ganhou ? 'win' : 'lose'), 300);
    }
  };

  const handleDepositar = () => {
    const valor = parseFloat(valorDeposito);
    if (!isNaN(valor) && valor > 0) {
      setSaldo((prev) => prev + valor);
      setValorDeposito("");
      playSound('bet');
    }
  };

  // Função para gerar resultado aleatório no modo offline
  const gerarResultadoOffline = (valorAposta) => {
    // Gera um número aleatório entre 0 e 1
    const chance = Math.random();
    let resultado;
    
    // 30% de chance de ganhar
    if (chance < 0.3) {
      // Define um valor de prêmio aleatório entre 1x e 5x o valor da aposta
      const multiplicador = 1 + Math.random() * 4;
      const premio = Math.round(valorAposta * multiplicador * 100) / 100;
      resultado = `Parabéns! Você ganhou R$ ${premio.toFixed(2)}!`;
    } else {
      // 70% de chance de perder
      const frases = [
        "Não foi dessa vez... Tente novamente!",
        "Quase! Mais sorte na próxima!", 
        "Ops! Não foi agora...", 
        "Continue tentando, a sorte virá!"
      ];
      resultado = frases[Math.floor(Math.random() * frases.length)];
    }
    
    return resultado;
  };

  const handleRaspar = async () => {
    const valorAposta = parseFloat(aposta);
    if (raspou || isNaN(valorAposta) || valorAposta <= 0) return;
    if (saldo < valorAposta) {
      alert("Saldo insuficiente!");
      return;
    }

    try {
      setProcessandoAposta(true);
      playSound('bet');
      setSaldo((prev) => prev - valorAposta);
      
      let resultadoSorteio;
      
      if (modoOffline) {
        // Modo offline - gera resultado localmente
        resultadoSorteio = gerarResultadoOffline(valorAposta);
        setResultado(resultadoSorteio);
      } else {
        // Modo online - tenta conectar com backend
        try {
          const res = await axios.post("http://localhost:5000/api/sortear");
          resultadoSorteio = res.data.resultado;
          setResultado(resultadoSorteio);
        } catch (error) {
          console.error("Erro ao conectar com o backend:", error);
          alert("Não foi possível conectar ao servidor. Ativando modo offline.");
          setModoOffline(true);
          resultadoSorteio = gerarResultadoOffline(valorAposta);
          setResultado(resultadoSorteio);
        }
      }
      
      // Limpar o valor da aposta após o resultado
      setAposta("");
      
      setIsScratching(true);
      setProcessandoAposta(false);
      
      // Inicializar canvas após obter resultado
      setTimeout(() => {
        initializeCanvas();
      }, 100);
    } catch (error) {
      console.error("Erro ao processar aposta:", error);
      setProcessandoAposta(false);
      alert("Ocorreu um erro ao processar sua aposta. Tente novamente.");
    }
  };

  const handleNovaRaspadinha = () => {
    setResultado("");
    setRaspou(false);
    setAposta("");
    setIsScratching(false);
    setScratchProgress(0);
    setShowResult(false);
    setIsWin(false);
    setIsMouseDown(false);
    setValorPremio(0);
    setPremioResgatado(false);
  };
  
  const handleResgatarPremio = () => {
    if (isWin && valorPremio > 0 && !premioResgatado) {
      setSaldo((prev) => prev + valorPremio);
      setPremioResgatado(true);
      playSound('win');
    }
  };

  return (
    <>
      <nav className="navbar" style={{
        padding: isMobile ? '10px 15px' : '15px 25px',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '10px' : '0'
      }}>
        <div className="navbar-brand" style={{ 
          fontSize: isMobile ? '1.2rem' : '1.5rem',
          marginBottom: isMobile ? '10px' : '0'
        }}>🍀 Raspadinha da Sorte</div>
        <div className="navbar-items" style={{ 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '10px' : '20px',
          width: isMobile ? '100%' : 'auto'
        }}>
          <div className="navbar-item" style={{
            marginBottom: isMobile ? '5px' : '0',
            alignItems: isMobile ? 'flex-start' : 'center'
          }}>
            <span>SALDO</span>
            <span>R$ {saldo.toFixed(2)}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            width: isMobile ? '100%' : 'auto'
          }}>
            <div style={{ 
              position: 'relative', 
              backgroundColor: '#fff',
              borderRadius: '20px',
              width: isExtraSmall ? 'calc(100% - 50px)' : (isMobile ? '160px' : '180px'),
              height: isExtraSmall ? '36px' : '40px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                position: 'absolute', 
                left: isExtraSmall ? '8px' : '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ 
                  color: '#666', 
                  fontSize: isExtraSmall ? '11px' : '12px', 
                  fontWeight: 'bold' 
                }}>R$</span>
              </div>
              <input
                type="number"
                placeholder="Depositar"
                value={valorDeposito}
                onChange={(e) => setValorDeposito(e.target.value)}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  padding: `0 10px 0 ${isExtraSmall ? '30px' : '40px'}`, 
                  border: 'none',
                  outline: 'none',
                  fontSize: isExtraSmall ? '12px' : '14px'
                }}
              />
            </div>
            <button 
              onClick={handleDepositar} 
              style={{ 
                width: isExtraSmall ? '36px' : '40px', 
                height: isExtraSmall ? '36px' : '40px', 
                borderRadius: '50%', 
                backgroundColor: '#e14b8a',
                border: 'none',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: isExtraSmall ? '16px' : '18px', color: '#fff' }}>💳</span>
            </button>
          </div>
        </div>
      </nav>
      
      <div className="container">
        <div className="menu">
          <div className="modo-status">{modoOffline ? "🔌 Modo Offline" : "🌐 Modo Online"}</div>

        <div className="input-group">
          <div className="input-field-wrapper">
            <span className="currency-symbol">R$</span>
            <input
              type="number"
              placeholder="Valor da aposta"
              value={aposta}
              onChange={(e) => setAposta(e.target.value)}
              disabled={raspou || isScratching}
              className="input-field input-with-prefix"
            />
          </div>
          <button 
            onClick={handleRaspar} 
            disabled={raspou || isScratching || !aposta || processandoAposta}
            className="btn btn-bet"
          >
            {processandoAposta ? "⏳ Processando..." : "🎲 Apostar"}
          </button>
        </div>
      </div>

      <div className="raspadinha-container">
        {isScratching ? (
          <div className="scratch-area">
            <div className="resultado-background">
              <div className={`resultado-text ${isWin ? 'win' : 'lose'}`}>
                {showResult ? resultado : "???"}
              </div>
            </div>
            <canvas
              ref={canvasRef}
              className="scratch-canvas"
              onMouseDown={() => setIsMouseDown(true)}
              onMouseUp={() => setIsMouseDown(false)}
              onMouseLeave={() => setIsMouseDown(false)}
              onMouseMove={handleScratch}
              onTouchStart={() => setIsMouseDown(true)}
              onTouchEnd={() => setIsMouseDown(false)}
              onTouchMove={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                  clientX: touch.clientX,
                  clientY: touch.clientY
                });
                handleScratch(mouseEvent);
              }}
            />
            {scratchProgress > 0 && (
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${scratchProgress * 100}%`}}
                ></div>
              </div>
            )}
          </div>
        ) : (
          <div className="raspadinha-inicial" onClick={handleRaspar}>
            {!aposta ? "Digite o valor da aposta" : "🎯 Clique para começar!"}
          </div>
        )}
      </div>

      {showResult && (
        <div className="result-actions">
          <button onClick={handleNovaRaspadinha} className="btn btn-new">
            ✨ Nova Raspadinha
          </button>
          
          {isWin && (
            <>
              <div className="celebration">🎉 PARABÉNS! 🎉</div>
              {valorPremio > 0 && !premioResgatado && (
                <button 
                  onClick={handleResgatarPremio} 
                  className="btn btn-withdraw"
                >
                  💰 Resgatar R${valorPremio.toFixed(2)}
                </button>
              )}
              {valorPremio > 0 && premioResgatado && (
                <div className="premio-resgatado">✅ Prêmio resgatado com sucesso!</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
}

export default App;
