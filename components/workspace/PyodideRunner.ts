/**
 * PyodideRunner — manages the Pyodide Web Worker lifecycle.
 *
 * Usage:
 *   const runner = new PyodideRunner();
 *   runner.init();                          // start loading Pyodide
 *   runner.onStatus = (state) => ...;       // 'loading' | 'ready' | 'running' | 'error'
 *   runner.onOutput = (stream, text) => ...;
 *   runner.onFigure = (base64Png) => ...;
 *   runner.onError = (message) => ...;
 *   runner.onDone = () => ...;
 *   runner.runCode(code, packages);         // execute Python
 *   runner.terminate();                     // cleanup
 */

export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error';

export class PyodideRunner {
  private worker: Worker | null = null;
  private status: PyodideStatus = 'idle';

  public onStatus: ((state: PyodideStatus) => void) | null = null;
  public onOutput: ((stream: 'stdout' | 'stderr', text: string) => void) | null = null;
  public onFigure: ((base64Png: string) => void) | null = null;
  public onError: ((message: string) => void) | null = null;
  public onDone: (() => void) | null = null;

  /** Initialize the worker and start loading Pyodide */
  init() {
    if (this.worker) return;

    this.worker = new Worker('/pyodide-worker.js');

    this.worker.onmessage = (e: MessageEvent) => {
      const { type, state, stream, text, data, message } = e.data;

      switch (type) {
        case 'status':
          this.status = state;
          this.onStatus?.(state);
          break;
        case 'output':
          // Check for embedded figure data
          if (text && text.startsWith('__FIGURE__:')) {
            const figData = text.substring('__FIGURE__:'.length).trim();
            if (figData) this.onFigure?.(figData);
          } else {
            this.onOutput?.(stream ?? 'stdout', text ?? '');
          }
          break;
        case 'figure':
          if (data) this.onFigure?.(data);
          break;
        case 'error':
          this.onError?.(message ?? 'Unknown error');
          break;
        case 'done':
          this.onDone?.();
          break;
      }
    };

    this.worker.onerror = (e: ErrorEvent) => {
      this.status = 'error';
      this.onStatus?.('error');
      this.onError?.(e.message || 'Worker error');
    };

    // Start loading Pyodide
    this.status = 'loading';
    this.onStatus?.('loading');
    this.worker.postMessage({ type: 'init' });
  }

  /** Run Python code with optional packages */
  runCode(code: string, packages?: string[]) {
    if (!this.worker) {
      this.init();
    }
    this.worker?.postMessage({ type: 'run', code, packages });
  }

  /** Get current status */
  getStatus(): PyodideStatus {
    return this.status;
  }

  /** Terminate the worker */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.status = 'idle';
  }
}
