// src/application.js
import { Scene } from './scene.js'
import { Camera } from './camera.js'
import { UI } from './UI.js'
import * as THREE from 'three'
import { WebGLRenderer } from 'three'

export class Application {
  constructor() {

    // --- RENDERER ---
    this.renderer = new WebGLRenderer({ antialias: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    // --- PARAMÈTRES ---
    this.initParams()

    // --- SCÈNE ---
    this.scene = new Scene()
    this.scene.addAmbiantLight()
    this.scene.addDirectionalLight()
    this.scene.addGround(this.groundParams.texture, this.groundParams.repeats)
    this.scene.addSkybox(this.skyboxParams.file)
    this.scene.loadScene('/scenes/scene_1.json')

    // --- CAMERA ---
    this.camera = new Camera(this.renderer.domElement)

    // --- UI ---
    this.ui = new UI()
    this.ui.addSkyboxUI(
      this.skyboxFiles,
      this.skyboxParams,
      (filename) => {
        this.skyboxParams.file = filename
        this.scene.addSkybox(filename)
      }
    )
    this.ui.addSelectionPanel()
    this.ui.addExportButton(() => this.exportScene())

    // --- Import / Clear : input caché + boutons UI ---
    const importInput = document.createElement('input')
    importInput.type = 'file'
    importInput.accept = '.json,application/json'
    importInput.style.display = 'none'
    document.body.appendChild(importInput)

    importInput.addEventListener('change', async (event) => {
      await this.scene.importScene(event, {
        skybox: this.skyboxParams,
        ground: this.groundParams
      })
      importInput.value = ''
    })

    this.ui.addSceneIOButtons(
      () => this.scene.clearScene(),
      () => importInput.click()
    )

    // --- SÉLECTION ---
    this.selectedObject = null
    this.selectedMesh = null
    this.selectedMeshMaterial = null

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    // --- DÉPLACEMENT (touche G) ---
    this.moveSelectedObject = false

    // Events
    window.addEventListener('click', (e) => this.onClick(e))
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))

    // Resize
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })

    // Boucle
    this.render = this.render.bind(this)
    this.renderer.setAnimationLoop(this.render)
  }

  initParams() {
    this.groundTextures = [
      'aerial_grass_rock',
      'sand',
      'mud'
    ]

    this.groundParams = {
      texture: this.groundTextures[0],
      repeats: 50
    }

    this.skyboxFiles = [
      'DaySkyHDRI019A_2K-TONEMAPPED.jpg',
      'DaySkyHDRI050A_2K-TONEMAPPED.jpg',
      'NightSkyHDRI009_2K-TONEMAPPED.jpg'
    ]

    this.skyboxParams = {
      file: this.skyboxFiles[0]
    }
  }

  // --- EXPORT DE LA SCÈNE EN JSON ---
  exportScene() {
    const nodes = []

    for (const obj of this.scene.loadedObjects) {
      const p = obj.position
      const q = obj.quaternion
      const s = obj.scale

      nodes.push({
        name: obj.name || 'object',
        position: `${p.x},${p.y},${p.z}`,
        rotation: `${q.x},${q.y},${q.z},${q.w}`,
        scale: `${s.x},${s.y},${s.z}`
      })
    }

    const data = {
      params: {
        ground: {
          texture: this.groundParams.texture,
          repeats: this.groundParams.repeats
        },
        skybox: this.skyboxParams.file
      },
      nodes
    }

    const json = JSON.stringify(data, null, 2)
    console.log('Exported scene JSON:', json)

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'scene_export.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  }

  // --- CLIC : sélection ---
  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect()

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera.camera)

    const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true)

    let hit = null
    for (const inter of intersects) {
      if (inter.object.userData && inter.object.userData.isSelectable) {
        hit = inter
        break
      }
    }

    if (!hit) {
      this.deselectObject()
      return
    }

    const hitMesh = hit.object
    const obj = hitMesh.userData.object || hitMesh

    this.selectObject(obj, hitMesh)
  }

  selectObject(object, mesh) {
    this.deselectObject(false)

    this.selectedObject = object
    this.selectedMesh = mesh
    this.selectedMeshMaterial = mesh.material

    const highlightMaterial = mesh.material.clone()
    if ('emissive' in highlightMaterial) {
      highlightMaterial.emissive = new THREE.Color(0xff5500)
    } else {
      highlightMaterial.color = new THREE.Color(0xff5500)
    }
    mesh.material = highlightMaterial

    this.ui.updateSelectionInfo(object)
  }

  deselectObject(updateUI = true) {
    if (this.selectedMesh && this.selectedMeshMaterial) {
      this.selectedMesh.material = this.selectedMeshMaterial
    }

    this.selectedObject = null
    this.selectedMesh = null
    this.selectedMeshMaterial = null
    this.moveSelectedObject = false

    if (updateUI) {
      this.ui.clearSelectionInfo()
    }
  }

  // --- CLAVIER : activer/désactiver le mode déplacement (G) ---
  onKeyDown(event) {
    if (event.key === 'g' || event.key === 'G') {
      if (this.selectedObject) {
        this.moveSelectedObject = !this.moveSelectedObject
        console.log('Move mode:', this.moveSelectedObject)
      }
    }
  }

  // --- SOURIS : déplacer l’objet sélectionné sur le sol ---
  onMouseMove(event) {
    if (!this.moveSelectedObject || !this.selectedObject || !this.scene.ground) {
      return
    }

    const rect = this.renderer.domElement.getBoundingClientRect()

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera.camera)

    const intersects = this.raycaster.intersectObject(this.scene.ground, false)

    if (intersects.length > 0) {
      const point = intersects[0].point
      this.selectedObject.position.copy(point)
      this.ui.updateSelectionInfo(this.selectedObject)
    }
  }

  render() {
    this.camera.update()
    this.renderer.render(this.scene.scene, this.camera.camera)
  }
}
