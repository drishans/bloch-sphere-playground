/**
 * Main entry point — wires together the WebGPU renderer, quantum state engine,
 * UI controls, code editor, and all interactive features.
 */
import { BlochRenderer, QUBIT_COLORS } from './renderer/webgpu-renderer';
import { QuantumState, TARGET_STATES } from './engine/quantum-state';
import type { BlochCoords, MeasureResult } from './engine/quantum-state';
import { GATES, GATES2, rotationGate, GATE_INFO } from './engine/gates';
import { formatComplex, formatAngle } from './engine/complex';
import { drawCircuitDiagram } from './ui/circuit-diagram';
import { drawHistogram } from './ui/histogram';
import { CodeEditor } from './ui/code-editor';
import type { ShaderType } from './ui/code-editor';
import { RECIPES, QUIZ_CHALLENGES, TUTORIAL_STEPS } from './recipes/index';
import { generateQASM } from './utils/qasm';
import gridWGSL from './shaders/grid.wgsl?raw';

// ── App State ──────────────────────────────────────────────
let state = new QuantumState(1);
let activeQubit = 0;
let trailEnabled = true;
const trails = new Map<number, BlochCoords[]>();
let histData: number[] | null = null;
let tutorialStep = -1; // -1 = not active

// ── Renderer ───────────────────────────────────────────────
const renderer = new BlochRenderer();
const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;

// ── DOM references ─────────────────────────────────────────
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const qubitTabs   = $<HTMLDivElement>('qubit-tabs');
const stateDisp   = $<HTMLDivElement>('state-display');
const blochCoords = $<HTMLDivElement>('bloch-coords');
const probBars    = $<HTMLDivElement>('prob-bars');
const singleGates = $<HTMLDivElement>('single-gates');
const rotGates    = $<HTMLDivElement>('rot-gates');
const entGates    = $<HTMLDivElement>('ent-gates');
const entSection  = $<HTMLElement>('entangling-section');
const gateHistory = $<HTMLDivElement>('gate-history');
const measureRes  = $<HTMLDivElement>('measure-result');
const densityGrid = $<HTMLDivElement>('density-matrix');
const circuitCvs  = $<HTMLCanvasElement>('circuit-canvas');
const histCvs     = $<HTMLCanvasElement>('hist-canvas');
const rotAngle    = $<HTMLInputElement>('rot-angle');
const rotAngleVal = $<HTMLSpanElement>('rot-angle-val');
const ctrlSelect  = $<HTMLSelectElement>('ctrl-qubit');
const tgtSelect   = $<HTMLSelectElement>('tgt-qubit');
const trailToggle = $<HTMLInputElement>('trail-toggle');
const fidTarget   = $<HTMLSelectElement>('fid-target');
const fidVal      = $<HTMLSpanElement>('fid-val');
const expX        = $<HTMLDivElement>('exp-x');
const expY        = $<HTMLDivElement>('exp-y');
const expZ        = $<HTMLDivElement>('exp-z');
const histShots   = $<HTMLInputElement>('hist-shots');
const tooltip     = $<HTMLDivElement>('tooltip');

// Tutorial bar
const tutorialBar  = $<HTMLDivElement>('tutorial-bar');
const tutorialStep$ = $<HTMLDivElement>('tutorial-step');
const tutorialText = $<HTMLDivElement>('tutorial-text');

// Modals
const recipeModal = $<HTMLDivElement>('recipe-modal');
const quizModal   = $<HTMLDivElement>('quiz-modal');
const qasmModal   = $<HTMLDivElement>('qasm-modal');
const keysModal   = $<HTMLDivElement>('keys-modal');
const recipeList  = $<HTMLDivElement>('recipe-list');
const quizContent = $<HTMLDivElement>('quiz-content');
const qasmOutput  = $<HTMLPreElement>('qasm-output');
const keysGrid    = $<HTMLDivElement>('keys-grid');

