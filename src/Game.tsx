import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_W, CANVAS_H } from './game/constants';
import type { InputState, GameState } from './game/types';
import { initState, update } from './game/gameLogic';
import { render } from './game/renderer';

const KEYS_MAP: Record<string, keyof InputState> = {
  ArrowLeft: 'left',  KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up',      KeyW: 'up',
  ArrowDown: 'down',  KeyS: 'down',
  Space: 'jump',
};

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const inputRef = useRef<InputState>({ left: false, right: false, up: false, down: false, jump: false });
  const timeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const jumpPressedRef = useRef(false);

  const handleKey = useCallback((e: KeyboardEvent, down: boolean) => {
    // Restart on game over
    if (down && e.code === 'Enter' && stateRef.current.gameOver) {
      e.preventDefault();
      stateRef.current = initState();
      return;
    }

    const key = KEYS_MAP[e.code];
    if (!key) return;
    e.preventDefault();

    if (key === 'jump') {
      if (down && !jumpPressedRef.current) {
        jumpPressedRef.current = true;
        inputRef.current.jump = true;
      }
      if (!down) {
        jumpPressedRef.current = false;
        inputRef.current.jump = false;
      }
    } else {
      inputRef.current[key] = down;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true);
    const onKeyUp   = (e: KeyboardEvent) => handleKey(e, false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let prevTime = performance.now();

    function loop(now: number) {
      const dt = Math.min(now - prevTime, 32); // cap at ~30fps equivalent
      prevTime = now;
      timeRef.current++;

      // Fixed-step update (60fps target)
      const steps = Math.round(dt / 16.67) || 1;
      for (let i = 0; i < steps; i++) {
        update(stateRef.current, inputRef.current);
        // Jump is a one-frame impulse
        if (inputRef.current.jump && !jumpPressedRef.current) {
          inputRef.current.jump = false;
        }
      }

      render(ctx, stateRef.current, timeRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleKey]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#02081a',
      padding: '16px',
    }}>
      <h1 style={{
        color: '#ffd700',
        fontFamily: 'monospace',
        fontSize: '2rem',
        letterSpacing: '0.3em',
        marginBottom: '12px',
        textShadow: '0 0 20px #ffd700, 0 0 40px #ff8800',
      }}>
        ☠ BOOTY ☠
      </h1>
      <div style={{
        border: '3px solid #ffd700',
        boxShadow: '0 0 40px rgba(255,215,0,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'block', imageRendering: 'pixelated' }}
          tabIndex={0}
        />
      </div>
      <p style={{
        color: 'rgba(180,200,255,0.5)',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        marginTop: '10px',
      }}>
        Arrow keys or WASD to move · Space to jump · Collect numbered keys → open matching doors
      </p>
    </div>
  );
}
