const canvas = document.querySelector("#signal-canvas");
const ctx = canvas.getContext("2d");
const webglCanvas = document.querySelector("#webgl-scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const palette = ["#e3b471", "#d9c49a", "#c98a4b", "#86d7d2"];
const shouldStartAtTop = !window.location.hash || window.location.hash === "#top";

function scrollToPageTop(behavior = "auto") {
  window.scrollTo({ top: 0, left: 0, behavior });
}

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

if (shouldStartAtTop) {
  scrollToPageTop();
  window.addEventListener(
    "load",
    () => {
      requestAnimationFrame(() => scrollToPageTop());
    },
    { once: true }
  );
}

document.querySelectorAll('a[href="#top"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (window.location.hash !== "#top") {
      history.pushState(null, "", "#top");
    }
    scrollToPageTop(reduceMotion ? "auto" : "smooth");
  });
});

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#top") {
    requestAnimationFrame(() => scrollToPageTop());
  }
});

let width = 0;
let height = 0;
let ratio = 1;
let nodes = [];
let frame = 0;

function resizeSignalCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const targetCount = Math.min(64, Math.max(28, Math.floor((width * height) / 30000)));
  nodes = Array.from({ length: targetCount }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.1,
    vy: -0.08 - Math.random() * 0.22,
    size: 0.8 + Math.random() * 1.8,
    color: palette[index % palette.length],
    phase: Math.random() * Math.PI * 2
  }));
}

