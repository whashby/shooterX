// =======================================================
// Image Assets Loading
// =======================================================
const asteroidImages = {
    1: new Image(),
    2: new Image(),
    3: new Image()
};
asteroidImages[1].src = "assets/asteroid_small.png";
asteroidImages[2].src = "assets/asteroid_medium.png";
asteroidImages[3].src = "assets/asteroid_large.png";

const enemyShipImage = new Image();
enemyShipImage.src = "assets/enemy_ship.png";

const bossShipImage = new Image();
bossShipImage.src = "assets/boss.png";

const powerUpImage = new Image();
powerUpImage.src = "assets/powerup.png";

const specialItemImage = new Image();
specialItemImage.src = "assets/special.png";

const healthRefillImage = new Image();
healthRefillImage.src = "assets/health_refill.png";

const playerShipImage = new Image();
playerShipImage.src = "assets/ship.png";

// =======================================================
// Canvas and Global State
// =======================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const maxLives = 5;
let lives = 3;
let score = 0;
let lastShotTime = 0;
const baseFireInterval = 500;
let currentFireInterval = baseFireInterval;
let isPaused = false;

const enemies = [];
const enemyBullets = [];
const powerUps = [];
const specialPowerUps = [];
const healthRefills = [];
const specialRings = [];

// =======================================================
// Starry Background Setup (Space Environment)
// =======================================================
const stars = [];
const starCount = 150;
for (let i = 0; i < starCount; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5
    });
}

function drawStarryBackground() {
    // Draw a solid dark base.
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create a subtle radial gradient that gives a nebula-like effect.
    const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width
    );
    gradient.addColorStop(0, "rgba(10,10,30,0.2)");
    gradient.addColorStop(1, "black");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the stars.
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
    }
}

// =======================================================
// Global Timers for Spawning
// =======================================================
let lastPowerUpSpawn = 0;
let lastSpecialPowerUpSpawn = 0;
let lastHealthRefillSpawn = 0;
let lastAsteroidSpawn = 0;
let lastShipSpawn = 0;
let lastBossSpawn = 0;
const bossSpawnInterval = 10000; // 10 seconds

let gameOver = false;

// =======================================================
// Player Object and Movement (using ship.png)
// =======================================================
const player = {
    x: 50,
    y: canvas.height / 2,
    width: 50,
    height: 30,
    powerStage: 0,
    bullets: [],
    specialCount: 0
};

canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    player.x = Math.min(mouseX, 0.9 * canvas.width - player.width);
    player.y = mouseY - player.height / 2;
});

// =======================================================
// Shooting and Bullet Patterns
// =======================================================
function getFireInterval() {
    if (player.powerStage === 0) return baseFireInterval;
    else if (player.powerStage === 1) return baseFireInterval / 2;
    else if (player.powerStage === 2 || player.powerStage === 3) return baseFireInterval / 2;
    else if (player.powerStage === 4) return baseFireInterval / 3;
    else if (player.powerStage === 5) return baseFireInterval / 4;
    else return baseFireInterval / 5;
}

function shoot() {
    const bulletSpeed = 10;
    const bulletsToAdd = [];
    currentFireInterval = getFireInterval();
    if (player.powerStage < 2) {
        bulletsToAdd.push({
            x: player.x + player.width,
            y: player.y + player.height / 2,
            vx: bulletSpeed,
            vy: 0
        });
    } else if (player.powerStage === 2) {
        bulletsToAdd.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - 5,
            vx: bulletSpeed,
            vy: 0
        });
        bulletsToAdd.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 + 5,
            vx: bulletSpeed,
            vy: 0
        });
    } else {
        bulletsToAdd.push({
            x: player.x + player.width,
            y: player.y + player.height / 2,
            vx: bulletSpeed,
            vy: 0
        });
        bulletsToAdd.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - 10,
            vx: bulletSpeed,
            vy: 0
        });
        bulletsToAdd.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 + 10,
            vx: bulletSpeed,
            vy: 0
        });
        const diagSpeed = bulletSpeed * Math.cos(Math.PI / 4);
        bulletsToAdd.push({
            x: player.x + player.width,
            y: player.y + player.height / 2,
            vx: diagSpeed,
            vy: -diagSpeed
        });
        bulletsToAdd.push({
            x: player.x + player.width,
            y: player.y + player.height / 2,
            vx: diagSpeed,
            vy: diagSpeed
        });
    }
    player.bullets.push(...bulletsToAdd);
}

