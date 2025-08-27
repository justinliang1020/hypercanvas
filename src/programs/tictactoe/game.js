import { h, text } from "../../packages/hyperapp/index.js";

import { ProgramBase } from "../../programBase.js";

/**
 * @typedef State
 * @property {('X'|'O'|null)[]} board - Array of 9 cells representing the game board
 * @property {'X'|'O'} currentPlayer - Current player's turn
 * @property {'X'|'O'|'tie'|null} winner - Game winner or null if game is ongoing
 * @property {boolean} gameOver - Whether the game has ended
 */

/**
 * @extends ProgramBase<State>
 */
export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      board: Array(9).fill(null),
      currentPlayer: "X",
      winner: null,
      gameOver: false,
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) => {
    return h(
      "div",
      {
        id: "tictactoe-container",
        style: {
          position: "relative",
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          boxSizing: "border-box",
        },
      },
      [
        this.#gameStatus(state),
        this.#gameBoard(state),
        this.#resetButton(state),
      ],
    );
  };

  /**
   * Check if there's a winner or tie
   * @param {('X'|'O'|null)[]} board - Current board state
   * @returns {'X'|'O'|'tie'|null} Winner or null if game continues
   */
  #checkWinner = (board) => {
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }

    if (board.every((cell) => cell !== null)) {
      return "tie";
    }

    return null;
  };

  /**
   * Handle cell click
   * @param {State} state - Current state
   * @param {number} index - Cell index (0-8)
   * @returns {State} Updated state
   */
  #handleCellClick = (state, index) => {
    if (state.gameOver || state.board[index]) {
      return state;
    }

    const newBoard = [...state.board];
    newBoard[index] = state.currentPlayer;

    const winner = this.#checkWinner(newBoard);
    const gameOver = winner !== null;
    const nextPlayer = state.currentPlayer === "X" ? "O" : "X";

    return {
      ...state,
      board: newBoard,
      currentPlayer: gameOver ? state.currentPlayer : nextPlayer,
      winner,
      gameOver,
    };
  };

  /**
   * Reset the game
   * @param {State} state - Current state
   * @returns {State} Reset state
   */
  #resetGame = (state) => {
    return {
      ...state,
      board: Array(9).fill(null),
      currentPlayer: "X",
      winner: null,
      gameOver: false,
    };
  };

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #gameStatus = (state) => {
    let statusText = "";
    if (state.winner === "tie") {
      statusText = "It's a tie!";
    } else if (state.winner) {
      statusText = `Player ${state.winner} wins!`;
    } else {
      statusText = `Player ${state.currentPlayer}'s turn`;
    }

    return h(
      "div",
      {
        style: {
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "20px",
          color: "#333",
        },
      },
      text(statusText),
    );
  };

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #gameBoard = (state) => {
    return h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3, 100px)",
          gridTemplateRows: "repeat(3, 100px)",
          gap: "4px",
          backgroundColor: "#333",
          padding: "4px",
          borderRadius: "8px",
        },
      },
      state.board.map((cell, index) =>
        h(
          "div",
          {
            key: `${index}`,
            style: {
              backgroundColor: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: "bold",
              cursor: state.gameOver || cell ? "default" : "pointer",
              userSelect: "none",
              borderRadius: "4px",
              color: cell === "X" ? "#e74c3c" : "#3498db",
            },
            onclick: (currentState) =>
              this.#handleCellClick(currentState, index),
          },
          text(cell || ""),
        ),
      ),
    );
  };

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #resetButton = (state) => {
    return h(
      "button",
      {
        style: {
          marginTop: "20px",
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: "#007acc",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        },
        onclick: (currentState) => this.#resetGame(currentState),
      },
      text("New Game"),
    );
  };
}