// Custom axis
const customAxis  = $<HTMLDivElement>('custom-axis');
const axisNx      = $<HTMLInputElement>('axis-nx');
const axisNy      = $<HTMLInputElement>('axis-ny');
const axisNz      = $<HTMLInputElement>('axis-nz');
const nxVal       = $<HTMLSpanElement>('nx-val');
const nyVal       = $<HTMLSpanElement>('ny-val');
const nzVal       = $<HTMLSpanElement>('nz-val');

// ── Initialization ─────────────────────────────────────────
async function init() {
  const ok = await renderer.init(canvas);
  if (!ok) {
    document.body.innerHTML = '<div style="padding:40px;color:#ff7675;font-size:18px;">WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.</div>';
    return;
  }

  buildSingleGateButtons();
  buildRotGateButtons();
  buildEntGateButtons();
  rebuildQubitTabs();
  updateEntSelects();
  buildRecipeList();
  buildQuizContent();
  buildShortcutsGrid();
  initCodeEditor();
  setupCameraControls();
  setupKeyboardShortcuts();
  setupToolbarButtons();
  setupActionButtons();

  trailToggle.checked = trailEnabled;
  trailToggle.addEventListener('change', () => { trailEnabled = trailToggle.checked; });

  rotAngle.addEventListener('input', () => {
    rotAngleVal.textContent = formatAngle(parseFloat(rotAngle.value));
  });

  // Custom axis value displays
  for (const [input, display] of [[axisNx, nxVal], [axisNy, nyVal], [axisNz, nzVal]] as [HTMLInputElement, HTMLSpanElement][]) {
    input.addEventListener('input', () => { display.textContent = parseFloat(input.value).toFixed(2); });
  }

  fidTarget.addEventListener('change', updateUI);

  $('btn-run-hist').addEventListener('click', () => {
    const shots = parseInt(histShots.value) || 1024;
    histData = state.simulateMeasurements(shots);
    drawHistogram(histCvs, histData, state.n);
  });

  requestAnimationFrame(frame);
  updateUI();
}

// ── Animation loop ─────────────────────────────────────────
function frame() {
  const blochs: BlochCoords[] = [];
  for (let q = 0; q < state.n; q++) {
    const b = state.getBloch(q);
    blochs.push(b);
    // Record trail
    if (trailEnabled) {
      if (!trails.has(q)) trails.set(q, []);
      const trail = trails.get(q)!;
      const last = trail[trail.length - 1];
      if (!last || Math.abs(last.x - b.x) > 0.001 || Math.abs(last.y - b.y) > 0.001 || Math.abs(last.z - b.z) > 0.001) {
        trail.push(b);
        if (trail.length > 200) trail.shift();
      }
    }
  }

  renderer.render(blochs, activeQubit, trails, trailEnabled);
  requestAnimationFrame(frame);
}

// ── UI Update ──────────────────────────────────────────────
function updateUI() {
  updateStateDisplay();
  updateBlochCoords();
  updateProbBars();
  updateGateHistory();
  updateDensityMatrix();
  updateExpectations();
  updateFidelity();
  drawCircuitDiagram(circuitCvs, state.n, state.history);
  drawHistogram(histCvs, histData, state.n);
  updateEntVisibility();
}

function updateStateDisplay() {
  const amps = state.amps;
  const n = state.n;
  let html = '|&psi;&rang; = ';
  const terms: string[] = [];
  for (let i = 0; i < state.dim; i++) {
    const a = amps[i];
    if (a.abs2() < 1e-8) continue;
    const label = `|${i.toString(2).padStart(n, '0')}&rang;`;
    const coeff = formatComplex(a);
    terms.push(`${coeff}${label}`);
  }
  html += terms.length > 0 ? terms.join(' + ').replace(/\+ -/g, '- ') : '0';
  stateDisp.innerHTML = html;
}

function updateBlochCoords() {
  const b = state.getBloch(activeQubit);
  blochCoords.innerHTML = `<span>x: ${b.x.toFixed(3)}</span> <span>y: ${b.y.toFixed(3)}</span> <span>z: ${b.z.toFixed(3)}</span>`;
}

