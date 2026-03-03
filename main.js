import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- CONFIGURATION & DATA ---
const TEAMS = [
    { name: 'Corinthians', color1: '#ffffff', color2: '#000000', id: 'corinthians' },
    { name: 'Palmeiras', color1: '#006437', color2: '#ffffff', id: 'palmeiras' },
    { name: 'Flamengo', color1: '#ff0000', color2: '#000000', id: 'flamengo' },
    { name: 'São Paulo', color1: '#ff0000', color2: '#ffffff', id: 'saopaulo' },
    { name: 'Santos', color1: '#ffffff', color2: '#000000', id: 'santos' },
    { name: 'Gremio', color1: '#00aae7', color2: '#000000', id: 'gremio' },
    { name: 'Internacional', color1: '#ff0000', color2: '#ffffff', id: 'inter' },
    { name: 'Atletico-MG', color1: '#000000', color2: '#ffffff', id: 'atleticomg' },
    { name: 'Cruzeiro', color1: '#0000ff', color2: '#ffffff', id: 'cruzeiro' },
    { name: 'Fluminense', color1: '#800000', color2: '#008000', id: 'fluminense' },
    { name: 'Botafogo', color1: '#000000', color2: '#ffffff', id: 'botafogo' },
    { name: 'Vasco', color1: '#000000', color2: '#ffffff', id: 'vasco' },
    { name: 'Bahia', color1: '#0000ff', color2: '#ff0000', id: 'bahia' },
    { name: 'Fortaleza', color1: '#ff0000', color2: '#0000ff', id: 'fortaleza' },
    { name: 'Athletico-PR', color1: '#ff0000', color2: '#000000', id: 'athleticopr' },
    { name: 'Cuiaba', color1: '#008000', color2: '#ffff00', id: 'cuiaba' },
    { name: 'Vitoria', color1: '#ff0000', color2: '#000000', id: 'vitoria' },
    { name: 'Criciuma', color1: '#ffff00', color2: '#000000', id: 'criciuma' },
    { name: 'Juventude', color1: '#008000', color2: '#ffffff', id: 'juventude' },
    { name: 'Atletico-GO', color1: '#ff0000', color2: '#000000', id: 'atleticogo' }
];

let gameState = {
    playerTeam: null,
    opponentTeam: null,
    difficulty: 'hard',
    phase: 'OITAVAS DE FINAL',
    score: { player: 0, opponent: 0 },
    isGameOver: false
};

// --- DOM ELEMENTS ---
const menuScreen = document.getElementById('menu-screen');
const teamList = document.getElementById('team-list');
const opponentList = document.getElementById('opponent-list');
const startBtn = document.getElementById('start-btn');
const uiLayer = document.getElementById('ui-layer');
const victoryScreen = document.getElementById('victory-screen');

// --- INITIALIZE MENU ---
function initMenu() {
    TEAMS.forEach(team => {
        // Player Selection
        const pItem = createTeamItem(team, 'player');
        teamList.appendChild(pItem);

        // Opponent Selection
        const oItem = createTeamItem(team, 'opponent');
        opponentList.appendChild(oItem);
    });

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.difficulty = btn.dataset.level;
        });
    });

    startBtn.addEventListener('click', startGame);
}

