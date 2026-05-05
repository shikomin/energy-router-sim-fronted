<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Device {
  id: string
  name: string
  type: string
}

interface DeviceRuntime {
  deviceId: string
  telemetry: Record<string, any>
}

interface TopologyData {
  id: string
  name: string
}

const props = defineProps<{
  topology: TopologyData | null
  devices: Device[]
  deviceRuntimes: Map<string, DeviceRuntime>
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const hoveredDevice = ref<string | null>(null)
const mousePos = ref({ x: 0, y: 0 })

let animationId: number | null = null
let animationPhase = 0

interface DevicePosition {
  id: string
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
}

interface ConnectionLine {
  fromX: number
  fromY: number
  toX: number
  toY: number
  power: number
  type: string
}

const devicePositions = ref<Map<string, DevicePosition>>(new Map())
const connectionLines = ref<ConnectionLine[]>([])

const deviceColors: Record<string, string> = {
  PCS: '#a371f7',
  MPPT: '#ffd666',
  DCDC: '#73d13d',
  BMS: '#40a9ff',
  AC_LOAD: '#ff7875',
  DC_LOAD: '#ff7875',
  METER_PREVENT_BACKFLOW: '#3fb950'
}

const getDevicePower = (deviceId: string): number => {
  const runtime = props.deviceRuntimes.get(deviceId)
  if (!runtime) return 0

  const telemetry = runtime.telemetry
  if (deviceId.includes('mppt')) {
    return ((telemetry.pv1Power || 0) + (telemetry.pv2Power || 0) + (telemetry.pv3Power || 0) + (telemetry.pv4Power || 0)) / 10
  }
  if (deviceId.includes('pcs')) {
    return (telemetry.activePower || 0) / 10
  }
  if (deviceId.includes('dcdc')) {
    return (telemetry.batteryPower || 0) / 10
  }
  if (deviceId.includes('bms')) {
    return (telemetry.totalSOC || 0)
  }
  if (deviceId.includes('load')) {
    return (telemetry.activePower || 0) / 10
  }
  if (deviceId.includes('meter')) {
    return (telemetry.instantPower || 0) / 10
  }
  return 0
}

const calculateLayout = () => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const width = canvas.width
  const height = canvas.height

  const positions = new Map<string, DevicePosition>()
  const lines: ConnectionLine[] = []

  const startX = 60
  const busY = 20
  const busHeight = 6
  const busLength = 400
  const deviceWidth = 100
  const deviceHeight = 60
  const verticalGap = 120
  const dcdcVerticalGap = 120
  const acLoadVerticalGap = 180

  const meterX = startX
  const meterY = busY + 30
  positions.set('meter_01', {
    id: 'meter_01',
    name: '大电网',
    type: 'METER_PREVENT_BACKFLOW',
    x: meterX,
    y: meterY,
    width: deviceWidth,
    height: deviceHeight
  })

  const acBusStartX = meterX + deviceWidth
  const acBusCenterX = acBusStartX + busLength / 2
  positions.set('bus_ac_marker', {
    id: 'bus_ac_marker',
    name: '交流母线',
    type: 'BUS',
    x: acBusCenterX,
    y: meterY + deviceHeight / 2,
    width: busLength,
    height: busHeight
  })

  const pcsX = acBusStartX + busLength
  const pcsY = meterY
  positions.set('pcs_01', {
    id: 'pcs_01',
    name: 'ACDC',
    type: 'PCS',
    x: pcsX,
    y: pcsY,
    width: deviceWidth,
    height: deviceHeight
  })

  const dcBusStartX = pcsX + deviceWidth
  const dcBusCenterX = dcBusStartX + busLength / 2
  positions.set('bus_dc_marker', {
    id: 'bus_dc_marker',
    name: '直流母线',
    type: 'BUS',
    x: dcBusCenterX,
    y: pcsY + deviceHeight / 2,
    width: busLength,
    height: busHeight
  })

  const dcLoadX = dcBusStartX + busLength
  const dcLoadY = pcsY
  positions.set('dc_load_01', {
    id: 'dc_load_01',
    name: '直流负载',
    type: 'DC_LOAD',
    x: dcLoadX,
    y: dcLoadY,
    width: deviceWidth,
    height: deviceHeight
  })

  const acLoadX = acBusCenterX
  const acLoadY = busY + acLoadVerticalGap
  positions.set('ac_load_01', {
    id: 'ac_load_01',
    name: '交流负载',
    type: 'AC_LOAD',
    x: acLoadX - deviceWidth / 2,
    y: acLoadY,
    width: deviceWidth,
    height: deviceHeight
  })

  const mpptX = dcBusCenterX -200
  const mpptY = acLoadY
  positions.set('mppt_01', {
    id: 'mppt_01',
    name: 'MPPT(光伏)',
    type: 'MPPT',
    x: mpptX,
    y: mpptY,
    width: deviceWidth,
    height: deviceHeight
  })

  const dcdc1X = dcBusCenterX + 70
  const dcdc1Y = busY + dcdcVerticalGap 
  positions.set('dcdc_01', {
    id: 'dcdc_01',
    name: 'DCDC1',
    type: 'DCDC',
    x: dcdc1X,
    y: dcdc1Y,
    width: deviceWidth,
    height: deviceHeight
  })
  const dcdc2X = dcBusCenterX - 70
  const dcdc2Y = busY + dcdcVerticalGap 
  positions.set('dcdc_02', {
    id: 'dcdc_02',
    name: 'DCDC2',
    type: 'DCDC',
    x: dcdc2X,
    y: dcdc2Y,
    width: deviceWidth,
    height: deviceHeight
  })


  const bmsX = dcBusCenterX
  const bmsY = dcdc1Y + deviceHeight + 50
  positions.set('bms_01', {
    id: 'bms_01',
    name: 'BMS(储能)',
    type: 'BMS',
    x: bmsX,
    y: bmsY,
    width: deviceWidth,
    height: deviceHeight
  })

  lines.push({
    fromX: meterX + deviceWidth,
    fromY: meterY + deviceHeight / 2,
    toX: acBusStartX,
    toY: meterY + deviceHeight / 2,
    power: getDevicePower('meter_01'),
    type: 'AC'
  })

  lines.push({
    fromX: acBusStartX + busLength,
    fromY: meterY + deviceHeight / 2,
    toX: pcsX,
    toY: pcsY + deviceHeight / 2,
    power: getDevicePower('pcs_01'),
    type: 'AC'
  })

  lines.push({
    fromX: pcsX + deviceWidth,
    fromY: pcsY + deviceHeight / 2,
    toX: dcBusStartX,
    toY: pcsY + deviceHeight / 2,
    power: getDevicePower('pcs_01'),
    type: 'DC'
  })

  lines.push({
    fromX: dcBusStartX + busLength,
    fromY: pcsY + deviceHeight / 2,
    toX: dcLoadX,
    toY: dcLoadY + deviceHeight / 2,
    power: getDevicePower('dc_load_01'),
    type: 'DC'
  })

  lines.push({
    fromX: acBusCenterX,
    fromY: busY + 60,
    toX: acLoadX,
    toY: acLoadY + deviceHeight / 2,
    power: getDevicePower('ac_load_01'),
    type: 'AC'
  })

  lines.push({
    fromX: mpptX + 50,
    fromY: busY + 60,
    toX: mpptX + 50,
    toY: mpptY + deviceHeight / 2,
    power: getDevicePower('mppt_01'),
    type: 'DC'
  })

  lines.push({
    fromX: dcdc2X + deviceWidth / 2,
    fromY: dcdc2Y - deviceHeight + 45,
    toX: dcdc2X + deviceWidth / 2,
    toY: dcdc2Y + deviceHeight,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })
  
  lines.push({
    fromX: dcdc1X + deviceWidth / 2,
    fromY: dcdc1Y - deviceHeight + 45,
    toX: dcdc1X + deviceWidth / 2,
    toY: dcdc1Y + deviceHeight,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })

  lines.push({
    fromX: dcdc2X + deviceWidth / 2 + (dcdc1X - dcdc2X)/2,
    fromY: dcdc2Y - deviceHeight + 45,
    toX: dcdc2X + deviceWidth / 2,
    toY: dcdc2Y - deviceHeight + 45,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })

  lines.push({
    fromX: dcdc1X + deviceWidth / 2 - (dcdc1X - dcdc2X)/2,
    fromY: dcdc1Y - deviceHeight + 45,
    toX: dcdc1X + deviceWidth / 2,
    toY: dcdc1Y - deviceHeight + 45,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })

  
  lines.push({
    fromX: dcdc1X + deviceWidth / 2 - (dcdc1X - dcdc2X)/2,
    fromY: dcdc1Y - deviceHeight ,
    toX: dcdc1X + deviceWidth / 2 - (dcdc1X - dcdc2X)/2,
    toY: dcdc1Y - deviceHeight + 45,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })


  lines.push({
    fromX: dcdc2X + deviceWidth / 2,
    fromY: dcdc2Y + deviceHeight,
    toX: dcdc2X + deviceWidth / 2,
    toY: dcdc2Y + deviceHeight + 30,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })

  lines.push({
    fromX: dcdc1X + deviceWidth / 2,
    fromY: dcdc1Y + deviceHeight,
    toX: dcdc1X + deviceWidth / 2,
    toY: dcdc1Y + deviceHeight + 30,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })

  lines.push({
    fromX: dcdc2X + deviceWidth / 2,
    fromY: dcdc2Y + deviceHeight + 30,
    toX: dcdc2X + deviceWidth / 2 + (dcdc1X  - dcdc2X )/2,
    toY: dcdc2Y + deviceHeight + 30,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })

  lines.push({
    fromX: dcdc1X + deviceWidth / 2,
    fromY: dcdc1Y + deviceHeight + 30,
    toX: dcdc2X + deviceWidth / 2 + (dcdc1X  - dcdc2X )/2,
    toY: dcdc2Y + deviceHeight + 30,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })

  lines.push({
    fromX: dcdc2X + deviceWidth / 2 + (dcdc1X  - dcdc2X )/2,
    fromY: dcdc2Y + deviceHeight + 30,
    toX: bmsX + deviceWidth / 2,
    toY: bmsY,
    power: getDevicePower('bms_01'),
    type: 'DC'
  })


  devicePositions.value = positions
  connectionLines.value = lines
}

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(13, 17, 23, 0.8)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  connectionLines.value.forEach(line => {
    drawConnection(ctx, line, animationPhase)
  })

  devicePositions.value.forEach((pos, id) => {
    if (pos.type === 'BUS') {
      drawBus(ctx, pos, id.includes('ac'))
    } else {
      drawDevice(ctx, pos, hoveredDevice.value === id)
    }
  })

  animationPhase += 0.08
  if (animationPhase > Math.PI * 2) {
    animationPhase = 0
  }
}