// =======================================================
// Special Shot: Expanding Ring
// =======================================================
function shootSpecial() {
    specialRings.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        radius: 0,
        thickness: 10,
        speed: 5,
        hitEnemies: []
    });
}

document.addEventListener("keydown", e => {
    if (e.code === "Space" && player.specialCount > 0) {
        shootSpecial();
        player.specialCount--;
    }
});

// =======================================================
// Update Functions for Player's Bullets and Special Rings
// =======================================================
function updateBullets() {
    for (let i = player.bullets.length - 1; i >= 0; i--) {
        const bullet = player.bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        if (
            bullet.x > canvas.width ||
            bullet.x < 0 ||
            bullet.y > canvas.height ||
            bullet.y < 0
        ) {
            player.bullets.splice(i, 1);
            continue;
        }
        // Changed bullet color to white for contrast against space.
        ctx.fillStyle = "white";
        ctx.fillRect(bullet.x, bullet.y, 10, 2);
    }
}

function updateSpecialRings() {
    for (let i = specialRings.length - 1; i >= 0; i--) {
        let ring = specialRings[i];
        ring.radius += ring.speed;
        ctx.strokeStyle = "orange";
        ctx.lineWidth = ring.thickness;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, 2 * Math.PI);
        ctx.stroke();
        for (let j = enemies.length - 1; j >= 0; j--) {
            let enemy = enemies[j];
            if (ring.hitEnemies.indexOf(enemy) !== -1) continue;
            let enemyCenterX = enemy.x + enemy.width / 2;
            let enemyCenterY = enemy.y + enemy.height / 2;
            let dx = enemyCenterX - ring.x;
            let dy = enemyCenterY - ring.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (
                distance >= ring.radius - ring.thickness &&
                distance <= ring.radius + ring.thickness
            ) {
                enemy.hp -= 2;
                if (enemy.hp <= 0) {
                    if (enemy.type === "ship" && enemy.isBoss) score += 50;
                    else if (enemy.type === "ship") score += 5;
                    else score += enemy.index;
                    enemies.splice(j, 1);
                } else {
                    ring.hitEnemies.push(enemy);
                }
                updateScore();
            }
        }
        if (ring.radius > Math.max(canvas.width, canvas.height)) {
            specialRings.splice(i, 1);
        }
    }
}

// =======================================================
// Enemy Spawning Functions
// =======================================================
function spawnAsteroid() {
    const sizes = { 1: 20, 2: 35, 3: 50 };
    const index = Math.floor(Math.random() * 3) + 1;
    const size = sizes[index];
    const speed = Math.floor(Math.random() * 5 + 1);
    let movementType = "linear";
    let dy = 0;
    if (Math.random() < 0.15) {
        movementType = "diagonal";
        dy = speed * (Math.random() < 0.5 ? 1 : -1);
    }
    const rotation = Math.random() * Math.PI * 2;
    const angularVelocity =
        (Math.random() * 0.05 + 0.01) * (Math.random() < 0.5 ? 1 : -1);
    enemies.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        width: size,
        height: size,
        speed: speed,
        movementType: movementType,
        dy: dy,
        type: "asteroid",
        index: index,
        hp: Math.ceil(size / 20),
        shootInterval: 0,
        lastShootTime: 0,
        rotation: rotation,
        angularVelocity: angularVelocity
    });
}