function updateProbBars() {
  const probs = state.getProbs();
  const n = state.n;
  let html = '';
  for (let i = 0; i < state.dim; i++) {
    const p = probs[i];
    const label = `|${i.toString(2).padStart(n, '0')}\u27E9`;
    const pct = (p * 100).toFixed(1);
    const color = QUBIT_COLORS[i % QUBIT_COLORS.length];
    const colorStr = `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`;
    html += `<div class="prob-row">
      <span class="prob-label">${label}</span>
      <div class="prob-track"><div class="prob-fill" style="width:${pct}%;background:${colorStr}"></div></div>
      <span class="prob-pct">${pct}%</span>
    </div>`;
  }
  probBars.innerHTML = html;
}

function updateGateHistory() {
  if (state.history.length === 0) {
    gateHistory.innerHTML = '<span class="empty-hist">No gates applied</span>';
    return;
  }
  let html = '';
  for (const h of state.history) {
    const qLabel = h.qubits.map(q => `q${q}`).join(',');
    html += `<span class="hist-chip" title="${h.gate} on ${qLabel}">${h.gate}</span>`;
  }
  gateHistory.innerHTML = html;
}

function updateDensityMatrix() {
  const rho = state.getReducedDensity(activeQubit);
  const labels = ['0', '1'];
  let html = '<table class="dm-table"><tr><td></td>';
  for (const l of labels) html += `<td class="dm-header">${l}</td>`;
  html += '</tr>';
  for (let r = 0; r < 2; r++) {
    html += `<tr><td class="dm-header">${labels[r]}</td>`;
    for (let c = 0; c < 2; c++) {
      const val = rho[r * 2 + c];
      const mag = val.abs();
      const opacity = Math.max(0.2, mag);
      html += `<td class="dm-cell" style="opacity:${opacity}" title="${val.toString(4)}">${formatComplex(val)}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  densityGrid.innerHTML = html;
}

function updateExpectations() {
  expX.textContent = state.expectation('X', activeQubit).toFixed(3);
  expY.textContent = state.expectation('Y', activeQubit).toFixed(3);
  expZ.textContent = state.expectation('Z', activeQubit).toFixed(3);
}

function updateFidelity() {
  const targetKey = fidTarget.value;
  const target = TARGET_STATES[targetKey];
  if (target) {
    fidVal.textContent = state.fidelityTo(activeQubit, target).toFixed(3);
  }
}

function updateEntVisibility() {
  entSection.style.display = state.n >= 2 ? '' : 'none';
}

// ── Gate Buttons ───────────────────────────────────────────
function buildSingleGateButtons() {
  const gates = ['X', 'Y', 'Z', 'H', 'S', 'Sd', 'T', 'Td'];
  singleGates.innerHTML = '';
  for (const g of gates) {
    const info = GATE_INFO[g];
    const btn = document.createElement('button');
    btn.className = 'gate-btn';
    btn.style.borderColor = info.color;
    btn.style.color = info.color;
    btn.textContent = info.label;
    btn.title = info.desc;
    btn.addEventListener('click', () => applyGate(g));
    btn.addEventListener('mouseenter', (e) => showTooltip(e, info.desc));
    btn.addEventListener('mouseleave', hideTooltip);
    singleGates.appendChild(btn);
  }

  // Add qubit button
  const addBtn = document.createElement('button');
  addBtn.className = 'gate-btn add-qubit-btn';
  addBtn.textContent = '+';
  addBtn.title = 'Add qubit (max 4)';
  addBtn.addEventListener('click', () => {
    if (state.n < 4) {
      state.addQubit();
      trails.clear();
      histData = null;
      rebuildQubitTabs();
      updateEntSelects();
      updateUI();
    }
  });
  singleGates.appendChild(addBtn);
}

function buildRotGateButtons() {
  const rotations = ['Rx', 'Ry', 'Rz', 'Rn'];
  rotGates.innerHTML = '';
  for (const r of rotations) {
    const btn = document.createElement('button');
    btn.className = 'gate-btn';
    btn.style.borderColor = '#a29bfe';
    btn.style.color = '#a29bfe';
    btn.textContent = r;
    btn.title = r === 'Rn' ? 'Rotation around custom axis' : `Rotation around ${r[1].toUpperCase()}-axis`;
    btn.addEventListener('click', () => {
      const angle = parseFloat(rotAngle.value);
      if (r === 'Rn') {
        customAxis.style.display = customAxis.style.display === 'none' ? '' : 'none';
        if (customAxis.style.display !== 'none') return;
        const nx = parseFloat(axisNx.value);
        const ny = parseFloat(axisNy.value);
        const nz = parseFloat(axisNz.value);
        const gate = rotationGate({ nx, ny, nz }, angle);
        state.applySingleGate(gate, activeQubit, `Rn(${formatAngle(angle)})`);
      } else {
        const axis = r[1].toLowerCase();
        const gate = rotationGate(axis, angle);
        state.applySingleGate(gate, activeQubit, `${r}(${formatAngle(angle)})`);
      }
      histData = null;
      updateUI();
    });
    rotGates.appendChild(btn);
  }
}

function buildEntGateButtons() {
  const gates = ['CNOT', 'CZ', 'SWAP', 'CH'];
  entGates.innerHTML = '';
  for (const g of gates) {
    const info = GATE_INFO[g];
    const btn = document.createElement('button');
    btn.className = 'gate-btn';
    btn.style.borderColor = info.color;
    btn.style.color = info.color;
    btn.textContent = info.label;
    btn.title = info.desc;
    btn.addEventListener('click', () => {
      const ctrl = parseInt(ctrlSelect.value);
      const tgt = parseInt(tgtSelect.value);
      if (ctrl === tgt) return;
      state.applyTwoQubitGate(GATES2[g], ctrl, tgt, g);
      histData = null;
      updateUI();
    });
    entGates.appendChild(btn);
  }
}

function applyGate(name: string) {
  const gate = GATES[name];
  if (gate) {
    state.applySingleGate(gate, activeQubit, name);
    histData = null;
    updateUI();
  }
}

// ── Qubit Tabs ─────────────────────────────────────────────
function rebuildQubitTabs() {
  qubitTabs.innerHTML = '';
  for (let q = 0; q < state.n; q++) {
    const btn = document.createElement('button');
    const color = QUBIT_COLORS[q % QUBIT_COLORS.length];
    btn.className = `qubit-tab${q === activeQubit ? ' active' : ''}`;
    btn.style.borderColor = `rgb(${Math.round(color[0] * 255)},${Math.round(color[1] * 255)},${Math.round(color[2] * 255)})`;
    btn.textContent = `q${q}`;
    btn.addEventListener('click', () => {
      activeQubit = q;
      rebuildQubitTabs();
      updateUI();
    });
    qubitTabs.appendChild(btn);
  }
}

function updateEntSelects() {
  ctrlSelect.innerHTML = '';
  tgtSelect.innerHTML = '';
  for (let q = 0; q < state.n; q++) {
    ctrlSelect.add(new Option(`q${q}`, String(q)));
    tgtSelect.add(new Option(`q${q}`, String(q)));
  }
  if (state.n >= 2) tgtSelect.value = '1';
}

// ── Toolbar Buttons ────────────────────────────────────────
function setupToolbarButtons() {
  // Tutorial
  $('btn-tutorial').addEventListener('click', () => {
    tutorialStep = 0;
    showTutorialStep();
  });
  $('tutorial-next').addEventListener('click', () => {
    tutorialStep++;
    if (tutorialStep >= TUTORIAL_STEPS.length) { closeTutorial(); return; }
    showTutorialStep();
  });
  $('tutorial-prev').addEventListener('click', () => {
    if (tutorialStep > 0) tutorialStep--;
    showTutorialStep();
  });
  $('tutorial-close').addEventListener('click', closeTutorial);

  // Modals
  $('btn-recipes').addEventListener('click', () => { recipeModal.classList.add('active'); });
  $('recipe-close').addEventListener('click', () => { recipeModal.classList.remove('active'); });
  $('btn-quiz').addEventListener('click', () => { quizModal.classList.add('active'); });
  $('quiz-close').addEventListener('click', () => { quizModal.classList.remove('active'); });
  $('btn-qasm').addEventListener('click', () => {
    qasmOutput.textContent = generateQASM(state.n, state.history);
    qasmModal.classList.add('active');
  });
  $('qasm-close').addEventListener('click', () => { qasmModal.classList.remove('active'); });
  $('btn-keys').addEventListener('click', () => { keysModal.classList.add('active'); });
  $('keys-close').addEventListener('click', () => { keysModal.classList.remove('active'); });

  // Copy QASM
  $('btn-copy-qasm').addEventListener('click', () => {
    navigator.clipboard.writeText(qasmOutput.textContent || '');
    ($('btn-copy-qasm') as HTMLButtonElement).textContent = 'Copied!';
    setTimeout(() => { ($('btn-copy-qasm') as HTMLButtonElement).textContent = 'Copy'; }, 1500);
  });

  // Close modals on overlay click
  for (const modal of [recipeModal, quizModal, qasmModal, keysModal]) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Save / Load / Share
  $('btn-save').addEventListener('click', saveState);
  $('btn-load').addEventListener('click', loadState);
  $('btn-share').addEventListener('click', shareState);
}

function setupActionButtons() {
  $('btn-undo').addEventListener('click', () => { state.undo(); histData = null; updateUI(); });
  $('btn-reset').addEventListener('click', () => {
    state.reset(); trails.clear(); histData = null; activeQubit = 0;
    rebuildQubitTabs(); updateUI();
  });
  $('btn-random').addEventListener('click', () => {
    const gates = ['X', 'Y', 'Z', 'H', 'S', 'T'];
    const count = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const g = gates[Math.floor(Math.random() * gates.length)];
      const q = Math.floor(Math.random() * state.n);
      state.applySingleGate(GATES[g], q, g);
    }
    histData = null;
    updateUI();
  });

  // Measurement
  $('btn-mz').addEventListener('click', () => showMeasure(state.measureQubit(activeQubit, 'z')));
  $('btn-mx').addEventListener('click', () => showMeasure(state.measureQubit(activeQubit, 'x')));
  $('btn-my').addEventListener('click', () => showMeasure(state.measureQubit(activeQubit, 'y')));
}

function showMeasure(result: MeasureResult) {
  measureRes.innerHTML = `<span class="measure-outcome">${result.label}</span> <span class="measure-prob">(p=${result.prob.toFixed(3)})</span>`;
  histData = null;
  updateUI();
}

// ── Tutorial ───────────────────────────────────────────────
function showTutorialStep() {
  if (tutorialStep < 0 || tutorialStep >= TUTORIAL_STEPS.length) return;
  const step = TUTORIAL_STEPS[tutorialStep];
  tutorialBar.classList.add('active');
  tutorialStep$.textContent = `${tutorialStep + 1}/${TUTORIAL_STEPS.length}`;
  tutorialText.innerHTML = `<strong>${step.title}</strong>: ${step.text}`;
}

function closeTutorial() {
  tutorialStep = -1;
  tutorialBar.classList.remove('active');
}

// ── Recipes ────────────────────────────────────────────────
function buildRecipeList() {
  recipeList.innerHTML = '';
  for (const recipe of RECIPES) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `<h4>${recipe.name}</h4><p>${recipe.desc}</p><small>Min qubits: ${recipe.minQubits}</small>`;
    card.addEventListener('click', () => executeRecipe(recipe));
    recipeList.appendChild(card);
  }
}

function executeRecipe(recipe: typeof RECIPES[0]) {
  // Ensure enough qubits
  while (state.n < recipe.minQubits) {
    state.addQubit();
  }
  state.reset();
  trails.clear();
  histData = null;

  if (recipe.steps === 'hadamard_all') {
    for (let q = 0; q < state.n; q++) {
      state.applySingleGate(GATES.H, q, 'H');
    }
  } else {
    for (const step of recipe.steps) {
      if (step.type === 'single' && step.qubit !== undefined) {
        const gate = GATES[step.gate];
        if (gate) state.applySingleGate(gate, step.qubit, step.gate);
      } else if (step.type === 'two' && step.q1 !== undefined && step.q2 !== undefined) {
        const gate = GATES2[step.gate];
        if (gate) state.applyTwoQubitGate(gate, step.q1, step.q2, step.gate);
      }
    }
  }

  // Update code editor with recipe source
  if (codeEditor && recipe.source) {
    codeEditor.setSource('sphere', recipe.source);
  }

  rebuildQubitTabs();
  updateEntSelects();
  updateUI();
  recipeModal.classList.remove('active');
}

// ── Quiz ───────────────────────────────────────────────────
function buildQuizContent() {
  quizContent.innerHTML = '';
  for (let i = 0; i < QUIZ_CHALLENGES.length; i++) {
    const ch = QUIZ_CHALLENGES[i];
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `<h4>Challenge: Reach ${ch.label}</h4><p>${ch.hint}</p>`;
    card.addEventListener('click', () => startQuiz(i));
    quizContent.appendChild(card);
  }
}

function startQuiz(idx: number) {
  const ch = QUIZ_CHALLENGES[idx];
  state = new QuantumState(1);
  trails.clear();
  histData = null;
  activeQubit = 0;

  // Apply start gates if any
  if (ch.startGates) {
    for (const g of ch.startGates) {
      const gate = GATES[g];
      if (gate) state.applySingleGate(gate, 0, g);
    }
  }

  rebuildQubitTabs();
  updateEntSelects();
  updateUI();
  quizModal.classList.remove('active');

  // Store quiz target for checking
  (window as any).__quizTarget = ch;
  measureRes.innerHTML = `<span class="measure-outcome">Quiz: reach ${ch.label}</span>`;
}

// ── Save / Load / Share ────────────────────────────────────
function saveState() {
  const data = state.serialize();
  localStorage.setItem('bloch-v2-save', data);
  showToast('State saved!');
}

function loadState() {
  const data = localStorage.getItem('bloch-v2-save');
  if (data) {
    try {
      state = QuantumState.deserialize(data);
      trails.clear();
      histData = null;
      activeQubit = 0;
      rebuildQubitTabs();
      updateEntSelects();
      updateUI();
      showToast('State loaded!');
    } catch { showToast('Failed to load state'); }
  } else {
    showToast('No saved state found');
  }
}

function shareState() {
  const data = state.serialize();
  const encoded = btoa(data);
  const url = `${window.location.origin}${window.location.pathname}#state=${encoded}`;
  navigator.clipboard.writeText(url);
  showToast('Share link copied!');
}

function loadFromHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#state=')) {
    try {
      const data = atob(hash.slice(7));
      state = QuantumState.deserialize(data);
      trails.clear();
      histData = null;
      activeQubit = 0;
      rebuildQubitTabs();
      updateEntSelects();
    } catch { /* ignore bad hash */ }
  }
}

