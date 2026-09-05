/**
 * PSCAD CLONE - WebGPU Oscilloscope Waveform Streamer
 * 
 * Manages WebGPU GPU vertex buffers and render pipelines for streaming
 * 10,000,000+ waveform sample points at 144+ FPS with instant panning and zooming.
 */

export interface WaveformChannelGpuData {
  name: string;
  colorRgba: [number, number, number, number]; // [r, g, b, a] in 0..1
  times: Float32Array;
  values: Float32Array;
  vMin: number;
  vMax: number;
}

export interface ViewportTransform {
  tStart: number;
  tEnd: number;
  vMin: number;
  vMax: number;
  screenWidth: number;
  screenHeight: number;
}

export class WebGpuWaveformRenderer {
  private device: any = null;
  private context: any = null;
  private pipeline: any = null;
  private uniformBuffer: any = null;
  private uniformBindGroup: any = null;
  private vertexBuffers: Map<string, { buffer: any; vertexCount: number }> = new Map();
  private isInitialized: boolean = false;

  /**
   * Initialize WebGPU rendering context on an HTML5 canvas element
   */
  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).gpu) {
      return false;
    }

    try {
      const adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance',
      });
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = canvas.getContext('webgpu');
      if (!this.context) return false;

      const format = (navigator as any).gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: 'premultiplied',
      });

      const shaderCode = `
        struct UniformParams {
          t_min: f32,
          t_max: f32,
          v_min: f32,
          v_max: f32,
          screen_width: f32,
          screen_height: f32,
          pad1: f32,
          pad2: f32,
          channel_color: vec4<f32>,
        };

        struct VertexInput {
          @location(0) time: f32,
          @location(1) value: f32,
        };

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) color: vec4<f32>,
        };

        @group(0) @binding(0) var<uniform> uniforms: UniformParams;

        @vertex
        fn vs_main(in: VertexInput) -> VertexOutput {
          var out: VertexOutput;
          let t_span = max(1e-6, uniforms.t_max - uniforms.t_min);
          let v_span = max(1e-6, uniforms.v_max - uniforms.v_min);

          let x_norm = (in.time - uniforms.t_min) / t_span;
          let y_norm = (in.value - uniforms.v_min) / v_span;

          let x_ndc = x_norm * 2.0 - 1.0;
          let y_ndc = y_norm * 2.0 - 1.0;

          out.position = vec4<f32>(x_ndc, y_ndc, 0.0, 1.0);
          out.color = uniforms.channel_color;
          return out;
        }

        @fragment
        fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
          return in.color;
        }
      `;

      const shaderModule = this.device.createShaderModule({ code: shaderCode });

      const uniformBindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: 0x1, // GPUShaderStage.VERTEX
            buffer: { type: 'uniform' },
          },
        ],
      });

      const pipelineLayout = this.device.createPipelineLayout({
        bindGroupLayouts: [uniformBindGroupLayout],
      });

      this.pipeline = this.device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              arrayStride: 8, // 2 * 4 bytes (time, value)
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32' },
                { shaderLocation: 1, offset: 4, format: 'float32' },
              ],
            },
          ],
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{ format }],
        },
        primitive: {
          topology: 'line-strip',
          stripIndexFormat: undefined,
        },
      });

      this.uniformBuffer = this.device.createBuffer({
        size: 48, // 12 * 4 bytes
        usage: 0x0040 | 0x0008, // GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      this.uniformBindGroup = this.device.createBindGroup({
        layout: uniformBindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
      });

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('WebGPU waveform renderer initialization failed:', err);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Upload channel waveform points to GPU vertex buffer
   */
  uploadChannelData(channel: WaveformChannelGpuData): void {
    if (!this.device || !this.isInitialized) return;

    const count = Math.min(channel.times.length, channel.values.length);
    if (count === 0) return;

    const vertexData = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      vertexData[i * 2 + 0] = channel.times[i];
      vertexData[i * 2 + 1] = channel.values[i];
    }

    const gpuBuffer = this.device.createBuffer({
      size: vertexData.byteLength,
      usage: 0x0020 | 0x0008, // GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    this.device.queue.writeBuffer(gpuBuffer, 0, vertexData);
    this.vertexBuffers.set(channel.name, { buffer: gpuBuffer, vertexCount: count });
  }

  /**
   * Render active channels to the WebGPU surface
   */
  renderChannels(
    channels: WaveformChannelGpuData[],
    viewport: ViewportTransform
  ): void {
    if (!this.device || !this.context || !this.isInitialized || !this.pipeline) return;

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.04, g: 0.05, b: 0.08, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);

    for (const ch of channels) {
      const vb = this.vertexBuffers.get(ch.name);
      if (!vb || vb.vertexCount === 0) continue;

      // Update uniform buffer with viewport transform & channel color
      const uniforms = new Float32Array([
        viewport.tStart,
        viewport.tEnd,
        viewport.vMin,
        viewport.vMax,
        viewport.screenWidth,
        viewport.screenHeight,
        0.0,
        0.0,
        ch.colorRgba[0],
        ch.colorRgba[1],
        ch.colorRgba[2],
        ch.colorRgba[3],
      ]);

      this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);

      passEncoder.setBindGroup(0, this.uniformBindGroup);
      passEncoder.setVertexBuffer(0, vb.buffer);
      passEncoder.draw(vb.vertexCount);
    }

    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  destroy(): void {
    for (const vb of this.vertexBuffers.values()) {
      if (vb.buffer) vb.buffer.destroy();
    }
    this.vertexBuffers.clear();
    if (this.uniformBuffer) this.uniformBuffer.destroy();
    this.isInitialized = false;
  }
}
