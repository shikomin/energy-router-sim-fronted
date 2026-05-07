import type { DeviceRuntime } from './index'

export const WS_TOPICS = {
  DEVICES: '/topic/devices',
  SIMULATION: '/topic/simulation',
  TOPOLOGY: '/topic/topology',
  SYSTEM: '/topic/system',
  MQTT_STATE: '/topic/mqtt_state'
}

export type MessageType = 'DEVICE_UPDATE' | 'SIMULATION_UPDATE' | 'TOPOLOGY_UPDATE' | 'SYSTEM_EVENT' | 'HEARTBEAT' | 'MQTT_STATE'

export interface WebSocketMessage<T = unknown> {
  type: MessageType
  topic: string
  data: T
  timestamp: number
}

class WebSocketClient {
  private stompClient: any = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private subscriptions: Map<string, (message: WebSocketMessage) => void> = new Map()
  private connectionAttempts = 0
  private maxConnectionAttempts = 10
  private baseReconnectDelay = 1000
  private manualDisconnect = false
  private connecting = false

  connect(): Promise<void> {
    if (this.stompClient?.connected) {
      return Promise.resolve()
    }

    if (this.connecting) {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (this.stompClient?.connected) {
            resolve()
          } else {
            this.connect().then(resolve).catch(resolve)
          }
        }, 100)
      })
    }

    this.connecting = true
    this.manualDisconnect = false

    return new Promise((resolve, reject) => {
      this.loadStomp().then((Stomp) => {
        const wsUrl = this.getWsUrl()
        console.log('WebSocket connecting to:', wsUrl)

        this.stompClient = Stomp.client(wsUrl)
        this.stompClient.debug = () => {}

        this.stompClient.connect(
          {},
          () => {
            console.log('WebSocket connected')
            this.connectionAttempts = 0
            this.connecting = false
            this.resubscribeAll()
            resolve()
          },
          (error: any) => {
            console.error('WebSocket connection error:', error)
            this.stompClient = null
            this.connecting = false

            if (!this.manualDisconnect && this.connectionAttempts < this.maxConnectionAttempts) {
              this.connectionAttempts++
              const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.connectionAttempts - 1), 30000)
              console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.connectionAttempts})`)

              if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer)
              }
              this.reconnectTimer = setTimeout(() => {
                this.connect().catch(() => {})
              }, delay)
            }

            reject(error)
          }
        )
      }).catch((err) => {
        this.connecting = false
        reject(err)
      })
    })
  }

  disconnect(): void {
    this.manualDisconnect = true
    this.connecting = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.stompClient) {
      this.stompClient.disconnect()
      this.stompClient = null
    }
  }

  subscribe(topic: string, callback: (message: WebSocketMessage) => void): void {
    this.subscriptions.set(topic, callback)

    if (this.stompClient?.connected) {
      this.doSubscribe(topic, callback)
    }
  }

  private doSubscribe(topic: string, callback: (message: WebSocketMessage) => void): void {
    this.stompClient.subscribe(topic, (message: any) => {
      try {
        const parsedMessage: WebSocketMessage = JSON.parse(message.body)
        callback(parsedMessage)
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    })
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic)
  }

  send(destination: string, body: unknown): void {
    if (!this.stompClient?.connected) {
      throw new Error('WebSocket not connected')
    }

    const jsonBody = typeof body === 'string' ? body : JSON.stringify(body)
    this.stompClient.send(destination, {}, jsonBody)
  }

  isConnected(): boolean {
    return this.stompClient?.connected ?? false
  }

  private getWsUrl(): string {
    const wsBaseUrl = import.meta.env.VITE_WS_URL
    if (wsBaseUrl) {
      return `${wsBaseUrl}/ws`
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws`
  }

  private resubscribeAll(): void {
    if (!this.stompClient?.connected) return

    this.subscriptions.forEach((callback, topic) => {
      this.doSubscribe(topic, callback)
    })
  }

  private loadStomp(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).Stomp) {
        resolve((window as any).Stomp)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js'
      script.onload = () => {
        resolve((window as any).Stomp)
      }
      script.onerror = () => {
        reject(new Error('Failed to load Stomp.js'))
      }
      document.head.appendChild(script)
    })
  }
}

const wsClient = new WebSocketClient()

export const subscribeDeviceUpdates = (callback: (data: Record<string, DeviceRuntime>) => void): void => {
  wsClient.subscribe(WS_TOPICS.DEVICES, (message) => {
    if (message.type === 'DEVICE_UPDATE') {
      callback(message.data as Record<string, DeviceRuntime>)
    }
  })
}

export const subscribeSimulationUpdates = (callback: (data: unknown) => void): void => {
  wsClient.subscribe(WS_TOPICS.SIMULATION, (message) => {
    if (message.type === 'SIMULATION_UPDATE') {
      callback(message.data)
    }
  })
}

export const subscribeTopologyUpdates = (callback: (data: unknown) => void): void => {
  wsClient.subscribe(WS_TOPICS.TOPOLOGY, (message) => {
    if (message.type === 'TOPOLOGY_UPDATE') {
      callback(message.data)
    }
  })
}

export const subscribeSystemEvents = (callback: (data: unknown) => void): void => {
  wsClient.subscribe(WS_TOPICS.SYSTEM, (message) => {
    if (message.type === 'SYSTEM_EVENT') {
      callback(message.data)
    }
  })
}

export const subscribeMqttState = (callback: (data: unknown) => void): void => {
  wsClient.subscribe(WS_TOPICS.MQTT_STATE, (message) => {
    callback(message.data)
  })
}

export { wsClient }