// ── Code Editor ────────────────────────────────────────────
let codeEditor: CodeEditor | null = null;

function initCodeEditor() {
  const bottomPanel = $('bottom-panel');
  codeEditor = new CodeEditor(
    bottomPanel,
    {
      sphere: renderer.sphereShaderSource,
      line: renderer.lineShaderSource,
      grid: gridWGSL,
    },
    {
      onRecompile: (type: ShaderType, source: string) => {
        if (type === 'sphere') return renderer.recompileSphereShader(source);
        if (type === 'line') return renderer.recompileLineShader(source);
        // Grid shader — no live recompile currently, show info
        return null;
      },
    },
  );
}

// ── Camera Controls ────────────────────────────────────────
function setupCameraControls() {
  let dragging = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.camera.cameraPhi += dx * 0.01;
    renderer.camera.cameraTheta = Math.max(0.1, Math.min(Math.PI - 0.1, renderer.camera.cameraTheta - dy * 0.01));
  });

  window.addEventListener('mouseup', () => { dragging = false; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    renderer.camera.cameraDist = Math.max(1.5, Math.min(10, renderer.camera.cameraDist + e.deltaY * 0.005));
  }, { passive: false });

  // Touch support
  let lastTouch: Touch | null = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) lastTouch = e.touches[0];
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouch) {
      const t = e.touches[0];
      const dx = t.clientX - lastTouch.clientX;
      const dy = t.clientY - lastTouch.clientY;
      renderer.camera.cameraPhi += dx * 0.01;
      renderer.camera.cameraTheta = Math.max(0.1, Math.min(Math.PI - 0.1, renderer.camera.cameraTheta - dy * 0.01));
      lastTouch = t;
    }
  }, { passive: false });
  canvas.addEventListener('touchend', () => { lastTouch = null; });
}

