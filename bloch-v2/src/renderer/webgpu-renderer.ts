/**
 * WebGPU Bloch sphere renderer.
 * Handles device init, pipeline creation, and per-frame drawing.
 */
import sphereWGSL from '../shaders/sphere.wgsl?raw';
import lineWGSL from '../shaders/line.wgsl?raw';
import { createSphere, createCircle, createArrow, type SphereGeo } from '../utils/geometry';
import { mat4Identity, mat4Perspective, mat4LookAt, mat4Mul, mat4RotateX, mat4RotateZ, project3Dto2D } from '../utils/math';
import type { BlochCoords } from '../engine/quantum-state';

export const QUBIT_COLORS: [number, number, number][] = [
  [0.42, 0.36, 0.91],
  [0.0, 0.81, 0.79],
  [0.99, 0.47, 0.66],
  [1.0, 0.92, 0.65],
];

export interface RendererState {
  cameraTheta: number;
  cameraPhi: number;
  cameraDist: number;
}

export class BlochRenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private depthTexture!: GPUTexture;

  // Pipelines
  private spherePipeline!: GPURenderPipeline;
  private linePipeline!: GPURenderPipeline;

  // Static geometry
  private sphereGeo!: SphereGeo;
  private sphereVB!: GPUBuffer;
  private sphereIB!: GPUBuffer;
  private circleVB!: GPUBuffer;
  private circleVertCount!: number;
  private axisBuffers!: { buf: GPUBuffer; count: number }[];

  // Dynamic buffers
  private dynVB!: GPUBuffer;
  private dynMaxVerts = 4096;

  // Uniform buffers
  private sphereUB!: GPUBuffer;
  private lineUB!: GPUBuffer;
  private sphereBG!: GPUBindGroup;
  private lineBG!: GPUBindGroup;

  // Text overlay
  private textCanvas!: HTMLCanvasElement;
  private textCtx!: CanvasRenderingContext2D;

  // Public camera
  camera: RendererState = { cameraTheta: 0.6, cameraPhi: 0.8, cameraDist: 3.5 };

  private canvas!: HTMLCanvasElement;
  private _currentShaderSource = sphereWGSL; // tracks live-editable source
  private _lineShaderSource = lineWGSL;

  get sphereShaderSource(): string { return this._currentShaderSource; }
  get lineShaderSource(): string { return this._lineShaderSource; }

  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    this.canvas = canvas;
    if (!navigator.gpu) return false;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;

    this.device = await adapter.requestDevice();
    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format, alphaMode: 'premultiplied' });

    this._createTextOverlay();
    this._createGeometry();
    this._createBuffers();
    this._createPipelines();
    this._resize();

    window.addEventListener('resize', () => this._resize());
    return true;
  }

  /** Attempt to recompile sphere shader from edited source. Returns error or null. */
  recompileSphereShader(source: string): string | null {
    try {
      const module = this.device.createShaderModule({ code: source });
      // We can't synchronously check for errors, but we can try to recreate pipeline
      this._currentShaderSource = source;
      this._createPipelines();
      return null;
    } catch (e: any) {
      return e.message || 'Shader compilation error';
    }
  }

  recompileLineShader(source: string): string | null {
    try {
      this._lineShaderSource = source;
      this._createPipelines();
      return null;
    } catch (e: any) {
      return e.message || 'Shader compilation error';
    }
  }

  private _createTextOverlay(): void {
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10;';
    this.canvas.parentElement?.appendChild(this.textCanvas);
    this.textCtx = this.textCanvas.getContext('2d')!;
  }

  private _createGeometry(): void {
    this.sphereGeo = createSphere(0.98, 48, 32);
    const circle = createCircle(1.0, 80);
    this.circleVertCount = circle.length / 3;

    // Sphere vertex buffer (interleaved pos+normal, stride=24)
    this.sphereVB = this._createBufferInit(this.sphereGeo.vertices, GPUBufferUsage.VERTEX);
    this.sphereIB = this._createBufferInit(this.sphereGeo.indices, GPUBufferUsage.INDEX);
    this.circleVB = this._createBufferInit(circle, GPUBufferUsage.VERTEX);

    // Axes
    const axes = [
      createArrow([-1.3, 0, 0], [1.3, 0, 0]),
      createArrow([0, -1.3, 0], [0, 1.3, 0]),
      createArrow([0, 0, -1.3], [0, 0, 1.3]),
    ];
    this.axisBuffers = axes.map(data => ({
      buf: this._createBufferInit(data, GPUBufferUsage.VERTEX),
      count: data.length / 3,
    }));
  }

  private _createBuffers(): void {
    // Dynamic vertex buffer for state vectors, trails, etc.
    this.dynVB = this.device.createBuffer({
      size: this.dynMaxVerts * 3 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Uniform buffers — sphere: 4x4 mvp + 4x4 model + vec3 color + f32 alpha + vec3 lightDir + pad = 160 bytes
    this.sphereUB = this.device.createBuffer({ size: 160, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    // Line: 4x4 mvp + vec3 color + f32 alpha + f32 pointSize + 3xpad = 96 bytes
    this.lineUB = this.device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  }

  private _createPipelines(): void {
    const sphereModule = this.device.createShaderModule({ code: this._currentShaderSource });
    const lineModule = this.device.createShaderModule({ code: this._lineShaderSource });

    const sphereBGL = this.device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }],
    });
    const lineBGL = this.device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }],
    });

    this.sphereBG = this.device.createBindGroup({
      layout: sphereBGL,
      entries: [{ binding: 0, resource: { buffer: this.sphereUB } }],
    });
    this.lineBG = this.device.createBindGroup({
      layout: lineBGL,
      entries: [{ binding: 0, resource: { buffer: this.lineUB } }],
    });

    const depthStencil: GPUDepthStencilState = {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    };

    const blendState: GPUBlendState = {
      color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    };

    this.spherePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [sphereBGL] }),
      vertex: {
        module: sphereModule, entryPoint: 'vs',
        buffers: [{
          arrayStride: 24, // 6 floats: pos(3) + normal(3)
          attributes: [
            { format: 'float32x3', offset: 0, shaderLocation: 0 },
            { format: 'float32x3', offset: 12, shaderLocation: 1 },
          ],
        }],
      },
      fragment: {
        module: sphereModule, entryPoint: 'fs',
        targets: [{ format: this.format, blend: blendState }],
      },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil,
    });

    this.linePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [lineBGL] }),
      vertex: {
        module: lineModule, entryPoint: 'vs',
        buffers: [{ arrayStride: 12, attributes: [{ format: 'float32x3', offset: 0, shaderLocation: 0 }] }],
      },
      fragment: {
        module: lineModule, entryPoint: 'fs',
        targets: [{ format: this.format, blend: blendState }],
      },
      primitive: { topology: 'line-list' },
      depthStencil,
    });
  }

  private _createBufferInit(data: Float32Array | Uint16Array, usage: number): GPUBuffer {
    const buf = this.device.createBuffer({
      size: Math.max(data.byteLength, 4),
      usage: usage | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    if (data instanceof Float32Array) new Float32Array(buf.getMappedRange()).set(data);
    else new Uint16Array(buf.getMappedRange()).set(data);
    buf.unmap();
    return buf;
  }

  private _resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (w === 0 || h === 0) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.textCanvas.width = w;
    this.textCanvas.height = h;
    this.textCanvas.style.width = rect.width + 'px';
    this.textCanvas.style.height = rect.height + 'px';

    if (this.depthTexture) this.depthTexture.destroy();
    this.depthTexture = this.device.createTexture({
      size: { width: w, height: h },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  /** Main render call. Pass per-qubit Bloch coordinates and trail data. */
  render(
    qubitBlochs: BlochCoords[],
    activeQubit: number,
    trails: Map<number, BlochCoords[]>,
    trailEnabled: boolean,
  ): void {
    if (!this.device || this.canvas.width === 0) return;

    const { cameraTheta, cameraPhi, cameraDist } = this.camera;
    const aspect = this.canvas.width / this.canvas.height;

    const eye: [number, number, number] = [
      cameraDist * Math.sin(cameraTheta) * Math.cos(cameraPhi),
      cameraDist * Math.cos(cameraTheta),
      cameraDist * Math.sin(cameraTheta) * Math.sin(cameraPhi),
    ];

    const proj = mat4Perspective(Math.PI / 4, aspect, 0.1, 100);
    const view = mat4LookAt(eye, [0, 0, 0], [0, 1, 0]);
    const vp = mat4Mul(proj, view);
    const model = mat4Identity();
    const mvp = mat4Mul(vp, model);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.04, g: 0.04, b: 0.06, a: 1 },
        loadOp: 'clear', storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    // 1. Draw sphere (translucent)
    this._writeSphereUniforms(mvp, model, [0.15, 0.15, 0.22], 0.3, [0.5, 0.8, 0.6]);
    pass.setPipeline(this.spherePipeline);
    pass.setBindGroup(0, this.sphereBG);
    pass.setVertexBuffer(0, this.sphereVB);
    pass.setIndexBuffer(this.sphereIB, 'uint16');
    pass.drawIndexed(this.sphereGeo.indices.length);

    // 2. Draw grid circles (equator + meridians)
    this._drawCircle(pass, mvp, [0.3, 0.3, 0.4], 0.5);
    this._drawCircle(pass, mat4Mul(vp, mat4RotateX(mat4Identity(), Math.PI / 2)), [0.25, 0.25, 0.35], 0.3);
    this._drawCircle(pass, mat4Mul(vp, mat4RotateZ(mat4Identity(), Math.PI / 2)), [0.25, 0.25, 0.35], 0.3);

    // 3. Draw axes
    const axisColors: [number, number, number][] = [[0.8, 0.3, 0.3], [0.3, 0.8, 0.3], [0.3, 0.5, 0.8]];
    for (let i = 0; i < 3; i++) {
      this._writeLineUniforms(mvp, axisColors[i], 0.7);
      pass.setPipeline(this.linePipeline);
      pass.setBindGroup(0, this.lineBG);
      pass.setVertexBuffer(0, this.axisBuffers[i].buf);
      pass.draw(this.axisBuffers[i].count);
    }

    // 4. Draw per-qubit state vectors and trails
    for (let qi = 0; qi < qubitBlochs.length; qi++) {
      const b = qubitBlochs[qi];
      const color = QUBIT_COLORS[qi % QUBIT_COLORS.length];
      const isActive = qi === activeQubit;
      const alpha = isActive ? 1.0 : 0.4;

      // Trail
      if (trailEnabled && trails.has(qi)) {
        const trail = trails.get(qi)!;
        if (trail.length > 1) {
          const trailData: number[] = [];
          for (let j = 0; j < trail.length - 1; j++) {
            const t1 = trail[j], t2 = trail[j + 1];
            trailData.push(t1.x, t1.z, t1.y, t2.x, t2.z, t2.y);
          }
          this._drawDynamic(pass, mvp, new Float32Array(trailData), color, isActive ? 0.5 : 0.15);
        }
      }

      // State vector arrow
      const arrowData = createArrow([0, 0, 0], [b.x, b.z, b.y], 0.06);
      if (arrowData.length > 0) {
        this._drawDynamic(pass, mvp, arrowData, color, alpha);
      }

      // Shadow on equatorial plane for active qubit
      if (isActive) {
        const shadow = new Float32Array([
          0, 0, 0, b.x, 0, b.y,
          b.x, 0, b.y, b.x, b.z, b.y,
        ]);
        this._drawDynamic(pass, mvp, shadow, color, 0.25);
      }
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);

    // 5. Text labels
    this._drawLabels(mvp);
  }

  private _writeSphereUniforms(mvp: Float32Array, model: Float32Array, color: number[], alpha: number, lightDir: number[]): void {
    const data = new Float32Array(40); // 160 bytes
    data.set(mvp, 0);
    data.set(model, 16);
    data[32] = color[0]; data[33] = color[1]; data[34] = color[2]; data[35] = alpha;
    data[36] = lightDir[0]; data[37] = lightDir[1]; data[38] = lightDir[2]; data[39] = 0;
    this.device.queue.writeBuffer(this.sphereUB, 0, data);
  }

  private _writeLineUniforms(mvp: Float32Array, color: number[], alpha: number): void {
    const data = new Float32Array(24); // 96 bytes
    data.set(mvp, 0);
    data[16] = color[0]; data[17] = color[1]; data[18] = color[2]; data[19] = alpha;
    data[20] = 6.0; // pointSize
    this.device.queue.writeBuffer(this.lineUB, 0, data);
  }

  private _drawCircle(pass: GPURenderPassEncoder, mvp: Float32Array, color: number[], alpha: number): void {
    this._writeLineUniforms(mvp, color, alpha);
    pass.setPipeline(this.linePipeline);
    pass.setBindGroup(0, this.lineBG);
    pass.setVertexBuffer(0, this.circleVB);
    pass.draw(this.circleVertCount);
  }

  private _drawDynamic(pass: GPURenderPassEncoder, mvp: Float32Array, data: Float32Array, color: number[], alpha: number): void {
    if (data.length === 0) return;
    const vertCount = data.length / 3;
    if (vertCount > this.dynMaxVerts) return;
    this.device.queue.writeBuffer(this.dynVB, 0, data.buffer, data.byteOffset, data.byteLength);
    this._writeLineUniforms(mvp, Array.from(color), alpha);
    pass.setPipeline(this.linePipeline);
    pass.setBindGroup(0, this.lineBG);
    pass.setVertexBuffer(0, this.dynVB);
    pass.draw(vertCount);
  }

  private _drawLabels(mvp: Float32Array): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.textCanvas.width, h = this.textCanvas.height;
    this.textCtx.clearRect(0, 0, w, h);
    this.textCtx.font = `${14 * dpr}px "Courier New", monospace`;
    this.textCtx.textAlign = 'center';
    this.textCtx.textBaseline = 'middle';

    const labels: { pos: [number, number, number]; text: string; color: string }[] = [
      { pos: [1.45, 0, 0], text: 'X', color: '#ff7675' },
      { pos: [-1.45, 0, 0], text: '-X', color: '#ff7675' },
      { pos: [0, 1.45, 0], text: '|0\u27E9', color: '#dfe6e9' },
      { pos: [0, -1.45, 0], text: '|1\u27E9', color: '#dfe6e9' },
      { pos: [0, 0, 1.45], text: 'Y', color: '#00cec9' },
      { pos: [0, 0, -1.45], text: '-Y', color: '#00cec9' },
    ];

    for (const l of labels) {
      const p = project3Dto2D(mvp, l.pos, w, h);
      this.textCtx.fillStyle = l.color;
      this.textCtx.fillText(l.text, p.x, p.y);
    }
  }

  destroy(): void {
    this.device?.destroy();
  }
}