function spawnEnemyShip() {
    enemies.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - 40),
        width: 50,
        height: 40,
        speed: 3,
        type: "ship",
        isBoss: false,
        hp: 5,
        shootInterval: 2000,
        lastShootTime: 0,
        direction: Math.random() < 0.5 ? 1 : -1
    });
}

function spawnBossShip() {
    enemies.push({
        x: canvas.width,
        y: canvas.height / 2 - 100,
        width: 200,
        height: 200,
        speed: 2,
        type: "ship",
        isBoss: true,
        hp: 50,
        shootInterval: 2000,
        lastShootTime: 0,
        direction: 1
    });
}

// =======================================================
// Asteroid Fragmentation Cascade
// =======================================================
function spawnFragments(parent, newIndex) {
    const sizes = { 1: 20, 2: 35, 3: 50 };
    let offsets;
    if (newIndex === 1) {
        offsets = [-10, 10];
    } else if (newIndex === 2) {
        offsets = [-10, 0, 10];
    } else {
        offsets = [-10, 10];
    }
    offsets.forEach((offset, idx) => {
        let extraX = parent.speed + 2;
        let extraY =
            idx % 3 === 0 ? 0 : idx % 2 === 0 ? -2 : 2;
        let vx = -extraX;
        let vy =
            (parent.dy !== undefined ? parent.dy : 0) + extraY;
        const rotation = Math.random() * Math.PI * 2;
        const angularVelocity =
            (Math.random() * 0.05 + 0.01) *
            (Math.random() < 0.5 ? 1 : -1);
        enemies.push({
            x: parent.x,
            y: parent.y + offset,
            width: sizes[newIndex],
            height: sizes[newIndex],
            vx: vx,
            vy: vy,
            type: "asteroid",
            index: 1,
            hp: Math.ceil(sizes[newIndex] / 20),
            shootInterval: 0,
            lastShootTime: 0,
            rotation: rotation,
            angularVelocity: angularVelocity
        });
        if (newIndex > 1) {
            spawnFragments(
                enemies[enemies.length - 1],
                newIndex - 1
            );
        }
    });
}

// =======================================================
// Collision Detection: Player Bullets vs. Enemies
// =======================================================
function checkBulletCollisions() {
    for (let b = player.bullets.length - 1; b >= 0; b--) {
        const bullet = player.bullets[b];
        for (let e = enemies.length - 1; e >= 0; e--) {
            const enemy = enemies[e];
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + 10 > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + 2 > enemy.y
            ) {
                if (enemy.type === "asteroid" && enemy.index > 1) {
                    spawnFragments(enemy, enemy.index - 1);
                    score += enemy.index;
                    enemies.splice(e, 1);
                } else {
                    const damage = bullet.special ? 2 : 1;
                    enemy.hp -= damage;
                    if (enemy.hp <= 0) {
                        if (enemy.type === "ship" && enemy.isBoss) score += 50;
                        else if (enemy.type === "ship") score += 5;
                        else score += enemy.index;
                        enemies.splice(e, 1);
                    }
                }
                player.bullets.splice(b, 1);
                updateScore();
                break;
            }
        }
    }
}

// =======================================================
// Enemy Attacks: Enemy Bullets
// =======================================================
function enemyShoot(enemy) {
    const bulletSpeed = enemy.isBoss ? 7 : 5;
    const enemyCenterX = enemy.x + enemy.width / 2;
    const enemyCenterY = enemy.y + enemy.height / 2;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const dx = playerCenterX - enemyCenterX;
    const dy = playerCenterY - enemyCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vx = (dx / dist) * bulletSpeed;
    const vy = (dy / dist) * bulletSpeed;
    enemyBullets.push({
        x: enemyCenterX,
        y: enemyCenterY,
        vx: vx,
        vy: vy
    });
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        eb.x += eb.vx;
        eb.y += eb.vy;
        ctx.fillStyle = "red";
        ctx.fillRect(eb.x, eb.y, 8, 4);
        if (
            eb.x < player.x + player.width &&
            eb.x + 8 > player.x &&
            eb.y < player.y + player.height &&
            eb.y + 4 > player.y
        ) {
            processLifeLoss();
            enemyBullets.splice(i, 1);
            continue;
        }
        if (
            eb.x < 0 ||
            eb.x > canvas.width ||
            eb.y < 0 ||
            eb.y > canvas.height
        ) {
            enemyBullets.splice(i, 1);
        }
    }
}

