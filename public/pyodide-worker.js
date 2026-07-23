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

let pyodide = null;
let pyodideReady = false;

async function loadPyodide() {
  if (pyodideReady) return pyodide;

  postMessage({ type: 'status', state: 'loading' });

  // Load Pyodide from CDN
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js');

  pyodide = await globalThis.loadPyodide();

  // Redirect stdout/stderr to main thread
  pyodide.setStdout({
    batched: (text) => {
      if (text) postMessage({ type: 'output', stream: 'stdout', text });
    },
  });
  pyodide.setStderr({
    batched: (text) => {
      if (text) postMessage({ type: 'output', stream: 'stderr', text });
    },
  });

  // Pre-load common packages
  await pyodide.loadPackage(['micropip']);

  pyodideReady = true;
  postMessage({ type: 'status', state: 'ready' });

  return pyodide;
}

async function ensurePackages(packages) {
  if (!packages || packages.length === 0) return;

  const py = await loadPyodide();

  for (const pkg of packages) {
    try {
      // Try loading from Pyodide's built-in packages first (faster)
      if (['numpy', 'pandas', 'scipy', 'matplotlib', 'networkx', 'sympy', 'regex', 'micropip'].includes(pkg)) {
        await py.loadPackage(pkg);
      } else {
        // Use micropip for packages not in the default set (e.g., rdkit)
        await py.runPythonAsync(`import micropip; await micropip.install('${pkg}')`);
      }
      postMessage({ type: 'output', stream: 'stdout', text: `[Loaded: ${pkg}]\n` });
    } catch (err) {
      postMessage({ type: 'output', stream: 'stderr', text: `[Failed to load ${pkg}: ${err.message}]\n` });
    }
  }
}

async function runCode(code, packages) {
  const py = await loadPyodide();

  // Install packages if requested
  if (packages && packages.length > 0) {
    await ensurePackages(packages);
  }

  // Set up matplotlib for inline rendering (capture figures as base64)
  try {
    await py.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import io as _io
import base64 as _b64

class _FigureCapture:
    def __init__(self):
        self._orig_show = matplotlib.pyplot.show
        matplotlib.pyplot.show = self._capture
    def _capture(self, *args, **kwargs):
        fig = matplotlib.pyplot.gcf()
        if fig.get_size_inches().sum() > 0:
            buf = _io.BytesIO()
            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            img_data = _b64.b64encode(buf.read()).decode()
            print(f"__FIGURE__:{img_data}")
        matplotlib.pyplot.close('all')

_fig_cap = _FigureCapture()
`);
  } catch {
    // matplotlib not available yet — that's ok
  }

  postMessage({ type: 'status', state: 'running' });

  try {
    // Run the user code
    const result = await py.runPythonAsync(code);

    // If there's a non-None result, print it
    if (result !== undefined && result !== null) {
      const resultStr = String(result);
      if (resultStr && resultStr !== 'None') {
        postMessage({ type: 'output', stream: 'stdout', text: resultStr + '\n' });
      }
    }

    postMessage({ type: 'status', state: 'ready' });
    postMessage({ type: 'done' });
  } catch (err) {
    let traceback = err.message || String(err);

    // Try to extract Python traceback
    if (err.traceback) {
      traceback = err.traceback;
    }

    postMessage({ type: 'error', message: traceback, traceback });
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
