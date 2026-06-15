import { useCallback, useEffect, useRef, useState } from 'react';

const READ_GAP_MS = 1000;
const DUPLICATE_WINDOW_MS = 1500;
const MIN_UID_LENGTH = 4;

export function useNfcReader({ active, onRead }) {
  const [lastRead, setLastRead] = useState(null);
  const [serialStatus, setSerialStatus] = useState('disconnected');
  const [webNfcStatus, setWebNfcStatus] = useState('idle');
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const recentReadsRef = useRef(new Map());
  const activeRef = useRef(active);
  const onReadRef = useRef(onRead);
  const serialAbortRef = useRef(null);
  const webNfcAbortRef = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  const processRead = useCallback(
    (rawValue, source = 'keyboard') => {
      const nfcUid = sanitizeNfcUid(rawValue);

      if (!activeRef.current || nfcUid.length < MIN_UID_LENGTH) {
        return;
      }

      const now = Date.now();
      const previousTime = recentReadsRef.current.get(nfcUid);

      if (previousTime && now - previousTime < DUPLICATE_WINDOW_MS) {
        return;
      }

      recentReadsRef.current.set(nfcUid, now);
      setLastRead({
        uid: nfcUid,
        source,
        readAt: new Date(),
      });
      onReadRef.current(nfcUid, source);
    },
    [],
  );

  useEffect(() => {
    if (!active) {
      bufferRef.current = '';
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Evitar interceptar teclas si el usuario está escribiendo en un campo
      const targetTag = event.target?.tagName?.toUpperCase();
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || event.target?.isContentEditable) {
        return;
      }

      const now = Date.now();

      if (event.key === 'Enter') {
        const value = bufferRef.current;
        bufferRef.current = '';

        if (value) {
          event.preventDefault();
          processRead(value, 'keyboard');
        }

        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      if (now - lastKeyTimeRef.current > READ_GAP_MS) {
        bufferRef.current = '';
      }

      bufferRef.current += event.key;
      lastKeyTimeRef.current = now;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [active, processRead]);

  const connectSerial = useCallback(async () => {
    if (!('serial' in navigator)) {
      setSerialStatus('unsupported');
      throw new Error('Web Serial no esta disponible en este navegador.');
    }

    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    const abortController = new AbortController();
    serialAbortRef.current = abortController;
    setSerialStatus('connected');

    const decoder = new TextDecoderStream();
    const readableClosed = port.readable.pipeTo(decoder.writable, {
      signal: abortController.signal,
    });
    const reader = decoder.readable.getReader();
    let lineBuffer = '';

    try {
      while (!abortController.signal.aborted) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        lineBuffer += value;
        const lines = lineBuffer.split(/\r?\n/);
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          processRead(line, 'serial');
        }
      }
    } finally {
      reader.releaseLock();
      await readableClosed.catch(() => undefined);
      await port.close().catch(() => undefined);
      setSerialStatus('disconnected');
    }
  }, [processRead]);

  const disconnectSerial = useCallback(() => {
    serialAbortRef.current?.abort();
    serialAbortRef.current = null;
    setSerialStatus('disconnected');
  }, []);

  const startWebNfc = useCallback(async () => {
    if (!('NDEFReader' in window)) {
      setWebNfcStatus('unsupported');
      throw new Error('Web NFC no esta disponible en este navegador. Use lector USB NFC en PC.');
    }

    const controller = new AbortController();
    webNfcAbortRef.current = controller;
    const reader = new window.NDEFReader();
    await reader.scan({ signal: controller.signal });
    setWebNfcStatus('active');

    reader.onreading = (event) => {
      processRead(event.serialNumber || '', 'web-nfc');
    };
  }, [processRead]);

  const stopWebNfc = useCallback(() => {
    webNfcAbortRef.current?.abort();
    webNfcAbortRef.current = null;
    setWebNfcStatus('idle');
  }, []);

  return {
    lastRead,
    serialStatus,
    webNfcStatus,
    connectSerial,
    disconnectSerial,
    startWebNfc,
    stopWebNfc,
  };
}

export function sanitizeNfcUid(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^\da-zA-Z:_-]/g, '')
    .toUpperCase();
}
