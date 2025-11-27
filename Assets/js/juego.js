// Configuración del juego y variables

// imagenes para las cartas
const SYMBOLS = [
    { id: 1, path: "Assets/img/1.png" },
    { id: 2, path: "Assets/img/2.png" },
    { id: 3, path: "Assets/img/3.png" },
    { id: 4, path: "Assets/img/4.png" },
    { id: 5, path: "Assets/img/5.png" },
    { id: 6, path: "Assets/img/6.png" },
    { id: 7, path: "Assets/img/7.png" },
    { id: 8, path: "Assets/img/8.png" },
];

// sonidos del juego
const SOUNDS = {
    error: { path: "Assets/sounds/error.wav", audio: null },
    match: { path: "Assets/sounds/match.wav", audio: null },
    win: { path: "Assets/sounds/win.wav", audio: null }
};
// cantidad de pares
const PAIR_COUNT = SYMBOLS.length;
// tiempo para voltear la carta
const FLIP_BACK_DELAY_MS = 700;

// Estado del juego
let deck = [];
let revealedCards = [];
let movesCount = 0;
let matchedPairs = 0;
let elapsedSeconds = 0;
let timerId = null;
let isBoardLocked = false;
let isGameStarted = false;

// Referencias al DOM
let cardGridElement;
let movesCountElement;
let timeElapsedElement;
let statusMessageElement;
let resetButtonElement;
let winModalOverlayElement;
let winMovesElement;
let winTimeElement;
let playAgainButtonElement;

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    loadSounds();
    cacheDomElements();
    attachGlobalEventHandlers();
    startNewGame();
});



// sonidos - cargar archivos de audio
function loadSounds() {
    Object.keys(SOUNDS).forEach((key) => {
        const sound = SOUNDS[key];
        sound.audio = new Audio(sound.path);
        sound.audio.preload = "auto";
    });
}

// reproducir sonido
function playSound(soundKey) {
    const sound = SOUNDS[soundKey];
    if (sound && sound.audio) {
        sound.audio.currentTime = 0; // reiniciar si ya está sonando
        sound.audio.play().catch((error) => {
            console.warn(`No se pudo reproducir el sonido ${soundKey}:`, error);
        });
    }
}

// cache
function cacheDomElements() {
    cardGridElement = document.getElementById("card-grid");
    movesCountElement = document.getElementById("moves-count");
    timeElapsedElement = document.getElementById("time-elapsed");
    statusMessageElement = document.getElementById("status-message");
    resetButtonElement = document.getElementById("reset-button");
    winModalOverlayElement = document.getElementById("win-modal");
    winMovesElement = document.getElementById("win-moves");
    winTimeElement = document.getElementById("win-time");
    playAgainButtonElement = document.getElementById("play-again-button");
}

// eventos
function attachGlobalEventHandlers() {
    resetButtonElement.addEventListener("click", () => {
        startNewGame();
    });

    playAgainButtonElement.addEventListener("click", () => {
        hideWinModal();
        startNewGame();
    });

    // Cerrar modal con Escape
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isWinModalVisible()) {
            hideWinModal();
        }
    });
}

// -----------------------------
// Ciclo de juego
// -----------------------------

function startNewGame() {
    stopTimer();
    resetGameState();
    createDeck();
    shuffleDeck(deck);
    renderBoard();
    updateMovesUI();
    updateTimeUI();
    hideWinModal();
}

function resetGameState() {
    deck = [];
    revealedCards = [];
    movesCount = 0;
    matchedPairs = 0;
    elapsedSeconds = 0;
    isBoardLocked = false;
    isGameStarted = false;
}

// -----------------------------
// Deck y tablero
// -----------------------------

function createDeck() {
    const symbolsDoubled = [...SYMBOLS, ...SYMBOLS];

    deck = symbolsDoubled.map((symbol, index) => ({
        id: index,
        path: symbol.path,
        isMatched: false
    }));
}

function shuffleDeck(array) {
    // Fisher–Yates
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
}

function renderBoard() {
    cardGridElement.innerHTML = "";

    deck.forEach((cardData, index) => {
        const listItem = document.createElement("li");
        listItem.className = "card-grid__item";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "card card--default";
        button.dataset.index = String(index);
        button.dataset.path = cardData.path;

        const contentSpan = document.createElement("span");
        contentSpan.className = "card__content";
        contentSpan.textContent = "?";

        button.appendChild(contentSpan);
        button.addEventListener("click", handleCardClick);

        listItem.appendChild(button);
        cardGridElement.appendChild(listItem);
    });
}

// -----------------------------
// Interacción de cartas
// -----------------------------

