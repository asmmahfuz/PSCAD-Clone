/**
 * PSCAD CLONE - Remote Simulation & RPC Server Bridge Service
 * Connects to native PSCAD WebSocket / REST JSON-RPC simulation servers.
 */

import { tauriBridge } from './tauriBridge';

export interface RpcServerInfo {
  is_running: boolean;
  port: number;
  active_clients: number;
  total_requests: number;
  address: string;
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: string;
  id?: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class RemoteServerService {
  private static instance: RemoteServerService;
  private currentServerUrl: string = 'http://127.0.0.1:8080';
  private wsConnection: WebSocket | null = null;
  private isConnected: boolean = false;
  private nextRequestId: number = 1;
  private pendingCallbacks: Map<number | string, (res: any) => void> = new Map();

  private constructor() {}

  public static getInstance(): RemoteServerService {
    if (!RemoteServerService.instance) {
      RemoteServerService.instance = new RemoteServerService();
    }
    return RemoteServerService.instance;
  }

  /**
   * Start built-in native RPC server inside Tauri app
   */
  public async startNativeServer(port: number = 8080): Promise<RpcServerInfo> {
    if (tauriBridge.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<RpcServerInfo>('start_rpc_server', { port });
        this.currentServerUrl = res.address;
        return res;
      } catch (err) {
        console.warn('Failed to start native RPC server via Tauri:', err);
      }
    }
    // Fallback simulated info
    return {
      is_running: true,
      port,
      active_clients: 1,
      total_requests: 0,
      address: `http://127.0.0.1:${port}`,
    };
  }

  /**
   * Stop built-in native RPC server
   */
  public async stopNativeServer(): Promise<boolean> {
    if (tauriBridge.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<boolean>('stop_rpc_server');
      } catch (err) {
        console.warn('Failed to stop native RPC server:', err);
      }
    }
    return true;
  }

  /**
   * Query status of native RPC server
   */
  public async getServerStatus(): Promise<RpcServerInfo> {
    if (tauriBridge.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<RpcServerInfo>('get_rpc_server_status');
      } catch (err) {
        // Fallback
      }
    }
    return {
      is_running: this.isConnected,
      port: 8080,
      active_clients: this.isConnected ? 1 : 0,
      total_requests: 0,
      address: this.currentServerUrl,
    };
  }

  /**
   * Send JSON-RPC request over HTTP POST
   */
  public async sendRpcRequest<T = any>(method: string, params: any = {}): Promise<T> {
    const id = this.nextRequestId++;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    try {
      const response = await fetch(this.currentServerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: JsonRpcResponse<T> = await response.json();
      if (data.error) {
        throw new Error(`RPC Error [${data.error.code}]: ${data.error.message}`);
      }
      return data.result as T;
    } catch (e: any) {
      throw new Error(`RPC request failed to ${this.currentServerUrl}: ${e.message}`);
    }
  }

  /**
   * Connect to remote WebSocket stream
   */
  public connectWebSocket(url: string, onMessage?: (data: any) => void): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = url.replace('http://', 'ws://').replace('https://', 'wss://');
        this.wsConnection = new WebSocket(wsUrl);

        this.wsConnection.onopen = () => {
          this.isConnected = true;
          resolve(true);
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.id && this.pendingCallbacks.has(data.id)) {
              const cb = this.pendingCallbacks.get(data.id);
              this.pendingCallbacks.delete(data.id);
              cb?.(data);
            }
            onMessage?.(data);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        this.wsConnection.onerror = () => {
          this.isConnected = false;
          resolve(false);
        };

        this.wsConnection.onclose = () => {
          this.isConnected = false;
        };
      } catch (err) {
        this.isConnected = false;
        resolve(false);
      }
    });
  }

  public disconnectWebSocket() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
      this.isConnected = false;
    }
  }

  public setServerUrl(url: string) {
    this.currentServerUrl = url;
  }

  public getServerUrl(): string {
    return this.currentServerUrl;
  }
}

export const remoteServerService = RemoteServerService.getInstance();
