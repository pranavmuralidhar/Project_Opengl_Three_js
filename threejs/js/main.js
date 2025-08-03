import * as THREE from './libs/three.module.js';
import { THREEx } from './libs/THREEx.KeyboardState.js';
import { GUI } from './libs/dat.gui.module.js';
import Stats from './libs/stats.module.js';
import { ColladaLoader } from './libs/ColladaLoader.js';

import * as initTerrain from './initTerrain.js';

// Helpers
Math.radians = (degrees) => degrees * Math.PI / 180;

// --- Tunables / constants ---
let planetRotationSpeed = 0.01;
let systemRotationSpeed = 0.0005;
const planetList = ['earth', 'mercury', 'venus', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune'];
const spaceRadius = 18000;

// Audio
const spaceListener = new THREE.AudioListener();
const shipListener = new THREE.AudioListener();
const spaceSound = new THREE.Audio(spaceListener);
const sWSound = new THREE.PositionalAudio(spaceListener);
const shipSound = new THREE.PositionalAudio(shipListener);

// Three.js core refs
let camera, scene, cameraSpace, cameraShip, sceneSpace, sceneShip, renderer, stats, planets;
let falconPivot, falcon;

// Controls, speeds
let gamepad = false;
let onGamePadSelectButton = false;
let keyboard = new THREEx.KeyboardState();
let shipMoveSpeed = 10;
let shipBoostSpeed = 15;
let currentShipMoveSpeed = shipMoveSpeed;
let shipRotationSpeed = 0.02;
let characterMoveSpeed = 5;
let characterRotationSpeed = 0.02;
let autopilotSpeed = 20;

// ▼▼▼ NEW: Mouse interaction state ▼▼▼
let isPointerLocked = false;
const MOUSE_SENSITIVITY = 0.002;

// FX / misc
let clock = new THREE.Clock();
let vectorX = new THREE.Vector3(1, 0, 0);
let vectorY = new THREE.Vector3(0, 1, 0);
let vectorZ = new THREE.Vector3(0, 0, 1);
let stormMixer1, stormMixer2, stormMixer3, stormMixer4, stormMixer5, stormMixer6, stormMixer7, stormMixer8, stormMixer9;

// GUI
let gui, autopilotController;
let params;

// Scene state
let dimension = "ship"; // your code toggles this between "ship" and "space"

// Ship banking “animation” state
let shipMoveFrontRotationEffect = 10;
let shipMoveSideRotationEffect = 10;
let currentShipMoveFrontRotationEffect = 0;
let currentShipMoveSideRotationEffect = 0;
let shipMoveRotationPresicion = 0.02;

// Sound
let musicVolume = 1;
let shipVolume = 1;

// Corridors (ship scene collisions)
let corridorWidth = 550;
let corridorLength = 1600;

// Materials / textures (kept for completeness)
const textureLoader = new THREE.TextureLoader();
const blackMat  = new THREE.MeshStandardMaterial({color: 0x000000});
const whiteMat  = new THREE.MeshStandardMaterial({color: 0xffffff});
const greenMat  = new THREE.MeshStandardMaterial({color: 0x38FF00});

// ----------------------------------------------------
startGUI();
init();
animate();
// ----------------------------------------------------

function init() {
    // FPS stats
    stats = new Stats();
    document.body.appendChild(stats.dom);

    // Init terrains
    [sceneSpace, cameraSpace] = initTerrain.initSpace(spaceRadius);
    [sceneShip,  cameraShip ] = initTerrain.initShip();

    // Default: place on space scene (keep your original behavior)
    scene  = sceneSpace;
    camera = cameraSpace;

    cameraSpace.add(spaceListener);
    cameraShip.add(shipListener);

    // Planets group (is in the space scene)
    planets = sceneSpace.getObjectByName("planets");

    // Attach the cameras to their scenes
    sceneShip.add(cameraShip);
    sceneSpace.add(cameraSpace);

    // Music
    music();

    // Load Falcon
    const loadingManager = new THREE.LoadingManager(function () {
        cameraSpace.add(falconPivot);
    });

    const falconLoader = new ColladaLoader(loadingManager);
    falconLoader.load('./content/models/MilleniumFalcon/model.dae', function (collada) {
        falconPivot = new THREE.Group();
        falcon = collada.scene;
        falcon.position.x -= 13;
        falcon.rotation.x += Math.radians(180);
        falconPivot.add(falcon);
        falconPivot.position.z -= 75;
        falconPivot.position.y -= 20;

        // Clean and enable shadows
        if (falcon.children[0] && falcon.children[0].children) {
            falcon.children[0].children.pop();
        }
        falcon.traverse(function (child) {
            child.castShadow = true;
            child.receiveShadow = true;
        });

        sceneSpace.add(falconPivot);
    });

    // Gamepad events
    window.addEventListener("gamepadconnected", (event) => {
        console.log("Gamepad connected:", event.gamepad);
        gamepad = navigator.getGamepads()[0];
    });

    window.addEventListener("gamepaddisconnected", (event) => {
        console.log("Gamepad disconnected:", event.gamepad);
        gamepad = false;
    });

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.domElement.id = 'canvas';
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('click',  onLoad, false);
    document.addEventListener('keydown', onLoad, false);

    // ▼▼▼ NEW: Add listeners for mouse controls ▼▼▼
    renderer.domElement.addEventListener('click', () => {
        // Request pointer lock when the user clicks the canvas, only in space view
        if (dimension !== "space") { // This condition means we are in the space scene
             renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    document.addEventListener('mousemove', onMouseMove);
    // ▲▲▲ END NEW MOUSE CONTROLS SETUP ▲▲▲
}

// ▼▼▼ NEW: Mouse movement handler for rotation ▼▼▼
function onMouseMove(event) {
    // Only rotate if pointer is locked and we are in the space scene
    if (!isPointerLocked || dimension === 'space') return;

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);

    // Apply mouse movement to the Euler angles
    // movementX affects the Y-axis rotation (yaw)
    // movementY affects the X-axis rotation (pitch)
    euler.y -= event.movementX * MOUSE_SENSITIVITY;
    euler.x -= event.movementY * MOUSE_SENSITIVITY;

    // Clamp the pitch angle to prevent the camera from flipping over (e.g. > 90 degrees)
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

    // Apply the new rotation back to the camera's quaternion
    camera.quaternion.setFromEuler(euler);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onLoad() {
    const preload = document.querySelector('.container');
    const canvas  = document.querySelector('#canvas');
    if (canvas)   canvas.classList.add('display');
    if (preload)  preload.classList.add('container-finish');
}

function animate() {
    requestAnimationFrame(animate);
    render();

    // If we're in space scene (based on your original logic it's reversed, but we'll keep your pattern):
    if (dimension !== "space") {
        // ---- Autopilot OR manual controls ----
        if (params.autopilotTarget && params.autopilotTarget !== 'None') {
            updateAutopilot();
        } else {
            spaceControl();
        }

        planetUpdate();

    } else {
        shipControl();
        shipAnimation();
    }
}

function render() {
    stats.update();
    renderer.render(scene, camera);
}

function shipAnimation() {
    let delta = clock.getDelta();

    // storms animations (kept as-is)
    const stormIds = [1,2,3,4,5,6,7,8,9];
    const mixers   = [stormMixer1, stormMixer2, stormMixer3, stormMixer4, stormMixer5, stormMixer6, stormMixer7, stormMixer8, stormMixer9];

    for (let i = 0; i < stormIds.length; i++) {
        const idx = stormIds[i];
        const storm = sceneShip.getObjectByName(`storm${idx}`);
        if (!storm) continue;

        if (!mixers[i]) mixers[i] = new THREE.AnimationMixer(storm);

        let action = mixers[i].clipAction(storm.animations[shipSound.isPlaying ? 1 : 0]);
        action.stop();
        action = mixers[i].clipAction(storm.animations[shipSound.isPlaying ? 0 : 1]);
        action.play();
        mixers[i].update(delta + THREE.Math.randFloatSpread(0.002));
    }

    // Moving lights (kept)
    let time = Date.now() * 0.0005;
    let light1 = scene.getObjectByName('light1');
    if (light1 !== undefined) {
        light1.position.x = Math.sin(time * 0.7) * corridorWidth - 10;
        light1.position.z = Math.sin(time * 0.3) * corridorLength - 10;
    }
    let light2 = scene.getObjectByName('light2');
    if (light2 !== undefined) {
        light2.position.x = Math.sin(time * 0.1) * corridorWidth - 10;
        light2.position.z = Math.sin(time * -0.6) * corridorLength - 10;
    }
    let light3 = scene.getObjectByName('light3');
    if (light3 !== undefined) {
        light3.position.x = Math.sin(time * 0.9) * corridorWidth - 10;
        light3.position.z = Math.sin(time * 0.7) * corridorLength - 10;
    }
}

function spaceControl() {
    // Gamepad controls are unchanged
    if (gamepad) {
        gamepad = navigator.getGamepads()[0];

        // forward / backward
        if (gamepad.axes[1] <= -0.1) {
            camera.translateZ(currentShipMoveSpeed * gamepad.axes[1]);
            if (currentShipMoveFrontRotationEffect > -shipMoveFrontRotationEffect) {
                if (falconPivot && falcon) {
                    falconPivot.rotation.x -= shipMoveRotationPresicion;
                    falcon.position.y -= 0.5;
                    falcon.position.z -= 0.5;
                }
                currentShipMoveFrontRotationEffect--;
            }
        } else {
            if (currentShipMoveFrontRotationEffect < 0 && falconPivot && falcon) {
                falconPivot.rotation.x += shipMoveRotationPresicion;
                falcon.position.y += 0.5;
                falcon.position.z += 0.5;
                currentShipMoveFrontRotationEffect++;
            }
        }

        if (gamepad.axes[1] >= 0.1) {
            camera.translateZ(currentShipMoveSpeed * gamepad.axes[1]);
            if (currentShipMoveFrontRotationEffect < shipMoveFrontRotationEffect) {
                if (falconPivot && falcon) {
                    falconPivot.rotation.x += shipMoveRotationPresicion;
                    falcon.position.y += 0.5;
                    falcon.position.z += 0.5;
                }
                currentShipMoveFrontRotationEffect++;
            } else {
                if (currentShipMoveFrontRotationEffect > 0 && falconPivot && falcon) {
                    falconPivot.rotation.x -= shipMoveRotationPresicion;
                    falcon.position.y -= 0.5;
                    falcon.position.z -= 0.5;
                    currentShipMoveFrontRotationEffect--;
                }
            }
        } else {
            if (currentShipMoveFrontRotationEffect > 0 && falconPivot && falcon) {
                falconPivot.rotation.x -= shipMoveRotationPresicion;
                falcon.position.y -= 0.5;
                falcon.position.z -= 0.5;
                currentShipMoveFrontRotationEffect--;
            }
        }

        // strafe
        if (gamepad.axes[0] <= -0.1) {
            camera.translateX(-currentShipMoveSpeed * -gamepad.axes[0]);
            if (currentShipMoveSideRotationEffect > -shipMoveSideRotationEffect && falconPivot) {
                falconPivot.rotation.z += shipMoveRotationPresicion;
                currentShipMoveSideRotationEffect--;
            }
        } else {
            if (currentShipMoveSideRotationEffect < 0 && falconPivot) {
                falconPivot.rotation.z -= shipMoveRotationPresicion;
                currentShipMoveSideRotationEffect++;
            }
        }

        if (gamepad.axes[0] >= 0.1) {
            camera.translateX(currentShipMoveSpeed * gamepad.axes[0]);
            if (currentShipMoveSideRotationEffect < shipMoveSideRotationEffect && falconPivot) {
                falconPivot.rotation.z -= shipMoveRotationPresicion;
                currentShipMoveSideRotationEffect++;
            } else {
                if (currentShipMoveSideRotationEffect > 0 && falconPivot) {
                    falconPivot.rotation.z += shipMoveRotationPresicion;
                    currentShipMoveSideRotationEffect--;
                }
            }
        }

        // rolls / rotations
        if (gamepad.axes[3] <= -0.1) {
            camera.rotateOnAxis(vectorX, shipRotationSpeed * -gamepad.axes[3]);
        }
        if (gamepad.axes[3] >= 0.1) {
            camera.rotateOnAxis(vectorX, -shipRotationSpeed * gamepad.axes[3]);
        }
        if (gamepad.axes[2] <= -0.1) {
            camera.rotateOnAxis(vectorY, shipRotationSpeed * -gamepad.axes[2]);
        }
        if (gamepad.axes[2] >= 0.1) {
            camera.rotateOnAxis(vectorY, -shipRotationSpeed * gamepad.axes[2]);
        }
        if (gamepad.buttons[4].pressed) {
            camera.rotateOnAxis(vectorZ, shipRotationSpeed * 0.5);
        }
        if (gamepad.buttons[5].pressed) {
            camera.rotateOnAxis(vectorZ, -shipRotationSpeed * 0.5);
        }
        if (gamepad.buttons[6].value >= 0.1) {
            camera.translateY(-currentShipMoveSpeed * gamepad.buttons[6].value);
        }
        if (gamepad.buttons[7].value >= 0.1) {
            camera.translateY(currentShipMoveSpeed * gamepad.buttons[7].value);
        }

        // boost
        if (gamepad.buttons[0].pressed) {
            onLoad();
            currentShipMoveSpeed = shipBoostSpeed;
        } else {
            currentShipMoveSpeed = shipMoveSpeed;
        }

        // switch dimension
        if (gamepad.buttons[8].pressed) {
            onGamePadSelectButton = true;
        } else {
            if (onGamePadSelectButton) {
                onGamePadSelectButton = false;
                params.Switch();
            }
        }
    } else {
        // --- Keyboard part ---
        // ▼▼▼ MODIFIED: Removed arrow key rotation. Mouse handles this now. ▼▼▼
        // if (keyboard.pressed("up"))    camera.rotateOnAxis(vectorX,  shipRotationSpeed);
        // if (keyboard.pressed("down"))  camera.rotateOnAxis(vectorX, -shipRotationSpeed);
        // if (keyboard.pressed("left"))  camera.rotateOnAxis(vectorY,  shipRotationSpeed);
        // if (keyboard.pressed("right")) camera.rotateOnAxis(vectorY, -shipRotationSpeed);
        
        // Translation controls (W, S, A, D) and roll (4, 5) remain unchanged.
        if (keyboard.pressed("w")) {
            camera.translateZ(-currentShipMoveSpeed);
            if (currentShipMoveFrontRotationEffect < shipMoveFrontRotationEffect && falconPivot && falcon) {
                falconPivot.rotation.x -= shipMoveRotationPresicion;
                falcon.position.y -= 0.5;
                falcon.position.z -= 0.5;
                currentShipMoveFrontRotationEffect++;
            }
        } else {
            if (currentShipMoveFrontRotationEffect > 0 && falconPivot && falcon) {
                falconPivot.rotation.x += shipMoveRotationPresicion;
                falcon.position.y += 0.5;
                falcon.position.z += 0.5;
                currentShipMoveFrontRotationEffect--;
            }
        }

        if (keyboard.pressed("s")) {
            camera.translateZ(currentShipMoveSpeed);
            if (currentShipMoveFrontRotationEffect > -shipMoveFrontRotationEffect && falconPivot && falcon) {
                falconPivot.rotation.x += shipMoveRotationPresicion;
                falcon.position.y += 0.5;
                falcon.position.z += 0.5;
                currentShipMoveFrontRotationEffect--;
            } else {
                if (currentShipMoveFrontRotationEffect < 0 && falconPivot && falcon) {
                    falconPivot.rotation.x -= shipMoveRotationPresicion;
                    falcon.position.y -= 0.5;
                    falcon.position.z -= 0.5;
                    currentShipMoveFrontRotationEffect++;
                }
            }
        } else {
            if (currentShipMoveFrontRotationEffect < 0 && falconPivot && falcon) {
                falconPivot.rotation.x -= shipMoveRotationPresicion;
                falcon.position.y -= 0.5;
                falcon.position.z -= 0.5;
                currentShipMoveFrontRotationEffect++;
            }
        }

        if (keyboard.pressed("a")) {
            camera.translateX(-currentShipMoveSpeed);
            if (currentShipMoveSideRotationEffect > -shipMoveSideRotationEffect && falconPivot) {
                falconPivot.rotation.z += shipMoveRotationPresicion;
                currentShipMoveSideRotationEffect--;
            }
        } else if (keyboard.pressed("d")) {
            camera.translateX(currentShipMoveSpeed);
            if (currentShipMoveSideRotationEffect < shipMoveSideRotationEffect && falconPivot) {
                falconPivot.rotation.z -= shipMoveRotationPresicion;
                currentShipMoveSideRotationEffect++;
            }
        } else {
            if (currentShipMoveSideRotationEffect < 0 && falconPivot) {
                falconPivot.rotation.z -= shipMoveRotationPresicion;
                currentShipMoveSideRotationEffect++;
            }
            if (currentShipMoveSideRotationEffect > 0 && falconPivot) {
                falconPivot.rotation.z += shipMoveRotationPresicion;
                currentShipMoveSideRotationEffect--;
            }
        }

        if (keyboard.pressed("4")) camera.rotateOnAxis(vectorZ,  shipRotationSpeed * 0.5);
        if (keyboard.pressed("5")) camera.rotateOnAxis(vectorZ, -shipRotationSpeed * 0.5);

        if (keyboard.pressed("shift")) currentShipMoveSpeed = shipBoostSpeed;
        else                           currentShipMoveSpeed = shipMoveSpeed;
    }
}


function shipControl() {
    // Ship interior controls are unchanged
    if (gamepad) {
        gamepad = navigator.getGamepads()[0];

        if (gamepad.axes[1] <= -0.1) { camera.translateZ(characterMoveSpeed * gamepad.axes[1]); }
        if (gamepad.axes[1] >= 0.1)  { camera.translateZ(characterMoveSpeed * gamepad.axes[1]); }
        if (gamepad.axes[0] <= -0.1) { camera.translateX(-characterMoveSpeed * -gamepad.axes[0]); }
        if (gamepad.axes[0] >= 0.1)  { camera.translateX(characterMoveSpeed * gamepad.axes[0]); }

        if (gamepad.axes[3] <= -0.1 && camera.rotation.x < Math.radians(40))  camera.rotateOnAxis(vectorX,  characterRotationSpeed * -gamepad.axes[3]);
        if (gamepad.axes[3] >= 0.1 && camera.rotation.x > Math.radians(-40))  camera.rotateOnAxis(vectorX, -characterRotationSpeed * gamepad.axes[3]);
        if (gamepad.axes[2] <= -0.1) camera.rotateOnAxis(vectorY,  characterRotationSpeed * -gamepad.axes[2]);
        if (gamepad.axes[2] >= 0.1)  camera.rotateOnAxis(vectorY, -characterRotationSpeed * gamepad.axes[2]);

        if (gamepad.buttons[4].pressed) camera.rotateOnAxis(vectorZ,  characterRotationSpeed * 0.5);
        if (gamepad.buttons[5].pressed) camera.rotateOnAxis(vectorZ, -characterRotationSpeed * 0.5);

        if (gamepad.buttons[8].pressed) {
            onGamePadSelectButton = true;
        } else {
            if (onGamePadSelectButton) {
                onGamePadSelectButton = false;
                params.Switch();
            }
        }
        if (gamepad.buttons[0].pressed) onLoad();
    } else {
        if (keyboard.pressed("up")   && camera.rotation.x < Math.radians(40))  camera.rotateOnAxis(vectorX,  characterRotationSpeed);
        if (keyboard.pressed("down") && camera.rotation.x > Math.radians(-40)) camera.rotateOnAxis(vectorX, -characterRotationSpeed);
        if (keyboard.pressed("left"))  camera.rotateOnAxis(vectorY,  characterRotationSpeed);
        if (keyboard.pressed("right")) camera.rotateOnAxis(vectorY, -characterRotationSpeed);

        if (keyboard.pressed("w")) camera.translateZ(-characterMoveSpeed);
        if (keyboard.pressed("s")) camera.translateZ( characterMoveSpeed);
        if (keyboard.pressed("a")) camera.rotateOnAxis(vectorZ,  characterRotationSpeed * 0.5);
        if (keyboard.pressed("e")) camera.rotateOnAxis(vectorZ, -characterRotationSpeed * 0.5);
    }

    // Keep inside corridor
    camera.position.y = 250;
    if (camera.position.x >=  corridorWidth) camera.position.x =  corridorWidth;
    if (camera.position.x <= -corridorWidth) camera.position.x = -corridorWidth;
    if (camera.position.z >=  corridorLength) camera.position.z =  corridorLength;
    if (camera.position.z <= -corridorLength) camera.position.z = -corridorLength;
}

function planetUpdate() {
    if (!planets) return;

    planets.rotation.y += systemRotationSpeed;

    for (let i = 0; i < planetList.length; i++) {
        const p = planets.getObjectByName(planetList[i]);
        if (p) p.rotation.y += planetRotationSpeed;
    }
}

// ------------------ AUTOPILOT -----------------------
function updateAutopilot() {
    if (params.autopilotTarget === 'None' || !planets) return;

    const targetPlanet = planets.getObjectByName(params.autopilotTarget);
    if (!targetPlanet) {
        // Planet not found, stop autopilot
        params.autopilotTarget = 'None';
        if (autopilotController) autopilotController.setValue('None');
        return;
    }

    const targetPosition = new THREE.Vector3();
    targetPlanet.getWorldPosition(targetPosition);

    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    const distanceToTarget = cameraPosition.distanceTo(targetPosition);

    // Close enough? stop
    if (distanceToTarget < 300) {
        console.log(`Arrived at ${params.autopilotTarget}. Autopilot disengaged.`);
        params.autopilotTarget = 'None';
        if (autopilotController) autopilotController.setValue('None');
        return;
    }

    // Rotate camera smoothly to face the target
    const targetQuaternion = new THREE.Quaternion();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(camera.position, targetPosition, camera.up);
    targetQuaternion.setFromRotationMatrix(tempMatrix);
    camera.quaternion.slerp(targetQuaternion, 0.02);

    // Move forward
    camera.translateZ(-autopilotSpeed);
}
// ----------------------------------------------------

function music() {
    let spaceAudioLoader = new THREE.AudioLoader();
    spaceAudioLoader.load('./content/audio/SpaceAmbient.ogg', function (buffer) {
        spaceSound.setBuffer(buffer);
        spaceSound.setLoop(true);
        spaceSound.setVolume(musicVolume);
        spaceSound.play();
    });

    let SWAudioLoader = new THREE.AudioLoader();
    SWAudioLoader.load('./content/audio/starwars.ogg', function (buffer) {
        sWSound.setBuffer(buffer);
        sWSound.setRefDistance(150);
        sWSound.setMaxDistance(200);
        sWSound.setLoop(true);
        sWSound.play();
        sWSound.setVolume(1);
    });
    // attach to earth when space scene is ready
    // (guard because initTerrain may still be creating)
    const earth = sceneSpace.getObjectByName("earth");
    if (earth) earth.add(sWSound);

    let shipAudioLoader = new THREE.AudioLoader();
    shipAudioLoader.load('./content/audio/cantina.ogg', function (buffer) {
        shipSound.setBuffer(buffer);
        shipSound.setRefDistance(200);
        shipSound.setMaxDistance(300);
        shipSound.setLoop(true);
        shipSound.setVolume(shipVolume);
    });
    sceneShip.add(shipSound);
    shipSound.position.set(0, 100, 0);
}

function startGUI() {
    params = {
        Switch: function () {
            switch (dimension) {
                case "space":
                    // go to space scene
                    scene = sceneSpace;
                    camera = cameraSpace;
                    planets = scene.getObjectByName("planets");
                    shipSound.pause();
                    spaceSound.play();
                    sWSound.play();
                    dimension = "ship";
                    break;

                case "ship":
                    // go to ship scene
                    camera = cameraShip;
                    scene = sceneShip;
                    dimension = "space";
                    spaceSound.stop();
                    sWSound.stop();
                    // unlock pointer when switching out of space view
                    document.exitPointerLock(); 
                    break;

                default:
                    break;
            }
        },
        PlanetRotationSpeed: planetRotationSpeed,
        SystemRotationSpeed: systemRotationSpeed,
        autopilotTarget: 'None',
        MusicVolume: musicVolume,
        ShipMusicVolume: shipVolume,
        PlayPauseSpaceMusic: function () {
            if (spaceSound.isPlaying) spaceSound.pause();
            else spaceSound.play();
        },
        RestartSpaceMusic: function () {
            spaceSound.stop();
            spaceSound.play();
        },
        PlayPauseShipMusic: function () {
            if (shipSound.isPlaying) shipSound.pause();
            else shipSound.play();
        },
        RestartShipMusic: function () {
            shipSound.stop();
            shipSound.play();
        },
        ShipMoveSpeed: shipMoveSpeed,
        ShipBoostSpeed: shipBoostSpeed,
        ShipRotationSpeed: shipRotationSpeed,
        CharacterMoveSpeed: characterMoveSpeed,
        CharacterRotationSpeed: characterRotationSpeed
    };

    gui = new GUI();
    gui.width = 310;

    const spaceFolder           = gui.addFolder('Space settings');
    const shipControlsFolder    = gui.addFolder('SpaceShip controls settings');
    let spaceSoundFolder;
    const shipFolder            = gui.addFolder('Ship settings');
    const characterControlsFolder = shipFolder.addFolder('Character controls settings');
    const shipSoundFolder       = shipFolder.addFolder('Music');

    gui.add(params, 'Switch').name('Switch scene');

    spaceFolder.add(params, 'PlanetRotationSpeed')
        .name('Planet rotation speed').min(0).max(0.1).step(0.001)
        .onChange(() => { planetRotationSpeed = params.PlanetRotationSpeed; });

    spaceFolder.add(params, 'SystemRotationSpeed')
        .name('System rotation speed').min(0).max(0.01).step(0.0001)
        .onChange(() => { systemRotationSpeed = params.SystemRotationSpeed; });

    // --- Autopilot GUI ---
    const autopilotFolder = spaceFolder.addFolder('Autopilot');
    autopilotController = autopilotFolder
        .add(params, 'autopilotTarget', ['None', ...planetList])
        .name('Set Destination');
    autopilotFolder.open();
    // --- End Autopilot GUI ---

    spaceSoundFolder = spaceFolder.addFolder('Sound spaceControl');
    spaceSoundFolder.add(params, 'MusicVolume').name('Music volume').min(0).max(2).step(0.1).onChange(() => {
        musicVolume = params.MusicVolume;
        spaceSound.setVolume(musicVolume);
    });
    spaceSoundFolder.add(params, 'PlayPauseSpaceMusic').name('Play/Pause music');
    spaceSoundFolder.add(params, 'RestartSpaceMusic').name('Restart music');

    shipControlsFolder.add(params, 'ShipMoveSpeed')
        .name('Ship move speed').min(1).max(10).step(0.5)
        .onChange(() => { shipMoveSpeed = params.ShipMoveSpeed; });

    shipControlsFolder.add(params, 'ShipBoostSpeed')
        .name('Ship boost speed').min(2).max(20).step(0.5)
        .onChange(() => { shipBoostSpeed = params.ShipBoostSpeed; });

    shipControlsFolder.add(params, 'ShipRotationSpeed')
        .name('Ship rotation speed').min(0.001).max(0.05).step(0.001)
        .onChange(() => { shipRotationSpeed = params.ShipRotationSpeed; });

    characterControlsFolder.add(params, 'CharacterMoveSpeed')
        .name('Character move speed').min(1).max(10).step(0.1)
        .onChange(() => { characterMoveSpeed = params.CharacterMoveSpeed; });

    characterControlsFolder.add(params, 'CharacterRotationSpeed')
        .name('Character rotation speed').min(0.001).max(0.05).step(0.001)
        .onChange(() => { characterRotationSpeed = params.CharacterRotationSpeed; });

    shipSoundFolder.add(params, 'ShipMusicVolume')
        .name('Ship volume').min(0).max(2).step(0.1)
        .onChange(() => {
            shipVolume = params.ShipMusicVolume;
            shipSound.setVolume(shipVolume);
        });

    shipSoundFolder.add(params, 'PlayPauseShipMusic').name('Play/Pause music');
    shipSoundFolder.add(params, 'RestartShipMusic').name('Restart music');
}