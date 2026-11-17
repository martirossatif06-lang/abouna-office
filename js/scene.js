// ==========================================
// 3D REAL OFFICE SCENE (Three.js + GSAP)
// محاكاة طبيعية ثلاثية الأبعاد بعمق حقيقي وفيزياء فتح وإغلاق للأبواب والأدراج
// ==========================================

class OfficeScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.interactables = [];
    this.hoveredItem = null;
    this.activeFocusItem = null;

    // Lighting
    this.ambientLight = null;
    this.hemiLight = null;
    this.sunLight = null;
    this.lampLight = null;
    this.isNightMode = false;

    // Registry of all interactive doors & drawers
    this.doorRegistry = {};

    // Human Perspective Camera (Eye-level standing in room)
    this.defaultCameraPos = new THREE.Vector3(0, 5.6, 9.6);
    this.defaultCameraLookAt = new THREE.Vector3(0, 1.8, 0.2);

    this.audioEnabled = true;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf6f1e8);
    this.scene.fog = new THREE.FogExp2(0xf6f1e8, 0.018);

    // Natural human perspective FOV (48°)
    this.camera = new THREE.PerspectiveCamera(48, this.width / this.height, 0.1, 80);
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultCameraLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.copy(this.defaultCameraLookAt);
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 17;
    this.controls.enablePan = false;

    this.setupLighting();
    this.buildRoomArchitecture();

    // بناء الأثاث مع تجاويف حقيقية وأعماق ملموسة ورفوف داخلية
    this.buildEntranceWall();
    this.buildWindowAndDeskWall();
    this.buildGrandThreeSectionCabinet();
    this.buildFourGlassLibraryCabinet();

    // Track pointer
    this.pointerDownPos = { x: 0, y: 0, time: 0 };
    this.lastTap = { time: 0, itemId: null };

    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));

    this.animate();
  }

  onPointerDown(event) {
    this.pointerDownPos = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now()
    };
  }

  // --- Audio Synthesis ---
  playSound(type) {
    if (!this.audioEnabled) return;
    try {
      const ctx = window._audioCtx || (window._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'door') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'switch') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(750, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e) {}
  }

  // --- Lighting Setup with Natural Ambient Occlusion and Sharp Depth Shadows ---
  setupLighting() {
    // 1. Warm Soft Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xfff6ec, 0.42);
    this.scene.add(this.ambientLight);

    // 2. Hemisphere Light: Natural ceiling bounce vs dark floor shadows for depth
    this.hemiLight = new THREE.HemisphereLight(0xfffaed, 0x3d3028, 0.48);
    this.scene.add(this.hemiLight);

    // 3. Sun Light (Window Direction) with proper wide frustum for room-wide shadows
    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 1.35);
    this.sunLight.position.set(8.5, 7.5, 2.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 28;
    this.sunLight.shadow.camera.left = -9;
    this.sunLight.shadow.camera.right = 9;
    this.sunLight.shadow.camera.top = 9;
    this.sunLight.shadow.camera.bottom = -9;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // 4. Soft Fill Light from opposite room corner
    const fillLight = new THREE.DirectionalLight(0xdce8f5, 0.35);
    fillLight.position.set(-7, 6.5, -5);
    this.scene.add(fillLight);

    // 5. Desk Lamp Point Light
    this.lampLight = new THREE.PointLight(0xffb74d, 0.55, 6.5, 1.9);
    this.lampLight.position.set(2.6, 2.3, 0.5);
    this.lampLight.castShadow = true;
    this.lampLight.shadow.bias = -0.001;
    this.scene.add(this.lampLight);
  }

  // --- Procedural Parquet Floor Texture for Realistic Perspective Depth Lines ---
  createParquetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#b78952';
    ctx.fillRect(0, 0, 1024, 1024);

    const plankH = 32;
    const plankW = 128;
    const tones = ['#c2945d', '#b3844a', '#bb8e55', '#aa7a41', '#cb9e68'];

    for (let y = 0; y < 1024; y += plankH) {
      const shift = (Math.floor(y / plankH) % 2) * (plankW / 2);
      for (let x = -shift; x < 1024 + plankW; x += plankW) {
        ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        ctx.fillRect(x + 1, y + 1, plankW - 2, plankH - 2);

        // subtle wood plank grain lines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(x + 1, y + plankH / 2, plankW - 2, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(x + 1, y + 2, plankW - 2, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    return texture;
  }

  // --- Soft Contact Shadow Helper to Anchor Objects firmly to Floor ---
  createContactShadow(w, d, opacity = 0.35) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 64);
    grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
    grad.addColorStop(0.65, `rgba(0, 0, 0, ${opacity * 0.4})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.005;
    return plane;
  }

  // --- Room Architecture ---
  buildRoomArchitecture() {
    const roomWidth = 10;
    const roomLength = 9;
    const roomHeight = 4.8;

    // Floor with Parquet Wood Planks
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomLength);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.createParquetTexture(),
      roughness: 0.38,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Oriental Carpet with Depth Borders
    const rugGeo = new THREE.PlaneGeometry(5.4, 4.8);
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x8b2e1e, roughness: 0.9 });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, 0.1);
    rug.receiveShadow = true;
    this.scene.add(rug);

    const rugBorder = new THREE.Mesh(
      new THREE.PlaneGeometry(5.0, 4.4),
      new THREE.MeshStandardMaterial({ color: 0xc8963e, roughness: 0.85 })
    );
    rugBorder.rotation.x = -Math.PI / 2;
    rugBorder.position.set(0, 0.015, 0.1);
    rugBorder.receiveShadow = true;
    this.scene.add(rugBorder);

    const rugInner = new THREE.Mesh(
      new THREE.PlaneGeometry(4.7, 4.1),
      new THREE.MeshStandardMaterial({ color: 0x6e2216, roughness: 0.9 })
    );
    rugInner.rotation.x = -Math.PI / 2;
    rugInner.position.set(0, 0.02, 0.1);
    rugInner.receiveShadow = true;
    this.scene.add(rugInner);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3ede3, roughness: 0.88 });

    const northWall = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, roomHeight, 0.2), wallMat);
    northWall.position.set(0, roomHeight / 2, -roomLength / 2);
    northWall.receiveShadow = true;
    this.scene.add(northWall);

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomHeight, roomLength), wallMat);
    westWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    westWall.receiveShadow = true;
    this.scene.add(westWall);

    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomHeight, roomLength), wallMat);
    eastWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    eastWall.receiveShadow = true;
    this.scene.add(eastWall);

    // Baseboards
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const nBase = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 0.22, 0.06), baseMat);
    nBase.position.set(0, 0.11, -roomLength / 2 + 0.1);
    this.scene.add(nBase);

    const wBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, roomLength), baseMat);
    wBase.position.set(-roomWidth / 2 + 0.1, 0.11, 0);
    this.scene.add(wBase);

    const eBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, roomLength), baseMat);
    eBase.position.set(roomWidth / 2 - 0.1, 0.11, 0);
    this.scene.add(eBase);
  }

  // --- Helper to Register an Animated Door ---
  registerDoor(id, pivot, hingeSide, doorMesh, itemData, openAngle = 0.65) {
    const angle = hingeSide === 'left' ? Math.PI * openAngle : -Math.PI * openAngle;
    this.doorRegistry[id] = {
      pivot: pivot,
      isOpen: false,
      closedY: pivot.rotation.y,
      openY: pivot.rotation.y + angle
    };

    doorMesh.userData = {
      ...itemData,
      doorId: id
    };
    this.interactables.push(doorMesh);
  }

  // --- Helper to Register an Animated Drawer ---
  registerDrawer(id, drawerGroup, mesh, itemData, pullDistance = 0.5) {
    this.doorRegistry[id] = {
      drawer: drawerGroup,
      isOpen: false,
      closedZ: drawerGroup.position.z,
      openZ: drawerGroup.position.z + pullDistance
    };

    mesh.userData = {
      ...itemData,
      doorId: id
    };
    this.interactables.push(mesh);
  }

  // ==========================================
  // 1. حائط الباب (الشمال):
  // [باب المكتب] -> [الكنبة] -> [دولاب التواني المفرغ بعمق ورفوف] -> [التلاجة]
  // ==========================================
  buildEntranceWall() {
    const wallZ = -4.35;
    const woodClassic = new THREE.MeshStandardMaterial({ color: 0x54382e, roughness: 0.45 });
    const woodInner = new THREE.MeshStandardMaterial({ color: 0x3d2720, roughness: 0.6 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.85 });

    // A. باب المكتب
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-3.7, 0, wallZ);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x38221b, roughness: 0.5 }));
    frame.position.set(0, 1.6, 0);
    frame.castShadow = true;
    doorGroup.add(frame);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.55, 1.6, 0.02);

    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.05, 0.06), woodClassic);
    doorLeaf.position.set(0.575, 0, 0);
    doorLeaf.castShadow = true;
    doorPivot.add(doorLeaf);

    const doorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 12), handleMat);
    doorHandle.position.set(1.0, -0.1, 0.06);
    doorLeaf.add(doorHandle);

    doorGroup.add(doorPivot);
    this.scene.add(doorGroup);

    this.registerDoor('office_door', doorPivot, 'left', doorLeaf, {
      id: 'office_door',
      name: '🚪 باب المكتب (اضغط للفتح/الغلق)',
      section: 'contact',
      focusPos: new THREE.Vector3(-2.8, 2.0, -2.5),
      focusLookAt: new THREE.Vector3(-3.7, 1.6, wallZ)
    }, 0.55);

    // B. كنبة الزوار
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(-1.8, 0, wallZ + 0.65);
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.72 });
    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.85), sofaMat);
    sofaSeat.position.set(0, 0.45, 0);
    sofaSeat.castShadow = true;
    sofaSeat.receiveShadow = true;
    sofaGroup.add(sofaSeat);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.25), sofaMat);
    sofaBack.position.set(0, 0.95, -0.3);
    sofaBack.castShadow = true;
    sofaGroup.add(sofaBack);

    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.85);
    const armL = new THREE.Mesh(armGeo, sofaMat);
    armL.position.set(-0.95, 0.65, 0);
    armL.castShadow = true;
    sofaGroup.add(armL);
    const armR = new THREE.Mesh(armGeo, sofaMat);
    armR.position.set(0.95, 0.65, 0);
    armR.castShadow = true;
    sofaGroup.add(armR);

    // Contact shadow under sofa
    const sofaShadow = this.createContactShadow(2.4, 1.2, 0.4);
    sofaShadow.position.set(0, 0.005, 0);
    sofaGroup.add(sofaShadow);
    this.scene.add(sofaGroup);

    // C. دولاب أبونا الخاص (تجويف حقيقي بعمق 75 سم + رفوف + شماعة وتواني داخلية!)
    const vestmentGroup = new THREE.Group();
    vestmentGroup.position.set(1.1, 0, wallZ + 0.45);

    const cabWidth = 1.6;
    const cabHeight = 3.6;
    const cabDepth = 0.75;

    // Contact shadow
    vestmentGroup.add(this.createContactShadow(cabWidth + 0.3, cabDepth + 0.3, 0.45));

    // Outer Shell (Hollow Cavity: Back + Left Wall + Right Wall + Top + Bottom)
    // 1. Back panel
    const cabBack = new THREE.Mesh(new THREE.BoxGeometry(cabWidth, cabHeight, 0.04), woodInner);
    cabBack.position.set(0, cabHeight / 2, -cabDepth / 2 + 0.02);
    cabBack.receiveShadow = true;
    vestmentGroup.add(cabBack);

    // 2. Left side wall (Shows full 75cm depth!)
    const cabLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, cabHeight, cabDepth), woodClassic);
    cabLeft.position.set(-cabWidth / 2 + 0.02, cabHeight / 2, 0);
    cabLeft.castShadow = true;
    cabLeft.receiveShadow = true;
    vestmentGroup.add(cabLeft);

    // 3. Right side wall (Shows full 75cm depth!)
    const cabRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, cabHeight, cabDepth), woodClassic);
    cabRight.position.set(cabWidth / 2 - 0.02, cabHeight / 2, 0);
    cabRight.castShadow = true;
    cabRight.receiveShadow = true;
    vestmentGroup.add(cabRight);

    // 4. Top & Bottom panels
    const cabTop = new THREE.Mesh(new THREE.BoxGeometry(cabWidth, 0.04, cabDepth), woodClassic);
    cabTop.position.set(0, cabHeight - 0.02, 0);
    cabTop.castShadow = true;
    vestmentGroup.add(cabTop);

    const cabBottom = new THREE.Mesh(new THREE.BoxGeometry(cabWidth, 0.06, cabDepth), woodClassic);
    cabBottom.position.set(0, 0.03, 0);
    cabBottom.receiveShadow = true;
    vestmentGroup.add(cabBottom);

    // 5. Middle dividing shelf separating tall lower section from top box
    const lowerDoorH = 2.4;
    const midShelf = new THREE.Mesh(new THREE.BoxGeometry(cabWidth - 0.08, 0.04, cabDepth - 0.05), woodInner);
    midShelf.position.set(0, lowerDoorH + 0.02, 0);
    midShelf.receiveShadow = true;
    midShelf.castShadow = true;
    vestmentGroup.add(midShelf);

    // Interior contents inside the deep cavity:
    // Hanger rod
    const hangerRod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, cabWidth - 0.12, 12), handleMat);
    hangerRod.rotation.z = Math.PI / 2;
    hangerRod.position.set(0, lowerDoorH - 0.15, 0);
    vestmentGroup.add(hangerRod);

    // Priest tunics hanging inside the deep space
    const tunicWhite = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.5, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.6 })
    );
    tunicWhite.position.set(-0.35, 1.25, 0);
    tunicWhite.castShadow = true;
    tunicWhite.receiveShadow = true;
    vestmentGroup.add(tunicWhite);

    const tunicBlack = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.5, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.6 })
    );
    tunicBlack.position.set(0.35, 1.25, 0);
    tunicBlack.castShadow = true;
    tunicBlack.receiveShadow = true;
    vestmentGroup.add(tunicBlack);

    // Top Box interior shelf contents (Censer, Liturgical boxes)
    const boxContent = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xb7950b, roughness: 0.3, metalness: 0.7 })
    );
    boxContent.position.set(-0.35, lowerDoorH + 0.45, 0);
    vestmentGroup.add(boxContent);

    // --- الضرفتين الطوال التحتانيين (للروتين والتواني) ---
    const doorW = cabWidth / 2 - 0.03;
    const doorThick = 0.04;

    const doorPivotL = new THREE.Group();
    doorPivotL.position.set(-cabWidth / 2 + 0.02, lowerDoorH / 2 + 0.02, cabDepth / 2);
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(doorW, lowerDoorH - 0.02, doorThick), woodClassic);
    doorL.position.set(doorW / 2, 0, 0);
    doorL.castShadow = true;
    doorPivotL.add(doorL);

    const hL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 12), handleMat);
    hL.position.set(doorW - 0.06, 0, 0.04);
    doorL.add(hL);
    vestmentGroup.add(doorPivotL);

    this.registerDoor('vestment_left', doorPivotL, 'left', doorL, {
      id: 'cabinet_door',
      name: 'ضلفة توانى أبونا (يسار) — اضغط للفتح 3D',
      section: 'bio',
      focusPos: new THREE.Vector3(1.1, 1.8, -1.8),
      focusLookAt: new THREE.Vector3(1.1, 1.6, wallZ + 0.45)
    });

    const doorPivotR = new THREE.Group();
    doorPivotR.position.set(cabWidth / 2 - 0.02, lowerDoorH / 2 + 0.02, cabDepth / 2);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(doorW, lowerDoorH - 0.02, doorThick), woodClassic);
    doorR.position.set(-doorW / 2, 0, 0);
    doorR.castShadow = true;
    doorPivotR.add(doorR);

    const hR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 12), handleMat);
    hR.position.set(-doorW + 0.06, 0, 0.04);
    doorR.add(hR);
    vestmentGroup.add(doorPivotR);

    this.registerDoor('vestment_right', doorPivotR, 'right', doorR, {
      id: 'cabinet_door',
      name: 'ضلفة توانى أبونا (يمين) — اضغط للفتح 3D',
      section: 'bio',
      focusPos: new THREE.Vector3(1.1, 1.8, -1.8),
      focusLookAt: new THREE.Vector3(1.1, 1.6, wallZ + 0.45)
    });

    // --- الضرفتين المربعين البوكس الفوقانيين (للأباركة) ---
    const boxH = cabHeight - lowerDoorH - 0.08;
    const boxY = lowerDoorH + boxH / 2 + 0.04;

    const boxPivotL = new THREE.Group();
    boxPivotL.position.set(-cabWidth / 2 + 0.02, boxY, cabDepth / 2);
    const boxDoorL = new THREE.Mesh(new THREE.BoxGeometry(doorW, boxH, doorThick), woodClassic);
    boxDoorL.position.set(doorW / 2, 0, 0);
    boxDoorL.castShadow = true;
    boxPivotL.add(boxDoorL);
    vestmentGroup.add(boxPivotL);

    this.registerDoor('vestment_box_left', boxPivotL, 'left', boxDoorL, {
      id: 'cabinet_door',
      name: 'ضلفة الأباركة والصلوات (يسار) — اضغط للفتح 3D',
      section: 'bio',
      focusPos: new THREE.Vector3(1.1, 2.7, -1.8),
      focusLookAt: new THREE.Vector3(1.1, 2.8, wallZ + 0.45)
    });

    const boxPivotR = new THREE.Group();
    boxPivotR.position.set(cabWidth / 2 - 0.02, boxY, cabDepth / 2);
    const boxDoorR = new THREE.Mesh(new THREE.BoxGeometry(doorW, boxH, doorThick), woodClassic);
    boxDoorR.position.set(-doorW / 2, 0, 0);
    boxDoorR.castShadow = true;
    boxPivotR.add(boxDoorR);
    vestmentGroup.add(boxPivotR);

    this.registerDoor('vestment_box_right', boxPivotR, 'right', boxDoorR, {
      id: 'cabinet_door',
      name: 'ضلفة مقتنيات الخدمة (يمين) — اضغط للفتح 3D',
      section: 'bio',
      focusPos: new THREE.Vector3(1.1, 2.7, -1.8),
      focusLookAt: new THREE.Vector3(1.1, 2.8, wallZ + 0.45)
    });

    this.scene.add(vestmentGroup);

    // D. التلاجة في زاوية الحائط
    const fridgeGroup = new THREE.Group();
    fridgeGroup.position.set(3.4, 0, wallZ + 0.55);

    fridgeGroup.add(this.createContactShadow(1.1, 1.0, 0.4));

    const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xe0e2e6, roughness: 0.28, metalness: 0.35 });
    const fridgeBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.45, 0.75), fridgeMat);
    fridgeBody.position.set(0, 0.725, 0);
    fridgeBody.castShadow = true;
    fridgeBody.receiveShadow = true;
    fridgeGroup.add(fridgeBody);

    const fridgePivot = new THREE.Group();
    fridgePivot.position.set(-0.4, 0.725, 0.38);

    const fridgeDoor = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.42, 0.05), fridgeMat);
    fridgeDoor.position.set(0.42, 0, 0);
    fridgeDoor.castShadow = true;
    fridgePivot.add(fridgeDoor);

    const frHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.03), handleMat);
    frHandle.position.set(0.78, 0.1, 0.04);
    fridgeDoor.add(frHandle);
    fridgeGroup.add(fridgePivot);

    this.registerDoor('fridge_door', fridgePivot, 'left', fridgeDoor, {
      id: 'fridge_door',
      name: '🧊 ثلاجة المكتب (اضغط للفتح)',
      section: 'services',
      focusPos: new THREE.Vector3(2.5, 1.5, -2.2),
      focusLookAt: new THREE.Vector3(3.4, 0.8, wallZ + 0.55)
    }, 0.55);

    this.scene.add(fridgeGroup);
  }

  // ==========================================
  // 2. حائط الشباك والمكتب (اليمين):
  // [التكييف] من فوق + [الشباك] تحته + [مكتب أبونا بعمق ودرج منزلق 3D] والكرسيين
  // ==========================================
  buildWindowAndDeskWall() {
    const wallX = 4.88;

    // التكييف
    const acGroup = new THREE.Group();
    acGroup.position.set(wallX - 0.25, 4.0, 0.5);
    acGroup.rotation.y = -Math.PI / 2;
    const acBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    acBody.castShadow = true;
    acGroup.add(acBody);

    const acVent = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0x95a5a6 }));
    acVent.position.set(0, -0.15, 0.16);
    acGroup.add(acVent);
    this.scene.add(acGroup);

    // الشباك مع إضاءة نافذة طبيعية
    const winGroup = new THREE.Group();
    winGroup.position.set(wallX - 0.06, 2.4, 0.5);
    winGroup.rotation.y = -Math.PI / 2;
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    winGroup.add(winFrame);

    this.windowGlassMat = new THREE.MeshBasicMaterial({ color: 0xcde5ff });
    const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7), this.windowGlassMat);
    winGlass.position.z = 0.055;
    winGroup.add(winGlass);
    this.scene.add(winGroup);

    // مكتب أبونا والكرسيين مع عمق حقيقي
    const deskGroup = new THREE.Group();
    deskGroup.position.set(2.6, 0, 0.5);
    deskGroup.rotation.y = -Math.PI / 2;

    const deskWood = new THREE.MeshStandardMaterial({ color: 0x54382e, roughness: 0.35 });
    const innerDeskWood = new THREE.MeshStandardMaterial({ color: 0x3d2720, roughness: 0.5 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.72 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.85 });

    // Contact shadow under desk & chairs
    deskGroup.add(this.createContactShadow(3.2, 2.4, 0.5));

    // سطح المكتب بسمك وأبعاد ملموسة
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.09, 1.25), deskWood);
    top.position.set(0, 1.5, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    // قوائم وجوانب المكتب (Left Leg & Modesty Panel)
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 1.15), deskWood);
    sideL.position.set(-1.18, 0.725, 0);
    sideL.castShadow = true;
    sideL.receiveShadow = true;
    deskGroup.add(sideL);

    const modestyPanel = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.0, 0.04), deskWood);
    modestyPanel.position.set(0, 0.95, -0.52);
    modestyPanel.castShadow = true;
    deskGroup.add(modestyPanel);

    // وحدة الأدراج (كمودينو) مفرغة مع درج ينزلق بالكامل للخارج بفيزياء حقيقية!
    const pedW = 0.68;
    const pedH = 1.35;
    const pedD = 1.05;
    const pedX = 0.84;

    // Pedestal Frame (Hollow slot)
    const pedOuter = new THREE.Mesh(new THREE.BoxGeometry(pedW, pedH, pedD), deskWood);
    pedOuter.position.set(pedX, pedH / 2, 0);
    pedOuter.castShadow = true;
    pedOuter.receiveShadow = true;
    deskGroup.add(pedOuter);

    // تجويف فتحة الدرج العلوية
    const drawerSlot = new THREE.Mesh(new THREE.BoxGeometry(pedW - 0.08, 0.38, pedD - 0.06), innerDeskWood);
    drawerSlot.position.set(pedX, 1.1, 0.03);
    deskGroup.add(drawerSlot);

    // مجسم الدرج المنزلق 3D الكامل (له وجه + قاع + جوانب ينزلق للأمام!)
    const drawerBoxGroup = new THREE.Group();
    drawerBoxGroup.position.set(pedX, 1.1, pedD / 2);

    const dW = pedW - 0.08;
    const dH = 0.34;
    const dDepth = 0.85;

    // Face
    const dFace = new THREE.Mesh(new THREE.BoxGeometry(dW, dH, 0.04), new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.4 }));
    dFace.position.set(0, 0, 0);
    dFace.castShadow = true;
    drawerBoxGroup.add(dFace);

    // Handle
    const cHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 12), handleMat);
    cHandle.rotation.z = Math.PI / 2;
    cHandle.position.set(0, 0, 0.035);
    dFace.add(cHandle);

    // Drawer Sides & Bottom (Visible when drawer pulls out!)
    const dSideL = new THREE.Mesh(new THREE.BoxGeometry(0.02, dH - 0.04, dDepth), innerDeskWood);
    dSideL.position.set(-dW / 2 + 0.02, -0.02, -dDepth / 2);
    drawerBoxGroup.add(dSideL);

    const dSideR = new THREE.Mesh(new THREE.BoxGeometry(0.02, dH - 0.04, dDepth), innerDeskWood);
    dSideR.position.set(dW / 2 - 0.02, -0.02, -dDepth / 2);
    drawerBoxGroup.add(dSideR);

    const dBottom = new THREE.Mesh(new THREE.BoxGeometry(dW, 0.02, dDepth), innerDeskWood);
    dBottom.position.set(0, -dH / 2 + 0.02, -dDepth / 2);
    drawerBoxGroup.add(dBottom);

    // Papers & Stationery inside the drawer!
    const papers = new THREE.Mesh(
      new THREE.BoxGeometry(dW - 0.1, 0.06, dDepth - 0.2),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.7 })
    );
    papers.position.set(0, -dH / 2 + 0.05, -dDepth / 2);
    drawerBoxGroup.add(papers);

    deskGroup.add(drawerBoxGroup);

    this.registerDrawer('desk_commode_drawer', drawerBoxGroup, dFace, {
      id: 'drawers',
      name: 'درج مكتب أبونا — اضغط مرتين للسحب في 3D',
      section: 'services',
      focusPos: new THREE.Vector3(1.2, 2.2, 0.5),
      focusLookAt: new THREE.Vector3(2.6, 1.4, 0.5)
    }, 0.55);

    // كرسي أبونا
    const abounaChair = new THREE.Group();
    abounaChair.position.set(0, 0, 0.65);
    const aSeat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.8), leatherMat);
    aSeat.position.set(0, 0.85, 0);
    aSeat.castShadow = true;
    abounaChair.add(aSeat);

    const aBack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.14), leatherMat);
    aBack.position.set(0, 1.4, 0.35);
    aBack.castShadow = true;
    abounaChair.add(aBack);
    deskGroup.add(abounaChair);

    // كرسيين للزوار أمام المكتب
    const vChair1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.65), leatherMat);
    vChair1.position.set(-0.6, 0.55, -0.95);
    vChair1.castShadow = true;
    deskGroup.add(vChair1);

    const vChair2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.65), leatherMat);
    vChair2.position.set(0.6, 0.55, -0.95);
    vChair2.castShadow = true;
    deskGroup.add(vChair2);

    // اللابتوب على سطح المكتب
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(-0.25, 1.55, 0);
    const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.02, 0.46), new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.85 }));
    lBase.castShadow = true;
    laptopGroup.add(lBase);

    const lScreenPivot = new THREE.Group();
    lScreenPivot.position.set(0, 0.01, 0.23);
    lScreenPivot.rotation.x = Math.PI / 10;
    const lScreen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.44, 0.02), new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.85 }));
    lScreen.position.set(0, 0.22, 0);
    lScreenPivot.add(lScreen);

    const lDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x2563eb, emissiveIntensity: 0.6 })
    );
    lDisplay.position.set(0, 0.22, -0.012);
    lDisplay.rotation.y = Math.PI;
    lScreenPivot.add(lDisplay);
    laptopGroup.add(lScreenPivot);

    lBase.userData = {
      id: 'laptop',
      name: 'لابتوب أبونا (عرض الأعمال والمواقع)',
      section: 'showcase',
      focusPos: new THREE.Vector3(1.7, 2.2, 0.5),
      focusLookAt: new THREE.Vector3(2.4, 1.6, 0.5)
    };
    this.interactables.push(lBase);
    deskGroup.add(laptopGroup);

    // أباجورة المكتب (تبديل وضع النهار/الليل)
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0.85, 1.55, -0.2);
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 16), handleMat);
    lampBase.castShadow = true;
    lampGroup.add(lampBase);

    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 12), handleMat);
    lampPole.position.set(0, 0.28, 0);
    lampGroup.add(lampPole);

    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.32, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.3, side: THREE.DoubleSide })
    );
    lampShade.position.set(0, 0.52, 0);
    lampGroup.add(lampShade);

    this.lampBulbMat = new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0xffb74d, emissiveIntensity: 0.8 });
    const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), this.lampBulbMat);
    lampBulb.position.set(0, 0.48, 0);
    lampGroup.add(lampBulb);

    lampBase.userData = {
      id: 'lamp',
      name: 'أباجورة المكتب (اضغط لتبديل النهار/الليل)',
      section: 'lamp_toggle'
    };
    lampShade.userData = lampBase.userData;
    this.interactables.push(lampBase, lampShade);
    deskGroup.add(lampGroup);

    // التليفون الأرضي
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(-0.85, 1.55, -0.15);
    const phoneBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.32), new THREE.MeshStandardMaterial({ color: 0x263238 }));
    phoneBase.castShadow = true;
    phoneGroup.add(phoneBase);

    phoneBase.userData = {
      id: 'phone',
      name: 'تليفون المكتب (تواصل مباشر)',
      section: 'contact',
      focusPos: new THREE.Vector3(1.2, 2.3, 0.5),
      focusLookAt: new THREE.Vector3(2.6, 1.6, 0.5)
    };
    this.interactables.push(phoneBase);
    deskGroup.add(phoneGroup);

    this.scene.add(deskGroup);
  }

  // ==========================================
  // 3. الحائط المقابل لحائط الباب (الجنوب):
  // الدولاب الكبير 3 أجزاء بتجويف حقيقي وأعماق ملموسة ورفوف وأدراج:
  // - اليسار: ضرفتين طوال من تحت + بوكسين من فوق
  // - الوسط: درجين من تحت ينزلقان + ضرفتين قزاز للدروع والشهادات + بوكسين
  // - اليمين: 4 أرفف مكتبة + بوكسين من فوق
  // ==========================================
  buildGrandThreeSectionCabinet() {
    const cabinetGroup = new THREE.Group();
    cabinetGroup.position.set(0, 0, 4.0);
    cabinetGroup.rotation.y = Math.PI;

    const woodDark = new THREE.MeshStandardMaterial({ color: 0x4a2e2b, roughness: 0.48 });
    const woodInner = new THREE.MeshStandardMaterial({ color: 0x361f1c, roughness: 0.65 });
    const woodDoor = new THREE.MeshStandardMaterial({ color: 0x5a3733, roughness: 0.42 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.08, transparent: true, opacity: 0.42 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.85 });

    const totalW = 6.2;
    const totalH = 4.0;
    const depth = 0.75;
    const secW = totalW / 3;

    // Contact shadow
    cabinetGroup.add(this.createContactShadow(totalW + 0.4, depth + 0.4, 0.5));

    // Outer Hollow Cabinet Frame (Shows full 75cm depth!)
    // 1. Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(totalW, totalH, 0.04), woodInner);
    backWall.position.set(0, totalH / 2, -depth / 2 + 0.02);
    backWall.receiveShadow = true;
    cabinetGroup.add(backWall);

    // 2. Left & Right Outer Walls (full 75cm depth)
    const outerL = new THREE.Mesh(new THREE.BoxGeometry(0.05, totalH, depth), woodDark);
    outerL.position.set(-totalW / 2 + 0.025, totalH / 2, 0);
    outerL.castShadow = true;
    outerL.receiveShadow = true;
    cabinetGroup.add(outerL);

    const outerR = new THREE.Mesh(new THREE.BoxGeometry(0.05, totalH, depth), woodDark);
    outerR.position.set(totalW / 2 - 0.025, totalH / 2, 0);
    outerR.castShadow = true;
    outerR.receiveShadow = true;
    cabinetGroup.add(outerR);

    // 3. Top & Bottom Plinths
    const topBoard = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.06, depth), woodDark);
    topBoard.position.set(0, totalH - 0.03, 0);
    topBoard.castShadow = true;
    cabinetGroup.add(topBoard);

    const bottomBoard = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.08, depth), woodDark);
    bottomBoard.position.set(0, 0.04, 0);
    bottomBoard.receiveShadow = true;
    cabinetGroup.add(bottomBoard);

    // 4. Two Major Vertical Partitions separating the 3 Sections (Running full depth!)
    const part1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, totalH, depth - 0.04), woodDark);
    part1.position.set(-secW / 2, totalH / 2, 0);
    part1.castShadow = true;
    part1.receiveShadow = true;
    cabinetGroup.add(part1);

    const part2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, totalH, depth - 0.04), woodDark);
    part2.position.set(secW / 2, totalH / 2, 0);
    part2.castShadow = true;
    part2.receiveShadow = true;
    cabinetGroup.add(part2);

    // 5. Horizontal Divider separating Top Boxes from Lower Sections
    const boxH = 0.9;
    const boxDividerY = totalH - boxH - 0.04;
    const hDivider = new THREE.Mesh(new THREE.BoxGeometry(totalW - 0.1, 0.04, depth - 0.04), woodDark);
    hDivider.position.set(0, boxDividerY, 0);
    hDivider.castShadow = true;
    hDivider.receiveShadow = true;
    cabinetGroup.add(hDivider);

    // =========================================
    // الصف العلوي: 6 ضلف بوكس مربعة مع تجويف داخلي عميق
    // =========================================
    const boxY = boxDividerY + boxH / 2 + 0.02;

    for (let sec = 0; sec < 3; sec++) {
      const centerX = (sec - 1) * secW;
      const bDoorW = secW / 2 - 0.04;

      // بوكس يسار
      const boxPL = new THREE.Group();
      boxPL.position.set(centerX - secW / 2 + 0.02, boxY, depth / 2);
      const bL = new THREE.Mesh(new THREE.BoxGeometry(bDoorW, boxH - 0.02, 0.04), woodDoor);
      bL.position.set(bDoorW / 2, 0, 0);
      bL.castShadow = true;
      boxPL.add(bL);
      cabinetGroup.add(boxPL);

      this.registerDoor(`grand_top_box_${sec}_L`, boxPL, 'left', bL, {
        id: 'bookshelf',
        name: `ضلفة بوكس علوية (${sec + 1}) — اضغط للفتح 3D`,
        section: 'projects',
        focusPos: new THREE.Vector3(centerX * -1, 3.2, 1.8),
        focusLookAt: new THREE.Vector3(centerX * -1, 3.2, 4.0)
      });

      // بوكس يمين
      const boxPR = new THREE.Group();
      boxPR.position.set(centerX + secW / 2 - 0.02, boxY, depth / 2);
      const bR = new THREE.Mesh(new THREE.BoxGeometry(bDoorW, boxH - 0.02, 0.04), woodDoor);
      bR.position.set(-bDoorW / 2, 0, 0);
      bR.castShadow = true;
      boxPR.add(bR);
      cabinetGroup.add(boxPR);

      this.registerDoor(`grand_top_box_${sec}_R`, boxPR, 'right', bR, {
        id: 'bookshelf',
        name: `ضلفة بوكس علوية (${sec + 1}) — اضغط للفتح 3D`,
        section: 'projects',
        focusPos: new THREE.Vector3(centerX * -1, 3.2, 1.8),
        focusLookAt: new THREE.Vector3(centerX * -1, 3.2, 4.0)
      });
    }

    // =========================================
    // السيكشن الأيسر: ضرفتين طوال من تحت مع تجويف ورفوف داخلية
    // =========================================
    const leftSecX = -secW;
    const tallH = boxDividerY - 0.08;
    const tallDoorW = secW / 2 - 0.04;

    // رفوف داخلية في السيكشن الأيسر (بعمق 70 سم!)
    for (let r = 1; r <= 3; r++) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(secW - 0.08, 0.03, depth - 0.08), woodInner);
      sh.position.set(leftSecX, r * (tallH / 4) + 0.05, 0);
      sh.castShadow = true;
      sh.receiveShadow = true;
      cabinetGroup.add(sh);

      // ملفات ومجلدات على الرف بعمق حقيقي
      const folder = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.35, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 })
      );
      folder.position.set(leftSecX - 0.4, r * (tallH / 4) + 0.24, 0);
      cabinetGroup.add(folder);
    }

    const leftTallPL = new THREE.Group();
    leftTallPL.position.set(leftSecX - secW / 2 + 0.02, tallH / 2 + 0.06, depth / 2);
    const leftTallL = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH - 0.02, 0.04), woodDoor);
    leftTallL.position.set(tallDoorW / 2, 0, 0);
    leftTallL.castShadow = true;
    leftTallPL.add(leftTallL);
    cabinetGroup.add(leftTallPL);

    this.registerDoor('grand_tall_left_L', leftTallPL, 'left', leftTallL, {
      id: 'bookshelf',
      name: 'ضلفة الدولاب الطويلة (يسار) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(2.0, 1.8, 4.0)
    });

    const leftTallPR = new THREE.Group();
    leftTallPR.position.set(leftSecX + secW / 2 - 0.02, tallH / 2 + 0.06, depth / 2);
    const leftTallR = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH - 0.02, 0.04), woodDoor);
    leftTallR.position.set(-tallDoorW / 2, 0, 0);
    leftTallR.castShadow = true;
    leftTallPR.add(leftTallR);
    cabinetGroup.add(leftTallPR);

    this.registerDoor('grand_tall_left_R', leftTallPR, 'right', leftTallR, {
      id: 'bookshelf',
      name: 'ضلفة الدولاب الطويلة (يمين) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(2.0, 1.8, 4.0)
    });

    // =========================================
    // السيكشن الأيمن: 4 رفوف مكتبة مفتوحة تملأها الكتب بعمق حقيقي
    // =========================================
    const rightSecX = secW;
    const rShelfCount = 4;
    const rShelfSpacing = tallH / (rShelfCount + 1);

    for (let s = 1; s <= rShelfCount; s++) {
      const shY = s * rShelfSpacing + 0.05;
      const sh = new THREE.Mesh(new THREE.BoxGeometry(secW - 0.08, 0.035, depth - 0.06), woodDark);
      sh.position.set(rightSecX, shY, 0);
      sh.castShadow = true;
      sh.receiveShadow = true;
      cabinetGroup.add(sh);

      // صفوف كتب واقعية بألوان وعناوين وأعماق ملموسة
      const bookColors = [0x8b0000, 0x1b4d3e, 0x2e4053, 0xb7950b, 0x4a235a, 0x7e5109];
      let currX = rightSecX - secW / 2 + 0.15;

      while (currX < rightSecX + secW / 2 - 0.2) {
        const bW = 0.055 + Math.random() * 0.04;
        const bH = 0.38 + Math.random() * 0.12;
        const bD = depth * 0.65;
        const bMat = new THREE.MeshStandardMaterial({
          color: bookColors[Math.floor(Math.random() * bookColors.length)],
          roughness: 0.55
        });

        const book = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bMat);
        book.position.set(currX + bW / 2, shY + bH / 2 + 0.018, 0);
        book.castShadow = true;
        book.receiveShadow = true;
        cabinetGroup.add(book);

        currX += bW + 0.015;
      }
    }

    // ضرفتان خشبيتان لمكتبة المؤلفات والمشروعات (تفتحان لتكشفان الكتب بالداخل في 3D!)
    const rightTallPL = new THREE.Group();
    rightTallPL.position.set(rightSecX - secW / 2 + 0.02, tallH / 2 + 0.06, depth / 2);
    const rightTallL = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH - 0.02, 0.04), woodDoor);
    rightTallL.position.set(tallDoorW / 2, 0, 0);
    rightTallL.castShadow = true;
    rightTallPL.add(rightTallL);
    cabinetGroup.add(rightTallPL);

    this.registerDoor('grand_bookshelf_L', rightTallPL, 'left', rightTallL, {
      id: 'bookshelf',
      name: 'مكتبة المؤلفات والمشروعات (يسار) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(-1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(-2.0, 1.8, 4.0)
    });

    const rightTallPR = new THREE.Group();
    rightTallPR.position.set(rightSecX + secW / 2 - 0.02, tallH / 2 + 0.06, depth / 2);
    const rightTallR = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH - 0.02, 0.04), woodDoor);
    rightTallR.position.set(-tallDoorW / 2, 0, 0);
    rightTallR.castShadow = true;
    rightTallPR.add(rightTallR);
    cabinetGroup.add(rightTallPR);

    this.registerDoor('grand_bookshelf_R', rightTallPR, 'right', rightTallR, {
      id: 'bookshelf',
      name: 'مكتبة المؤلفات والمشروعات (يمين) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(-1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(-2.0, 1.8, 4.0)
    });

    // =========================================
    // السيكشن الأوسط: درجين من تحت ينزلقان + ضرفتين قزاز للدروع والشهادات
    // =========================================
    const midSecX = 0;
    const drawersH = 1.05;
    const glassH = tallH - drawersH;

    // رف فاصل أفقي فوق الدرجين
    const midDivider = new THREE.Mesh(new THREE.BoxGeometry(secW - 0.08, 0.04, depth - 0.04), woodDark);
    midDivider.position.set(midSecX, drawersH + 0.05, 0);
    midDivider.castShadow = true;
    cabinetGroup.add(midDivider);

    // الدرج السفلي 3D المنزلق
    const drawer1Group = new THREE.Group();
    drawer1Group.position.set(midSecX, 0.32, depth / 2);
    const d1Face = new THREE.Mesh(new THREE.BoxGeometry(secW - 0.08, 0.44, 0.04), woodDoor);
    d1Face.castShadow = true;
    drawer1Group.add(d1Face);

    const d1SideL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, depth - 0.1), woodInner);
    d1SideL.position.set(-secW / 2 + 0.06, 0, -depth / 2 + 0.05);
    drawer1Group.add(d1SideL);
    const d1SideR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, depth - 0.1), woodInner);
    d1SideR.position.set(secW / 2 - 0.06, 0, -depth / 2 + 0.05);
    drawer1Group.add(d1SideR);

    const d1H = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 12), handleMat);
    d1H.rotation.z = Math.PI / 2;
    d1H.position.set(0, 0, 0.035);
    d1Face.add(d1H);
    cabinetGroup.add(drawer1Group);

    this.registerDrawer('grand_mid_drawer_1', drawer1Group, d1Face, {
      id: 'drawers',
      name: 'درج الخدمات والمستندات (السفلي) — اضغط للفتح 3D',
      section: 'services',
      focusPos: new THREE.Vector3(0, 1.8, 1.6),
      focusLookAt: new THREE.Vector3(0, 0.4, 4.0)
    }, 0.55);

    // الدرج العلوي 3D المنزلق
    const drawer2Group = new THREE.Group();
    drawer2Group.position.set(midSecX, 0.78, depth / 2);
    const d2Face = new THREE.Mesh(new THREE.BoxGeometry(secW - 0.08, 0.44, 0.04), woodDoor);
    d2Face.castShadow = true;
    drawer2Group.add(d2Face);

    const d2H = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 12), handleMat);
    d2H.rotation.z = Math.PI / 2;
    d2H.position.set(0, 0, 0.035);
    d2Face.add(d2H);
    cabinetGroup.add(drawer2Group);

    this.registerDrawer('grand_mid_drawer_2', drawer2Group, d2Face, {
      id: 'drawers',
      name: 'درج العهود والسجلات (العلوي) — اضغط للفتح 3D',
      section: 'services',
      focusPos: new THREE.Vector3(0, 1.8, 1.6),
      focusLookAt: new THREE.Vector3(0, 0.8, 4.0)
    }, 0.55);

    // ضرفتين قزاز فوق الدرجين (لعرض الدروع والشهادات)
    const glassDoorW = secW / 2 - 0.04;
    const glassY = drawersH + glassH / 2 + 0.06;

    // رفوف زجاجية داخلية لعرض الدروع
    for (let r = 1; r <= 3; r++) {
      const gShelf = new THREE.Mesh(new THREE.BoxGeometry(secW - 0.08, 0.02, depth - 0.1), glassMat);
      gShelf.position.set(midSecX, drawersH + r * (glassH / 4) + 0.05, 0);
      cabinetGroup.add(gShelf);

      // دروع ذهبية وفضية داخلية ثلاثية الأبعاد
      const award = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.28, 12), handleMat);
      award.position.set(midSecX + (r - 2) * 0.45, drawersH + r * (glassH / 4) + 0.2, 0);
      award.castShadow = true;
      cabinetGroup.add(award);
    }

    const glassPL = new THREE.Group();
    glassPL.position.set(midSecX - secW / 2 + 0.02, glassY, depth / 2);
    const gDoorL = new THREE.Mesh(new THREE.BoxGeometry(glassDoorW, glassH - 0.02, 0.03), glassMat);
    gDoorL.position.set(glassDoorW / 2, 0, 0);
    glassPL.add(gDoorL);
    cabinetGroup.add(glassPL);

    this.registerDoor('grand_glass_L', glassPL, 'left', gDoorL, {
      id: 'wall_frames',
      name: 'ضلفة القزاز (عرض الدروع والشهادات) — اضغط للفتح 3D',
      section: 'milestones',
      focusPos: new THREE.Vector3(0, 2.2, 1.6),
      focusLookAt: new THREE.Vector3(0, 2.1, 4.0)
    });

    const glassPR = new THREE.Group();
    glassPR.position.set(midSecX + secW / 2 - 0.02, glassY, depth / 2);
    const gDoorR = new THREE.Mesh(new THREE.BoxGeometry(glassDoorW, glassH - 0.02, 0.03), glassMat);
    gDoorR.position.set(-glassDoorW / 2, 0, 0);
    glassPR.add(gDoorR);
    cabinetGroup.add(glassPR);

    this.registerDoor('grand_glass_R', glassPR, 'right', gDoorR, {
      id: 'wall_frames',
      name: 'ضلفة القزاز (عرض الدروع والشهادات) — اضغط للفتح 3D',
      section: 'milestones',
      focusPos: new THREE.Vector3(0, 2.2, 1.6),
      focusLookAt: new THREE.Vector3(0, 2.1, 4.0)
    });

    this.scene.add(cabinetGroup);
  }

  // ==========================================
  // 4. الحائط المقابل للمكتب (الشمال الغربي):
  // دولاب كبير 4 ضلف قزاز من فوق + 4 ضلف مكعبين من تحت
  // بتجويف داخلي عميق (65 سم) ورفوف كاملة بالكتب ثلاثية الأبعاد!
  // ==========================================
  buildFourGlassLibraryCabinet() {
    const libGroup = new THREE.Group();
    libGroup.position.set(-4.5, 0, 0.8);
    libGroup.rotation.y = Math.PI / 2;

    const woodDark = new THREE.MeshStandardMaterial({ color: 0x4a2e2b, roughness: 0.48 });
    const woodInner = new THREE.MeshStandardMaterial({ color: 0x361f1c, roughness: 0.65 });
    const woodDoor = new THREE.MeshStandardMaterial({ color: 0x5a3733, roughness: 0.42 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.08, transparent: true, opacity: 0.45 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.85 });

    const totalW = 4.4;
    const totalH = 3.8;
    const depth = 0.65;
    const doorW = totalW / 4 - 0.03;

    // Contact shadow
    libGroup.add(this.createContactShadow(totalW + 0.3, depth + 0.3, 0.48));

    // Outer Hollow Cabinet Shell (Depth 65cm)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(totalW, totalH, 0.03), woodInner);
    backWall.position.set(0, totalH / 2, -depth / 2 + 0.015);
    backWall.receiveShadow = true;
    libGroup.add(backWall);

    const outerL = new THREE.Mesh(new THREE.BoxGeometry(0.04, totalH, depth), woodDark);
    outerL.position.set(-totalW / 2 + 0.02, totalH / 2, 0);
    outerL.castShadow = true;
    outerL.receiveShadow = true;
    libGroup.add(outerL);

    const outerR = new THREE.Mesh(new THREE.BoxGeometry(0.04, totalH, depth), woodDark);
    outerR.position.set(totalW / 2 - 0.02, totalH / 2, 0);
    outerR.castShadow = true;
    outerR.receiveShadow = true;
    libGroup.add(outerR);

    const topBoard = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.05, depth), woodDark);
    topBoard.position.set(0, totalH - 0.025, 0);
    topBoard.castShadow = true;
    libGroup.add(topBoard);

    const bottomBoard = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.08, depth), woodDark);
    bottomBoard.position.set(0, 0.04, 0);
    bottomBoard.receiveShadow = true;
    libGroup.add(bottomBoard);

    // رف فاصل أفقي عريض يفصل الـ 4 مكعبات التحتانيين عن الـ 4 ضلف القزاز
    const cubeH = 1.2;
    const midShelf = new THREE.Mesh(new THREE.BoxGeometry(totalW - 0.08, 0.04, depth - 0.03), woodDark);
    midShelf.position.set(0, cubeH + 0.02, 0);
    midShelf.castShadow = true;
    midShelf.receiveShadow = true;
    libGroup.add(midShelf);

    // =========================================
    // الـ 4 ضلف مكعبين خشب من تحت مع تجاويف أرشفة
    // =========================================
    const cubeY = cubeH / 2 + 0.03;

    for (let i = 0; i < 4; i++) {
      const xLeft = -totalW / 2 + i * (doorW + 0.03);
      const isLeftHinged = i % 2 === 0;

      // تجويف أرشيف داخلي
      const archBox = new THREE.Mesh(
        new THREE.BoxGeometry(doorW - 0.1, 0.4, depth - 0.15),
        new THREE.MeshStandardMaterial({ color: 0x424242, roughness: 0.7 })
      );
      archBox.position.set(xLeft + doorW / 2, cubeY - 0.1, 0);
      libGroup.add(archBox);

      const cubePivot = new THREE.Group();
      cubePivot.position.set(isLeftHinged ? xLeft : xLeft + doorW, cubeY, depth / 2);

      const cubeDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, cubeH - 0.02, 0.04), woodDoor);
      cubeDoor.position.set(isLeftHinged ? doorW / 2 : -doorW / 2, 0, 0);
      cubeDoor.castShadow = true;
      cubePivot.add(cubeDoor);

      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 12), handleMat);
      h.position.set(isLeftHinged ? doorW - 0.06 : -doorW + 0.06, 0, 0.035);
      cubeDoor.add(h);

      libGroup.add(cubePivot);

      this.registerDoor(`library_cube_${i}`, cubePivot, isLeftHinged ? 'left' : 'right', cubeDoor, {
        id: 'library_four_doors',
        name: `ضلفة الأرشيف المكعبة (${i + 1}) — اضغط للفتح 3D`,
        section: 'projects',
        focusPos: new THREE.Vector3(-2.2, 1.4, 0.8),
        focusLookAt: new THREE.Vector3(-4.5, 1.2, 0.8)
      });
    }

    // =========================================
    // الـ 4 ضلف قزاز من فوق مع 3 أرفف داخلية عميقة محملة بالكتب
    // =========================================
    const upperH = totalH - cubeH - 0.08;
    const glassShelfCount = 3;
    const gShelfSpacing = upperH / (glassShelfCount + 1);

    // 3 رفوف عميقة تمتد على عرض المكتبة
    for (let s = 1; s <= glassShelfCount; s++) {
      const shY = cubeH + s * gShelfSpacing;
      const sh = new THREE.Mesh(new THREE.BoxGeometry(totalW - 0.08, 0.035, depth - 0.06), woodDark);
      sh.position.set(0, shY, 0);
      sh.castShadow = true;
      sh.receiveShadow = true;
      libGroup.add(sh);

      // صفوف كتب ثلاثية الأبعاد وراء القزاز
      const libColors = [0x78281f, 0x145a32, 0x1f618d, 0x7d6608, 0x512e5f, 0x6e2c00, 0xd4af37];
      let currX = -totalW / 2 + 0.15;

      while (currX < totalW / 2 - 0.2) {
        const bW = 0.05 + Math.random() * 0.04;
        const bH = 0.35 + Math.random() * 0.14;
        const bD = depth * 0.65;
        const bookMat = new THREE.MeshStandardMaterial({
          color: libColors[Math.floor(Math.random() * libColors.length)],
          roughness: 0.5
        });

        const book = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bookMat);
        book.position.set(currX + bW / 2, shY + bH / 2 + 0.018, 0);
        book.castShadow = true;
        book.receiveShadow = true;
        libGroup.add(book);

        currX += bW + 0.015;
      }
    }

    // ضرفتان خشبيتان لمكتبة المؤلفات والمشروعات (تفتحان لتكشفان الكتب بالداخل في 3D!)
    const rightTallPL = new THREE.Group();
    rightTallPL.position.set(rightSecX - secW / 2 + 0.02, tallH / 2 + 0.06, depth / 2);
    const rightTallL = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH - 0.02, 0.04), woodDoor);
    rightTallL.position.set(tallDoorW / 2, 0, 0);
    rightTallL.castShadow = true;
    rightTallPL.add(rightTallL);
    cabinetGroup.add(rightTallPL);

    this.registerDoor('grand_bookshelf_L', rightTallPL, 'left', rightTallL, {
      id: 'bookshelf',
      name: 'مكتبة المؤلفات والمشروعات (يسار) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(-1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(-2.0, 1.8, 4.0)
    });

    const rightTallPR = new THREE.Group();
    rightTallPR.position.set(rightSecX + secW / 2 - 0.02, tallH / 2 + 0.06, depth / 2);
    const rightTallR = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH - 0.02, 0.04), woodDoor);
    rightTallR.position.set(-tallDoorW / 2, 0, 0);
    rightTallR.castShadow = true;
    rightTallPR.add(rightTallR);
    cabinetGroup.add(rightTallPR);

    this.registerDoor('grand_bookshelf_R', rightTallPR, 'right', rightTallR, {
      id: 'bookshelf',
      name: 'مكتبة المؤلفات والمشروعات (يمين) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(-1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(-2.0, 1.8, 4.0)
    });

    // الـ 4 ضلف القزاز
    const glassUpperY = cubeH + upperH / 2 + 0.04;

    for (let i = 0; i < 4; i++) {
      const xLeft = -totalW / 2 + i * (doorW + 0.03);
      const isLeftHinged = i % 2 === 0;

      const glassPivot = new THREE.Group();
      glassPivot.position.set(isLeftHinged ? xLeft : xLeft + doorW, glassUpperY, depth / 2);

      const glassDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, upperH - 0.02, 0.03), glassMat);
      glassDoor.position.set(isLeftHinged ? doorW / 2 : -doorW / 2, 0, 0);
      glassPivot.add(glassDoor);

      // Glass door frame border
      const gFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.04, 0.035), woodDark);
      gFrame.position.set(isLeftHinged ? doorW / 2 : -doorW / 2, upperH / 2 - 0.02, 0);
      glassPivot.add(gFrame);

      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 12), handleMat);
      h.position.set(isLeftHinged ? doorW - 0.05 : -doorW + 0.05, 0, 0.03);
      glassDoor.add(h);

      libGroup.add(glassPivot);

      this.registerDoor(`library_glass_${i}`, glassPivot, isLeftHinged ? 'left' : 'right', glassDoor, {
        id: 'library_four_doors',
        name: `ضلفة المكتبة الزجاجية (${i + 1}) — اضغط للفتح 3D`,
        section: 'projects',
        focusPos: new THREE.Vector3(-2.0, 2.5, 0.8),
        focusLookAt: new THREE.Vector3(-4.5, 2.4, 0.8)
      });
    }

    this.scene.add(libGroup);
  }

  // --- Day / Night Lighting Transition ---
  toggleDayNight() {
    this.isNightMode = !this.isNightMode;

    this.playSound('switch');
    document.body.setAttribute('data-theme', this.isNightMode ? 'night' : 'day');

    const duration = 1.2;
    if (this.isNightMode) {
      gsap.to(this.scene.background, { r: 0.06, g: 0.08, b: 0.11, duration });
      gsap.to(this.scene.fog.color, { r: 0.06, g: 0.08, b: 0.11, duration });
      gsap.to(this.ambientLight, { intensity: 0.18, duration });
      gsap.to(this.hemiLight, { intensity: 0.15, duration });
      gsap.to(this.sunLight, { intensity: 0.1, duration });
      gsap.to(this.lampLight, { intensity: 1.8, distance: 9, duration });
      gsap.to(this.lampBulbMat, { emissiveIntensity: 2.0, duration });
      this.windowGlassMat.color.setHex(0x1e293b);
    } else {
      gsap.to(this.scene.background, { r: 0.96, g: 0.94, b: 0.91, duration });
      gsap.to(this.scene.fog.color, { r: 0.96, g: 0.94, b: 0.91, duration });
      gsap.to(this.ambientLight, { intensity: 0.42, duration });
      gsap.to(this.hemiLight, { intensity: 0.48, duration });
      gsap.to(this.sunLight, { intensity: 1.35, duration });
      gsap.to(this.lampLight, { intensity: 0.55, distance: 6.5, duration });
      gsap.to(this.lampBulbMat, { emissiveIntensity: 0.8, duration });
      this.windowGlassMat.color.setHex(0xcde5ff);
    }

    if (window.UI) {
      window.UI.updateDayNightIcons(this.isNightMode);
    }
  }

  // --- Open a Door or Drawer ---
  openDoor(doorId) {
    const reg = this.doorRegistry[doorId];
    if (!reg || reg.isOpen) return;

    reg.isOpen = true;
    if (reg.pivot) {
      this.playSound('door');
      gsap.to(reg.pivot.rotation, {
        y: reg.openY,
        duration: 0.85,
        ease: 'power2.out'
      });
    } else if (reg.drawer) {
      this.playSound('click');
      gsap.to(reg.drawer.position, {
        z: reg.openZ,
        duration: 0.65,
        ease: 'power2.out'
      });
    }
  }

  // --- Close a Door or Drawer ---
  closeDoor(doorId) {
    const reg = this.doorRegistry[doorId];
    if (!reg || !reg.isOpen) return;

    reg.isOpen = false;
    if (reg.pivot) {
      this.playSound('door');
      gsap.to(reg.pivot.rotation, {
        y: reg.closedY,
        duration: 0.65,
        ease: 'power2.inOut'
      });
    } else if (reg.drawer) {
      this.playSound('click');
      gsap.to(reg.drawer.position, {
        z: reg.closedZ,
        duration: 0.5,
        ease: 'power2.inOut'
      });
    }
  }

  toggleDoor(doorId) {
    const reg = this.doorRegistry[doorId];
    if (!reg) return;

    if (reg.isOpen) {
      this.closeDoor(doorId);
    } else {
      this.openDoor(doorId);
    }
  }

  closeAllDoors() {
    for (const key in this.doorRegistry) {
      this.closeDoor(key);
    }
  }

  // --- Camera Focus & Zoom Animations ---
  focusOnItem(itemData) {
    if (!itemData.focusPos || !itemData.focusLookAt) return;

    this.activeFocusItem = itemData;

    if (itemData.doorId) {
      this.openDoor(itemData.doorId);
    }

    this.controls.enabled = false;

    gsap.to(this.camera.position, {
      x: itemData.focusPos.x,
      y: itemData.focusPos.y,
      z: itemData.focusPos.z,
      duration: 1.4,
      ease: 'power3.inOut'
    });

    gsap.to(this.controls.target, {
      x: itemData.focusLookAt.x,
      y: itemData.focusLookAt.y,
      z: itemData.focusLookAt.z,
      duration: 1.4,
      ease: 'power3.inOut',
      onComplete: () => {
        this.controls.enabled = true;
      }
    });

    if (window.UI) {
      window.UI.showResetViewButton(true);
    }
  }

  locateAndHighlightDoor(item) {
    const targetDoorId = item.doorId;
    let targetObj = null;

    if (targetDoorId) {
      targetObj = this.interactables.find(obj => obj.userData && obj.userData.doorId === targetDoorId);
    }
    if (!targetObj && item.section) {
      targetObj = this.interactables.find(obj => obj.userData && obj.userData.section === item.section);
    }

    if (!targetObj || !targetObj.userData) return;

    const data = targetObj.userData;
    this.focusOnItem(data);

    const beacon = document.getElementById('beacon-indicator');
    const beaconLabel = document.getElementById('beacon-label');

    if (beacon && beaconLabel) {
      beaconLabel.textContent = `📍 مكانها هنا: ${item.title || data.name}!`;

      const worldPos = new THREE.Vector3();
      targetObj.getWorldPosition(worldPos);
      worldPos.y += 0.5;

      setTimeout(() => {
        const screenPos = worldPos.clone().project(this.camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        beacon.style.left = `${x}px`;
        beacon.style.top = `${y}px`;
        beacon.classList.add('visible');
      }, 700);

      setTimeout(() => {
        beacon.classList.remove('visible');
      }, 4500);
    }

    if (window.UI) {
      window.UI.openSection(item.section, item.title);
    }
  }

  resetCameraOverview() {
    this.closeAllDoors();
    this.activeFocusItem = null;

    this.controls.enabled = false;

    gsap.to(this.camera.position, {
      x: this.defaultCameraPos.x,
      y: this.defaultCameraPos.y,
      z: this.defaultCameraPos.z,
      duration: 1.2,
      ease: 'power3.inOut'
    });

    gsap.to(this.controls.target, {
      x: this.defaultCameraLookAt.x,
      y: this.defaultCameraLookAt.y,
      z: this.defaultCameraLookAt.z,
      duration: 1.2,
      ease: 'power3.inOut',
      onComplete: () => {
        this.controls.enabled = true;
      }
    });

    if (window.UI) {
      window.UI.showResetViewButton(false);
      window.UI.closeModal();
    }
  }

  // --- Mouse & Pointer Interaction ---
  onPointerMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData && hit.userData.name) {
        document.body.style.cursor = 'pointer';
        this.hoveredItem = hit.userData;

        if (window.UI) {
          window.UI.showTooltip(event.clientX, event.clientY, hit.userData.name);
        }
        return;
      }
    }

    document.body.style.cursor = 'default';
    this.hoveredItem = null;
    if (window.UI) {
      window.UI.hideTooltip();
    }
  }

  onPointerUp(event) {
    if (event.target.closest('.ui-overlay') || event.target.closest('.modal-backdrop')) {
      return;
    }

    const dx = Math.abs(event.clientX - this.pointerDownPos.x);
    const dy = Math.abs(event.clientY - this.pointerDownPos.y);
    const elapsed = Date.now() - this.pointerDownPos.time;

    // Ignore drag gestures
    if (dx > 8 || dy > 8 || elapsed > 700) {
      return;
    }

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData;

      if (data && data.id) {
        if (data.id === 'lamp') {
          this.toggleDayNight();
          return;
        }

        const now = Date.now();
        const currentId = data.doorId || data.id;
        const isDoubleTap = (now - this.lastTap.time < 550) && (this.lastTap.itemId === currentId);
        const reg = data.doorId ? this.doorRegistry[data.doorId] : null;
        const isCurrentlyOpen = reg ? reg.isOpen : false;

        if (isDoubleTap) {
          this.lastTap = { time: 0, itemId: null };
          if (window.UI) window.UI.hideTooltip();

          if (isCurrentlyOpen) {
            this.closeDoor(data.doorId);
            this.resetCameraOverview();
            if (window.UI) window.UI.closeModal();
          } else {
            this.focusOnItem(data);
            if (window.UI && data.section) {
              setTimeout(() => {
                window.UI.openSection(data.section, data.name);
              }, 750);
            }
          }
        } else {
          this.lastTap = { time: now, itemId: currentId };
          this.playSound('click');
          const actionText = isCurrentlyOpen ? 'اضغط مرتين للغلق ✖' : 'اضغط مرتين للفتح 📂';
          if (window.UI) {
            window.UI.showTooltip(event.clientX, event.clientY, `✨ ${data.name} (${actionText})`);
          }
        }
      }
    } else {
      this.lastTap = { time: 0, itemId: null };
      if (window.UI) window.UI.hideTooltip();
    }
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    if (!this.activeFocusItem && this.controls) {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }
}

window.OfficeScene = OfficeScene;