const drawBus = (ctx: CanvasRenderingContext2D, pos: DevicePosition, isAC: boolean) => {
  ctx.strokeStyle = isAC ? '#ffd666' : '#73d13d'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(pos.x - pos.width / 2, pos.y)
  ctx.lineTo(pos.x + pos.width / 2, pos.y)
  ctx.stroke()

  ctx.fillStyle = isAC ? '#ffd666' : '#73d13d'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(pos.name, pos.x, pos.y - 12)
}

const drawConnection = (
  ctx: CanvasRenderingContext2D,
  line: ConnectionLine,
  phase: number
) => {
  const { fromX, fromY, toX, toY, power, type } = line

  const isDC = type === 'DC'
  const baseColor = isDC ? '#73d13d' : '#ffd666'

  let displayPower = Math.abs(power)
  if (displayPower < 0.01) displayPower = 0

  ctx.strokeStyle = baseColor
  ctx.lineWidth = displayPower > 0 ? 3 : 2
  ctx.globalAlpha = displayPower > 0 ? 0.8 : 0.3

  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  if (displayPower > 0) {
    const dx = toX - fromX
    const dy = toY - fromY
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length > 20) {
      const nx = dx / length
      const ny = dy / length

      const pulseCount = 3
      const pulseSpacing = length / (pulseCount + 1)

      for (let i = 1; i <= pulseCount; i++) {
        const baseOffset = i * pulseSpacing
        const animOffset = (phase * length / (Math.PI * 2)) % pulseSpacing
        const offset = (baseOffset + animOffset) % length

        if (offset < length * 0.8) {
          const ax = fromX + nx * offset
          const ay = fromY + ny * offset

          const distanceFromCenter = Math.abs(offset - length / 2) / (length / 2)
          const alpha = (1 - distanceFromCenter * 0.7) * 0.9

          ctx.save()
          ctx.globalAlpha = alpha
          ctx.fillStyle = baseColor
          ctx.shadowColor = baseColor
          ctx.shadowBlur = 8

          ctx.beginPath()
          ctx.arc(ax, ay, 5, 0, Math.PI * 2)
          ctx.fill()

          ctx.restore()
        }
      }
    }

    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#e6edf3'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${displayPower.toFixed(1)}kW`, midX, midY - 8)
  }

  ctx.globalAlpha = 1
}