function handleCardClick(event) {
    const cardElement = event.currentTarget;

    if (isBoardLocked) return;
    if (cardElement.classList.contains("card--flipped")) return;
    if (cardElement.classList.contains("card--matched")) return;
    if (cardElement.classList.contains("card--locked")) return;

    const cardIndex = Number(cardElement.dataset.index);
    const cardPath = cardElement.dataset.path;

    if (!isGameStarted) {
        startTimer();
        isGameStarted = true;
    }

    flipCardUp(cardElement, cardPath);
    addRevealedCard(cardIndex, cardElement, cardPath);

    if (revealedCards.length === 2) {
        handlePairRevealed();
    }
}

function flipCardUp(cardElement, imagePath) {
    cardElement.classList.remove("card--default", "card--error");
    cardElement.classList.add("card--flipped", "card--flip-anim");
    updateCardContentWithFlip(cardElement, imagePath);
}


function updateCardContentWithFlip(cardElement, imagePath) {
    const contentSpan = cardElement.querySelector(".card__content");
    if (!contentSpan) return;

    // Cambiar el contenido a mitad de la animación de flip
    setTimeout(() => {
        contentSpan.innerHTML = "";
        const img = document.createElement("img");
        img.src = imagePath;
        img.alt = "Carta";
        img.style.width = "80%";
        img.style.height = "80%";
        img.style.objectFit = "contain";
        contentSpan.appendChild(img);
    }, 150);

    cardElement.addEventListener(
        "animationend",
        () => {
            cardElement.classList.remove("card--flip-anim");
        },
        { once: true }
    );
}


function flipCardDown(cardElement) {
    cardElement.classList.remove("card--flipped", "card--error");
    cardElement.classList.add("card--default");

    const contentSpan = cardElement.querySelector(".card__content");
    if (contentSpan) {
        contentSpan.innerHTML = "?";
    }
}

function markCardAsMatched(cardElement) {
    cardElement.classList.remove("card--flipped", "card--error", "card--default");
    cardElement.classList.add("card--matched", "card--locked");
}

function markCardAsError(cardElement) {
    cardElement.classList.remove("card--flipped", "card--default");
    cardElement.classList.add("card--error");
}

function addRevealedCard(index, element, path) {
    revealedCards.push({ index, element, path });
}

// -----------------------------
// Comparación de parejas
// -----------------------------

function handlePairRevealed() {
    if (revealedCards.length !== 2) return;

    incrementMoves();

    const [first, second] = revealedCards;
    const isMatch = first.path === second.path;

    if (isMatch) {
        processMatch(first, second);
    } else {
        processMismatch(first, second);
    }
}

function processMatch(first, second) {
    markCardAsMatched(first.element);
    markCardAsMatched(second.element);

    deck[first.index].isMatched = true;
    deck[second.index].isMatched = true;

    matchedPairs += 1;
    playSound("match"); // sonido de acierto

    revealedCards = [];

    if (matchedPairs === PAIR_COUNT) {
        handleGameWon();
    }
}

function processMismatch(first, second) {
    isBoardLocked = true;
    markCardAsError(first.element);
    markCardAsError(second.element);
    playSound("error"); // sonido de error

    setTimeout(() => {
        flipCardDown(first.element);
        flipCardDown(second.element);

        revealedCards = [];
        isBoardLocked = false;
    }, FLIP_BACK_DELAY_MS);
}


// contador de movimientos y tiempo
function incrementMoves() {
    movesCount += 1;
    updateMovesUI();
}

function updateMovesUI() {
    movesCountElement.textContent = String(movesCount);
}

function startTimer() {
    stopTimer();

    timerId = window.setInterval(() => {
        elapsedSeconds += 1;
        updateTimeUI();
    }, 1000);
}

function stopTimer() {
    if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
    }
}

function updateTimeUI() {
    timeElapsedElement.textContent = formatTime(elapsedSeconds);
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const minutesString = minutes.toString().padStart(2, "0");
    const secondsString = seconds.toString().padStart(2, "0");

    return `${minutesString}:${secondsString}`;
}

// Modal de victoria
function handleGameWon() {
    stopTimer();
    playSound("win"); // sonido de victoria
    updateWinModalStats();
    showWinModal();
}

function updateWinModalStats() {
    winMovesElement.textContent = String(movesCount);
    winTimeElement.textContent = formatTime(elapsedSeconds);
}

function showWinModal() {
    winModalOverlayElement.classList.add("modal-overlay--visible");
    winModalOverlayElement.setAttribute("aria-hidden", "false");
}

function hideWinModal() {
    winModalOverlayElement.classList.remove("modal-overlay--visible");
    winModalOverlayElement.setAttribute("aria-hidden", "true");
}

function isWinModalVisible() {
    return winModalOverlayElement.classList.contains("modal-overlay--visible");
}

