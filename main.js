import * as THREE from 'three';

// --- CONFIGURATION & DATA ---
const TEAMS = [
    { id: 'corinthians', name: 'Corinthians', color: '#ffffff', secondary: '#000000', shield: 'https://upload.wikimedia.org/wikipedia/pt/1/10/Corinthians_simbolo.png' },
    { id: 'flamengo', name: 'Flamengo', color: '#ff0000', secondary: '#000000', shield: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_crest.svg' },
    { id: 'palmeiras', name: 'Palmeiras', color: '#006437', secondary: '#ffffff', shield: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg' },
    { id: 'saopaulo', name: 'São Paulo', color: '#ff0000', secondary: '#ffffff', shield: 'https://upload.wikimedia.org/wikipedia/pt/4/4b/Sao_Paulo_Futebol_Clube.png' },
    { id: 'gremio', name: 'Grêmio', color: '#0d80bf', secondary: '#000000', shield: 'https://upload.wikimedia.org/wikipedia/pt/b/bc/Grêmio_FBPA.png' },
    { id: 'inter', name: 'Internacional', color: '#ff0000', secondary: '#ffffff', shield: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg' },
    { id: 'atletico', name: 'Atlético-MG', color: '#000000', secondary: '#ffffff', shield: 'https://upload.wikimedia.org/wikipedia/pt/e/e5/Atlético_Mineiro_galo.png' },
    { id: 'cruzeiro', name: 'Cruzeiro', color: '#0000ff', secondary: '#ffffff', shield: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Cruzeiro_Esporte_Clube_v2.svg' },
    { id: 'fluminense', name: 'Fluminense', color: '#8d0033', secondary: '#006437', shield: 'https://upload.wikimedia.org/wikipedia/pt/a/a3/Fluminense_FC_escudo.png' },
    { id: 'botafogo', name: 'Botafogo', color: '#000000', secondary: '#ffffff', shield: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Botafogo_de_Futebol_e_Regatas_logo.svg' },
    { id: 'vasco', name: 'Vasco', color: '#000000', secondary: '#ffffff', shield: 'https://upload.wikimedia.org/wikipedia/pt/a/ac/CRVascoDaGama.png' },
    { id: 'santos', name: 'Santos', color: '#ffffff', secondary: '#000000', shield: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Santos_logo.svg' }
];

const PHASES = ['OITAVAS DE FINAL', 'QUARTAS DE FINAL', 'SEMIFINAL', 'FINAL'];

// --- APP STATE ---
let gameState = {
    currentScreen: 'intro',
    playerTeam: null,
    machineTeam: null,
    difficulty: 'normal',
    currentPhaseIndex: 0,
    playerGoals: 0,
    machineGoals: 0,
    isPaused: false
};

// --- DOM ELEMENTS ---
const screens = {
    intro: document.getElementById('intro-screen'),
    selection: document.getElementById('selection-screen'),
    difficulty: document.getElementById('difficulty-screen'),
    game: document.getElementById('game-ui'),
    victory: document.getElementById('victory-screen')
};

const teamGrid = document.getElementById('team-grid');
const btnNextOpponent = document.getElementById('btn-next-opponent');
let selectionMode = 'player'; // 'player' or 'machine'

// --- INITIALIZATION ---
function init() {
    renderTeamGrid();
    setupEventListeners();
    lucide.createIcons();
}

function renderTeamGrid() {
    teamGrid.innerHTML = '';
    TEAMS.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.innerHTML = `
            <img src="${team.shield}" alt="${team.name}" class="team-logo">
            <span class="team-name">${team.name}</span>
        `;
        card.onclick = () => selectTeam(team, card);
        teamGrid.appendChild(card);
    });
}

function selectTeam(team, card) {
    document.querySelectorAll('.team-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    if (selectionMode === 'player') {
        gameState.playerTeam = team;
        btnNextOpponent.disabled = false;
        btnNextOpponent.innerText = 'PRÓXIMO: ESCOLHER ADVERSÁRIO';
    } else {
        gameState.machineTeam = team;
        btnNextOpponent.innerText = 'PRÓXIMO: DEFINIR DIFICULDADE';
    }
}

function switchScreen(screenKey) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenKey].classList.add('active');
    gameState.currentScreen = screenKey;
}

function setupEventListeners() {
    document.getElementById('btn-enter').onclick = () => switchScreen('selection');

    btnNextOpponent.onclick = () => {
        if (selectionMode === 'player') {
            selectionMode = 'machine';
            document.querySelector('.selection-header h2').innerHTML = 'ESCOLHA SEU <span class="highlight">ADVERSÁRIO</span>';
            btnNextOpponent.disabled = true;
            document.querySelectorAll('.team-card').forEach(c => c.classList.remove('selected'));
        } else {
            switchScreen('difficulty');
        }
    };

    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.difficulty = btn.dataset.diff;
        };
    });

    document.getElementById('btn-start-game').onclick = () => {
        startGame();
    };
}

