/**
 * Live code editor panel with basic syntax highlighting for WGSL.
 * Uses a textarea with a mirrored highlighted overlay.
 */

export type ShaderType = 'sphere' | 'line' | 'grid';

export interface CodeEditorCallbacks {
  onRecompile: (type: ShaderType, source: string) => string | null;
}

const WGSL_KEYWORDS = /\b(fn|var|let|const|struct|return|if|else|for|while|loop|break|continue|switch|case|default|discard|enable|override|alias|type)\b/g;
const WGSL_TYPES = /\b(f32|f16|i32|u32|bool|vec[234]f|vec[234]i|vec[234]u|mat[234]x[234]f|array|ptr|sampler|texture_[a-z_]+)\b/g;
const WGSL_BUILTINS = /\b(position|vertex_index|instance_index|front_facing|frag_depth|local_invocation_id|global_invocation_id|workgroup_id|num_workgroups|sample_index|sample_mask)\b/g;
const WGSL_DECORATORS = /@(vertex|fragment|compute|group|binding|builtin|location|workgroup_size|stage|id|align|size|interpolate)\b/g;
const WGSL_FUNCTIONS = /\b(abs|acos|asin|atan|atan2|ceil|clamp|cos|cross|degrees|determinant|distance|dot|exp|exp2|faceForward|floor|fma|fract|inverseSqrt|length|log|log2|max|min|mix|modf|normalize|pow|radians|reflect|refract|round|saturate|sign|sin|smoothstep|sqrt|step|tan|transpose|trunc)\b/g;
const WGSL_COMMENTS = /\/\/.*/g;

function highlightWGSL(code: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(WGSL_COMMENTS, '<span class="cm">$&</span>');
  html = html.replace(WGSL_DECORATORS, '<span class="dec">$&</span>');
  html = html.replace(WGSL_KEYWORDS, '<span class="kw">$&</span>');
  html = html.replace(WGSL_TYPES, '<span class="ty">$&</span>');
  html = html.replace(WGSL_BUILTINS, '<span class="bi">$&</span>');
  html = html.replace(WGSL_FUNCTIONS, '<span class="fn">$&</span>');
  html = html.replace(/(\d+\.?\d*)/g, '<span class="nu">$1</span>');

  return html;
}

export class CodeEditor {
  private container: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private highlight: HTMLElement;
  private errorBar: HTMLElement;
  private tabBar: HTMLElement;
  private currentType: ShaderType = 'sphere';
  private sources: Record<ShaderType, string>;
  private callbacks: CodeEditorCallbacks;

  constructor(
    parent: HTMLElement,
    initialSources: Record<ShaderType, string>,
    callbacks: CodeEditorCallbacks,
  ) {
    this.sources = { ...initialSources };
    this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.container.className = 'code-editor';

    // Tab bar
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'code-tabs';
    for (const type of ['sphere', 'line', 'grid'] as ShaderType[]) {
      const tab = document.createElement('button');
      tab.className = `code-tab${type === this.currentType ? ' active' : ''}`;
      tab.textContent = `${type}.wgsl`;
      tab.dataset.type = type;
      tab.addEventListener('click', () => this._switchTab(type));
      this.tabBar.appendChild(tab);
    }

    const recompileBtn = document.createElement('button');
    recompileBtn.className = 'code-tab recompile-btn';
    recompileBtn.textContent = '\u25B6 Recompile';
    recompileBtn.addEventListener('click', () => this._recompile());
    this.tabBar.appendChild(recompileBtn);

    this.container.appendChild(this.tabBar);

    // Editor area
    const editorWrap = document.createElement('div');
    editorWrap.className = 'code-editor-wrap';

    this.highlight = document.createElement('pre');
    this.highlight.className = 'code-highlight';

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'code-textarea';
    this.textarea.spellcheck = false;
    this.textarea.value = this.sources[this.currentType];

    this.textarea.addEventListener('input', () => {
      this.sources[this.currentType] = this.textarea.value;
      this._updateHighlight();
    });
    this.textarea.addEventListener('scroll', () => {
      this.highlight.scrollTop = this.textarea.scrollTop;
      this.highlight.scrollLeft = this.textarea.scrollLeft;
    });
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this.sources[this.currentType] = this.textarea.value;
        this._updateHighlight();
      }
    });

    editorWrap.appendChild(this.highlight);
    editorWrap.appendChild(this.textarea);
    this.container.appendChild(editorWrap);

    // Error bar
    this.errorBar = document.createElement('div');
    this.errorBar.className = 'code-error';
    this.container.appendChild(this.errorBar);

    parent.appendChild(this.container);
    this._updateHighlight();
  }

  private _switchTab(type: ShaderType): void {
    this.currentType = type;
    this.textarea.value = this.sources[type];
    this._updateHighlight();
    this.tabBar.querySelectorAll('.code-tab').forEach(t => {
      (t as HTMLElement).classList.toggle('active', t.getAttribute('data-type') === type);
    });
    this.errorBar.textContent = '';
    this.errorBar.style.display = 'none';
  }

  private _updateHighlight(): void {
    this.highlight.innerHTML = highlightWGSL(this.textarea.value) + '\n';
  }

  private _recompile(): void {
    const error = this.callbacks.onRecompile(this.currentType, this.sources[this.currentType]);
    if (error) {
      this.errorBar.textContent = error;
      this.errorBar.style.display = 'block';
    } else {
      this.errorBar.textContent = 'Compiled successfully';
      this.errorBar.style.display = 'block';
      this.errorBar.style.color = '#00b894';
      setTimeout(() => { this.errorBar.style.display = 'none'; this.errorBar.style.color = ''; }, 2000);
    }
  }

  /** Update source from outside (e.g., recipe loaded) */
  setSource(type: ShaderType, source: string): void {
    this.sources[type] = source;
    if (this.currentType === type) {
      this.textarea.value = source;
      this._updateHighlight();
    }
  }

  getSource(type: ShaderType): string {
    return this.sources[type];
  }
}
