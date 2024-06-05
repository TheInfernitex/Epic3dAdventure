import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

//variables:
const pointsUI = document.querySelector("#points");
const gameO = document.querySelector("#gameOver");
let points = 0, time = 1;
let gameOver = false;
const invisibleMaterial = new CANNON.Material();

// Create a contact material to make it transparent
const transparentContactMaterial = new CANNON.ContactMaterial(
  invisibleMaterial,
  invisibleMaterial,
  {
    friction: 0.0, // Adjust friction if needed
    restitution: 0.0, // Adjust restitution if needed
    contactEquationStiffness: 1e8, // Adjust contact stiffness if needed
    contactEquationRelaxation: 3, // Adjust contact relaxation if needed
  }
);

const randomRangeNum = (max, min) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

setInterval(() => {
  time += 0.1;
}, 5000);

const moveObstacles = (arr, speed, maxX, minX, maxZ, minZ) => {
  arr.forEach((el) => {
    //move towards player
    el.body.position.z += speed * time;
    //respawn if out
    if (el.body.position.z > camera.position.z) {
      el.body.position.x = randomRangeNum(maxX, minX);
      el.body.position.z = randomRangeNum(maxZ, minZ);
    }
    el.mesh.position.copy(el.body.position);
    el.mesh.quaternion.copy(el.body.quaternion);
  });
};

//scene setup:
const scene = new THREE.Scene();
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});
const cannonDebugger = new CannonDebugger(scene, world, {
  color: "#AEE2FF",
  scale: 1,
});
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 4.5;
camera.position.y = 1.5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

// Load textures
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("./assets/groundTexture.jpg");
const groundNormalMap = textureLoader.load("./assets/groundNormalMap.jpg");
const groundRoughnessMap = textureLoader.load(
  "./assets/groundRoughnessMap.jpg"
);

// Ground physics body
const groundBody = new CANNON.Body({
  shape: new CANNON.Box(new CANNON.Vec3(15, 0.5, 15)),
  mass: 0, // Mass of 0 means it's static
});
groundBody.position.y = -1;
world.addBody(groundBody);

// Ground mesh
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  normalMap: groundNormalMap,
  roughnessMap: groundRoughnessMap,
  roughness: 0.8,
});

const groundGeometry = new THREE.BoxGeometry(30, 1, 30);
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -1;
scene.add(ground);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10).normalize();
scene.add(directionalLight);

const loader = new GLTFLoader();
let player;
loader.load(
  "./assets/character_blockout/scene.gltf",
  function (gltf) {
    player = gltf.scene;
    const model = gltf.scene.children[0];
    model.rotation.z = Math.PI;
    const scaleFactor = 6;
    player.scale.set(scaleFactor, scaleFactor, scaleFactor); // Scaling up the model

    scene.add(player);
  },
  undefined,
  function (error) {
    console.error(error);
  }
);
// Player physics body
const playerBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Sphere(0.37),
  fixedRotation: true,
});
world.addBody(playerBody);

playerBody.addEventListener("collide", (e) => {
  powerups.forEach((el) => {
    if (e.body === el.body) {
      el.body.position.x = randomRangeNum(8, -8);
      el.body.position.z = randomRangeNum(-5, -10);
      el.mesh.position.copy(el.body.position);
      el.mesh.quaternion.copy(el.body.quaternion);
      points += 1;
      pointsUI.textContent = points.toString();
    }
  });
  enemies.forEach((el) => {
    if (e.body === el.body) {
      gameOver = true;
    }
  });
});

world.addContactMaterial(transparentContactMaterial);
// Powerups
const powerups = [];
// Load Powerup Model
let powerupModel;
loader.load(
  "./assets/sun/scene.gltf",
  function (gltf) {
    powerupModel = gltf.scene;
    const model = gltf.scene.children[0];
    model.position.y = 0;
    const scaleFactor = 0.02;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor); // Scale down the model

    // Create Powerups
    createPowerups();
  },
  undefined,
  function (error) {
    console.error(error);
  }
);

