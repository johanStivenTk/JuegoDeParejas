// -----------------------------
// Configuración del juego
// -----------------------------

const SYMBOLS = ["🍊", "🍉", "🍋", "🍒", "⭐", "💎", "🔥", "🌙"]; // 8 símbolos → 8 parejas
const PAIR_COUNT = SYMBOLS.length;
const FLIP_BACK_DELAY_MS = 700;

// Estado del juego
let deck = [];
let revealedCards = []; // [{ index, element, symbol }]
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

// -----------------------------
// Inicialización
// -----------------------------

document.addEventListener("DOMContentLoaded", () => {
    cacheDomElements();
    attachGlobalEventHandlers();
    startNewGame();
});

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
    updateStatusMessage("Nueva partida. Voltea dos cartas para empezar.");
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
        symbol,
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
        button.dataset.symbol = cardData.symbol;

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
    const cardSymbol = cardElement.dataset.symbol;

    if (!isGameStarted) {
        startTimer();
        isGameStarted = true;
    }

    flipCardUp(cardElement, cardSymbol);
    addRevealedCard(cardIndex, cardElement, cardSymbol);

    if (revealedCards.length === 2) {
        handlePairRevealed();
    }
}

function flipCardUp(cardElement, symbol) {
    cardElement.classList.remove("card--default");
    cardElement.classList.remove("card--error");
    cardElement.classList.add("card--flipped");

    const contentSpan = cardElement.querySelector(".card__content");
    if (contentSpan) {
        contentSpan.textContent = symbol;
    }
}

function flipCardDown(cardElement) {
    cardElement.classList.remove("card--flipped", "card--error");
    cardElement.classList.add("card--default");

    const contentSpan = cardElement.querySelector(".card__content");
    if (contentSpan) {
        contentSpan.textContent = "?";
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

function addRevealedCard(index, element, symbol) {
    revealedCards.push({ index, element, symbol });
}

// -----------------------------
// Comparación de parejas
// -----------------------------

function handlePairRevealed() {
    if (revealedCards.length !== 2) return;

    incrementMoves();

    const [first, second] = revealedCards;
    const isMatch = first.symbol === second.symbol;

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
    updateStatusMessage("¡Bien! Has encontrado una pareja.");

    revealedCards = [];

    if (matchedPairs === PAIR_COUNT) {
        handleGameWon();
    }
}

function processMismatch(first, second) {
    isBoardLocked = true;
    markCardAsError(first.element);
    markCardAsError(second.element);
    updateStatusMessage("Las cartas no coinciden.");

    setTimeout(() => {
        flipCardDown(first.element);
        flipCardDown(second.element);

        revealedCards = [];
        isBoardLocked = false;
    }, FLIP_BACK_DELAY_MS);
}

// -----------------------------
// Movimientos y tiempo
// -----------------------------

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

// -----------------------------
// Modal de victoria
// -----------------------------

function handleGameWon() {
    stopTimer();
    updateStatusMessage("¡Has encontrado todas las parejas!");
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

// -----------------------------
// Accesibilidad: mensajes live
// -----------------------------

function updateStatusMessage(message) {
    statusMessageElement.textContent = message;
}
