import type { DeviceRuntime } from './index'
import { wsClient, subscribeDeviceUpdates as wsSubscribeDeviceUpdates, subscribeSimulationUpdates as wsSubscribeSimulationUpdates, subscribeTopologyUpdates as wsSubscribeTopologyUpdates, subscribeSystemEvents as wsSubscribeSystemEvents, subscribeMqttState as wsSubscribeMqttState, WS_TOPICS } from './websocket'

export { WS_TOPICS }

type DeviceUpdateCallback = (data: Record<string, DeviceRuntime>) => void
type SimulationUpdateCallback = (data: unknown) => void
type TopologyUpdateCallback = (data: unknown) => void
type SystemEventCallback = (data: unknown) => void
type MqttStateCallback = (data: unknown) => void

class WebSocketManager {
  private deviceSubscribers: Set<DeviceUpdateCallback> = new Set()
  private simulationSubscribers: Set<SimulationUpdateCallback> = new Set()
  private topologySubscribers: Set<TopologyUpdateCallback> = new Set()
  private systemSubscribers: Set<SystemEventCallback> = new Set()
  private mqttStateSubscribers: Set<MqttStateCallback> = new Set()
  private connected = false
  private connectPromise: Promise<void> | null = null

  async connect(): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise
    }

    this.connectPromise = wsClient.connect()
      .then(() => {
        this.connected = true
        console.log('WebSocket manager connected')
      })
      .catch((err) => {
        this.connectPromise = null
        throw err
      })

    return this.connectPromise
  }

  disconnect(): void {
    wsClient.disconnect()
    this.connected = false
    this.connectPromise = null
  }

  isConnected(): boolean {
    return this.connected && wsClient.isConnected()
  }

  onDeviceUpdate(callback: DeviceUpdateCallback): () => void {
    this.deviceSubscribers.add(callback)
    
    const unsubscribe = () => {
      this.deviceSubscribers.delete(callback)
    }
    return unsubscribe
  }

  onSimulationUpdate(callback: SimulationUpdateCallback): () => void {
    this.simulationSubscribers.add(callback)
    
    const unsubscribe = () => {
      this.simulationSubscribers.delete(callback)
    }
    return unsubscribe
  }

  onTopologyUpdate(callback: TopologyUpdateCallback): () => void {
    this.topologySubscribers.add(callback)
    
    const unsubscribe = () => {
      this.topologySubscribers.delete(callback)
    }
    return unsubscribe
  }

  onSystemEvent(callback: SystemEventCallback): () => void {
    this.systemSubscribers.add(callback)
    
    const unsubscribe = () => {
      this.systemSubscribers.delete(callback)
    }
    return unsubscribe
  }

  onMqttState(callback: MqttStateCallback): () => void {
    this.mqttStateSubscribers.add(callback)
    
    const unsubscribe = () => {
      this.mqttStateSubscribers.delete(callback)
    }
    return unsubscribe
  }

  private notifyDeviceUpdate(data: Record<string, DeviceRuntime>): void {
    this.deviceSubscribers.forEach(cb => cb(data))
  }

  private notifySimulationUpdate(data: unknown): void {
    this.simulationSubscribers.forEach(cb => cb(data))
  }

  private notifyTopologyUpdate(data: unknown): void {
    this.topologySubscribers.forEach(cb => cb(data))
  }

  private notifySystemEvent(data: unknown): void {
    this.systemSubscribers.forEach(cb => cb(data))
  }

  private notifyMqttState(data: unknown): void {
    this.mqttStateSubscribers.forEach(cb => cb(data))
  }

  private setupSubscriptions(): void {
    wsSubscribeDeviceUpdates((data) => this.notifyDeviceUpdate(data))
    wsSubscribeSimulationUpdates((data) => this.notifySimulationUpdate(data))
    wsSubscribeTopologyUpdates((data) => this.notifyTopologyUpdate(data))
    wsSubscribeSystemEvents((data) => this.notifySystemEvent(data))
    wsSubscribeMqttState((data) => this.notifyMqttState(data))
  }

  initialize(): void {
    this.setupSubscriptions()
  }
}

export const wsManager = new WebSocketManager()
wsManager.initialize()