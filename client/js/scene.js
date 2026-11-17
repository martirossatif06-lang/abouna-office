// ==========================================
// 3D REAL OFFICE SCENE (Three.js + GSAP)
// كل ضلفة ودرج في المكتب يفتح بحركة فيزيائية 3D حقيقية!
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
    this.sunLight = null;
    this.lampLight = null;
    this.windowLight = null;
    this.isNightMode = false;

    // Registry of all interactive doors & drawers
    // { id, pivot, openRotation, closedRotation, isOpen, itemData }
    this.doorRegistry = {};

    // Initial Overview Camera
    this.defaultCameraPos = new THREE.Vector3(0, 8.5, 11);
    this.defaultCameraLookAt = new THREE.Vector3(0, 2.0, 0);

    this.audioEnabled = true;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5efe6);
    this.scene.fog = new THREE.FogExp2(0xf5efe6, 0.02);

    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 100);
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultCameraLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.defaultCameraLookAt);
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 18;
    this.controls.enablePan = false;

    this.setupLighting();
    this.buildRoomArchitecture();

    // بناء الأثاث مع تزويد كل ضلفة بمفصلات حقيقية ومحتويات ثلاثية الأبعاد بداخلها
    this.buildEntranceWall();
    this.buildWindowAndDeskWall();
    this.buildGrandThreeSectionCabinet();
    this.buildFourGlassLibraryCabinet();

    // Track pointer to prevent drag from triggering click
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
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'click') {
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'door') {
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(75, now + 0.28);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'switch') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {}
  }

  // --- Lighting Setup ---
  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xfff5ea, 0.85);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
    this.sunLight.position.set(10, 8, 1);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    const fillLight = new THREE.DirectionalLight(0xd4e6f1, 0.3);
    fillLight.position.set(-6, 8, -6);
    this.scene.add(fillLight);

    this.lampLight = new THREE.PointLight(0xffb74d, 0.4, 7, 1.8);
    this.lampLight.position.set(2.8, 2.5, 0.2);
    this.lampLight.castShadow = true;
    this.scene.add(this.lampLight);
  }

  // --- Room Architecture ---
  buildRoomArchitecture() {
    const roomWidth = 10;
    const roomLength = 9;
    const roomHeight = 4.8;

    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomLength);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd7ba89, roughness: 0.4, metalness: 0.05 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const rugGeo = new THREE.PlaneGeometry(5.2, 5.0);
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x933b27, roughness: 0.85 });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, 0);
    rug.receiveShadow = true;
    this.scene.add(rug);

    const rugBorder = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.6), new THREE.MeshStandardMaterial({ color: 0xb7950b, roughness: 0.8 }));
    rugBorder.rotation.x = -Math.PI / 2;
    rugBorder.position.set(0, 0.015, 0);
    rugBorder.receiveShadow = true;
    this.scene.add(rugBorder);

    const rugInner = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.3), new THREE.MeshStandardMaterial({ color: 0x78281f, roughness: 0.85 }));
    rugInner.rotation.x = -Math.PI / 2;
    rugInner.position.set(0, 0.02, 0);
    rugInner.receiveShadow = true;
    this.scene.add(rugInner);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1ebe1, roughness: 0.85 });

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

    const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const nBase = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 0.25, 0.08), baseMat);
    nBase.position.set(0, 0.125, -roomLength / 2 + 0.1);
    this.scene.add(nBase);

    const wBase = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, roomLength), baseMat);
    wBase.position.set(-roomWidth / 2 + 0.1, 0.125, 0);
    this.scene.add(wBase);

    const eBase = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, roomLength), baseMat);
    eBase.position.set(roomWidth / 2 - 0.1, 0.125, 0);
    this.scene.add(eBase);
  }

  // --- Helper to Register an Animated Door ---
  registerDoor(id, pivot, hingeSide, doorMesh, itemData, openAngle = 0.65) {
    const angle = hingeSide === 'left' ? -Math.PI * openAngle : Math.PI * openAngle;
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
  registerDrawer(id, drawerGroup, mesh, itemData, pullDistance = 0.45) {
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
  // [الباب عند جهة الدولاب] -> [الكنبة] -> [دولاب التواني] -> [التلاجة]
  // ==========================================
  buildEntranceWall() {
    const wallZ = -4.35;
    const woodClassic = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.45 });
    const woodInner = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.5 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 });

    // A. باب المكتب (يفتح للداخل عند الضغط عليه!)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-3.7, 0, wallZ);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 }));
    frame.position.set(0, 1.6, 0);
    doorGroup.add(frame);

    // Door Leaf Pivot
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.55, 1.6, 0.02);

    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.05, 0.06), woodClassic);
    doorLeaf.position.set(0.575, 0, 0);
    doorLeaf.castShadow = true;
    doorPivot.add(doorLeaf);

    const doorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 12), handleMat);
    doorHandle.position.set(1.0, -0.1, 0.06);
    doorLeaf.add(doorHandle);

    doorGroup.add(doorPivot);
    this.scene.add(doorGroup);

    this.registerDoor('office_door', doorPivot, 'right', doorLeaf, {
      id: 'office_door',
      name: '🚪 باب المكتب (اضغط للفتح/الغلق)',
      section: 'contact',
      focusPos: new THREE.Vector3(-2.8, 2.0, -2.5),
      focusLookAt: new THREE.Vector3(-3.7, 1.6, wallZ)
    }, 0.55);

    // B. كنبة الزوار
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(-1.8, 0, wallZ + 0.65);
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.7 });
    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.85), sofaMat);
    sofaSeat.position.set(0, 0.45, 0);
    sofaSeat.castShadow = true;
    sofaGroup.add(sofaSeat);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.25), sofaMat);
    sofaBack.position.set(0, 0.95, -0.3);
    sofaBack.castShadow = true;
    sofaGroup.add(sofaBack);

    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.85);
    const armL = new THREE.Mesh(armGeo, sofaMat);
    armL.position.set(-0.95, 0.65, 0);
    sofaGroup.add(armL);
    const armR = new THREE.Mesh(armGeo, sofaMat);
    armR.position.set(0.95, 0.65, 0);
    sofaGroup.add(armR);
    this.scene.add(sofaGroup);

    // C. دولاب أبونا الخاص (ضرفتين طوال للتواني + ضرفتين مربعين بوكس للأباركة)
    const vestmentGroup = new THREE.Group();
    vestmentGroup.position.set(1.1, 0, wallZ + 0.45);

    const cabWidth = 1.6;
    const cabHeight = 3.6;
    const cabDepth = 0.75;

    // Outer Cabinet Shell
    const cabBody = new THREE.Mesh(new THREE.BoxGeometry(cabWidth, cabHeight, cabDepth), woodClassic);
    cabBody.position.set(0, cabHeight / 2, 0);
    cabBody.castShadow = true;
    cabBody.receiveShadow = true;
    vestmentGroup.add(cabBody);

    // الداخلية (Inside the wardrobe):
    // شماعة ملابس كهنوتية + توني أبيض وأسود معلق
    const hangerRod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, cabWidth - 0.1, 12), handleMat);
    hangerRod.rotation.z = Math.PI / 2;
    hangerRod.position.set(0, 2.1, 0);
    vestmentGroup.add(hangerRod);

    // مجسم التوني الأبيض الكهنوتي المعلق بالداخل
    const tunicWhite = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.15), new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.6 }));
    tunicWhite.position.set(-0.35, 1.35, 0);
    vestmentGroup.add(tunicWhite);

    // مجسم التوني الأسود الكهنوتي المعلق بالداخل
    const tunicBlack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.6 }));
    tunicBlack.position.set(0.35, 1.35, 0);
    vestmentGroup.add(tunicBlack);

    // كاس وقارورة الأباركة في الرف العلوي البوكس
    const chalice = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 12), handleMat);
    chalice.position.set(-0.25, 2.8, 0.1);
    vestmentGroup.add(chalice);

    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 12), new THREE.MeshStandardMaterial({ color: 0x78281f }));
    bottle.position.set(0.25, 2.8, 0.1);
    vestmentGroup.add(bottle);

    // --- الضرفتين الطوال التحتانيين (لتواني أبونا) ---
    const lowerDoorH = 2.4;
    const doorW = cabWidth / 2 - 0.04;

    // ضلفة التواني الشمال
    const vPivotL = new THREE.Group();
    vPivotL.position.set(-cabWidth / 2 + 0.03, lowerDoorH / 2 + 0.08, cabDepth / 2);
    const vDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(doorW, lowerDoorH, 0.05), new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.4 }));
    vDoorLeft.position.set(doorW / 2, 0, 0);
    vDoorLeft.castShadow = true;
    vPivotL.add(vDoorLeft);

    const vHandleL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 12), handleMat);
    vHandleL.position.set(doorW - 0.06, 0, 0.05);
    vDoorLeft.add(vHandleL);
    vestmentGroup.add(vPivotL);

    this.registerDoor('vestment_door_left', vPivotL, 'left', vDoorLeft, {
      id: 'cabinet_door',
      name: 'ضلفة توانى أبونا (يسار) — اضغط للفتح 3D',
      section: 'bio',
      focusPos: new THREE.Vector3(1.1, 1.8, -1.8),
      focusLookAt: new THREE.Vector3(1.1, 1.6, wallZ + 0.45)
    });

    // ضلفة التواني اليمين
    const vPivotR = new THREE.Group();
    vPivotR.position.set(cabWidth / 2 - 0.03, lowerDoorH / 2 + 0.08, cabDepth / 2);
    const vDoorRight = new THREE.Mesh(new THREE.BoxGeometry(doorW, lowerDoorH, 0.05), new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.4 }));
    vDoorRight.position.set(-doorW / 2, 0, 0);
    vDoorRight.castShadow = true;
    vPivotR.add(vDoorRight);

    const vHandleR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 12), handleMat);
    vHandleR.position.set(-doorW + 0.06, 0, 0.05);
    vDoorRight.add(vHandleR);
    vestmentGroup.add(vPivotR);

    this.registerDoor('vestment_door_right', vPivotR, 'right', vDoorRight, {
      id: 'cabinet_door',
      name: 'ضلفة توانى أبونا (يمين) — اضغط للفتح 3D',
      section: 'bio',
      focusPos: new THREE.Vector3(1.1, 1.8, -1.8),
      focusLookAt: new THREE.Vector3(1.1, 1.6, wallZ + 0.45)
    });

    // --- الضرفتين المربعين البوكس الفوقانيين (للأباركة) ---
    const boxH = 0.95;
    const boxY = lowerDoorH + boxH / 2 + 0.12;

    const boxPivotL = new THREE.Group();
    boxPivotL.position.set(-cabWidth / 2 + 0.03, boxY, cabDepth / 2);
    const boxDoorL = new THREE.Mesh(new THREE.BoxGeometry(doorW, boxH, 0.05), new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.4 }));
    boxDoorL.position.set(doorW / 2, 0, 0);
    boxPivotL.add(boxDoorL);
    vestmentGroup.add(boxPivotL);

    this.registerDoor('vestment_box_left', boxPivotL, 'left', boxDoorL, {
      id: 'cabinet_door',
      name: 'ضلفة الأباركة والصلوات (يسار) — اضغط للفتح 3D',
      section: 'bio',
      focusPos: new THREE.Vector3(1.1, 2.6, -1.8),
      focusLookAt: new THREE.Vector3(1.1, 2.7, wallZ + 0.45)
    });

    const boxPivotR = new THREE.Group();
    boxPivotR.position.set(cabWidth / 2 - 0.03, boxY, cabDepth / 2);
    const boxDoorR = new THREE.Mesh(new THREE.BoxGeometry(doorW, boxH, 0.05), new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.4 }));
    boxDoorR.position.set(-doorW / 2, 0, 0);
    boxPivotR.add(boxDoorR);
    vestmentGroup.add(boxPivotR);

    this.registerDoor('vestment_box_right', boxPivotR, 'right', boxDoorR, {
      id: 'cabinet_door',
      name: 'ضلفة مقتنيات الخدمة (يمين) — اضغط للفتح 3D',
      section: 'bio',
      focusPos: new THREE.Vector3(1.1, 2.6, -1.8),
      focusLookAt: new THREE.Vector3(1.1, 2.7, wallZ + 0.45)
    });

    this.scene.add(vestmentGroup);

    // D. التلاجة في زاوية الحائط (تفتح أيضاً بالضغط عليها!)
    const fridgeGroup = new THREE.Group();
    fridgeGroup.position.set(3.4, 0, wallZ + 0.55);

    const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.3, metalness: 0.4 });
    const fridgeBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.45, 0.75), fridgeMat);
    fridgeBody.position.set(0, 0.725, 0);
    fridgeBody.castShadow = true;
    fridgeGroup.add(fridgeBody);

    // Fridge Door Pivot
    const fridgePivot = new THREE.Group();
    fridgePivot.position.set(-0.4, 0.725, 0.38);

    const fridgeDoor = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.42, 0.05), fridgeMat);
    fridgeDoor.position.set(0.42, 0, 0);
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
  // [التكييف] من فوق + [الشباك] تحته + [مكتب أبونا] قدامه والكرسيين
  // ==========================================
  buildWindowAndDeskWall() {
    const wallX = 4.88;

    // التكييف
    const acGroup = new THREE.Group();
    acGroup.position.set(wallX - 0.25, 4.0, 0.5);
    acGroup.rotation.y = -Math.PI / 2;
    const acBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    acGroup.add(acBody);

    const acVent = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0x95a5a6 }));
    acVent.position.set(0, -0.15, 0.16);
    acGroup.add(acVent);
    this.scene.add(acGroup);

    // الشباك
    const winGroup = new THREE.Group();
    winGroup.position.set(wallX - 0.06, 2.4, 0.5);
    winGroup.rotation.y = -Math.PI / 2;
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    winGroup.add(winFrame);

    this.windowGlassMat = new THREE.MeshBasicMaterial({ color: 0xbde0fe });
    const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7), this.windowGlassMat);
    winGlass.position.z = 0.055;
    winGroup.add(winGlass);
    this.scene.add(winGroup);

    // مكتب أبونا والكرسيين
    const deskGroup = new THREE.Group();
    deskGroup.position.set(2.6, 0, 0.5);
    deskGroup.rotation.y = -Math.PI / 2;

    const deskWood = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.35 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.3), deskWood);
    top.position.set(0, 1.8, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.74, 1.2), deskWood);
    sideL.position.set(-1.25, 0.87, 0);
    deskGroup.add(sideL);

    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.74, 1.2), deskWood);
    sideR.position.set(1.25, 0.87, 0);
    deskGroup.add(sideR);

    const modestyPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.05), deskWood);
    modestyPanel.position.set(0, 1.15, -0.55);
    deskGroup.add(modestyPanel);

    // كمودينو صغير بجوار المكتب (بدرج منزلق يفتح في 3D!)
    const commode = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.9), deskWood);
    commode.position.set(0.85, 0.65, 0);
    deskGroup.add(commode);

    const commodeDrawerPivot = new THREE.Group();
    commodeDrawerPivot.position.set(0.85, 0.95, 0.46);
    const commodeDrawerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.35, 0.05), new THREE.MeshStandardMaterial({ color: 0x6d4c41 }));
    commodeDrawerPivot.add(commodeDrawerMesh);

    const cHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 12), handleMat);
    cHandle.rotation.z = Math.PI / 2;
    cHandle.position.set(0, 0, 0.04);
    commodeDrawerMesh.add(cHandle);
    deskGroup.add(commodeDrawerPivot);

    this.registerDrawer('desk_commode_drawer', commodeDrawerPivot, commodeDrawerMesh, {
      id: 'drawers',
      name: 'درج كمودينو مكتب أبونا — اضغط للفتح 3D',
      section: 'services',
      focusPos: new THREE.Vector3(1.2, 2.2, 0.5),
      focusLookAt: new THREE.Vector3(2.6, 1.4, 0.5)
    }, 0.35);

    // كرسي أبونا
    const abounaChair = new THREE.Group();
    abounaChair.position.set(0, 0, 0.65);
    const aSeat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.8), leatherMat);
    aSeat.position.set(0, 1.1, 0);
    abounaChair.add(aSeat);
    const aBack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.14), leatherMat);
    aBack.position.set(0, 1.7, 0.35);
    abounaChair.add(aBack);
    deskGroup.add(abounaChair);

    // كرسيين للزوار
    const vChair1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.65), leatherMat);
    vChair1.position.set(-0.6, 0.7, -1.05);
    deskGroup.add(vChair1);

    const vChair2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.65), leatherMat);
    vChair2.position.set(0.6, 0.7, -1.05);
    deskGroup.add(vChair2);

    // اللابتوب (شاشة اللابتوب تفتح وتغلق!)
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(-0.25, 1.86, 0);
    const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.5), new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8 }));
    laptopGroup.add(lBase);

    const lScreenPivot = new THREE.Group();
    lScreenPivot.position.set(0, 0.01, 0.25);
    lScreenPivot.rotation.x = Math.PI / 10;
    const lScreen = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.48, 0.02), new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8 }));
    lScreen.position.set(0, 0.24, 0);
    lScreenPivot.add(lScreen);

    const lDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.42), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x2563eb, emissiveIntensity: 0.5 }));
    lDisplay.position.set(0, 0.24, -0.012);
    lDisplay.rotation.y = Math.PI;
    lScreenPivot.add(lDisplay);
    laptopGroup.add(lScreenPivot);

    lBase.userData = {
      id: 'laptop',
      name: 'اللابتوب على مكتب أبونا (معرض الأعمال)',
      section: 'showcase',
      focusPos: new THREE.Vector3(1.4, 2.5, 0.5),
      focusLookAt: new THREE.Vector3(2.6, 1.9, 0.5)
    };
    lScreen.userData = lBase.userData;
    lDisplay.userData = lBase.userData;
    this.interactables.push(lBase, lScreen, lDisplay);
    deskGroup.add(laptopGroup);

    // أباجورة المكتب
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0.85, 1.86, 0.2);
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 20), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8 }));
    lampGroup.add(lampBase);

    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.28, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.4 }));
    lampShade.position.set(0, 0.75, 0);
    lampShade.rotation.x = Math.PI;
    lampGroup.add(lampShade);

    this.lampBulbMat = new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0xffb74d, emissiveIntensity: 0.8 });
    const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), this.lampBulbMat);
    lampBulb.position.set(0, 0.7, 0);
    lampGroup.add(lampBulb);

    lampBase.userData = {
      id: 'lamp',
      name: 'أباجورة المكتب (تبديل نهار/ليل)',
      section: 'lamp_toggle'
    };
    lampShade.userData = lampBase.userData;
    this.interactables.push(lampBase, lampShade);
    deskGroup.add(lampGroup);

    // التليفون
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(-0.85, 1.86, -0.15);
    const phoneBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.35), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
    phoneGroup.add(phoneBase);

    phoneBase.userData = {
      id: 'phone',
      name: 'تليفون المكتب (تواصل مباشر)',
      section: 'contact',
      focusPos: new THREE.Vector3(1.2, 2.5, 0.5),
      focusLookAt: new THREE.Vector3(2.6, 1.9, 0.5)
    };
    this.interactables.push(phoneBase);
    deskGroup.add(phoneGroup);

    this.scene.add(deskGroup);
  }

  // ==========================================
  // 3. الحائط المقابل لحائط الباب (الجنوب):
  // الدولاب الكبير 3 أجزاء:
  // - كل ضلفة فيه (بوكسات، قزاز، درجين، طوال) تفتح بفيزياء 3D!
  // ==========================================
  buildGrandThreeSectionCabinet() {
    const cabinetGroup = new THREE.Group();
    cabinetGroup.position.set(0, 0, 4.0);
    cabinetGroup.rotation.y = Math.PI;

    const woodDark = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x81d4fa, roughness: 0.1, transparent: true, opacity: 0.45 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 });

    const totalW = 6.2;
    const totalH = 4.0;
    const depth = 0.75;
    const secW = totalW / 3;

    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(totalW, totalH, depth), woodDark);
    frame.position.set(0, totalH / 2, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    cabinetGroup.add(frame);

    // =========================================
    // الصف العلوي: 6 ضلف بوكس مربعة (تفتح جميعها!)
    // =========================================
    const boxH = 0.9;
    const boxY = totalH - boxH / 2 - 0.08;

    for (let sec = 0; sec < 3; sec++) {
      const centerX = (sec - 1) * secW;
      const bDoorW = secW / 2 - 0.04;

      // بوكس يسار السيكشن
      const boxPL = new THREE.Group();
      boxPL.position.set(centerX - secW / 2 + 0.02, boxY, depth / 2 + 0.02);
      const bL = new THREE.Mesh(new THREE.BoxGeometry(bDoorW, boxH, 0.05), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
      bL.position.set(bDoorW / 2, 0, 0);
      boxPL.add(bL);
      cabinetGroup.add(boxPL);

      this.registerDoor(`grand_top_box_${sec}_L`, boxPL, 'left', bL, {
        id: 'bookshelf',
        name: `ضلفة بوكس علوية (${sec + 1}) — اضغط للفتح 3D`,
        section: 'projects',
        focusPos: new THREE.Vector3(centerX * -1, 3.2, 1.8),
        focusLookAt: new THREE.Vector3(centerX * -1, 3.2, 4.0)
      });

      // بوكس يمين السيكشن
      const boxPR = new THREE.Group();
      boxPR.position.set(centerX + secW / 2 - 0.02, boxY, depth / 2 + 0.02);
      const bR = new THREE.Mesh(new THREE.BoxGeometry(bDoorW, boxH, 0.05), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
      bR.position.set(-bDoorW / 2, 0, 0);
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
    // السيكشن الأيسر: ضرفتين طوال من تحت (تفتحان!)
    // =========================================
    const leftSecX = -secW;
    const tallH = totalH - boxH - 0.25;
    const tallDoorW = secW / 2 - 0.04;

    const leftTallPL = new THREE.Group();
    leftTallPL.position.set(leftSecX - secW / 2 + 0.02, tallH / 2 + 0.05, depth / 2 + 0.02);
    const leftTallL = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH, 0.05), new THREE.MeshStandardMaterial({ color: 0x6d4c41 }));
    leftTallL.position.set(tallDoorW / 2, 0, 0);
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
    leftTallPR.position.set(leftSecX + secW / 2 - 0.02, tallH / 2 + 0.05, depth / 2 + 0.02);
    const leftTallR = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH, 0.05), new THREE.MeshStandardMaterial({ color: 0x6d4c41 }));
    leftTallR.position.set(-tallDoorW / 2, 0, 0);
    leftTallPR.add(leftTallR);
    cabinetGroup.add(leftTallPR);

    this.registerDoor('grand_tall_left_R', leftTallPR, 'right', leftTallR, {
      id: 'bookshelf',
      name: 'ضلفة الدولاب الطويلة (يسار) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(2.0, 1.8, 4.0)
    });

    // =========================================
    // السيكشن الأيمن: ضرفتين طوال من تحت (تفتحان!)
    // =========================================
    const rightSecX = secW;

    const rightTallPL = new THREE.Group();
    rightTallPL.position.set(rightSecX - secW / 2 + 0.02, tallH / 2 + 0.05, depth / 2 + 0.02);
    const rightTallL = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH, 0.05), new THREE.MeshStandardMaterial({ color: 0x6d4c41 }));
    rightTallL.position.set(tallDoorW / 2, 0, 0);
    rightTallPL.add(rightTallL);
    cabinetGroup.add(rightTallPL);

    this.registerDoor('grand_tall_right_L', rightTallPL, 'left', rightTallL, {
      id: 'bookshelf',
      name: 'ضلفة الدولاب الطويلة (يمين) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(-1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(-2.0, 1.8, 4.0)
    });

    const rightTallPR = new THREE.Group();
    rightTallPR.position.set(rightSecX + secW / 2 - 0.02, tallH / 2 + 0.05, depth / 2 + 0.02);
    const rightTallR = new THREE.Mesh(new THREE.BoxGeometry(tallDoorW, tallH, 0.05), new THREE.MeshStandardMaterial({ color: 0x6d4c41 }));
    rightTallR.position.set(-tallDoorW / 2, 0, 0);
    rightTallPR.add(rightTallR);
    cabinetGroup.add(rightTallPR);

    this.registerDoor('grand_tall_right_R', rightTallPR, 'right', rightTallR, {
      id: 'bookshelf',
      name: 'ضلفة الدولاب الطويلة (يمين) — اضغط للفتح 3D',
      section: 'projects',
      focusPos: new THREE.Vector3(-1.8, 2.0, 1.8),
      focusLookAt: new THREE.Vector3(-2.0, 1.8, 4.0)
    });

    // =========================================
    // السيكشن الأوسط (المميز):
    // - درجين تحت القزاز (ينزلقان للأمام في 3D!)
    // - ضرفتين قزاز (تفتحان بنعومة لتكشف الدروع والشهادات!)
    // =========================================
    const midSecX = 0;
    const drawersH = 0.85;
    const glassH = tallH - drawersH - 0.1;

    // الدرج الأول السفلي
    const drawer1Group = new THREE.Group();
    drawer1Group.position.set(midSecX, 0.28, depth / 2 + 0.02);
    const d1Mesh = new THREE.Mesh(new THREE.BoxGeometry(secW - 0.08, 0.38, 0.05), new THREE.MeshStandardMaterial({ color: 0x795548 }));
    drawer1Group.add(d1Mesh);

    const d1Handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 12), handleMat);
    d1Handle.rotation.z = Math.PI / 2;
    d1Handle.position.set(0, 0, 0.04);
    d1Mesh.add(d1Handle);
    cabinetGroup.add(drawer1Group);

    this.registerDrawer('grand_drawer_1', drawer1Group, d1Mesh, {
      id: 'drawers',
      name: 'درج الخدمات والتحميلات (1) — اضغط للفتح 3D',
      section: 'services',
      focusPos: new THREE.Vector3(0, 1.8, 1.6),
      focusLookAt: new THREE.Vector3(0, 1.0, 4.0)
    }, 0.45);

    // الدرج الثاني العلوي
    const drawer2Group = new THREE.Group();
    drawer2Group.position.set(midSecX, 0.72, depth / 2 + 0.02);
    const d2Mesh = new THREE.Mesh(new THREE.BoxGeometry(secW - 0.08, 0.38, 0.05), new THREE.MeshStandardMaterial({ color: 0x795548 }));
    drawer2Group.add(d2Mesh);

    const d2Handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 12), handleMat);
    d2Handle.rotation.z = Math.PI / 2;
    d2Handle.position.set(0, 0, 0.04);
    d2Mesh.add(d2Handle);
    cabinetGroup.add(drawer2Group);

    this.registerDrawer('grand_drawer_2', drawer2Group, d2Mesh, {
      id: 'drawers',
      name: 'درج الملفات المجانية (2) — اضغط للفتح 3D',
      section: 'services',
      focusPos: new THREE.Vector3(0, 1.8, 1.6),
      focusLookAt: new THREE.Vector3(0, 1.0, 4.0)
    }, 0.45);

    // ضرفتين قزاز في النص
    const glassDoorW = secW / 2 - 0.04;
    const glassY = drawersH + glassH / 2 + 0.08;

    // ضلفة قزاز شمال
    const glassPL = new THREE.Group();
    glassPL.position.set(midSecX - secW / 2 + 0.02, glassY, depth / 2 + 0.02);
    const gDoorL = new THREE.Mesh(new THREE.BoxGeometry(glassDoorW, glassH, 0.03), glassMat);
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

    // ضلفة قزاز يمين
    const glassPR = new THREE.Group();
    glassPR.position.set(midSecX + secW / 2 - 0.02, glassY, depth / 2 + 0.02);
    const gDoorR = new THREE.Mesh(new THREE.BoxGeometry(glassDoorW, glassH, 0.03), glassMat);
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

    // مقتنيات ذهبية تظهر وراء القزاز
    for (let r = 1; r <= 3; r++) {
      const award = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.28, 12), handleMat);
      award.position.set(midSecX + (r - 2) * 0.45, drawersH + r * 0.45, depth / 2 - 0.1);
      cabinetGroup.add(award);
    }

    this.scene.add(cabinetGroup);
  }

  // ==========================================
  // 4. الحائط المقابل للمكتب (الشمال الغربي):
  // دولاب كبير 4 ضلف قزاز من فوق + 4 ضلف مكعبين من تحت
  // كل واحدة من الـ 8 ضلف تفتح بمفصلتها الخاصة في 3D!
  // ==========================================
  buildFourGlassLibraryCabinet() {
    const libGroup = new THREE.Group();
    libGroup.position.set(-4.5, 0, 0.8);
    libGroup.rotation.y = Math.PI / 2;

    const woodDark = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x81d4fa, roughness: 0.1, transparent: true, opacity: 0.5 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 });

    const totalW = 4.4;
    const totalH = 3.8;
    const depth = 0.65;
    const doorW = totalW / 4 - 0.03;

    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(totalW, totalH, depth), woodDark);
    frame.position.set(0, totalH / 2, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    libGroup.add(frame);

    // =========================================
    // الـ 4 ضلف مكعبين خشب من تحت (تفتح كل منها!)
    // =========================================
    const cubeH = 1.2;
    const cubeY = cubeH / 2 + 0.05;

    for (let i = 0; i < 4; i++) {
      const xLeft = -totalW / 2 + i * (doorW + 0.03);
      const isLeftHinged = i % 2 === 0;

      const cubePivot = new THREE.Group();
      cubePivot.position.set(isLeftHinged ? xLeft : xLeft + doorW, cubeY, depth / 2 + 0.02);

      const cubeDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, cubeH, 0.05), new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.4 }));
      cubeDoor.position.set(isLeftHinged ? doorW / 2 : -doorW / 2, 0, 0);
      cubePivot.add(cubeDoor);

      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 12), handleMat);
      h.position.set(isLeftHinged ? doorW - 0.06 : -doorW + 0.06, 0, 0.04);
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
    // الـ 4 ضلف قزاز من فوق (تفتح كل منها لتظهر كتبها!)
    // =========================================
    const glassH = totalH - cubeH - 0.2;
    const glassY = cubeH + glassH / 2 + 0.1;

    for (let i = 0; i < 4; i++) {
      const xLeft = -totalW / 2 + i * (doorW + 0.03);
      const isLeftHinged = i % 2 === 0;

      // كتب ملونة داخل كل قسم بالدولاب
      const bookColors = [0x922b21, 0x1f618d, 0x196f3d, 0xb7950b];
      for (let s = 1; s <= 3; s++) {
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.35), new THREE.MeshStandardMaterial({ color: bookColors[(i + s) % 4] }));
        book.position.set(xLeft + doorW / 2, cubeH + s * 0.58, depth / 2 - 0.15);
        libGroup.add(book);
      }

      // ضلفة القزاز مع المفصلة
      const glassPivot = new THREE.Group();
      glassPivot.position.set(isLeftHinged ? xLeft : xLeft + doorW, glassY, depth / 2 + 0.02);

      const gDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, glassH, 0.03), glassMat);
      gDoor.position.set(isLeftHinged ? doorW / 2 : -doorW / 2, 0, 0);
      glassPivot.add(gDoor);

      const gHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 12), handleMat);
      gHandle.position.set(isLeftHinged ? doorW - 0.06 : -doorW + 0.06, 0, 0.04);
      gDoor.add(gHandle);

      libGroup.add(glassPivot);

      this.registerDoor(`library_glass_${i}`, glassPivot, isLeftHinged ? 'left' : 'right', gDoor, {
        id: 'library_four_doors',
        name: `ضلفة مكتبة القزاز (${i + 1}) — اضغط للفتح 3D`,
        section: 'projects',
        focusPos: new THREE.Vector3(-2.2, 2.5, 0.8),
        focusLookAt: new THREE.Vector3(-4.5, 2.5, 0.8)
      });
    }

    this.scene.add(libGroup);
  }

  // --- Day / Night Lighting Mode Toggle ---
  toggleDayNight(forcedMode = null) {
    if (forcedMode !== null) {
      this.isNightMode = forcedMode === 'night';
    } else {
      this.isNightMode = !this.isNightMode;
    }

    this.playSound('switch');
    document.body.setAttribute('data-theme', this.isNightMode ? 'night' : 'day');

    const duration = 1.2;
    if (this.isNightMode) {
      gsap.to(this.scene.background, { r: 0.06, g: 0.08, b: 0.11, duration });
      gsap.to(this.scene.fog.color, { r: 0.06, g: 0.08, b: 0.11, duration });
      gsap.to(this.ambientLight, { intensity: 0.25, duration });
      gsap.to(this.sunLight, { intensity: 0.15, duration });
      gsap.to(this.lampLight, { intensity: 1.8, distance: 9, duration });
      gsap.to(this.lampBulbMat, { emissiveIntensity: 2.0, duration });
      this.windowGlassMat.color.setHex(0x1e293b);
    } else {
      gsap.to(this.scene.background, { r: 0.96, g: 0.94, b: 0.90, duration });
      gsap.to(this.scene.fog.color, { r: 0.96, g: 0.94, b: 0.90, duration });
      gsap.to(this.ambientLight, { intensity: 0.85, duration });
      gsap.to(this.sunLight, { intensity: 1.25, duration });
      gsap.to(this.lampLight, { intensity: 0.4, distance: 7, duration });
      gsap.to(this.lampBulbMat, { emissiveIntensity: 0.8, duration });
      this.windowGlassMat.color.setHex(0xbde0fe);
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

  // --- Toggle Any Door / Drawer 3D Opening ---
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

    // تأكيد فتح الضلفة فيزيائياً
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

  // --- Locate, Guide Camera & Highlight Door with 3D Beacon ---
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

    // Focus camera and open door physically
    this.focusOnItem(data);

    // Show Glowing Beacon
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

    // 1. حساب المسافة للتأكد إذا كان سحب لتوجيه الكاميرا (Drag) أم ضغطة حقيقية (Tap)
    const dx = Math.abs(event.clientX - this.pointerDownPos.x);
    const dy = Math.abs(event.clientY - this.pointerDownPos.y);
    const elapsed = Date.now() - this.pointerDownPos.time;

    // لو المستخدم بيحرك صباعه عشان يلف في الغرفة (أكتر من 8 بيكسل)، نتجاهل الضغطة تماماً!
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
            // الضلفة مفتوحة -> دوستين يقفلوها ويرجعوا المشهد العام!
            this.closeDoor(data.doorId);
            this.resetCameraOverview();
            if (window.UI) window.UI.closeModal();
          } else {
            // الضلفة مقفولة -> دوستين يفتحوها فيزيائياً ويقربوا الكاميرا ويعرضوا المحتوى!
            this.focusOnItem(data);
            if (window.UI && data.section) {
              window.UI.openSection(data.section, data.name);
            }
          }
        } else {
          // اللمسة الأولى: إظهار التنبيه الذكي بالاسم (للفتح أو للغلق)
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
