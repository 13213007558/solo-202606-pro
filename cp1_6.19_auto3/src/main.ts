import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { DataSimulator } from './dataModule/dataSimulator'
import { ThreeScene } from './renderModule/ThreeScene'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const buildingCount = Math.floor(Math.random() * 151) + 50
const dataSimulator = new DataSimulator(buildingCount)
const threeScene = new ThreeScene(dataSimulator)

dataSimulator.start()

app.provide('dataSimulator', dataSimulator)
app.provide('threeScene', threeScene)

app.mount('#app')
