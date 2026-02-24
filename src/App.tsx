/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  User, 
  Cpu, 
  Layers, 
  Info,
  ChevronRight,
  AlertCircle,
  Volume2,
  VolumeX,
  PiggyBank
} from 'lucide-react';
import { Card, Suit, Rank, GameState, GameStatus } from './types';
import { createDeck, shuffle, getSuitSymbol, getSuitColor, SUITS, getSuitNameCN } from './constants';

const INITIAL_HAND_SIZE = 8;

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    playerHand: [],
    aiHand: [],
    drawPile: [],
    discardPile: [],
    currentSuit: 'hearts',
    currentRank: 'A',
    turn: 'player',
    status: 'waiting',
    winner: null,
  });

  const [message, setMessage] = useState<string>("欢迎来到山东疯狂 8 点！");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  // Voice Announcement
  useEffect(() => {
    if (isVoiceEnabled && message && window.speechSynthesis) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, [message, isVoiceEnabled]);

  // Initialize Game
  const initGame = useCallback(() => {
    const deck = shuffle(createDeck());
    const playerHand = deck.splice(0, INITIAL_HAND_SIZE);
    const aiHand = deck.splice(0, INITIAL_HAND_SIZE);
    
    // Find a starting card that is NOT an 8
    let firstCardIndex = 0;
    while (deck[firstCardIndex].rank === '8') {
      firstCardIndex++;
    }
    const discardPile = [deck.splice(firstCardIndex, 1)[0]];
    const drawPile = deck;

    setGameState({
      playerHand,
      aiHand,
      drawPile,
      discardPile,
      currentSuit: discardPile[0].suit,
      currentRank: discardPile[0].rank,
      turn: 'player',
      status: 'playing',
      winner: null,
    });
    setMessage("轮到你了！请匹配花色或点数。");
  }, []);

  // Check for Win
  useEffect(() => {
    if (gameState.status === 'playing') {
      if (gameState.playerHand.length === 0) {
        setGameState(prev => ({ ...prev, status: 'game-over', winner: 'player' }));
        setMessage("恭喜！你赢了！");
      } else if (gameState.aiHand.length === 0) {
        setGameState(prev => ({ ...prev, status: 'game-over', winner: 'ai' }));
        setMessage("AI 赢了！下次好运。");
      }
    }
  }, [gameState.playerHand.length, gameState.aiHand.length, gameState.status]);

  // AI Turn Logic
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.turn === 'ai' && !isAiThinking) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        handleAiTurn();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.turn, gameState.status, isAiThinking]);

  const handleAiTurn = () => {
    const { aiHand, currentSuit, currentRank, drawPile, discardPile } = gameState;
    
    // 1. Try to find a matching card (not an 8)
    const playableIndex = aiHand.findIndex(c => c.rank !== '8' && (c.suit === currentSuit || c.rank === currentRank));
    
    if (playableIndex !== -1) {
      const card = aiHand[playableIndex];
      const newAiHand = aiHand.filter((_, i) => i !== playableIndex);
      setGameState(prev => ({
        ...prev,
        aiHand: newAiHand,
        discardPile: [card, ...prev.discardPile],
        currentSuit: card.suit,
        currentRank: card.rank,
        turn: 'player',
      }));
      setMessage(`AI 打出了 ${getSuitNameCN(card.suit)} ${card.rank}。`);
    } 
    // 2. Try to play an 8
    else {
      const eightIndex = aiHand.findIndex(c => c.rank === '8');
      if (eightIndex !== -1) {
        const card = aiHand[eightIndex];
        const newAiHand = aiHand.filter((_, i) => i !== eightIndex);
        
        // AI picks the suit it has the most of
        const suitCounts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
        newAiHand.forEach(c => suitCounts[c.suit]++);
        const bestSuit = (Object.keys(suitCounts) as Suit[]).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b);

        setGameState(prev => ({
          ...prev,
          aiHand: newAiHand,
          discardPile: [card, ...prev.discardPile],
          currentSuit: bestSuit,
          currentRank: '8',
          turn: 'player',
        }));
        setMessage(`AI 打出了 8，并将花色更改为 ${getSuitNameCN(bestSuit)}。`);
      } 
      // 3. Draw a card
      else if (drawPile.length > 0) {
        const [drawnCard, ...remainingDrawPile] = drawPile;
        setGameState(prev => ({
          ...prev,
          aiHand: [...prev.aiHand, drawnCard],
          drawPile: remainingDrawPile,
          turn: 'player',
        }));
        setMessage("AI 无牌可出，摸了一张牌。");
      } 
      // 4. Skip turn
      else {
        setGameState(prev => ({ ...prev, turn: 'player' }));
        setMessage("AI 无牌可出且摸牌堆已空，跳过回合。");
      }
    }
    setIsAiThinking(false);
  };

  const playCard = (card: Card) => {
    if (gameState.turn !== 'player' || gameState.status !== 'playing') return;

    const isEight = card.rank === '8';
    const isValid = isEight || card.suit === gameState.currentSuit || card.rank === gameState.currentRank;

    if (!isValid) {
      setMessage("无效出牌！请匹配花色或点数。");
      return;
    }

    const newPlayerHand = gameState.playerHand.filter(c => c.id !== card.id);

    if (isEight) {
      setGameState(prev => ({
        ...prev,
        playerHand: newPlayerHand,
        discardPile: [card, ...prev.discardPile],
        status: 'suit-picking',
      }));
      setMessage("你打出了 8！请选择一个新花色。");
    } else {
      setGameState(prev => ({
        ...prev,
        playerHand: newPlayerHand,
        discardPile: [card, ...prev.discardPile],
        currentSuit: card.suit,
        currentRank: card.rank,
        turn: 'ai',
      }));
      setMessage(`你打出了 ${getSuitNameCN(card.suit)} ${card.rank}。`);
    }
  };

  const drawCard = () => {
    if (gameState.turn !== 'player' || gameState.status !== 'playing') return;

    if (gameState.drawPile.length === 0) {
      setMessage("摸牌堆已空！跳过回合。");
      setGameState(prev => ({ ...prev, turn: 'ai' }));
      return;
    }

    const [drawnCard, ...remainingDrawPile] = gameState.drawPile;
    setGameState(prev => ({
      ...prev,
      playerHand: [...prev.playerHand, drawnCard],
      drawPile: remainingDrawPile,
      turn: 'ai',
    }));
    setMessage(`你摸到了 ${getSuitNameCN(drawnCard.suit)} ${drawnCard.rank}。轮到 AI 了。`);
  };

  const pickSuit = (suit: Suit) => {
    setGameState(prev => ({
      ...prev,
      currentSuit: suit,
      currentRank: '8',
      status: 'playing',
      turn: 'ai',
    }));
    setMessage(`你将花色更改为 ${getSuitNameCN(suit)}。轮到 AI 了。`);
  };

  return (
    <div className="min-h-screen bg-[#1a472a] text-white font-sans selection:bg-emerald-500/30 relative overflow-x-hidden">
      {/* Background Image - Fat Pig (Very Visible) */}
      <div 
        className="fixed inset-0 z-0 opacity-70 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=1920")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Layers className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">山东疯狂 8 点</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">经典版</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`p-2 rounded-full transition-all ${isVoiceEnabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            title={isVoiceEnabled ? "关闭语音" : "开启语音"}
          >
            {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-white/70">进行中</span>
          </div>
          <button 
            onClick={initGame}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="重新开始"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-8 min-h-[calc(100vh-80px)]">
        {gameState.status === 'waiting' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-12 bg-black/20 rounded-3xl border border-white/10 backdrop-blur-xl max-w-md relative z-10"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <PiggyBank className="text-emerald-400" size={40} />
              </div>
              <h2 className="text-3xl font-bold mb-2">准备好开始了吗？</h2>
              <p className="text-white/60 mb-8">匹配花色或点数以清空手牌。记住，8 是万能牌！</p>
              <button 
                onClick={initGame}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                开始新游戏
                <ChevronRight size={20} />
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            {/* AI Area */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-white/70">
                  <Cpu size={16} />
                  <span className="text-sm font-medium uppercase tracking-wider">AI 对手</span>
                </div>
                <div className="text-xs font-mono bg-black/30 px-2 py-1 rounded border border-white/5">
                  手牌数: {gameState.aiHand.length}
                </div>
              </div>
              <div className="flex justify-center gap-[-20px] sm:gap-[-40px] h-32 sm:h-40">
                {gameState.aiHand.map((_, i) => (
                  <motion.div
                    key={`ai-card-${i}`}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="w-20 h-28 sm:w-28 sm:h-40 bg-slate-800 rounded-lg border-2 border-white/20 shadow-xl flex items-center justify-center overflow-hidden relative"
                    style={{ marginLeft: i === 0 ? 0 : '-40px' }}
                  >
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white/10 rounded-full flex items-center justify-center">
                      <Layers className="text-white/20" size={24} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Table Center */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8">
              <div className="flex items-center gap-12 sm:gap-20">
                {/* Draw Pile */}
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">摸牌堆</span>
                  <button 
                    onClick={drawCard}
                    disabled={gameState.turn !== 'player' || gameState.status !== 'playing'}
                    className={`group relative w-24 h-36 sm:w-32 sm:h-48 rounded-xl border-2 border-white/20 shadow-2xl transition-all ${
                      gameState.turn === 'player' && gameState.status === 'playing' 
                      ? 'hover:-translate-y-2 cursor-pointer active:scale-95' 
                      : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {gameState.drawPile.length > 0 ? (
                      <div className="absolute inset-0 bg-slate-800 rounded-lg flex flex-col items-center justify-center gap-2">
                         <Layers className="text-white/20" size={32} />
                         <span className="text-xs font-mono text-white/40">{gameState.drawPile.length}</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/20 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                        <span className="text-[10px] text-white/20 font-bold">已空</span>
                      </div>
                    )}
                    {gameState.turn === 'player' && gameState.status === 'playing' && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                        <ChevronRight size={14} className="rotate-90" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Discard Pile */}
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">弃牌堆</span>
                  <div className="relative w-24 h-36 sm:w-32 sm:h-48">
                    <AnimatePresence mode="popLayout">
                      {gameState.discardPile.length > 0 && (
                        <motion.div
                          key={gameState.discardPile[0].id}
                          initial={{ scale: 1.2, rotate: 10, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          className="absolute inset-0 bg-white rounded-xl shadow-2xl flex flex-col p-3 text-slate-900 border border-white/50"
                        >
                          <div className={`text-xl sm:text-2xl font-bold leading-none ${getSuitColor(gameState.discardPile[0].suit)}`}>
                            {gameState.discardPile[0].rank}
                          </div>
                          <div className={`text-lg sm:text-xl ${getSuitColor(gameState.discardPile[0].suit)}`}>
                            {getSuitSymbol(gameState.discardPile[0].suit)}
                          </div>
                          <div className="flex-1 flex items-center justify-center">
                            <div className={`text-4xl sm:text-6xl ${getSuitColor(gameState.discardPile[0].suit)}`}>
                              {getSuitSymbol(gameState.discardPile[0].suit)}
                            </div>
                          </div>
                          <div className={`text-xl sm:text-2xl font-bold leading-none self-end rotate-180 ${getSuitColor(gameState.discardPile[0].suit)}`}>
                            {gameState.discardPile[0].rank}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="flex flex-col items-center gap-2">
                <div className="px-6 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-3">
                  {isAiThinking ? (
                     <div className="flex gap-1">
                       <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                       <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                       <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                     </div>
                  ) : (
                    <Info size={14} className="text-emerald-400" />
                  )}
                  <span className="text-sm font-medium text-white/90">{message}</span>
                </div>
                
                {/* Current Suit Indicator (for 8s) */}
                <div className="flex items-center gap-2">
                   <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">当前花色:</span>
                   <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 ${getSuitColor(gameState.currentSuit)}`}>
                      <span className="text-lg">{getSuitSymbol(gameState.currentSuit)}</span>
                      <span className="text-[10px] font-bold uppercase">{getSuitNameCN(gameState.currentSuit)}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Player Area */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-white/70">
                  <User size={16} />
                  <span className="text-sm font-medium uppercase tracking-wider">你的手牌</span>
                </div>
                <div className="text-xs font-mono bg-black/30 px-2 py-1 rounded border border-white/5">
                  手牌数: {gameState.playerHand.length}
                </div>
              </div>
              <div className="flex justify-center flex-wrap gap-2 sm:gap-4">
                <AnimatePresence>
                  {gameState.playerHand.map((card, i) => {
                    const isPlayable = gameState.turn === 'player' && 
                                     gameState.status === 'playing' && 
                                     (card.rank === '8' || card.suit === gameState.currentSuit || card.rank === gameState.currentRank);
                    
                    return (
                      <motion.button
                        key={card.id}
                        layout
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0, scale: 0.5 }}
                        whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
                        onClick={() => playCard(card)}
                        className={`w-20 h-28 sm:w-28 sm:h-40 bg-white rounded-lg shadow-xl flex flex-col p-2 sm:p-3 text-slate-900 border-2 transition-all ${
                          isPlayable 
                          ? 'border-emerald-500/50 cursor-pointer hover:shadow-emerald-500/20' 
                          : 'border-transparent opacity-70 grayscale-[0.5] cursor-not-allowed'
                        }`}
                      >
                        <div className={`text-lg sm:text-xl font-bold leading-none ${getSuitColor(card.suit)}`}>
                          {card.rank}
                        </div>
                        <div className={`text-sm sm:text-base ${getSuitColor(card.suit)}`}>
                          {getSuitSymbol(card.suit)}
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <div className={`text-3xl sm:text-5xl ${getSuitColor(card.suit)}`}>
                            {getSuitSymbol(card.suit)}
                          </div>
                        </div>
                        <div className={`text-lg sm:text-xl font-bold leading-none self-end rotate-180 ${getSuitColor(card.suit)}`}>
                          {card.rank}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Suit Picker Modal */}
      <AnimatePresence>
        {gameState.status === 'suit-picking' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-center mb-6">选择新花色</h3>
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map((suit) => (
                  <button
                    key={suit}
                    onClick={() => pickSuit(suit)}
                    className="flex flex-col items-center gap-2 p-6 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group active:scale-95"
                  >
                    <span className={`text-5xl transition-transform group-hover:scale-110 ${getSuitColor(suit)}`}>
                      {getSuitSymbol(suit)}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">{getSuitNameCN(suit)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState.status === 'game-over' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />
              
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                gameState.winner === 'player' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {gameState.winner === 'player' ? <Trophy size={48} /> : <AlertCircle size={48} />}
              </div>
              
              <h2 className="text-4xl font-black mb-2 tracking-tight">
                {gameState.winner === 'player' ? '胜利！' : '失败'}
              </h2>
              <p className="text-white/60 mb-8 text-lg">
                {gameState.winner === 'player' 
                  ? '你清空了手牌，掌控了全局！' 
                  : '这次 AI 技高一筹。准备好复仇了吗？'}
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={initGame}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} />
                  再玩一局
                </button>
                <button 
                  onClick={() => setGameState(prev => ({ ...prev, status: 'waiting' }))}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 font-bold rounded-xl transition-all"
                >
                  返回主菜单
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="p-6 text-center text-white/20 text-[10px] uppercase tracking-[0.2em] font-bold">
        山东疯狂 8 点 &copy; 2024 &bull; 使用 React 和 Tailwind 构建
      </footer>
    </div>
  );
}