// --- GAME LOGIC (3D) ---
let scene, camera, renderer, clock;
let stadium, ball, playerCar, machineCar;
let keys = {};
let turboCharge = 100;

function startGame() {
    switchScreen('game');
    screens.game.classList.add('active');

    // UI Update
    document.getElementById('ui-player-logo').src = gameState.playerTeam.shield;
    document.getElementById('ui-machine-logo').src = gameState.machineTeam.shield;
    document.getElementById('ui-phase').innerText = PHASES[gameState.currentPhaseIndex];

    initThreeJS();
    animate();
}

function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 10, 50);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Field
    const fieldGeo = new THREE.PlaneGeometry(30, 50);
    const fieldMat = new THREE.MeshPhongMaterial({ color: 0x1a4a1a });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    scene.add(field);

    // Walls
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x333333, transparent: true, opacity: 0.3 });
    const createWall = (w, h, d, x, y, z) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
    };
    createWall(30, 5, 1, 0, 2.5, 25); // Back
    createWall(30, 5, 1, 0, 2.5, -25); // Front
    createWall(1, 5, 50, 15, 2.5, 0); // Right
    createWall(1, 5, 50, -15, 2.5, 0); // Left

    // Goals
    const goalGeo = new THREE.BoxGeometry(10, 5, 2);
    const goalMat = new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: true });

    const playerGoal = new THREE.Mesh(goalGeo, goalMat);
    playerGoal.position.set(0, 2.5, 24);
    scene.add(playerGoal);

    const machineGoal = new THREE.Mesh(goalGeo, goalMat);
    machineGoal.position.set(0, 2.5, -24);
    scene.add(machineGoal);

    // Ball
    const ballGeo = new THREE.SphereGeometry(1, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 1, 0);
    ball.castShadow = true;
    ball.velocity = new THREE.Vector3(0, 0, 0);
    scene.add(ball);

    // Cars
    playerCar = createCar(gameState.playerTeam.color);
    playerCar.position.set(0, 0.5, 15);
    scene.add(playerCar);

    machineCar = createCar(gameState.machineTeam.color);
    machineCar.position.set(0, 0.5, -15);
    machineCar.rotation.y = Math.PI;
    scene.add(machineCar);

    clock = new THREE.Clock();

    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
}

function createCar(color) {
    const car = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.5, 0.8, 2.5);
    const bodyMat = new THREE.MeshPhongMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    car.add(body);

    // Roof
    const roofGeo = new THREE.BoxGeometry(1.2, 0.5, 1.2);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.y = 0.6;
    car.add(roof);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const wheelPos = [[0.8, -0.3, 0.8], [-0.8, -0.3, 0.8], [0.8, -0.3, -0.8], [-0.8, -0.3, -0.8]];
    wheelPos.forEach(p => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(p[0], p[1], p[2]);
        car.add(w);
    });

    car.velocity = new THREE.Vector3(0, 0, 0);
    car.speed = 0;
    return car;
}

function animate() {
    if (gameState.isPaused) return;

    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    updatePlayer(delta);
    updateMachine(delta);
    updateBall(delta);
    updatePhysics();

    // Camera follow
    camera.position.lerp(new THREE.Vector3(playerCar.position.x, 10, playerCar.position.z + 15), 0.1);
    camera.lookAt(ball.position);

    renderer.render(scene, camera);
}

const BASE_SPEED = 1.25;
const TURBO_MULT = 1.8;
const JUMP_FORCE = 5;

function updatePlayer(delta) {
    let targetSpeed = 0;
    let isTurbo = keys['KeyB'] && turboCharge > 0;

    if (keys['ArrowUp']) targetSpeed = isTurbo ? BASE_SPEED * TURBO_MULT : BASE_SPEED;
    if (keys['ArrowDown']) targetSpeed = -BASE_SPEED / 2;

    playerCar.speed = THREE.MathUtils.lerp(playerCar.speed, targetSpeed, 0.1);

    if (keys['ArrowLeft']) playerCar.rotation.y += 3 * delta;
    if (keys['ArrowRight']) playerCar.rotation.y -= 3 * delta;

    playerCar.position.x += Math.sin(playerCar.rotation.y) * playerCar.speed * delta * 20;
    playerCar.position.z += Math.cos(playerCar.rotation.y) * playerCar.speed * delta * 20;

    // Jump
    if (keys['Space'] && playerCar.position.y <= 0.51) {
        playerCar.velocity.y = JUMP_FORCE;
    }

    // Gravity
    if (playerCar.position.y > 0.5) {
        playerCar.velocity.y -= 9.8 * delta;
        playerCar.position.y += playerCar.velocity.y * delta;
    } else {
        playerCar.position.y = 0.5;
        playerCar.velocity.y = 0;
    }

    // Turbo drain/charge
    if (isTurbo) {
        turboCharge -= 30 * delta;
    } else {
        turboCharge = Math.min(100, turboCharge + 10 * delta);
    }
    document.getElementById('turbo-fill').style.width = turboCharge + '%';
}