const drawDevice = (
  ctx: CanvasRenderingContext2D,
  pos: DevicePosition,
  isHovered: boolean
) => {
  const color = deviceColors[pos.type] || '#58a6ff'

  if (isHovered) {
    ctx.shadowColor = color
    ctx.shadowBlur = 20
  }

  ctx.fillStyle = 'rgba(30, 35, 50, 0.95)'
  ctx.strokeStyle = color
  ctx.lineWidth = isHovered ? 3 : 2

  ctx.beginPath()
  ctx.roundRect(pos.x, pos.y, pos.width, pos.height, 8)
  ctx.fill()
  ctx.stroke()

  ctx.shadowBlur = 0

  ctx.fillStyle = color
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(pos.name, pos.x + pos.width / 2, pos.y + pos.height / 2)
}

const handleMouseMove = (e: MouseEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY

  mousePos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }

  let found: string | null = null
  devicePositions.value.forEach((pos, id) => {
    if (pos.type !== 'BUS') {
      if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
        found = id
      }
    }
  })

  hoveredDevice.value = found
}

const handleMouseLeave = () => {
  hoveredDevice.value = null
}

const hoveredDeviceData = computed(() => {
  if (!hoveredDevice.value) return null

  const runtime = props.deviceRuntimes.get(hoveredDevice.value)
  const device = props.devices.find(d => d.id === hoveredDevice.value)
  const pos = devicePositions.value.get(hoveredDevice.value)

  if (!device) return null

  return {
    device,
    runtime,
    pos
  }
})