// ── Keyboard Shortcuts ─────────────────────────────────────
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Don't handle shortcuts when typing in inputs
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

    const key = e.key.toLowerCase();

    // Gate shortcuts
    if (key === 'x') applyGate('X');
    else if (key === 'y') applyGate('Y');
    else if (key === 'z' && !e.ctrlKey && !e.metaKey) applyGate('Z');
    else if (key === 'h') applyGate('H');
    else if (key === 's' && !e.ctrlKey && !e.metaKey) applyGate('S');
    else if (key === 't') applyGate('T');

    // Qubit selection
    else if (key >= '1' && key <= '4') {
      const q = parseInt(key) - 1;
      if (q < state.n) { activeQubit = q; rebuildQubitTabs(); updateUI(); }
    }

    // Undo
    else if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      state.undo(); histData = null; updateUI();
    }

    // Measurement
    else if (key === 'm') {
      showMeasure(state.measureQubit(activeQubit, 'z'));
    }

    // Reset
    else if (key === 'r' && !e.ctrlKey && !e.metaKey) {
      state.reset(); trails.clear(); histData = null; activeQubit = 0;
      rebuildQubitTabs(); updateUI();
    }

    // Escape closes modals
    else if (key === 'escape') {
      recipeModal.classList.remove('active');
      quizModal.classList.remove('active');
      qasmModal.classList.remove('active');
      keysModal.classList.remove('active');
      closeTutorial();
    }
  });
}

function buildShortcutsGrid() {
  const shortcuts = [
    ['X / Y / Z / H / S / T', 'Apply gate'],
    ['1 / 2 / 3 / 4', 'Select qubit'],
    ['M', 'Measure Z'],
    ['R', 'Reset state'],
    ['Ctrl+Z', 'Undo last gate'],
    ['Esc', 'Close modal/tutorial'],
    ['Drag', 'Rotate camera'],
    ['Scroll', 'Zoom in/out'],
  ];
  keysGrid.innerHTML = '';
  for (const [key, desc] of shortcuts) {
    keysGrid.innerHTML += `<div class="shortcut-key">${key}</div><div class="shortcut-desc">${desc}</div>`;
  }
}

// ── Tooltip ────────────────────────────────────────────────
function showTooltip(e: MouseEvent, text: string) {
  tooltip.textContent = text;
  tooltip.style.display = 'block';
  tooltip.style.left = `${e.pageX + 12}px`;
  tooltip.style.top = `${e.pageY - 30}px`;
}

function hideTooltip() {
  tooltip.style.display = 'none';
}

// ── Toast notification ─────────────────────────────────────
function showToast(msg: string) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000);
}

// ── Boot ───────────────────────────────────────────────────
loadFromHash();
init();