function drawMote(x, y, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.22;
  ctx.beginPath();
  ctx.arc(x, y, size * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animateSignals(time = 0) {
  frame += 1;
  ctx.clearRect(0, 0, width, height);

  for (const node of nodes) {
    const sway = Math.sin(time * 0.0007 + node.phase) * 0.14;
    node.x += reduceMotion ? 0 : node.vx + sway;
    node.y += reduceMotion ? 0 : node.vy;

    if (node.x < -20) node.x = width + 20;
    if (node.x > width + 20) node.x = -20;
    if (node.y < -24) {
      node.y = height + 20;
      node.x = Math.random() * width;
    }

    const pulse = 0.34 + Math.sin(time * 0.0018 + node.phase) * 0.16;
    drawMote(node.x, node.y, node.size, node.color, reduceMotion ? 0.16 : pulse);
  }

  if (!reduceMotion || frame < 2) {
    requestAnimationFrame(animateSignals);
  }
}

window.addEventListener("resize", resizeSignalCanvas);

resizeSignalCanvas();
animateSignals();

async function initThreeScene() {
  window.__portfolioThreeStatus = "loading";
  try {
    const THREE = await import("./vendor/three.module.js");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, 0.1, 120);
    const renderer = new THREE.WebGLRenderer({
      canvas: webglCanvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x06080f, 1);
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene.fog = new THREE.FogExp2(0x080a12, 0.05);
    const cameraBase = new THREE.Vector3(0, 0.24, 8.4);
    const lookAtTarget = new THREE.Vector3(0, -0.68, -4.5);
    camera.position.copy(cameraBase);

    const world = new THREE.Group();
    const temple = new THREE.Group();
    const ruins = new THREE.Group();
    const artStage = new THREE.Group();
    const holoRig = new THREE.Group();
    scene.add(world);
    world.add(temple, ruins, artStage, holoRig);

    const ambient = new THREE.AmbientLight(0x8a93a8, 0.5);
    const keyLight = new THREE.DirectionalLight(0xf2a95c, 3.1);
    const rimLight = new THREE.PointLight(0x86d7d2, 13, 30);
    const scanLight = new THREE.PointLight(0xe3b471, 6, 18);
    keyLight.position.set(-3.8, 5.4, 5.2);
    rimLight.position.set(4.4, 1.8, 2.8);
    scanLight.position.set(-4.2, -0.9, -1.2);
    scene.add(ambient, keyLight, rimLight, scanLight);

    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x7d5941,
      emissive: 0x1d1007,
      metalness: 0.04,
      roughness: 0.78
    });
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xe3b471,
      transparent: true,
      opacity: 0.14,
      wireframe: true
    });
    const holoMaterial = new THREE.MeshStandardMaterial({
      color: 0x86d7d2,
      emissive: 0x0e3f44,
      metalness: 0.22,
      roughness: 0.34,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });
    const glassMaterial = new THREE.MeshBasicMaterial({
      color: 0x86d7d2,
      transparent: true,
      opacity: 0.18,
      wireframe: true
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 34, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x140e0d,
        emissive: 0x070604,
        metalness: 0.08,
        roughness: 0.86,
        transparent: true,
        opacity: 0.84
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -2.62, -5.4);
    world.add(floor);

    const floorGrid = new THREE.GridHelper(28, 42, 0xe3b471, 0x25333a);
    floorGrid.position.set(0, -2.58, -5.4);
    floorGrid.material.transparent = true;
    floorGrid.material.opacity = 0.18;
    world.add(floorGrid);

    function addFluting(columnGroup, radius, height, material) {
      const lines = [];
      for (let i = 0; i < 18; i += 1) {
        const angle = (i / 18) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        lines.push(x, -height / 2, z, x, height / 2, z);
      }
      const flutes = new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lines, 3)),
        material
      );
      columnGroup.add(flutes);
    }

    function addTempleColumn(x, z, height, scale = 1) {
      const column = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2 * scale, 0.28 * scale, height, 28),
        stoneMaterial
      );
      const capital = new THREE.Mesh(
        new THREE.BoxGeometry(0.9 * scale, 0.24 * scale, 0.64 * scale),
        stoneMaterial
      );
      const base = capital.clone();
      const topDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42 * scale, 0.34 * scale, 0.18 * scale, 24),
        stoneMaterial
      );
      const bottomDisc = topDisc.clone();
      const outline = new THREE.Mesh(
        new THREE.CylinderGeometry(0.205 * scale, 0.285 * scale, height + 0.02, 28),
        edgeMaterial
      );

      shaft.position.y = -2.42 + height / 2;
      outline.position.copy(shaft.position);
      capital.position.y = -2.42 + height + 0.2 * scale;
      base.position.y = -2.54;
      topDisc.position.y = -2.42 + height + 0.03 * scale;
      bottomDisc.position.y = -2.34;
      column.add(shaft, outline, capital, base, topDisc, bottomDisc);
      addFluting(column, 0.292 * scale, height * 0.9, new THREE.LineBasicMaterial({
        color: 0xffd19a,
        transparent: true,
        opacity: 0.22
      }));
      column.children[column.children.length - 1].position.y = shaft.position.y;

      column.position.set(x, 0, z);
      column.rotation.y = Math.sin(x * 1.4) * 0.05;
      temple.add(column);
      return column;
    }

    const sideColumns = [
      addTempleColumn(-5.9, -2.2, 4.5, 1.12),
      addTempleColumn(5.9, -2.2, 4.5, 1.12),
      addTempleColumn(-6.35, -5.45, 3.7, 0.92),
      addTempleColumn(6.35, -5.45, 3.7, 0.92)
    ];

    const pediment = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 0.78, 3),
      new THREE.MeshStandardMaterial({
        color: 0x5d3d2b,
        emissive: 0x160c05,
        metalness: 0.04,
        roughness: 0.78,
        transparent: true,
        opacity: 0.86
      })
    );
    pediment.position.set(0, 2.1, -6.6);
    pediment.rotation.z = Math.PI / 2;
    pediment.rotation.y = Math.PI / 2;
    const pedimentEdge = new THREE.Mesh(pediment.geometry, edgeMaterial);
    pedimentEdge.position.copy(pediment.position);
    pedimentEdge.rotation.copy(pediment.rotation);
    temple.add(pediment, pedimentEdge);

    function addRuinBay(x, z, scale = 1) {
      const bay = new THREE.Group();
      const columnGeometry = new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 2.1 * scale, 18);
      const blockGeometry = new THREE.BoxGeometry(0.58 * scale, 0.18 * scale, 0.44 * scale);
      const lintelGeometry = new THREE.BoxGeometry(1.62 * scale, 0.26 * scale, 0.5 * scale);
      const archGeometry = new THREE.TorusGeometry(0.55 * scale, 0.045 * scale, 8, 30, Math.PI);

      [-0.58, 0.58].forEach((offset) => {
        const column = new THREE.Mesh(columnGeometry, stoneMaterial);
        column.position.set(offset * scale, -1.55 * scale, 0);
        const capTop = new THREE.Mesh(blockGeometry, stoneMaterial);
        const capBottom = new THREE.Mesh(blockGeometry, stoneMaterial);
        capTop.position.set(offset * scale, -0.44 * scale, 0);
        capBottom.position.set(offset * scale, -2.62 * scale, 0);
        bay.add(column, capTop, capBottom);
      });

      const lintel = new THREE.Mesh(lintelGeometry, stoneMaterial);
      lintel.position.set(0, -0.2 * scale, 0);
      const arch = new THREE.Mesh(archGeometry, stoneMaterial);
      arch.position.set(0, -0.34 * scale, 0.03 * scale);
      const outline = new THREE.Mesh(archGeometry, edgeMaterial);
      outline.position.copy(arch.position);
      bay.add(lintel, arch, outline);

      bay.position.set(x, -0.02, z);
      bay.rotation.y = Math.sin(x) * 0.08;
      ruins.add(bay);
      return bay;
    }

    [-4.8, -3.05, -1.3, 0.45, 2.2, 3.95].forEach((x, index) => {
      addRuinBay(x, -7.2 - (index % 2) * 0.28, 0.95 + (index % 3) * 0.06);
    });

    const loader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    function loadArtworkTexture(src) {
      const texture = loader.load(src);
      texture.anisotropy = maxAnisotropy;
      if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function createFrame(width, height, color = 0x86d7d2) {
      const points = [
        new THREE.Vector3(-width / 2, -height / 2, 0),
        new THREE.Vector3(width / 2, -height / 2, 0),
        new THREE.Vector3(width / 2, height / 2, 0),
        new THREE.Vector3(-width / 2, height / 2, 0),
        new THREE.Vector3(-width / 2, -height / 2, 0)
      ];
      return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.58 })
      );
    }

    const artworkPanels = [
      {
        src: "assets/artstation/ephesus.jpg",
        width: 5.7,
        height: 3.25,
        position: [-2.25, 0.22, -5.85],
        rotation: [0.05, 0.2, -0.01],
        color: 0xe3b471
      },
      {
        src: "assets/artstation/character-model.webp",
        width: 2.35,
        height: 2.95,
        position: [3.32, 0.0, -3.55],
        rotation: [0.02, -0.58, 0.04],
        color: 0x86d7d2
      },
      {
        src: "assets/artstation/magical-tree.webp",
        width: 2.2,
        height: 2.9,
        position: [-4.5, -0.42, -2.9],
        rotation: [0.04, 0.72, -0.08],
        color: 0xe3b471
      },
      {
        src: "assets/artstation/aether.jpg",
        width: 3.1,
        height: 1.75,
        position: [1.75, 1.55, -5.15],
        rotation: [-0.03, -0.35, 0.04],
        color: 0x86d7d2
      },
      {
        src: "assets/artstation/to-tartarus.jpg",
        width: 2.65,
        height: 2.0,
        position: [-0.45, -1.28, -2.45],
        rotation: [0.02, 0.14, -0.05],
        color: 0xe3b471
      },
      {
        src: "assets/artstation/steampunk-device.webp",
        width: 2.0,
        height: 2.52,
        position: [4.62, -1.05, -5.25],
        rotation: [0.02, -0.78, 0.06],
        color: 0x86d7d2
      },
      {
        src: "assets/artstation/sundial.jpg",
        width: 2.12,
        height: 1.6,
        position: [-3.75, 1.24, -4.05],
        rotation: [-0.02, 0.54, -0.05],
        color: 0xe3b471
      }
    ];

    const panels = artworkPanels.map((asset, index) => {
      const group = new THREE.Group();
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(asset.width, asset.height),
        new THREE.MeshBasicMaterial({
          map: loadArtworkTexture(asset.src),
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide
        })
      );
      const backPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(asset.width + 0.18, asset.height + 0.18),
        new THREE.MeshBasicMaterial({
          color: 0x06080f,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        })
      );
      backPlate.position.z = -0.03;
      const frameLine = createFrame(asset.width + 0.18, asset.height + 0.18, asset.color);
      frameLine.position.z = 0.035;
      group.add(backPlate, panel, frameLine);
      group.position.set(...asset.position);
      group.rotation.set(...asset.rotation);
      group.userData = {
        baseY: asset.position[1],
        baseRotationY: asset.rotation[1],
        baseRotationZ: asset.rotation[2],
        phase: index * 0.8
      };
      artStage.add(group);
      return group;
    });

    function createSunDialModel() {
      const sundial = new THREE.Group();
      const dialStone = new THREE.MeshStandardMaterial({
        color: 0x8b6a46,
        emissive: 0x1f1307,
        metalness: 0.18,
        roughness: 0.54
      });
      const dialGlow = new THREE.LineBasicMaterial({ color: 0xffd19a, transparent: true, opacity: 0.64 });
      const faceTexture = loadArtworkTexture("assets/artstation/sundial-closeup.webp");

      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.12, 0.16, 72), dialStone);
      base.position.y = 0;
      sundial.add(base);

      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.96, 72),
        new THREE.MeshBasicMaterial({
          map: faceTexture,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide
        })
      );
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.085;
      sundial.add(face);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.99, 0.024, 8, 96),
        new THREE.MeshBasicMaterial({ color: 0xe3b471, transparent: true, opacity: 0.5 })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.105;
      sundial.add(rim);

      const tickPositions = [];
      for (let i = 0; i < 24; i += 1) {
        const angle = (i / 24) * Math.PI * 2;
        const inner = i % 2 === 0 ? 0.62 : 0.74;
        const outer = 0.9;
        tickPositions.push(
          Math.cos(angle) * inner, 0.12, Math.sin(angle) * inner,
          Math.cos(angle) * outer, 0.12, Math.sin(angle) * outer
        );
      }
      sundial.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(tickPositions, 3)),
        dialGlow
      ));

      const gnomonShape = new THREE.Shape();
      gnomonShape.moveTo(-0.04, 0);
      gnomonShape.lineTo(0.58, 0);
      gnomonShape.lineTo(-0.04, 0.82);
      gnomonShape.lineTo(-0.04, 0);
      const gnomon = new THREE.Mesh(
        new THREE.ExtrudeGeometry(gnomonShape, { depth: 0.045, bevelEnabled: false }),
        new THREE.MeshStandardMaterial({
          color: 0x2a1810,
          emissive: 0x160b05,
          metalness: 0.32,
          roughness: 0.42
        })
      );
      gnomon.position.set(-0.2, 0.13, -0.02);
      gnomon.rotation.y = -0.24;
      sundial.add(gnomon);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.82, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x06080f, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.rotation.z = -0.56;
      shadow.position.set(0.2, 0.127, -0.24);
      sundial.add(shadow);

      sundial.position.set(2.48, -1.46, -5.16);
      sundial.rotation.set(1.14, -0.12, -0.04);
      sundial.scale.setScalar(0.58);
      sundial.userData = {
        baseY: sundial.position.y,
        baseRotationY: sundial.rotation.y
      };
      world.add(sundial);
      return sundial;
    }

    const sunDialModel = createSunDialModel();

    const scanLines = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const scan = new THREE.Mesh(
        new THREE.PlaneGeometry(8.6, 0.012),
        new THREE.MeshBasicMaterial({ color: 0x86d7d2, transparent: true, opacity: 0.13, side: THREE.DoubleSide })
      );
      scan.position.set(-0.3, -1.45 + i * 0.52, -2.18);
      scan.rotation.y = 0.12;
      scanLines.add(scan);
    }
    artStage.add(scanLines);

    function addCylinderBetween(group, start, end, radius, material) {
      const direction = new THREE.Vector3().subVectors(end, start);
      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 12), material);
      limb.position.copy(midpoint);
      limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      group.add(limb);
    }

    function createHologramFigure() {
      const figure = new THREE.Group();
      figure.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), holoMaterial));
      figure.children[0].position.y = 1.08;

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.96, 18), holoMaterial);
      torso.position.y = 0.42;
      figure.add(torso);

      const joints = {
        shoulderLeft: new THREE.Vector3(-0.38, 0.77, 0),
        shoulderRight: new THREE.Vector3(0.38, 0.77, 0),
        handLeft: new THREE.Vector3(-0.72, 0.08, 0.03),
        handRight: new THREE.Vector3(0.72, 0.08, 0.03),
        hipLeft: new THREE.Vector3(-0.2, -0.08, 0),
        hipRight: new THREE.Vector3(0.2, -0.08, 0),
        footLeft: new THREE.Vector3(-0.34, -1.08, 0.04),
        footRight: new THREE.Vector3(0.34, -1.08, 0.04)
      };
      addCylinderBetween(figure, joints.shoulderLeft, joints.handLeft, 0.045, holoMaterial);
      addCylinderBetween(figure, joints.shoulderRight, joints.handRight, 0.045, holoMaterial);
      addCylinderBetween(figure, joints.hipLeft, joints.footLeft, 0.055, holoMaterial);
      addCylinderBetween(figure, joints.hipRight, joints.footRight, 0.055, holoMaterial);

      const turntable = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.015, 8, 72), glassMaterial);
      turntable.rotation.x = Math.PI / 2;
      turntable.position.y = -1.22;
      const shoulderRing = turntable.clone();
      shoulderRing.position.y = 0.78;
      figure.add(turntable, shoulderRing);
      return figure;
    }

    const figure = createHologramFigure();
    figure.position.set(2.28, -0.98, -2.2);
    figure.rotation.y = -0.56;
    holoRig.add(figure);

    const particleCount = 420;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 14;
      particlePositions[i * 3 + 1] = -2.25 + Math.random() * 5.4;
      particlePositions[i * 3 + 2] = -8.5 + Math.random() * 7.2;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xffd19a, size: 0.026, transparent: true, opacity: 0.62 })
    );
    world.add(particles);

    const targetRotation = { x: 0, y: 0 };
    const pointerShift = { x: 0, y: 0 };
    window.addEventListener("pointermove", (event) => {
      pointerShift.x = event.clientX / window.innerWidth - 0.5;
      pointerShift.y = event.clientY / window.innerHeight - 0.5;
      targetRotation.y = pointerShift.x * 0.18;
      targetRotation.x = pointerShift.y * 0.08;
    });

    function resizeThree() {
      cameraBase.z = window.innerWidth < 720 ? 10.1 : 8.4;
      cameraBase.y = window.innerWidth < 720 ? 0.08 : 0.24;
      camera.fov = window.innerWidth < 720 ? 49 : 43;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener("resize", resizeThree);

    let threeFrames = 0;
    function renderThree(time = 0) {
      threeFrames += 1;
      const t = time * 0.001;

      world.rotation.y += (targetRotation.y - world.rotation.y) * 0.04;
      world.rotation.x += (targetRotation.x - world.rotation.x) * 0.04;

      camera.position.x += (cameraBase.x + pointerShift.x * 0.5 - camera.position.x) * 0.035;
      camera.position.y += (cameraBase.y - pointerShift.y * 0.22 + Math.sin(t * 0.45) * 0.08 - camera.position.y) * 0.035;
      camera.position.z += (cameraBase.z + Math.sin(t * 0.28) * 0.26 - camera.position.z) * 0.035;
      camera.lookAt(lookAtTarget);

      ruins.position.y = Math.sin(t * 0.42) * 0.035;
      temple.position.y = Math.sin(t * 0.28) * 0.025;
      temple.rotation.y = Math.sin(t * 0.18) * 0.025;
      sideColumns.forEach((column, index) => {
        column.rotation.y = Math.sin(t * 0.34 + index) * 0.035 + (index < 2 ? 0 : Math.sin(index) * 0.04);
      });
      floorGrid.position.z = -5.4 + ((t * 0.18) % 1);
      particles.rotation.y = t * 0.025;
      particles.position.x = Math.sin(t * 0.16) * 0.12;
      scanLines.position.y = Math.sin(t * 1.2) * 0.06;

      panels.forEach((panel, index) => {
        const phase = panel.userData.phase;
        panel.position.y = panel.userData.baseY + Math.sin(t * 0.72 + phase) * 0.12;
        panel.rotation.y = panel.userData.baseRotationY + Math.sin(t * 0.42 + phase) * 0.055;
        panel.rotation.z = panel.userData.baseRotationZ + Math.sin(t * 0.38 + phase) * 0.018;
      });

      sunDialModel.position.y = sunDialModel.userData.baseY + Math.sin(t * 0.72 + 1.6) * 0.035;
      sunDialModel.rotation.y = sunDialModel.userData.baseRotationY + Math.sin(t * 0.38) * 0.12;
      figure.rotation.y = -0.56 + Math.sin(t * 0.65) * 0.38;
      figure.position.y = -0.98 + Math.sin(t * 0.9) * 0.05;
      holoRig.rotation.y = Math.sin(t * 0.34) * 0.08;

      renderer.render(scene, camera);
      window.__portfolioThreeReady = threeFrames > 3;
      window.__portfolioThreeFrames = threeFrames;
      window.__portfolioThreeStatus = "rendering";
      window.__portfolioSceneAssetCount = panels.length + 1;

      if (!reduceMotion || threeFrames < 4) {
        requestAnimationFrame(renderThree);
      }
    }

    resizeThree();
    renderThree();
  } catch (error) {
    document.body.classList.add("three-fallback");
    window.__portfolioThreeReady = false;
    window.__portfolioThreeStatus = "failed";
    window.__portfolioThreeError = String(error);
  }
}

initThreeScene();

function updateSceneDim() {
  const fadeEnd = Math.max(window.innerHeight * 0.85, 1);
  const dim = Math.min(1, Math.max(0, window.scrollY / fadeEnd));
  document.documentElement.style.setProperty("--scene-dim", dim.toFixed(3));
}

window.addEventListener("scroll", updateSceneDim, { passive: true });
window.addEventListener("resize", updateSceneDim);
updateSceneDim();

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.18 }
);

document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));

const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const navObserver = new IntersectionObserver(
  (entries) => {
    const active = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!active) return;

    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${active.target.id}`;
      link.classList.toggle("is-active", isActive);
    });
  },
  {
    rootMargin: "-30% 0px -52% 0px",
    threshold: [0.12, 0.3, 0.6]
  }
);

sections.forEach((section) => navObserver.observe(section));

document.querySelectorAll(".project-card").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (reduceMotion) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-4px) rotateX(${y * -2}deg) rotateY(${x * 2}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});
