// --- Constants & Weights ---
const position_weights = [2.2, 2, 2.2, 2, 2.2, 2, 2.2, 2, 2.2];
const size_weights = [1, 2, 3];

const sizeValue = { 'big': 2, 'medium': 1, 'small': 0, '': -1 };
const roleValue = { 'player': 1, 'ai': 2, '': -1 };
const reversedSizeValue = Object.fromEntries(Object.entries(sizeValue).map(([key, value]) => [value, key]));
const reversedRoleValue = Object.fromEntries(Object.entries(roleValue).map(([key, value]) => [value, key]));

// --- OPENING BOOK SETUP ---
let openingBook = {};

// Fetch the Deep Opening Book when the worker spins up
fetch('opening_moves_deep.json')
    .then(response => response.json())
    .then(data => {
        openingBook = data;
        console.log("Deep Opening Book loaded successfully!");
        console.log(`Total memorized moves: ${Object.keys(openingBook).length}`);
    })
    .catch(error => console.error("Error loading deep opening book:", error));

// Helper function to turn the board into the JSON key string
function getBoardKey(current_board) {
    return current_board.map(cell => `${cell[0]},${cell[1]}`).join(';');
}

// --- AI LOGIC ---
function aiMove(board, player_pieces, ai_pieces) {
    // 1. Check if the board is completely empty
    const isEmpty = board.every(cell => cell[0] === -1);
    if (isEmpty && openingBook["empty"]) {
        console.log("Deep Book Move: Empty Board");
        return [true, openingBook["empty"]];
    }

    // 2. Check the Deep Opening Book for the current board state
    const boardKey = getBoardKey(board);
    if (openingBook[boardKey]) {
        console.log("Deep Book Move Found!");
        return [true, openingBook[boardKey]];
    }

    // 3. Fallback to Minimax (Late Game)
    console.log("No book move found. Calculating via Minimax...");
    let best_score = -Infinity;
    let move = [-1, -1];
    let newBoard = [...board];
    let moves = generate_possible_moves(newBoard, 2, ai_pieces);

    for (const [index, size] of moves) {
        const tmp = board[index]; // previous state
        place_piece(newBoard, index, 2, size, ai_pieces);
        let score = minimax(newBoard, 0, -Infinity, Infinity, false, player_pieces, ai_pieces);
        remove_piece(newBoard, index, 2, size, ai_pieces, tmp);
        
        score = score + (position_weights[index] * size_weights[size]);
        console.log("Evaluating move: row:", Math.floor(index/3), " col:", index%3, " size:", reversedSizeValue[size], " score:", score);
        
        if (score > best_score) {
            best_score = score;
            move = [index, size];
        }
    }

    if (move[0] !== -1 && move[1] !== -1) {
        console.log("Best move found -> index", move[0], "size", move[1], "Best Score", best_score);
        return [true, move]; 
    }

    return [false, move];
}

function minimax(minimax_board, depth, alpha, beta, is_maximizing, player_available_pieces, ai_available_pieces, max_depth = 8) {
    let best_score;
    if (checkWin(2, minimax_board)) {
        return 1000 / (depth + 1); 
    } else if (checkWin(1, minimax_board)) {
        return -1000 / (depth + 1); 
    } else if (is_board_full(minimax_board, player_available_pieces, ai_available_pieces)) {
        return check_win_fullBoard(minimax_board);
    } 
    
    if (depth === max_depth) {
        return heuristic_evaluation(minimax_board, depth); 
    }

    if (is_maximizing) {
        best_score = -Infinity;
        let moves = generate_possible_moves(minimax_board, 2, ai_available_pieces);
        for (const [index, size] of moves) {
            const tmp = minimax_board[index]; 
            place_piece(minimax_board, index, 2, size, ai_available_pieces);
            
            const score = minimax(minimax_board, depth + 1, alpha, beta, false, player_available_pieces, ai_available_pieces, max_depth);
            remove_piece(minimax_board, index, 2, size, ai_available_pieces, tmp);

            best_score = Math.max(best_score, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return best_score;
    } else {
        best_score = Infinity;
        let moves = generate_possible_moves(minimax_board, 1, player_available_pieces);
        for (const [index, size] of moves) {
            const tmp = minimax_board[index]; 
            place_piece(minimax_board, index, 1, size, player_available_pieces);
            
            const score = minimax(minimax_board, depth + 1, alpha, beta, true, player_available_pieces, ai_available_pieces, max_depth);
            remove_piece(minimax_board, index, 1, size, player_available_pieces, tmp);

            best_score = Math.min(best_score, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }   
        return best_score;
    }
}

function heuristic_evaluation(board, depth) {
    let player_score = 0;
    let ai_score = 0;

    for (let index = 0; index < board.length; index++) {
        if (board[index][0] === 1) {
            player_score += (board[index][1] + 1);
        } else if (board[index][0] === 2) {
            ai_score += (board[index][1] + 1);
        }
    }
    return (ai_score - player_score) / (depth + 1);
}

function generate_possible_moves(board, role, available_pieces) {
    let possible_moves = [];
    for (let index = 0; index < board.length; index++) 
        for (let size = 0; size < available_pieces.length; size++)
            if (can_place_piece(board, index, role, size, available_pieces)) {
                possible_moves.push([index, size]);
        }
    return possible_moves;
}

function can_place_piece(board, index, role, size, available_pieces) {
    if (role != board[index][0] && size > board[index][1] && available_pieces[size] != 0) {
        return true;
    } else {
        return false;
    }
}

function checkWin(role, check_board) {
    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    return winConditions.some(combination => {
        return combination.every(index => {
            return check_board[index][0] === role;
        });
    });
}

function is_board_full(board, player_pieces, ai_pieces) {
    for (let index = 0; index < board.length; index++) {
        if (board[index][0] === -1) {
            return false;
        } else if ((generate_possible_moves(board, 2, ai_pieces).length +
                    generate_possible_moves(board, 1, player_pieces).length) !== 0) {
            return false;
        } else {
            return true;
        }   
    }
}

function check_win_fullBoard(board) {
    let player_count = 0;
    let ai_count = 0;

    for (let index = 0; index < board.length; index++) {
        if (board[index][0] === 1) {
            player_count++;
        } else if (board[index][0] === 2) {
            ai_count++;
        }
    }

    if (player_count > ai_count) return -Infinity; // Player wins
    else if (player_count < ai_count) return Infinity; // AI wins
    return 0; // Draw
}

function place_piece(board, index, role, size, available_pieces) {
    board[index] = [role, size];
    available_pieces[size]--;
}

function remove_piece(board, index, role, size, available_pieces, previous_state) {
    board[index] = previous_state;
    available_pieces[size]++;
}

// --- COMMUNICATION WITH MAIN SCRIPT ---
self.onmessage = function(event) {
    const { board, player_pieces, ai_pieces } = event.data;
    const [bestMoveFound, move] = aiMove(board, player_pieces, ai_pieces);
    self.postMessage({ bestMoveFound, move });
};