function createPowerups() {
  // Powerups
  for (let i = 0; i < 10; i++) {
    const posX = randomRangeNum(8, -8);
    const posZ = randomRangeNum(-5, -10);

    // Create Powerup Mesh
    const powerup = powerupModel.clone(); // Clone the loaded model
    powerup.position.set(posX, 0, posZ); // Set initial position
    scene.add(powerup); // Add powerup to the scene

    // Create Powerup Physics Body
    const powerupShape = new CANNON.Sphere(0.1);
    const powerupBody = new CANNON.Body({
      shape: powerupShape,
      material: invisibleMaterial,
    });
    powerupBody.position.set(posX, 0, posZ); // Set initial position

    world.addBody(powerupBody);

    // Store powerup mesh and body
    const powerupObject = {
      mesh: powerup,
      body: powerupBody,
    };
    powerups.push(powerupObject);
  }
}

// Enemies
const enemies = [];
// Load Enemy Model
let enemyModel;
loader.load(
  "./assets/spike_ball/scene.gltf",
  function (gltf) {
    enemyModel = gltf.scene;
    const model = gltf.scene.children[0];
    model.position.y = 0;
    const scaleFactor = 0.4;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor); // Scale down the model

    // Create Enemies
    createEnemies();
  },
  undefined,
  function (error) {
    console.error(error);
  }
);

function createEnemies() {
  // Enemies
  for (let i = 0; i < 3; i++) {
    const posX = randomRangeNum(8, -8);
    const posZ = randomRangeNum(-5, -10);

    // Create Enemy Mesh
    const enemy = enemyModel.clone(); // Clone the loaded model
    enemy.position.set(posX, 0, posZ); // Set initial position
    scene.add(enemy); // Add enemy to the scene

    // Create Enemy Physics Body
    const enemyShape = new CANNON.Sphere(0.38);
    const enemyBody = new CANNON.Body({ shape: enemyShape });
    enemyBody.position.set(posX, 0, posZ); // Set initial position
    world.addBody(enemyBody); // Add enemy body to the world

    // Store enemy mesh and body
    const enemyObject = {
      mesh: enemy,
      body: enemyBody,
    };
    enemies.push(enemyObject);
  }
}

// Particles
const geometry = new THREE.BufferGeometry();
const vertices = [];
const size = 3000;

for (let i = 0; i < 5000; i++) {
  const x = (Math.random() * size + Math.random() * size) / 2 - size / 2;
  const y = (Math.random() * size + Math.random() * size) / 2 - size / 2;
  const z = (Math.random() * size + Math.random() * size) / 2 - size / 2;
  vertices.push(x, y, z);
}
geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(vertices, 3)
);
const material = new THREE.PointsMaterial({
  size: 2,
  color: 0xffffff,
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

function animate() {
  requestAnimationFrame(animate);

  particles.rotation.x += 0.001;
  particles.rotation.y += 0.001;
  particles.rotation.z += 0.001;

  if (player) {
    player.position.copy(playerBody.position);
    player.quaternion.copy(playerBody.quaternion);
  }

  if (!gameOver) {
    moveObstacles(powerups, 0.06, 8, -8, -5, -10);
    moveObstacles(enemies, 0.1, 8, -8, -5, -10);
  } else {
    gameO.innerHTML = "GAME OVER! [ Press  <i>Enter</i>  to Restart ]";

    //kick player off screen:
    playerBody.velocity.set(playerBody.position.x, 5, 5);
    enemies.forEach((el) => {
      scene.remove(el.mesh);
      world.removeBody(el.body);
    });
    powerups.forEach((el) => {
      scene.remove(el.mesh);
      world.removeBody(el.body);
    });

    if (playerBody.position.z > camera.position.z) {
      scene.remove(player);
      world.removeBody(playerBody);
    }
  }

  controls.update();

  world.fixedStep();
  cannonDebugger.update();

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("keydown", (e) => {
  //move left or right:

  if (e.key === "d" || e.key === "D" || e.key === "ArrowRight")
    playerBody.position.x += 0.1;
  if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")
    playerBody.position.x -= 0.1;
  //reset:
  if (e.key === "r" || e.key === "R") {
    playerBody.position.x = 0;
    playerBody.position.y = 0;
    playerBody.position.z = 0;
  }
  //jump:
  if (e.key === " " || e.key === "ArrowUp") {
    playerBody.position.y = 1.8;
  }

  if (e.key === "Enter") location.reload();
});
