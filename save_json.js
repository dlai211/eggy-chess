const fs = require('fs'); // Import the file system module (fs)

let jsonData = {};

let board = Array(9).fill([-1, -1]);
let game_over = false;
let player_pieces = [3, 3, 2]; 
let ai_pieces = [3, 3, 2]; 
const position_weights = [2.2, 2, 2.2, 2, 2.2, 2, 2.2, 2, 2.2];
const size_weights = [2, 2.5, 1.5];

// Piece size value mapping
const sizeValue = {
    'big': 2,
    'medium': 1,
    'small': 0,
    '': -1
};

const roleValue = {
    'player': 1,
    'ai': 2,
    '': -1
};

const reversedSizeValue = Object.fromEntries(
    Object.entries(sizeValue).map(([key, value]) => [value, key])
)

const reversedRoleValue = Object.fromEntries(
    Object.entries(roleValue).map(([key, value]) => [value, key])
)

function save_move(moveNumber, board, player_pieces, ai_pieces, bestMove, winner) {
    let moveKey = `${moveNumber}_move`;

    // If this is the first move of that type, initialize an array
    if (!jsonData[moveKey]) {
        jsonData[moveKey] = [];
    }

    // Add the current move
    jsonData[moveKey].push({
        "board": [...board],
        "player_pieces": [...player_pieces],
        "ai_pieces": [...ai_pieces],
        "bestMove": bestMove,
        "winner": winner
    });
}

function Move(check_board, index, size, player_pieces, ai_pieces, num_move) {
    let bestMove, move;
    if (can_place_piece(board, index, 1, size, player_pieces)){
        place_piece(check_board, index, 1, size, player_pieces);

        if (checkWin(1, check_board)) {
            save_move(num_move, check_board, player_pieces, ai_pieces, null, 1);
            return;
        }

        // When the board is full
        if (is_board_full(check_board, player_pieces, ai_pieces)) {
            if (check_win_fullBoard(check_board) == Infinity) { // AI wins
                save_move(num_move, check_board, player_pieces, ai_pieces, null, 2);
                return;
            } else if (check_win_fullBoard(check_board) == -Infinity) { // Player wins
                save_move(num_move, check_board, player_pieces, ai_pieces, null, 1);
                return;
            }
        }

        [bestMove, move] = aiMove(check_board);
        let check_board2 = JSON.parse(JSON.stringify(check_board));
        let ai_pieces2 = JSON.parse(JSON.stringify(ai_pieces));

        if (bestMove) {
            place_piece(check_board2, move[0], 2, move[1], ai_pieces2);

            if (checkWin(2, check_board2)) {
                save_move(num_move, check_board, player_pieces, ai_pieces, null, 2);
                return;
            }

            // When the board is full
            if (is_board_full(check_board2, player_pieces, ai_pieces2)) {
                if (check_win_fullBoard(check_board2) == Infinity) { // AI wins
                    save_move(num_move, check_board, player_pieces, ai_pieces, null, 2);
                    return;
                } else if (check_win_fullBoard(check_board2) == -Infinity) { // Player wins
                    save_move(num_move, check_board, player_pieces, ai_pieces, null, 1);
                    return;
                }
            }

            save_move(num_move, check_board, player_pieces, ai_pieces, move, "");
            

        } else {
            let possible_moves = generate_possible_moves(board, 2, ai_pieces);
            let random_index = random(0, possible_moves.length);
            let random_move = possible_moves[random_index];
            place_piece(check_board2, random_move[0], 2, random_move[1], ai_pieces2);

            if (checkWin(2, check_board2)) {
                save_move(num_move, check_board, player_pieces, ai_pieces, null, 2);
                return;
            }

            if (is_board_full(check_board, player_pieces, ai_pieces2)) {
                if (check_win_fullBoard(check_board) == Infinity) { // AI wins
                    save_move(num_move, check_board, player_pieces, ai_pieces, null, 2);
                    return;
                } else if (check_win_fullBoard(check_board) == -Infinity) { // Player wins
                    save_move(num_move, check_board, player_pieces, ai_pieces, null, 1);
                    return;
                }
            }

            save_move(num_move, check_board, player_pieces, ai_pieces, random_move, "");

        }   
    }
}


// First player move
for (let index = 0; index < 9; index++) {
    for (let size = 0; size < 3; size++) {
        Move(board, index, size, player_pieces, ai_pieces, 1);
        [board, player_pieces, ai_pieces] = restartGame();
    }
}


