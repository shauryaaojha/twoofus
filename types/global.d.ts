declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    heic2any?: (options: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>;
  }
}

export {};
