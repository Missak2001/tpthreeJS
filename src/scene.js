// src/scene.js
import * as THREE from 'three'
import { createStandardMaterial, textureloader, loadGltf } from './tools.js'

export class Scene {
  constructor() {
    this.scene = new THREE.Scene()
    this.directionalLight = null
    this.ground = null

    // Cache des modèles glTF déjà chargés
    this.modelCache = {}    // { name: mesh }
    // Objets instanciés dans la scène (pour export/import)
    this.loadedObjects = []
  }

  // --- CUBE (optionnel) ---
  addCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshPhongMaterial({ color: 0xaa0000 })
    const cube = new THREE.Mesh(geometry, material)

    cube.position.y = 1
    cube.castShadow = true
    cube.receiveShadow = false

    this.scene.add(cube)
  }

  // --- LUMIÈRE D'AMBIANCE ---
  addAmbiantLight() {
    const light = new THREE.AmbientLight(0xffffff, 0.1)
    this.scene.add(light)
  }

  // --- DIRECTIONAL LIGHT + OMBRES ---
  addDirectionalLight() {
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0)
    dirLight.position.set(50, 100, 50)

    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048

    const cam = dirLight.shadow.camera
    cam.near = 1
    cam.far = 200
    cam.left = -50
    cam.right = 50
    cam.top = 50
    cam.bottom = -50

    this.scene.add(dirLight)
    this.directionalLight = dirLight

    const helper = new THREE.DirectionalLightHelper(dirLight, 5)
    this.scene.add(helper)
  }

  // --- SOL TEXTURÉ ---
  addGround(textureName, repeats) {
    const size = 100 // pour bien voir la skybox
    const geometry = new THREE.PlaneGeometry(size, size)
    const material = createStandardMaterial(textureName, repeats)

    const ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0

    ground.receiveShadow = true

    this.scene.add(ground)
    this.ground = ground
  }

  // Changer le matériel du sol (utilisé à l'import)
  changeGround(textureName, repeats) {
    if (!this.ground) {
      this.addGround(textureName, repeats)
      return
    }
    const material = createStandardMaterial(textureName, repeats)
    this.ground.material.dispose()
    this.ground.material = material
  }

  // --- SKYBOX JPG (equirectangulaire) ---
  addSkybox(filename) {
    const path = `/skybox/${filename}`
    console.log('Loading skybox:', path)

    textureloader.load(path, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      this.scene.background = texture
    })
  }

  // ------------------- CHARGEMENT SCÈNE -------------------

  // Fonction principale pour charger une scène à partir d'une URL (utilisée au démarrage)
  async loadScene(url) {
    try {
      console.log('Loading scene JSON:', url)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }
      const data = await response.json()
      await this.loadSceneFromData(data)
    } catch (err) {
      console.error('Erreur loadScene:', err)
    }
  }

  // Utilisée par loadScene() ET par importScene()
  async loadSceneFromData(data) {
    if (!data.nodes || !Array.isArray(data.nodes)) {
      console.error('Format de scène invalide: nodes manquant ou pas un tableau')
      return
    }

    for (const obj of data.nodes) {
      const name = obj.name
      if (!name) {
        console.warn('Objet sans nom dans la scène JSON:', obj)
        continue
      }

      // 1) Charger ou récupérer le modèle dans le cache
      let baseMesh = this.modelCache[name]
      if (!baseMesh) {
        console.log('Loading glTF model:', name)
        baseMesh = await loadGltf(name) // /models/name.glb
        this.modelCache[name] = baseMesh
      }

      // 2) Cloner le modèle
      const mesh = baseMesh.clone(true)

      // 3) Appliquer transform
      if (obj.position) {
        mesh.position.fromArray(obj.position.split(',').map(Number))
      }

      if (obj.rotation) {
        mesh.quaternion.fromArray(obj.rotation.split(',').map(Number))
      }

      if (obj.scale) {
        mesh.scale.fromArray(obj.scale.split(',').map(Number))
      }

      // 4) Ombres + marquage pour la sélection
      mesh.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true
          o.receiveShadow = true

          o.userData = {
            isSelectable: true,
            object: mesh
          }
        }
      })

      // 5) Ajouter à la scène + garder la réf
      this.scene.add(mesh)
      this.loadedObjects.push(mesh)
    }

    console.log('Scene loaded with', this.loadedObjects.length, 'objects')
  }

  // ------------------- CLEAR + IMPORT -------------------

  // Supprime tous les objets sélectionnables (chargés depuis les scènes)
  clearScene() {
    for (const obj of this.loadedObjects) {
      this.scene.remove(obj)
    }
    this.loadedObjects = []
    console.log('Scene cleared')
  }

  // Importation d'une scène depuis un fichier local (event vient de l'input file)
  async importScene(event, params) {
    const file = event.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // 1) vider la scène courante
      this.clearScene()

      // 2) mettre à jour les paramètres ground / skybox via params
      if (data.params && data.params.ground) {
        params.ground.texture = data.params.ground.texture
        params.ground.repeats = data.params.ground.repeats
        this.changeGround(params.ground.texture, params.ground.repeats)
      }

      if (data.params && data.params.skybox) {
        params.skybox.file = data.params.skybox
        this.addSkybox(params.skybox.file)
      }

      // 3) charger les objets de la scène
      await this.loadSceneFromData(data)

      console.log('Scene imported from file:', file.name)
    } catch (err) {
      console.error('Erreur importScene:', err)
    }
  }
}