// for (let numMove = 1; numMove < 2; numMove++) {
//     if (jsonData[`${numMove}_move`]) {
//         for (const move of jsonData[`${numMove}_move`]) {
//             if (move.winner === "") {
//                 // set ai move to board (from previous step)    
//                 let board2 = [...move.board];
//                 let player_pieces2 = [...move.player_pieces];
//                 let ai_pieces2 = [...move.ai_pieces];
//                 place_piece(board2, move.bestMove[0], 2, move.bestMove[1], ai_pieces2);
//                 let board3 = JSON.parse(JSON.stringify(board2));
//                 let player_pieces3 = JSON.parse(JSON.stringify(player_pieces2));
//                 let ai_pieces3 = JSON.parse(JSON.stringify(ai_pieces2));

//                 for (let index2 = 0; index2 < 9; index2++) {
//                     for (let size2 = 0; size2 < 3; size2++) {
//                         Move(board2, index2, size2, player_pieces2, ai_pieces2, numMove+1);
//                         board2 = JSON.parse(JSON.stringify(board3));
//                         player_pieces2 = JSON.parse(JSON.stringify(player_pieces3));
//                         ai_pieces2 = JSON.parse(JSON.stringify(ai_pieces3));
//                     }
//                 }
//             }
//         } 
//     } else {
//         console.log("Either the moves ran out or Something went wrong.");
//         break;
//     }
// }


function restartGame() {
    // Reset board state
    board.length = 0;
    for (let i = 0; i < 9; i++) {
        board.push([-1, -1]);
    }

    player_pieces = [3, 3, 2];
    ai_pieces = [3, 3, 2];

    return [board, player_pieces, ai_pieces];
}

function place_piece(board, index, role, size, available_pieces) {
    board[index] = [role, size];
    available_pieces[size]--;
}

function remove_piece(board, index, role, size, available_pieces, previous_state) {
    board[index] = previous_state;
    available_pieces[size]++;
}

function can_place_piece(board, index, role, size, available_pieces) {
    if (role != board[index][0] && size > board[index][1] && available_pieces[size] != 0) {
        return true;
    } else {
        return false;
    }
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
    
function is_board_full(board, player_pieces, ai_pieces) {
    // return board.every(row => row[0] !== -1);

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

    if (player_count > ai_count) {
        return -Infinity; // Player wins
    } else if (player_count < ai_count) {
        return Infinity; // AI wins
    }
}

function checkWin(role, check_board = board) {
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

function minimax(minimax_board, depth, alpha, beta, is_maximizing, player_available_pieces, ai_available_pieces, max_depth = 14) {
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
            if (beta <= alpha) {
                break;
            }
        }
        return best_score;
    }   else {
        best_score = Infinity;
        let moves = generate_possible_moves(minimax_board, 1, player_available_pieces);
        for (const [index, size] of moves) {
            const tmp = minimax_board[index]; 
            place_piece(minimax_board, index, 1, size, player_available_pieces);
            
            const score = minimax(minimax_board, depth + 1, alpha, beta, true, player_available_pieces, ai_available_pieces, max_depth);
            remove_piece(minimax_board, index, 1, size, player_available_pieces, tmp);

            best_score = Math.min(best_score, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) {
                break;
            }
        }   return best_score;
    }
}

function aiMove(board) {

    let best_score = -Infinity;
    let move = [-1, -1];
    let newBoard = [...board];
    let moves = generate_possible_moves(newBoard, 2, ai_pieces);

    for (const [index, size] of moves) {
        const tmp = board[index]; // previous state
        place_piece(newBoard, index, 2, size, ai_pieces);
        let score = minimax(newBoard, 0, -Infinity, Infinity, false, player_pieces, ai_pieces);
        remove_piece(newBoard, index, 2, size, ai_pieces, tmp);
        score = score + (position_weights[index] * size_weights[size])
        // console.log("position_weights:", position_weights[index], " size_weights:", size_weights[size]);
        console.log("Evaluating move: row:", Math.floor(index/3), " col:", index%3, " size:", reversedSizeValue[size], " score:", score);
        if (score > best_score) {
            best_score = score;
            move = [index, size];
        }
    }

    if (move[0] !== -1 && move[1] !== -1) {
        console.log("Best move found -> index", move[0], "size", move[1], "Best Score", best_score);
        place_piece(board, move[0], 2, move[1], best_score);
        console.log("AI pieces after move: ", board);
        return [true, move, best_score]; // return true if a move was made, index, size
    }

    return [false, move, best_score];
}

fs.writeFileSync('player_first.json', JSON.stringify(jsonData, null, 2), 'utf-8');

console.log('Data has been saved to player_first.json');