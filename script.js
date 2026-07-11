/**
 * SHADOW ESCAPE: PRO EDITION
 * Optimized Canvas Engine with Particle Systems & Combo Mechanics
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimize by disabling canvas transparency

let gameState = 'start'; 
let animationId;
let lastTime = 0;
let gameTime = 0;

// Game Systems
let score = 0;
let highScore = localStorage.getItem('shadowEscapeHighScore') || 0;
let difficultyMultiplier = 1;
let cameraShakeTime = 0;
let gridOffset = 0;

// Combo System
let combo = 1;
let comboTimer = 0;
const COMBO_MAX_TIME = 2500; // 2.5 seconds to chain crystals

// UI Elements
const ui = {
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    pauseScreen: document.getElementById('pause-screen'),
    hud: document.getElementById('hud'),
    scoreEl: document.getElementById('score'),
    highScoreEl: document.getElementById('high-score'),
    finalScoreEl: document.getElementById('final-score'),
    healthBar: document.getElementById('health-bar'),
    comboContainer: document.getElementById('combo-container'),
    comboEl: document.getElementById('combo'),
    mobileControls: document.getElementById('mobile-controls')
};

ui.highScoreEl.innerText = highScore;

// Touch detection
if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
    ui.mobileControls.classList.remove('hidden');
}

// Canvas Sizing
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input Handling
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key === 'p' || e.key === 'Escape') togglePause();
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Mobile Controls
document.querySelectorAll('.d-btn').forEach(btn => {
    const key = btn.getAttribute('data-key');
    const press = (e) => { e.preventDefault(); keys[key] = true; };
    const release = (e) => { e.preventDefault(); keys[key] = false; };
    btn.addEventListener('touchstart', press);
    btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
});

// --- Entities ---
class Player {
    constructor() {
        this.radius = 15;
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.speed = 6;
        this.color = '#00f3ff';
        this.health = 100;
        this.trail = [];
    }

    update() {
        let dx = 0; let dy = 0;
        if (keys.ArrowUp || keys.w) dy -= 1;
        if (keys.ArrowDown || keys.s) dy += 1;
        if (keys.ArrowLeft || keys.a) dx -= 1;
        if (keys.ArrowRight || keys.d) dx += 1;

        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length; dy /= length;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        // Trail effect
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 8) this.trail.shift();
    }

    draw() {
        // Draw Trail
        ctx.beginPath();
        for(let i=0; i<this.trail.length; i++) {
            const point = this.trail[i];
            const size = (i / this.trail.length) * this.radius;
            ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = `rgba(0, 243, 255, 0.3)`;
        ctx.lineWidth = this.radius;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw Player Core
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.6)';
        ctx.fill();
    }
}

class Enemy {
    constructor() {
        this.radius = 12;
        if (Math.random() < 0.5) {
            this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
            this.y = Math.random() * canvas.height;
        } else {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
        }
        this.baseSpeed = Math.random() * 1.5 + 1.5;
        this.color = '#ff0055';
    }

    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);
        
        const currentSpeed = this.baseSpeed * difficultyMultiplier;
        this.x += Math.cos(angle) * currentSpeed;
        this.y += Math.sin(angle) * currentSpeed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Inner core
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
}

class Crystal {
    constructor() {
        this.radius = 8;
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 100) + 50;
        this.color = '#ff00ff';
        this.pulse = 0;
    }

    draw() {
        this.pulse += 0.15;
        const scale = 1 + Math.sin(this.pulse) * 0.3;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.pulse * 0.5);
        
        // Draw Diamond Shape
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.5 * scale);
        ctx.lineTo(this.radius * scale, 0);
        ctx.lineTo(0, this.radius * 1.5 * scale);
        ctx.lineTo(-this.radius * scale, 0);
        ctx.closePath();
        
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, speedModifier = 1) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 * speedModifier;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = Math.random() * 4 + 1;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }

    update() {
        this.vx *= 0.95; // Friction
        this.vy *= 0.95;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.radius = Math.max(0, this.radius - 0.05);
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

// --- Game Objects ---
let player;
let enemies = [];
let crystals = [];
let particles = [];

// --- Core Functions ---
function initGame() {
    player = new Player();
    enemies = [];
    crystals = [];
    particles = [];
    score = 0;
    combo = 1;
    comboTimer = 0;
    gameTime = 0;
    difficultyMultiplier = 1;
    
    updateScoreUI();
    updateComboUI();
    ui.healthBar.style.width = '100%';
    
    spawnCrystal();
    spawnEnemy();
    spawnEnemy(); // Start slightly harder
    
    gameState = 'playing';
    ui.startScreen.classList.add('hidden');
    ui.gameOverScreen.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    
    lastTime = performance.now();
    animate(lastTime);
}

function spawnCrystal() { crystals.push(new Crystal()); }
function spawnEnemy() { enemies.push(new Enemy()); }

function createExplosion(x, y, color, count, speedModifier = 1) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, speedModifier));
    }
}

function triggerCameraShake(intensity) {
    cameraShakeTime = intensity;
}

function updateScoreUI() { ui.scoreEl.innerText = score; }

function updateComboUI() {
    ui.comboEl.innerText = `x${combo}`;
    if(combo > 1) {
        ui.comboContainer.classList.add('combo-active');
    } else {
        ui.comboContainer.classList.remove('combo-active');
        ui.comboEl.innerText = ''; // Hide x1 to keep UI clean
    }
}

// --- Background Grid ---
function drawGrid(speed) {
    gridOffset = (gridOffset + speed) % 60;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for(let x = 0; x < canvas.width; x += 60) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for(let y = gridOffset; y < canvas.height; y += 60) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
}

// --- Physics & Logic ---
function updateLogic(deltaTime) {
    gameTime += deltaTime;
    difficultyMultiplier = 1 + Math.floor(gameTime / 8000) * 0.15; // Ramp up

    // Combo Timer Drain
    if (combo > 1) {
        comboTimer -= deltaTime;
        if (comboTimer <= 0) {
            combo = 1;
            updateComboUI();
        }
    }

    player.update();

    // Check Crystals
    for (let i = crystals.length - 1; i >= 0; i--) {
        const c = crystals[i];
        if (Math.hypot(player.x - c.x, player.y - c.y) < player.radius + c.radius) {
            createExplosion(c.x, c.y, c.color, 20, 1.5);
            crystals.splice(i, 1);
            
            // Apply Score & Combo
            score += 10 * combo;
            combo++;
            comboTimer = COMBO_MAX_TIME;
            updateScoreUI();
            updateComboUI();
            
            spawnCrystal();
            if (score % 100 === 0) spawnEnemy(); // Spawn enemies at score thresholds
        }
    }

    // Check Enemies
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        e.update();
        if (Math.hypot(player.x - e.x, player.y - e.y) < player.radius + e.radius) {
            player.health -= 1.5; // Drain health
            ui.healthBar.style.width = `${Math.max(0, player.health)}%`;
            triggerCameraShake(8);
            createExplosion(player.x, player.y, '#ff0055', 3, 0.5);
            combo = 1; // Lose combo on hit
            updateComboUI();
            
            if (player.health <= 0) endGame();
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }
}

// --- Render Loop ---
function animate(currentTime) {
    if (gameState !== 'playing') return;
    animationId = requestAnimationFrame(animate);
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    updateLogic(deltaTime);

    // 1. Clear Screen
    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // 2. Apply Camera Shake
    if (cameraShakeTime > 0) {
        const dx = (Math.random() - 0.5) * 15;
        const dy = (Math.random() - 0.5) * 15;
        ctx.translate(dx, dy);
        cameraShakeTime--;
    }

    // 3. Draw Background
    drawGrid(1); // Grid moves at speed 1

    // 4. Draw Entities
    crystals.forEach(c => c.draw());
    enemies.forEach(e => e.draw());
    player.draw();

    // 5. Draw Particles (Additive Blending for Glow)
    ctx.globalCompositeOperation = 'lighter';
    particles.forEach(p => p.draw());
    ctx.globalCompositeOperation = 'source-over'; // Reset

    ctx.restore();
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        cancelAnimationFrame(animationId);
        ui.pauseScreen.classList.remove('hidden');
    } else if (gameState === 'paused') {
        gameState = 'playing';
        ui.pauseScreen.classList.add('hidden');
        lastTime = performance.now();
        animate(lastTime);
    }
}

function endGame() {
    gameState = 'gameover';
    cancelAnimationFrame(animationId);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('shadowEscapeHighScore', highScore);
        ui.highScoreEl.innerText = highScore;
    }
    
    ui.finalScoreEl.innerText = score;
    ui.hud.classList.add('hidden');
    
    // Slight delay before showing game over for dramatic effect
    setTimeout(() => {
        ui.gameOverScreen.classList.remove('hidden');
    }, 500);
}

// Event Bindings
document.getElementById('start-btn').addEventListener('click', initGame);
document.getElementById('restart-btn').addEventListener('click', initGame);
document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('resume-btn').addEventListener('click', togglePause);