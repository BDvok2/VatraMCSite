import React, { useRef, useEffect } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { parseGIF, decompressFrames } from 'gifuct-js'


function ChunkModel({ scrollRef }) {
  const meshRef = useRef()
  const gltf = useLoader(GLTFLoader, '/chunk.glb')
  // Material rendering style: 'blocky' (legacy), 'diffuse' (default), or 'pbr'
  const MATERIAL_STYLE = 'diffuse'
  
  useFrame((state) => {
    if (!meshRef.current) return
    // Map scroll pixels to world units at THIS object's depth for 1:1 on-screen motion
    const objectZ = meshRef.current.position.z ?? -1
    const vp = state.viewport.getCurrentViewport(state.camera, [0, 0, objectZ])
    const worldPerPixelY = vp.height / state.size.height
    const scrollY = scrollRef?.current || 0
    meshRef.current.position.y = scrollY * worldPerPixelY
  })

  // Disable texture filtering for pixelated look and tune materials
  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.material) {
          // Enable shadow casting and receiving
          child.castShadow = true
          child.receiveShadow = true
          
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              if (material.map) {
                const tex = material.map
                tex.minFilter = THREE.NearestFilter
                tex.magFilter = THREE.NearestFilter
                tex.generateMipmaps = false
                if ('colorSpace' in tex) {
                  tex.colorSpace = THREE.SRGBColorSpace
                } else if ('encoding' in tex) {
                  tex.encoding = THREE.sRGBEncoding
                }
                tex.anisotropy = 1
                tex.needsUpdate = true
              }
              if (MATERIAL_STYLE === 'blocky') {
                // Enforce Minecraft-like block material
                material.roughness = 1
                material.metalness = 0
                material.flatShading = true
                material.envMapIntensity = 0
                if ('shininess' in material) material.shininess = 0
                if (material.specular && typeof material.specular.setScalar === 'function') material.specular.setScalar(0)
                if ('clearcoat' in material) {
                  material.clearcoat = 0
                  if ('clearcoatRoughness' in material) material.clearcoatRoughness = 1
                }
                if ('sheen' in material) material.sheen = 0
                if ('reflectivity' in material) material.reflectivity = 0
                if ('envMap' in material) material.envMap = null
                if ('ior' in material) material.ior = 1.0
                if ('specularIntensity' in material) material.specularIntensity = 0
                if ('specularColor' in material && material.specularColor && typeof material.specularColor.setScalar === 'function') material.specularColor.setScalar(0)
                if ('emissiveIntensity' in material) material.emissiveIntensity = 0
                if ('emissive' in material && material.emissive && typeof material.emissive.setScalar === 'function') material.emissive.setScalar(0)
              } else if (MATERIAL_STYLE === 'diffuse') {
                // Keep glTF/PBR params; just ensure smooth shading for diffuse lighting
                material.flatShading = false
              } // 'pbr' branch: leave as-is
              material.needsUpdate = true
            })
          } else {
            if (child.material.map) {
              const tex = child.material.map
              tex.minFilter = THREE.NearestFilter
              tex.magFilter = THREE.NearestFilter
              tex.generateMipmaps = false
              if ('colorSpace' in tex) {
                tex.colorSpace = THREE.SRGBColorSpace
              } else if ('encoding' in tex) {
                tex.encoding = THREE.sRGBEncoding
              }
              tex.anisotropy = 1
              tex.needsUpdate = true
            }
            if (MATERIAL_STYLE === 'blocky') {
              // Enforce Minecraft-like block material
              child.material.roughness = 1
              child.material.metalness = 0
              child.material.flatShading = true
              child.material.envMapIntensity = 0
              if ('shininess' in child.material) child.material.shininess = 0
              if (child.material.specular && typeof child.material.specular.setScalar === 'function') child.material.specular.setScalar(0)
              if ('clearcoat' in child.material) {
                child.material.clearcoat = 0
                if ('clearcoatRoughness' in child.material) child.material.clearcoatRoughness = 1
              }
              if ('sheen' in child.material) child.material.sheen = 0
              if ('reflectivity' in child.material) child.material.reflectivity = 0
              if ('envMap' in child.material) child.material.envMap = null
              if ('ior' in child.material) child.material.ior = 1.0
              if ('specularIntensity' in child.material) child.material.specularIntensity = 0
              if ('specularColor' in child.material && child.material.specularColor && typeof child.material.specularColor.setScalar === 'function') child.material.specularColor.setScalar(0)
              if ('emissiveIntensity' in child.material) child.material.emissiveIntensity = 0
              if ('emissive' in child.material && child.material.emissive && typeof child.material.emissive.setScalar === 'function') child.material.emissive.setScalar(0)
            } else if (MATERIAL_STYLE === 'diffuse') {
              // Keep glTF/PBR params; just ensure smooth shading for diffuse lighting
              child.material.flatShading = false
            } // 'pbr': leave as-is
            child.material.needsUpdate = true
          }
        }
      })
    }
  }, [gltf])

  return (
    <primitive 
      ref={meshRef}
      object={gltf.scene} 
      scale={[1, 1, 1]}
      position={[0, 0, -1]}
    />
  )
}

