export {};

declare global {
  interface Window {
    heic2any?: (options: { blob: Blob; toType: string; quality?: number }) => Promise<Blob | Blob[]>;
  }
}