const resizeCanvas = () => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  canvas.width = container.clientWidth
  canvas.height = 350
  calculateLayout()
}

watch(
  () => [props.topology, props.devices, props.deviceRuntimes],
  () => {
    calculateLayout()
  },
  { deep: true }
)

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  const animate = () => {
    draw()
    animationId = requestAnimationFrame(animate)
  }
  animate()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<template>
  <div class="circuit-diagram" ref="containerRef">
    <div class="diagram-header">
      <h3>一次接线图</h3>
      <span class="diagram-subtitle">{{ topology?.name || '未选择拓扑' }}</span>
    </div>
    <div class="canvas-container">
      <canvas
        ref="canvasRef"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      ></canvas>
      <div
        v-if="hoveredDeviceData"
        class="device-tooltip"
        :style="{ left: mousePos.x + 15 + 'px', top: mousePos.y + 15 + 'px' }"
      >
        <div class="tooltip-header">{{ hoveredDeviceData.device.name }}</div>
        <div class="tooltip-type">{{ hoveredDeviceData.device.type }}</div>
        <div v-if="hoveredDeviceData.runtime" class="tooltip-runtime">
          <div v-for="(value, key) in hoveredDeviceData.runtime.telemetry" :key="key" class="tooltip-row">
            <span class="tooltip-key">{{ key }}:</span>
            <span class="tooltip-value">{{ typeof value === 'number' ? (value / 10).toFixed(2) : value }}</span>
          </div>
        </div>
        <div v-else class="tooltip-no-data">无实时数据</div>
      </div>
    </div>
    <div class="diagram-legend">
      <div class="legend-item">
        <span class="legend-line ac"></span>
        <span>交流母线</span>
      </div>
      <div class="legend-item">
        <span class="legend-line dc"></span>
        <span>直流母线</span>
      </div>
      <div class="legend-item">
        <span class="legend-pulse"></span>
        <span>电能流向</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.circuit-diagram {
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(20, 25, 38, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.diagram-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.diagram-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #e6edf3;
  margin: 0;
}

.diagram-subtitle {
  font-size: 0.8rem;
  color: #6e7681;
}

.canvas-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

canvas {
  display: block;
  width: 100%;
  height: 350px;
  cursor: pointer;
}

.device-tooltip {
  position: absolute;
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.98) 0%, rgba(20, 25, 38, 0.98) 100%);
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  min-width: 180px;
  max-width: 280px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.tooltip-header {
  font-weight: 600;
  color: #e6edf3;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.tooltip-type {
  font-size: 0.75rem;
  color: #8b949e;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tooltip-runtime {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.tooltip-key {
  color: #8b949e;
}

.tooltip-value {
  color: #c9d1d9;
  font-variant-numeric: tabular-nums;
}

.tooltip-no-data {
  font-size: 0.75rem;
  color: #6e7681;
  font-style: italic;
}

.diagram-legend {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #8b949e;
}

.legend-line {
  width: 30px;
  height: 6px;
  border-radius: 3px;
}

.legend-line.ac {
  background: #ffd666;
}

.legend-line.dc {
  background: #73d13d;
}

.legend-pulse {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #58a6ff;
  box-shadow: 0 0 6px #58a6ff;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
</style>