function FireplaceModel({ scrollRef }) {
  const groupRef = useRef()
  const gltf = useLoader(GLTFLoader, '/fireplace.glb')
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const textureRef = useRef(null)
  const imgRef = useRef(null) // fallback <img>
  const framesRef = useRef([])
  const frameIndexRef = useRef(0)
  const accRef = useRef(0)
  const FRAME_DURATION = 0.05 // seconds per frame

  // Prepare texture: prefer ImageDecoder to extract frames and control timing
  useEffect(() => {
    let cancelled = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    canvasRef.current = canvas
    ctxRef.current = ctx

    async function setupWithImageDecoder() {
      if (!('ImageDecoder' in window)) throw new Error('ImageDecoder not supported')
      const res = await fetch('/fire.gif')
      if (!res.ok) throw new Error('Failed to fetch fire.gif')
      const buf = await res.arrayBuffer()
      // @ts-ignore - ImageDecoder is a browser API
      const decoder = new window.ImageDecoder({ data: buf, type: 'image/gif' })
      // @ts-ignore
      await decoder.tracks.ready
      // @ts-ignore
      const track = decoder.tracks.selectedTrack
      const frameCount = track?.frameCount ?? 0
      if (!frameCount) throw new Error('No frames decoded')
      const frames = []
      for (let i = 0; i < frameCount; i++) {
        const { image } = await decoder.decode({ frameIndex: i })
        frames.push(image)
      }
      if (cancelled) return
      framesRef.current = frames

      const w = frames[0]?.displayWidth || 64
      const h = frames[0]?.displayHeight || 64
      canvas.width = w
      canvas.height = h
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(frames[0], 0, 0)

      const tex = new THREE.CanvasTexture(canvas)
      tex.minFilter = THREE.NearestFilter
      tex.magFilter = THREE.NearestFilter
      tex.generateMipmaps = false
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      tex.flipY = false
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace
      else tex.encoding = THREE.sRGBEncoding
      tex.center.set(0.5, 0.5)
      tex.rotation = -Math.PI / 2
      textureRef.current = tex

      if (gltf?.scene) {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            const mat = new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,
              alphaTest: 0.1,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
            // Dispose old material to free memory
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m && m.dispose && m.dispose())
            } else if (child.material && child.material.dispose) {
              child.material.dispose()
            }
            child.material = mat
            child.castShadow = false
            child.receiveShadow = false
          }
        })
      }
    }

    async function setupWithGifuct() {
      const res = await fetch('/fire.gif')
      if (!res.ok) throw new Error('Failed to fetch fire.gif')
      const buf = await res.arrayBuffer()
      const gif = parseGIF(buf)
      const frames = decompressFrames(gif, true) // build full RGBA patches per frame
      if (!frames?.length) throw new Error('GIF had no frames')
      const w = frames[0].dims.width
      const h = frames[0].dims.height
      canvas.width = w
      canvas.height = h
      // Convert to ImageData objects for fast putImageData in the stepper
      const imgDatas = frames.map((f) => new ImageData(f.patch, w, h))
      framesRef.current = imgDatas
      // Draw first frame
      ctx.putImageData(imgDatas[0], 0, 0)

      const tex = new THREE.CanvasTexture(canvas)
      tex.minFilter = THREE.NearestFilter
      tex.magFilter = THREE.NearestFilter
      tex.generateMipmaps = false
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      tex.flipY = false
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace
      else tex.encoding = THREE.sRGBEncoding
      tex.center.set(0.5, 0.5)
      tex.rotation = -Math.PI / 2
      textureRef.current = tex

      if (gltf?.scene) {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            const mat = new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,
              alphaTest: 0.1,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m && m.dispose && m.dispose())
            } else if (child.material && child.material.dispose) {
              child.material.dispose()
            }
            child.material = mat
            child.castShadow = false
            child.receiveShadow = false
          }
        })
      }
    }

    // Last-resort legacy fallback: animated <img> texture (will ignore fixed 0.1s timing)
    async function setupLegacyImgFallback() {
      const img = new Image()
      img.decoding = 'async'
      img.loading = 'eager'
      img.crossOrigin = 'anonymous'
      img.src = '/fire.gif'
      imgRef.current = img
      const onLoad = () => {
        if (cancelled) return
        const tex = new THREE.Texture(img)
        tex.minFilter = THREE.NearestFilter
        tex.magFilter = THREE.NearestFilter
        tex.generateMipmaps = false
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        tex.flipY = false
        if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace
        else tex.encoding = THREE.sRGBEncoding
        tex.center.set(0.5, 0.5)
        tex.rotation = -Math.PI / 2
        textureRef.current = tex

        if (gltf?.scene) {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              const mat = new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide,
                depthWrite: false,
              })
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => m && m.dispose && m.dispose())
              } else if (child.material && child.material.dispose) {
                child.material.dispose()
              }
              child.material = mat
              child.castShadow = false
              child.receiveShadow = false
            }
          })
        }
      }
      img.addEventListener('load', onLoad)
      try {
        img.style.position = 'fixed'
        img.style.left = '-9999px'
        img.style.top = '-9999px'
        img.style.width = '1px'
        img.style.height = '1px'
        img.style.opacity = '0'
        img.style.pointerEvents = 'none'
        document.body.appendChild(img)
      } catch {}
      return () => img.removeEventListener('load', onLoad)
    }

    let cleanupFallback = null
    ;(async () => {
      try {
        await setupWithImageDecoder()
      } catch {
        try {
          await setupWithGifuct()
        } catch {
          cleanupFallback = await setupLegacyImgFallback()
        }
      }
    })()

    return () => {
      cancelled = true
      if (cleanupFallback) cleanupFallback()
      // Dispose texture and materials
      const tex = textureRef.current
      if (tex) {
        textureRef.current = null
        tex.dispose()
      }
      if (gltf?.scene) {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m && m.dispose && m.dispose())
            } else if (child.material && child.material.dispose) {
              child.material.dispose()
            }
          }
        })
      }
      // Close bitmaps
      const frames = framesRef.current
      framesRef.current = []
      frames?.forEach((bmp) => bmp && bmp.close && bmp.close())
      // Remove hidden <img> if present
      const img = imgRef.current
      if (img) {
        imgRef.current = null
        try { document.body.removeChild(img) } catch {}
      }
    }
  }, [gltf])

  // Per-frame updates: scroll-follow and fixed-rate frame stepping at 0.1s
  useFrame((state, delta) => {
    const group = groupRef.current
    if (group) {
      const objectZ = group.position.z ?? -1
      const vp = state.viewport.getCurrentViewport(state.camera, [0, 0, objectZ])
      const worldPerPixelY = vp.height / state.size.height
      const scrollY = scrollRef?.current || 0
      group.position.y = scrollY * worldPerPixelY
    }

    const frames = framesRef.current
    const tex = textureRef.current
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (frames && frames.length > 0 && tex && ctx && canvas) {
      accRef.current += delta
      while (accRef.current >= FRAME_DURATION) {
        accRef.current -= FRAME_DURATION
        frameIndexRef.current = (frameIndexRef.current + 1) % frames.length
        const frame = frames[frameIndexRef.current]
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (typeof ImageData !== 'undefined' && frame instanceof ImageData) {
          ctx.putImageData(frame, 0, 0)
        } else {
          // ImageBitmap or HTMLImageElement
          ctx.drawImage(frame, 0, 0)
        }
        tex.needsUpdate = true
      }
    } else if (tex && !frames?.length) {
      // Fallback path using <img>: mark texture dirty so GIF progresses
      tex.needsUpdate = true
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, -1]}>
      {gltf && <primitive object={gltf.scene} />}
    </group>
  )
}