function createTeamItem(team, type) {
    const item = document.createElement('div');
    item.className = 'team-item';
    item.innerHTML = `
        <div class="team-badge-placeholder" style="background: linear-gradient(135deg, ${team.color1} 50%, ${team.color2} 50%); border-radius: 50%; width: 40px; height: 40px; border: 2px solid rgba(255,255,255,0.2)"></div>
        <span style="font-size: 8px; margin-top: 4px; display: block">${team.name}</span>
    `;
    item.addEventListener('click', () => {
        const parent = type === 'player' ? teamList : opponentList;
        parent.querySelectorAll('.team-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        if (type === 'player') gameState.playerTeam = team;
        else gameState.opponentTeam = team;
    });
    return item;
}

// --- GAME CORE ---
let scene, camera, renderer, world, clock;
let car, opponentCar, ball;
let debugMode = false;

function startGame() {
    if (!gameState.playerTeam || !gameState.opponentTeam) {
        alert('Selecione os times!');
        return;
    }
    menuScreen.classList.add('hidden');
    uiLayer.classList.remove('hidden');

    updateScoreboard();
    initThree();
    initPhysics();
    createArena();
    createVehicles();
    createBall();
    animate();
}

function updateScoreboard() {
    document.getElementById('player-goals').textContent = gameState.score.player;
    document.getElementById('opponent-goals').textContent = gameState.score.opponent;
    document.getElementById('match-phase').textContent = gameState.phase;
}

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 20, 100);

    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    scene.add(sunLight);

    clock = new THREE.Clock();
}

function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Normal gravity, jump will handle "antigravity"
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
}

function createArena() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(60, 100);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x1a3a1a,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid/Lines
    const grid = new THREE.GridHelper(100, 20, 0x333333, 0x222222);
    grid.rotation.x = Math.PI / 2;
    floor.add(grid);

    const floorBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
        material: new CANNON.Material({ friction: 0.1, restitution: 0.3 })
    });
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(floorBody);

    // Goal Structures
    createGoalPost(0, 0, -50);
    createGoalPost(0, 0, 50);

    // Walls (Simplified)
    createWall(0, 5, -50.5, 60, 10, 1); // North
    createWall(0, 5, 50.5, 60, 10, 1);  // South
    createWall(-30.5, 5, 0, 1, 10, 100); // West
    createWall(30.5, 5, 0, 1, 10, 100);  // East
}

function createGoalPost(x, y, z) {
    const geo = new THREE.BoxGeometry(15, 8, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + 4, z);
    scene.add(mesh);
}

function createWall(x, y, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
    const body = new CANNON.Body({ mass: 0, shape });
    body.position.set(x, y, z);
    world.addBody(body);
}

function createVehicles() {
    // Player Car
    car = createCarMesh(gameState.playerTeam.color1);
    scene.add(car.mesh);
    world.addBody(car.body);
    car.body.position.set(0, 1, 30);

    // Opponent Car
    opponentCar = createCarMesh(gameState.opponentTeam.color1);
    scene.add(opponentCar.mesh);
    world.addBody(opponentCar.body);
    opponentCar.body.position.set(0, 1, -30);
}

function createCarMesh(color) {
    const group = new THREE.Group();

    // Body (Chassis)
    const bodyGeo = new THREE.BoxGeometry(2, 0.6, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.7 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.3;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Cabin (Cockpit)
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 1.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.8 });
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.y = 0.9;
    cabinMesh.position.z = 0.2;
    group.add(cabinMesh);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const wheelPositions = [
        { x: -1.1, y: 0.3, z: 1.5 },
        { x: 1.1, y: 0.3, z: 1.5 },
        { x: -1.1, y: 0.3, z: -1.5 },
        { x: 1.1, y: 0.3, z: -1.5 }
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, pos.y, pos.z);
        group.add(wheel);
    });

    // Physics Body
    const shape = new CANNON.Box(new CANNON.Vec3(1.1, 0.7, 2));
    const body = new CANNON.Body({
        mass: 1500,
        shape,
        material: new CANNON.Material({ friction: 0.5, restitution: 0.3 })
    });

    return { mesh: group, body };
}