function updateMachine(delta) {
    // Basic AI
    const diff = new THREE.Vector3().subVectors(ball.position, machineCar.position);
    const dist = diff.length();

    let aiSpeed = BASE_SPEED;
    if (gameState.difficulty === 'hard') aiSpeed *= 1.3;
    if (gameState.difficulty === 'corinthians') aiSpeed *= 1.6;

    if (dist > 2) {
        const targetAngle = Math.atan2(diff.x, diff.z);
        machineCar.rotation.y = THREE.MathUtils.lerp(machineCar.rotation.y, targetAngle, 0.1);

        machineCar.position.x += Math.sin(machineCar.rotation.y) * aiSpeed * delta * 15;
        machineCar.position.z += Math.cos(machineCar.rotation.y) * aiSpeed * delta * 15;
    }

    // AI Jump
    if (ball.position.y > 1.5 && dist < 5 && machineCar.position.y <= 0.51) {
        machineCar.velocity.y = JUMP_FORCE * 0.8;
    }

    // AI Gravity
    if (machineCar.position.y > 0.5) {
        machineCar.velocity.y -= 9.8 * delta;
        machineCar.position.y += machineCar.velocity.y * delta;
    } else {
        machineCar.position.y = 0.5;
        machineCar.velocity.y = 0;
    }
}

function updateBall(delta) {
    ball.position.add(ball.velocity.clone().multiplyScalar(delta));
    ball.velocity.multiplyScalar(0.98); // Friction

    // Wall bounce
    if (Math.abs(ball.position.x) > 14) {
        ball.velocity.x *= -0.8;
        ball.position.x = Math.sign(ball.position.x) * 14;
    }
    if (Math.abs(ball.position.z) > 24) {
        // Check Goal
        if (Math.abs(ball.position.x) < 5) {
            handleGoal(ball.position.z > 0 ? 'machine' : 'player');
        } else {
            ball.velocity.z *= -0.8;
            ball.position.z = Math.sign(ball.position.z) * 24;
        }
    }
}

function updatePhysics() {
    // Car vs Ball
    checkCollision(playerCar, ball, playerCar.speed);
    checkCollision(machineCar, ball, BASE_SPEED);
}

function checkCollision(car, ball, speed) {
    const dist = car.position.distanceTo(ball.position);
    if (dist < 2) {
        const dir = new THREE.Vector3().subVectors(ball.position, car.position).normalize();
        ball.velocity.add(dir.multiplyScalar(Math.abs(speed) * 10 + 2));
    }
}

function handleGoal(scorer) {
    if (gameState.isPaused) return;

    if (scorer === 'player') gameState.playerGoals++;
    else gameState.machineGoals++;

    document.getElementById('player-goals').innerText = gameState.playerGoals;
    document.getElementById('machine-goals').innerText = gameState.machineGoals;

    const announcement = document.getElementById('goal-announcement');
    announcement.classList.add('show');

    gameState.isPaused = true;

    setTimeout(() => {
        announcement.classList.remove('show');
        resetPositions();

        if (gameState.playerGoals >= 3 || gameState.machineGoals >= 3) {
            handleMatchEnd();
        } else {
            gameState.isPaused = false;
            animate();
        }
    }, 2000);
}

function resetPositions() {
    ball.position.set(0, 1, 0);
    ball.velocity.set(0, 0, 0);
    playerCar.position.set(0, 0.5, 15);
    playerCar.rotation.y = 0;
    machineCar.position.set(0, 0.5, -15);
    machineCar.rotation.y = Math.PI;
}

function handleMatchEnd() {
    if (gameState.playerGoals >= 3) {
        if (gameState.currentPhaseIndex < PHASES.length - 1) {
            gameState.currentPhaseIndex++;
            gameState.playerGoals = 0;
            gameState.machineGoals = 0;
            alert('PARABÉNS! VOCÊ AVANÇOU PARA AS ' + PHASES[gameState.currentPhaseIndex]);
            startGame();
        } else {
            showVictory();
        }
    } else {
        alert('FIM DE JOGO! SEU TIME FOI ELIMINADO.');
        location.reload();
    }
}

function showVictory() {
    switchScreen('victory');
    document.getElementById('vai-team').innerText = `VAI, ${gameState.playerTeam.name}!`;
    document.body.removeChild(renderer.domElement);
}

init();