// =======================================================
// Updating Enemies (Drawing with Rotation)
// =======================================================
function updateEnemies(timestamp) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.type === "asteroid") {
            if (enemy.vx !== undefined && enemy.vy !== undefined) {
                enemy.x += enemy.vx;
                enemy.y += enemy.vy;
            } else {
                enemy.x -= enemy.speed;
                if (enemy.movementType === "diagonal") {
                    enemy.y += enemy.dy;
                    if (enemy.y < 0 || enemy.y + enemy.height > canvas.height)
                        enemy.dy = -enemy.dy;
                }
            }
            enemy.rotation += enemy.angularVelocity;
            ctx.save();
            ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            ctx.rotate(enemy.rotation);
            ctx.drawImage(
                asteroidImages[enemy.index],
                -enemy.width / 2,
                -enemy.height / 2,
                enemy.width,
                enemy.height
            );
            ctx.restore();
        } else if (enemy.type === "ship") {
            if (enemy.isBoss) {
                if (enemy.x > canvas.width - enemy.width - 100)
                    enemy.x -= enemy.speed;
                enemy.y += enemy.direction * enemy.speed;
                if (enemy.y <= 0 || enemy.y + enemy.height >= canvas.height)
                    enemy.direction *= -1;
                ctx.save();
                ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                ctx.drawImage(
                    bossShipImage,
                    -enemy.width / 2,
                    -enemy.height / 2,
                    enemy.width,
                    enemy.height
                );
                ctx.restore();
                if (timestamp - enemy.lastShootTime > enemy.shootInterval) {
                    enemy.lastShootTime = timestamp;
                    bossShoot360(enemy);
                }
            } else {
                enemy.x -= enemy.speed;
                enemy.y += enemy.direction * enemy.speed;
                if (enemy.y <= 0 || enemy.y + enemy.height >= canvas.height)
                    enemy.direction *= -1;
                let angle = Math.atan2(enemy.direction * enemy.speed, -enemy.speed);
                ctx.save();
                ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                ctx.rotate(angle);
                ctx.drawImage(
                    enemyShipImage,
                    -enemy.width / 2,
                    -enemy.height / 2,
                    enemy.width,
                    enemy.height
                );
                ctx.restore();
                if (timestamp - enemy.lastShootTime > enemy.shootInterval) {
                    enemy.lastShootTime = timestamp;
                    enemyShoot(enemy);
                }
            }
        }
        if (
            enemy.x < player.x + player.width &&
            enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height &&
            enemy.y + enemy.height > player.y
        ) {
            if (enemy.type === "ship") {
                gameOver = true;
            } else {
                processLifeLoss();
            }
            enemies.splice(i, 1);
            continue;
        }
        if (enemy.x + enemy.width < 0) {
            enemies.splice(i, 1);
            continue;
        }
    }
}

// =======================================================
// Boss 360° Fire Function
// =======================================================
function bossShoot360(boss) {
    const bulletSpeed = 7;
    for (let angle = 0; angle < 360; angle += 15) {
        const rad = (angle * Math.PI) / 180;
        enemyBullets.push({
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height / 2,
            vx: bulletSpeed * Math.cos(rad),
            vy: bulletSpeed * Math.sin(rad)
        });
    }
}

