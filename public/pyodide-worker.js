/**
 * Pyodide Web Worker — runs Python in a separate thread.
 * Loaded from /public/pyodide-worker.js (served statically).
 *
 * Protocol:
 *   Main → Worker: { type: 'run', code: string, packages?: string[] }
 *   Worker → Main: { type: 'status', state: 'loading'|'ready'|'running'|'error' }
 *                  { type: 'output', stream: 'stdout'|'stderr', text: string }
 *                  { type: 'figure', data: string }  // base64 PNG
 *                  { type: 'done' }
 *                  { type: 'error', message: string, traceback?: string }
 */

const PYODIDE_CDN_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';

let pyodide = null;
let pyodideLoadingPromise = null;

const BUILTIN_PACKAGES = new Set([
  'numpy',
  'pandas',
  'scipy',
  'matplotlib',
  'scikit-learn',
  'biopython',
  'networkx',
  'sympy',
  'regex',
  'micropip',
  'sqlite3',
  'sqlalchemy',
]);

async function loadPyodide() {
  if (pyodide) return pyodide;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = (async () => {
    postMessage({ type: 'status', state: 'loading' });

    // Load Pyodide from CDN
    importScripts(`${PYODIDE_CDN_BASE}pyodide.js`);

    pyodide = await globalThis.loadPyodide({
      indexURL: PYODIDE_CDN_BASE,
    });

    // Redirect stdout/stderr to main thread
    pyodide.setStdout({
      batched: (text) => {
        if (text) postMessage({ type: 'output', stream: 'stdout', text: text + '\n' });
      },
    });
    pyodide.setStderr({
      batched: (text) => {
        if (text) postMessage({ type: 'output', stream: 'stderr', text: text + '\n' });
      },
    });

    // Pre-load micropip for dynamic package installation
    try {
      await pyodide.loadPackage('micropip');
    } catch (e) {
      console.warn('micropip pre-load warning:', e);
    }

    postMessage({ type: 'status', state: 'ready' });
    return pyodide;
  })();

  return pyodideLoadingPromise;
}

async function ensurePackages(packages) {
  if (!packages || packages.length === 0) return;

  const py = await loadPyodide();

  for (const pkg of packages) {
    const pkgLower = pkg.toLowerCase();
    try {
      if (BUILTIN_PACKAGES.has(pkgLower)) {
        await py.loadPackage(pkgLower);
      } else {
        await py.runPythonAsync(`import micropip\nawait micropip.install('${pkg}')`);
      }
      postMessage({ type: 'output', stream: 'stdout', text: `[Loaded: ${pkg}]\n` });
    } catch (err) {
      postMessage({
        type: 'output',
        stream: 'stderr',
        text: `[Failed to load ${pkg}: ${err.message || String(err)}]\n`,
      });
    }
  }
}

async function setupMatplotlib(py) {
  try {
    await py.runPythonAsync(`
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import io as _io
    import base64 as _b64

    def _biodockify_capture_figure(*args, **kwargs):
        fig = plt.gcf()
        if fig.get_size_inches().sum() > 0:
            buf = _io.BytesIO()
            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            img_data = _b64.b64encode(buf.read()).decode()
            print(f"__FIGURE__:{img_data}")
        plt.close('all')

    plt.show = _biodockify_capture_figure
except Exception:
    pass
`);
  } catch {
    // Matplotlib not loaded yet
  }
}

async function runCode(code, packages) {
  postMessage({ type: 'status', state: 'running' });

  const py = await loadPyodide();

  // Install packages if requested
  if (packages && packages.length > 0) {
    await ensurePackages(packages);
  }

  // Set up figure capture if matplotlib is present
  await setupMatplotlib(py);

  try {
    // Run the user code
    const result = await py.runPythonAsync(code);

    // If there's a return value (not None), print it
    if (result !== undefined && result !== null) {
      const resultStr = String(result);
      if (resultStr && resultStr !== 'None') {
        postMessage({ type: 'output', stream: 'stdout', text: resultStr + '\n' });
      }
    }
  } catch (err) {
    let traceback = err.message || String(err);
    if (err.traceback) {
      traceback = err.traceback;
    }
    postMessage({ type: 'error', message: traceback, traceback });
  } finally {
    postMessage({ type: 'status', state: 'ready' });
    postMessage({ type: 'done' });
  }
}

// Message handler
self.onmessage = async function (e) {
  const { type, code, packages } = e.data;

  if (type === 'run') {
    try {
      await runCode(code, packages);
    } catch (err) {
      postMessage({ type: 'error', message: String(err) });
      postMessage({ type: 'status', state: 'error' });
      postMessage({ type: 'done' });
    }
  } else if (type === 'init') {
    try {
      await loadPyodide();
    } catch (err) {
      postMessage({ type: 'error', message: 'Failed to load Pyodide: ' + String(err) });
      postMessage({ type: 'status', state: 'error' });
    }
  }
};