function Scene({ scrollRef }) {
  return (
    <>
      {/* Minecraft-style sky light */}
      <hemisphereLight
        args={["#8ec9ff", "#2a2a2a", 0.6]}
      />

      {/* Main sun light - warm directional with soft shadows */}
      <directionalLight
        position={[60, 120, 900]}
        intensity={1.6}
        color="#ffe6b3"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={400}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0005}
        shadow-normalBias={0.6}
      />

      {/* Title is now rendered in the hero section as HTML text */}

      <ChunkModel scrollRef={scrollRef} />
      <FireplaceModel scrollRef={scrollRef} />
    </>
  )
}

export default function ThreeBackground() {
  const scrollRef = useRef(0)

  useEffect(() => {
    const appContainer = document.querySelector('.app')

    const handleScroll = () => {
      // Prefer container scroll if it actually scrolls; otherwise use window scroll
      if (appContainer && appContainer.scrollHeight > appContainer.clientHeight) {
        scrollRef.current = appContainer.scrollTop
      } else {
        scrollRef.current = window.scrollY || window.pageYOffset || 0
      }
    }

    // Attach listeners to both so changes in layout still work
    if (appContainer) appContainer.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Sync once on mount
    handleScroll()

    return () => {
      if (appContainer) appContainer.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="three-container">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ 
          position: [0, 0, 3], 
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        shadows
        gl={{ 
          antialias: true,
          alpha: false,
        }}
        onCreated={({ gl, scene, camera }) => {
          // Enable shadows
          gl.shadowMap.enabled = true
          gl.shadowMap.type = THREE.PCFSoftShadowMap
          
          // Set up tone mapping for cinematic look
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
          if ('outputColorSpace' in gl) {
            gl.outputColorSpace = THREE.SRGBColorSpace
          } else if ('outputEncoding' in gl) {
            gl.outputEncoding = THREE.sRGBEncoding
          }
          
          // Add fog and background for atmospheric depth
          const skyColor = 0x87CEEB
          scene.background = new THREE.Color(skyColor)
          gl.setClearColor(new THREE.Color(skyColor), 1)
          scene.fog = new THREE.Fog(skyColor, 60, 350)
        }}
      >
        <Scene scrollRef={scrollRef} />
      </Canvas>
    </div>
  )
}