// =======================================================
// Life Loss and Power-Up Adjustment
// =======================================================
function processLifeLoss() {
    lives--;
    if (player.powerStage > 3) {
        const stagesLost = Math.min(2, player.powerStage);
        player.powerStage = Math.max(player.powerStage - 2, 0);
        for (let i = 0; i < stagesLost; i++) {
            spawnPowerUp();
        }
    }
    updateHealthbar();
    if (lives <= 0) {
        gameOver = true;
    }
}

// =======================================================
// UI Update Functions
// =======================================================
function updateScore() {
    document.getElementById("scoreboard").innerText = "Score: " + score;
}
function updateHealthbar() {
    const healthbar = document.getElementById("healthbar");
    let hearts = "";
    for (let i = 0; i < lives; i++) {
        hearts += "❤️ ";
    }
    healthbar.innerHTML = hearts
        .trim()
        .split(" ")
        .join("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
}
function updatePowerupBar() {
    const powerupBar = document.getElementById("powerupBar");
    let display = "";
    const maxPower = 6;
    for (let i = 0; i < maxPower; i++) {
        display += i < player.powerStage ? "■ " : "□ ";
    }
    powerupBar.innerHTML = "Power: " + display;
}
function updateSpecialBar() {
    const specialBar = document.getElementById("specialBar");
    let display = "";
    const maxSpecial = 3;
    for (let i = 0; i < maxSpecial; i++) {
        display += i < player.specialCount ? "★ " : "☆ ";
    }
    specialBar.innerHTML = "Specials: " + display;
}

// =======================================================
// Power-Up, Special, and Health Refill Spawning/Updates
// =======================================================
function spawnPowerUp() {
    const size = 20;
    powerUps.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        size: size,
        speed: 2
    });
}
function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        p.x -= p.speed;
        ctx.drawImage(powerUpImage, p.x, p.y, p.size, p.size);
        if (
            p.x < player.x + player.width &&
            p.x + p.size > player.x &&
            p.y < player.y + player.height &&
            p.y + p.size > player.y
        ) {
            if (player.powerStage < 6) {
                player.powerStage++;
            }
            powerUps.splice(i, 1);
        }
    }
    powerUps.forEach((p, i) => {
        if (p.x + p.size < 0) powerUps.splice(i, 1);
    });
}
function spawnSpecialPowerUp() {
    const size = 20;
    specialPowerUps.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        size: size,
        speed: 2
    });
}
function updateSpecialPowerUps() {
    for (let i = specialPowerUps.length - 1; i >= 0; i--) {
        const sp = specialPowerUps[i];
        sp.x -= sp.speed;
        ctx.drawImage(specialItemImage, sp.x, sp.y, sp.size, sp.size);
        if (
            sp.x < player.x + player.width &&
            sp.x + sp.size > player.x &&
            sp.y < player.y + player.height &&
            sp.y + sp.size > player.y
        ) {
            if (player.specialCount < 3) {
                player.specialCount++;
            }
            specialPowerUps.splice(i, 1);
        }
    }
    specialPowerUps.forEach((sp, i) => {
        if (sp.x + sp.size < 0) specialPowerUps.splice(i, 1);
    });
}
function spawnHealthRefill() {
    const size = 20;
    healthRefills.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        size: size,
        speed: 2
    });
}
function updateHealthRefills() {
    for (let i = healthRefills.length - 1; i >= 0; i--) {
        const r = healthRefills[i];
        r.x -= r.speed;
        ctx.drawImage(healthRefillImage, r.x, r.y, r.size, r.size);
        if (
            r.x < player.x + player.width &&
            r.x + r.size > player.x &&
            r.y < player.y + player.height &&
            r.y + r.size > player.y
        ) {
            if (lives < maxLives) {
                lives++;
                updateHealthbar();
            }
            healthRefills.splice(i, 1);
        }
    }
    healthRefills.forEach((r, i) => {
        if (r.x + r.size < 0) healthRefills.splice(i, 1);
    });
}