function createBall() {
    const geo = new THREE.SphereGeometry(1.5, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    scene.add(mesh);

    const shape = new CANNON.Sphere(1.5);
    ball = {
        mesh,
        body: new CANNON.Body({
            mass: 50,
            shape,
            material: new CANNON.Material({ friction: 0.1, restitution: 0.8 })
        })
    };
    ball.body.position.set(0, 5, 0);
    world.addBody(ball.body);
}

// --- INPUT HANDLING ---
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

function updateInput() {
    if (!car) return;

    const force = 5000;
    const torque = 2000;

    if (keys['KeyW']) car.body.applyLocalForce(new CANNON.Vec3(0, 0, -force), new CANNON.Vec3(0, 0, 0));
    if (keys['KeyS']) car.body.applyLocalForce(new CANNON.Vec3(0, 0, force), new CANNON.Vec3(0, 0, 0));
    if (keys['KeyA']) car.body.angularVelocity.y = 2;
    if (keys['KeyD']) car.body.angularVelocity.y = -2;
    if (keys['Space'] && Math.abs(car.body.velocity.y) < 0.1) car.body.velocity.y = 10; // Jump
}

function updateAI() {
    if (!opponentCar || !ball) return;

    // Simple AI: Follow ball
    const toBall = ball.body.position.vsub(opponentCar.body.position);
    toBall.y = 0;
    toBall.normalize();

    let speed = 2000;
    if (gameState.difficulty === 'medium') speed = 4000;
    if (gameState.difficulty === 'hard') speed = 7000;

    opponentCar.body.applyLocalForce(new CANNON.Vec3(0, 0, -speed), new CANNON.Vec3(0, 0, 0));
    // Simple rotation towards ball
    const angle = Math.atan2(toBall.x, toBall.z);
    opponentCar.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle + Math.PI);
}

function checkGoals() {
    if (ball.body.position.z < -48) goalScored('player');
    if (ball.body.position.z > 48) goalScored('opponent');
}

function goalScored(who) {
    gameState.score[who]++;
    updateScoreboard();
    resetPositions();

    if (gameState.score[who] >= 3) {
        if (who === 'player') advanceTournament();
        else alert('Fim de Jogo! Você perdeu.');
    }
}

function resetPositions() {
    ball.body.position.set(0, 5, 0);
    ball.body.velocity.set(0, 0, 0);
    ball.body.angularVelocity.set(0, 0, 0);

    car.body.position.set(0, 1, 30);
    car.body.velocity.set(0, 0, 0);
    car.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);

    opponentCar.body.position.set(0, 1, -30);
    opponentCar.body.velocity.set(0, 0, 0);
    opponentCar.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
}

function advanceTournament() {
    const phases = ['OITAVAS DE FINAL', 'QUARTAS DE FINAL', 'SEMIFINAL', 'FINAL'];
    const currentIndex = phases.indexOf(gameState.phase);

    if (currentIndex < phases.length - 1) {
        gameState.phase = phases[currentIndex + 1];
        gameState.score = { player: 0, opponent: 0 };
        // Choose new random opponent
        gameState.opponentTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        updateScoreboard();
        resetPositions();
        alert(`Parabéns! Você avançou para as ${gameState.phase}`);
    } else {
        showVictory();
    }
}

function showVictory() {
    gameState.isGameOver = true;
    uiLayer.classList.add('hidden');
    victoryScreen.classList.remove('hidden');
    document.getElementById('victory-msg').textContent = `Vai, ${gameState.playerTeam.name}!`;
}

function animate() {
    if (gameState.isGameOver) return;
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    world.step(1 / 60, delta, 3);

    updateInput();
    updateAI();
    checkGoals();

    // Sync Three meshes with Cannon bodies
    car.mesh.position.copy(car.body.position);
    car.mesh.quaternion.copy(car.body.quaternion);

    opponentCar.mesh.position.copy(opponentCar.body.position);
    opponentCar.mesh.quaternion.copy(opponentCar.body.quaternion);

    ball.mesh.position.copy(ball.body.position);
    ball.mesh.quaternion.copy(ball.body.quaternion);

    // Follow camera
    const cameraOffset = new THREE.Vector3(0, 10, 20);
    const cameraPos = car.mesh.position.clone().add(cameraOffset);
    camera.position.lerp(cameraPos, 0.1);
    camera.lookAt(ball.mesh.position);

    renderer.render(scene, camera);
}

// Start
initMenu();
window.addEventListener('resize', () => {
    if (camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
