import { useEffect, useRef, useState } from 'react';

type Props = {
  busy: boolean;
  onSend: (t: string) => void;
  levelRef: React.MutableRefObject<number>;
  listening: boolean;
  setListening: (v: boolean) => void;
  placeholder: string;
  onError: (e: string) => void;
};

const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export default function Composer({ busy, onSend, levelRef, listening, setListening, placeholder, onError }: Props) {
  const [text, setText] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const rec = useRef<any>(null);
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const base = useRef('');
  const bars = useRef<HTMLDivElement>(null);

  // waveform: bars follow the live mic level while listening
  useEffect(() => {
    if (!listening) return;
    let raf = 0;
    const tick = () => {
      const el = bars.current;
      if (el) {
        const lv = levelRef.current;
        [...el.children].forEach((b, i) => {
          const wobble = 0.35 + 0.65 * Math.abs(Math.sin(performance.now() / 180 + i * 0.7));
          (b as HTMLElement).style.transform = `scaleY(${Math.max(0.08, Math.min(1, lv * 1.6 * wobble))})`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening, levelRef]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => () => stopListening(), []);

  // Hold Space anywhere outside a text field to talk; release to send — like speaking to an assistant in the room.
  const textRef = useRef(text);
  textRef.current = text;
  const hold = useRef(false);
  useEffect(() => {
    const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.closest('input, textarea, select, [contenteditable="true"]') !== null || el.tagName === 'BUTTON' || !!el.closest('dialog[open]'));
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || typing(e.target) || busy || hold.current) return;
      e.preventDefault();
      hold.current = true;
      if (!rec.current) toggleMic();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !hold.current) return;
      e.preventDefault();
      hold.current = false;
      window.setTimeout(() => {
        stopListening();
        const t = textRef.current.trim();
        if (t) { onSend(t); setText(''); }
      }, 350);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [busy, onSend]);

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    if (listening) stopListening();
    onSend(t);
    setText('');
  };

  async function startMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        levelRef.current = Math.min(1, Math.sqrt(sum / buf.length) * 5);
        if (audio.current) audio.current.raf = requestAnimationFrame(loop);
      };
      audio.current = { ctx, stream, raf: requestAnimationFrame(loop) };
    } catch {
      // meter is decorative; recognition can still work
    }
  }

  function stopListening() {
    try { rec.current?.stop(); } catch { /* already stopped */ }
    rec.current = null;
    if (audio.current) {
      cancelAnimationFrame(audio.current.raf);
      audio.current.stream.getTracks().forEach((t) => t.stop());
      audio.current.ctx.close().catch(() => {});
      audio.current = null;
    }
    levelRef.current = 0;
    setListening(false);
  }

  const toggleMic = async () => {
    if (listening) return stopListening();
    if (!SR) {
      onError('这个浏览器不支持语音识别，请用 Chrome 或 Edge；接入 FG 后会改用公司语音识别服务。');
      return;
    }
    const r = new SR();
    r.lang = 'zh-CN';
    r.interimResults = true;
    r.continuous = true;
    base.current = text ? `${text} ` : '';
    r.onresult = (e: any) => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      setText(base.current + finalText + interim);
    };
    r.onerror = (e: any) => {
      const msg: Record<string, string> = {
        'not-allowed': '麦克风权限被拒绝。请在地址栏左侧允许麦克风后再试。',
        network: '语音识别需要连接浏览器的识别服务，当前网络连不上。可以先打字；接入 FG 后改用公司语音识别。',
        'no-speech': '没有听到声音，再说一次试试。',
      };
      onError(msg[e.error] || `语音识别出错：${e.error}`);
      stopListening();
    };
    r.onend = () => { if (rec.current === r) stopListening(); };
    rec.current = r;
    try {
      r.start();
      setListening(true);
      startMeter();
    } catch (err: any) {
      onError(`无法启动语音识别：${err.message}`);
    }
  };

  return (
      <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <button type="button" className={`mic ${listening ? 'on' : ''}`} onClick={toggleMic} aria-pressed={listening} title={listening ? '停止聆听' : '按一下开始说话'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
          <span className="sr-only">{listening ? '停止聆听' : '语音输入'}</span>
        </button>
        {listening && <div className="wave" ref={bars} aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} />)}</div>}
        <label className="sr-only" htmlFor="composer-input">对美林说</label>
        <textarea
          id="composer-input"
          ref={box}
          rows={1}
          value={text}
          placeholder={listening ? '在听…松开空格或再按一下麦克风发送' : placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
          }}
        />
        <button type="submit" className="send" disabled={!text.trim() || busy}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          <span className="sr-only">发送</span>
        </button>
      </form>
  );
}