// =======================================================
// Game Over Screen and New Game Button
// =======================================================
function drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.textAlign = "center";
    ctx.font = "bold 80px 'Press Start 2P', sans-serif";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "bold 40px 'Press Start 2P', sans-serif";
    ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 20);
    document.getElementById("newGameButton").style.display = "block";
}

function resetGame() {
    lives = 5;
    score = 0;
    player.powerStage = 0;
    player.specialCount = 0;
    player.bullets = [];
    enemies.length = 0;
    enemyBullets.length = 0;
    powerUps.length = 0;
    specialPowerUps.length = 0;
    healthRefills.length = 0;
    specialRings.length = 0;
    lastShotTime = 0;
    lastAsteroidSpawn = 0;
    lastShipSpawn = 0;
    lastBossSpawn = 0;
    gameOver = false;
    document.getElementById("newGameButton").style.display = "none";
    updateHealthbar();
    updateScore();
    updatePowerupBar();
    updateSpecialBar();
    requestAnimationFrame(update);
}


document.getElementById("newGameButton").addEventListener("click", resetGame);

document.addEventListener("click", function () {
    isPaused = !isPaused;

    if (isPaused || gameOver) {
        document.body.style.cursor = "auto"; // Show cursor when paused or game over
    } else {
        document.body.style.cursor = "none"; // Hide cursor when game is active
    }
});


// =======================================================
// Main Game Loop
// =======================================================
function update(timestamp) {
    // Clear the canvas, then draw the starry background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStarryBackground();

    if (gameOver) {
        drawGameOver();
        return;
    }

    if (isPaused) {
        return; // Stop updating when paused
    }

    // Draw the player ship.
    ctx.drawImage(playerShipImage, player.x, player.y, player.width, player.height);

    if (!lastShotTime) lastShotTime = timestamp;
    if (timestamp - lastShotTime > currentFireInterval) {
        shoot();
        lastShotTime = timestamp;
    }

    updateBullets();
    updateEnemyBullets();
    updateEnemies(timestamp);
    updatePowerUps();
    updateSpecialPowerUps();
    updateHealthRefills();
    updateSpecialRings();
    checkBulletCollisions();

    let asteroidSpawnInterval = Math.max(300, 1000 - player.powerStage * 100);
    if (timestamp - lastAsteroidSpawn > asteroidSpawnInterval) {
        spawnAsteroid();
        lastAsteroidSpawn = timestamp;
    }
    let shipSpawnInterval = Math.max(2000, 5000 - player.powerStage * 500);
    if (timestamp - lastShipSpawn > shipSpawnInterval) {
        spawnEnemyShip();
        lastShipSpawn = timestamp;
    }
    const specialSpawnInterval = 15000;
    if (timestamp - lastSpecialPowerUpSpawn > specialSpawnInterval) {
        spawnSpecialPowerUp();
        lastSpecialPowerUpSpawn = timestamp;
    }
    const powerUpSpawnInterval = 7000;
    if (timestamp - lastPowerUpSpawn > powerUpSpawnInterval && player.powerStage <= 3) {
        spawnPowerUp();
        lastPowerUpSpawn = timestamp;
    }
    const healthRefillSpawnInterval = 10000;
    if (timestamp - lastHealthRefillSpawn > healthRefillSpawnInterval && lives < maxLives) {
        spawnHealthRefill();
        lastHealthRefillSpawn = timestamp;
    }
    // Boss respawn: if score >= 30 and enough time passed and no boss exists.
    if (score >= 30 && (timestamp - lastBossSpawn > bossSpawnInterval) && !enemies.some(e => e.isBoss)) {
        spawnBossShip();
        lastBossSpawn = timestamp;
    }

    updateScore();
    updatePowerupBar();
    updateSpecialBar();

    requestAnimationFrame(update);
}

updateHealthbar();
updateScore();
updatePowerupBar();
updateSpecialBar();
requestAnimationFrame(update);
