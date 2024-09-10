document.addEventListener('DOMContentLoaded', () => {
    const cells = document.querySelectorAll('.cell');
    const playerPieces = document.querySelectorAll('.player');
    const aiPieces = document.querySelectorAll('.ai');
    const playerText = document.getElementById('playerText');
    const startingMessage = document.getElementById('startingMessage');
    const playerButton = document.getElementById('playerButton');
    const aiButton = document.getElementById('aiButton');
    const restartButton = document.getElementById('restartButton');
    // const winningMessage = document.getElementById('winningMessage');
    // const winningMessageText = document.querySelector('[data-winning-message-text]');
    
    let currentPlayer = 'player';
    const board = Array(9).fill([-1, -1]);
    let game_over = false;
    let player_pieces = [3, 3, 2]; // [Small, Medium, Large] for player
    let ai_pieces = [3, 3, 2]; // [Small, Medium, Large] for AI
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

    function start() {
        playerButton.addEventListener('click', () => {
            currentPlayer = 'player';
            startingMessage.style.display = 'none';
        })

        aiButton.addEventListener('click', () => {
            currentPlayer = 'ai';
            // startingMessage.textContent = 'AI is thinking...';
            startingMessage.style.display = 'none';
            [BestMove, move] = aiMove();
            if (BestMove) {
                cells[move[0]].setAttribute('data-role', 'ai');
                cells[move[0]].setAttribute('data-size', reversedSizeValue[move[1]]);
                updatePieceCountText(player_pieces, ai_pieces);
            }
            currentPlayer = currentPlayer === 'player' ? 'ai' : 'player';
        })
    }

    start();
    updateDraggableState();
    
    function handleDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.classList);
    }

    function handleTouchStart(event) {
        event.target.classList.add('dragging');
    }

    function handleTouchMove(event) {
        const touchLocation = event.touches[0];
        const piece = document.querySelector('.dragging');
        if (piece) {
            piece.style.position = 'absolute';
            piece.style.left = `${touchLocation.pageX - 25}px`;
            piece.style.top = `${touchLocation.pageY - 25}px`;
        }
    }

    function handleTouchEnd(event) {
        const piece = document.querySelector('.dragging');
        if (piece) {
            piece.classList.remove('dragging');
            piece.style.position = 'relative';
            piece.style.left = '0';
            piece.style.top = '0';

            const touchLocation = event.changedTouches[0];
            const cell = document.elementFromPoint(touchLocation.clientX, touchLocation.clientY);

            if (cell && cell.classList.contains('cell')) {
                handleDrop({ target: cell, dataTransfer: { getData: () => piece.classList } });
            }
        }
    }
    
    function handleDrop(event) {
        event.preventDefault();
        const cell = event.target;
        const pieceClass = event.dataTransfer.getData('text/plain');
        const [role, size] = pieceClass.split(' ');
        let BestMove = false;
        let index_tmp, size_tmp;
        const index = Array.from(cells).indexOf(cell);
    
        // Ensure that a piece is only placed in an empty or "eatable" cell
        if (can_place_piece(board, index, roleValue[role], sizeValue[size], player_pieces)) {

            // Update the board array
            place_piece(board, index, roleValue[role], sizeValue[size], player_pieces);
            console.log('check win:', checkWin(roleValue[role]));
            console.log('currentRole:', reversedRoleValue[board[index][0]]);
            console.log('currentSize:', reversedSizeValue[board[index][1]]);
            console.log('available pieces:', player_pieces)

            // Place the new piece 
            // comment: cells[index] === cell;
            cells[index].setAttribute('data-role', role);
            cells[index].setAttribute('data-size', size);
    
            updatePieceCountText(player_pieces, ai_pieces);

            // Check for a win condition
            if (checkWin(1)) {
                // setWinningMessage('player');
                game_over = true;
                playerText.textContent = `Player Wins!`;
            } else {
                // Switch turns
                currentPlayer = currentPlayer === 'player' ? 'ai' : 'player';
                console.log('currentplayer after:', currentPlayer);
                [BestMove, move]= aiMove(); // Call AI move
                [index_tmp, size_tmp] = [move[0], move[1]];
                console.log("Calling: Best move found -> BestMove:", BestMove, " index:", index_tmp, "size:", size_tmp);

                if (BestMove) {
                    playerText.textContent = `Eggy Chess`;
                    cells[index_tmp].setAttribute('data-role', 'ai');
                    cells[index_tmp].setAttribute('data-size', reversedSizeValue[size_tmp]);
                    updatePieceCountText(player_pieces, ai_pieces);
                    console.log("Best move found (problem) -> index", index_tmp, "size", size_tmp);

                    if (checkWin(2)) {
                        game_over = true;
                        console.log('AI wins');
                        // setWinningMessage('ai');
                        playerText.textContent = `AI Wins!`;
                    }

                } else {
                    playerText.textContent = `All AI moves is futile! It will do a random move.`;
                    let possible_moves = generate_possible_moves(board, 2, ai_pieces);
                    let random_index = random(0, possible_moves.length);
                    let random_move = possible_moves[random_index];
                    place_piece(board, random_move[0], 2, random_move[1], ai_pieces);
                    cells[random_move[0]].setAttribute('data-role', 'ai');
                    cells[random_move[0]].setAttribute('data-size', reversedSizeValue[random_move[1]]);
                    updatePieceCountText(player_pieces, ai_pieces);
                }
                currentPlayer = currentPlayer === 'player' ? 'ai' : 'player';

                if (is_board_full) {
                    console.log(is_board_full);
                    console.log('Board is full');
                }
            }
        }
    }
    

    function handleDragOver(event) {
        event.preventDefault();
    }

    function place_piece(board, index, role, size, available_pieces) {
        board[index] = [role, size];
        available_pieces[size]--;
    }
    
    function remove_piece(board, index, role, size, available_pieces, previous_state) {
        board[index] = previous_state;
        available_pieces[size]++;
    }

    function updatePieceCountText(player_pieces, ai_pieces) {
        const playerSmall = document.getElementById('player-small-number');
        const playerMedium = document.getElementById('player-medium-number');
        const playerBig = document.getElementById('player-big-number');
        const aiSmall = document.getElementById('ai-small-number');
        const aiMedium = document.getElementById('ai-medium-number');
        const aiBig = document.getElementById('ai-big-number');
    
        // Update the text content for the piece counts
        playerSmall.textContent = player_pieces[0];
        playerMedium.textContent = player_pieces[1];
        playerBig.textContent = player_pieces[2];
        aiSmall.textContent = ai_pieces[0];
        aiMedium.textContent = ai_pieces[1];
        aiBig.textContent = ai_pieces[2];
    
        // Update opacity for player's pieces based on the count
        updatePieceOpacity('player', 'small', player_pieces[0]);
        updatePieceOpacity('player', 'medium', player_pieces[1]);
        updatePieceOpacity('player', 'big', player_pieces[2]);
    
        // Update opacity for AI's pieces based on the count
        updatePieceOpacity('ai', 'small', ai_pieces[0]);
        updatePieceOpacity('ai', 'medium', ai_pieces[1]);
        updatePieceOpacity('ai', 'big', ai_pieces[2]);
    }
    
    function updatePieceOpacity(role, size, count) {
        const pieces = document.querySelectorAll(`.${role}.${size}`);
        
        pieces.forEach(piece => {
            if (count === 0) {
                piece.style.opacity = '0.3';
            } else {
                piece.style.opacity = '1';
            }
        });
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
    

    function is_board_full(board) {
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
    

    function minimax(minimax_board, depth, alpha, beta, is_maximizing, player_available_pieces, ai_available_pieces, max_depth = 8) {
        let best_score;
        if (checkWin(2, minimax_board)) {
            return 1000 / (depth + 1); 
        } else if (checkWin(1, minimax_board)) {
            return -1000 / (depth + 1); 
        } else if (is_board_full(minimax_board)) {
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
    
    
    
    
    function aiMove() {

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
            place_piece(board, move[0], 2, move[1], ai_pieces);
            console.log("AI pieces after move: ", board);
            return [true, move]; // return true if a move was made, index, size
        }

        return [false, move];
    }

    function restartGame() {
        startingMessage.style.display = 'flex';
    
        // Reset board state
        board.length = 0;
        for (let i = 0; i < 9; i++) {
            board.push([-1, -1]);
        }
    
        player_pieces = [3, 3, 2];
        ai_pieces = [3, 3, 2];
    
        // Clear cell attributes
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.removeAttribute('data-role');
            cell.removeAttribute('data-size');
        });
    
        // Reset piece counts
        document.getElementById('player-big-number').textContent = '2';
        document.getElementById('player-medium-number').textContent = '3';
        document.getElementById('player-small-number').textContent = '3';
        
        document.getElementById('ai-big-number').textContent = '2';
        document.getElementById('ai-medium-number').textContent = '3';
        document.getElementById('ai-small-number').textContent = '3';
    
        // Re-enable dragging for all pieces
        playerPieces.forEach(piece => {
            piece.setAttribute('draggable', true);
            piece.style.opacity = '1'; // Reset opacity
            removePieceEventListeners(piece);
            addPieceEventListeners(piece);
        });
    
        // Disable dragging for AI pieces
        aiPieces.forEach(piece => {
            piece.setAttribute('draggable', false);
            piece.style.opacity = '1';
        });
    
        // Remove and re-attach event listeners for each cell
        cells.forEach(cell => {
            cell.removeEventListener('dragover', handleDragOver);
            cell.removeEventListener('drop', handleDrop);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', handleDrop);
        });
    
        start(); // Re-start the game process
        updateDraggableState();
        playerText.textContent = `Eggy Chess`;
    }
    
    function updateDraggableState() {
        // Disable dragging for all pieces first
        playerPieces.forEach(piece => {
            piece.setAttribute('draggable', false);
            removePieceEventListeners(piece);
        });
    
        aiPieces.forEach(piece => {
            piece.setAttribute('draggable', false);
            removePieceEventListeners(piece);
        });
    
        // Enable dragging for the current player's pieces only if the count is greater than 0
        if (currentPlayer === 'player') {
            playerPieces.forEach(piece => {
                const size = piece.classList.contains('big') ? 'big' :
                            piece.classList.contains('medium') ? 'medium' : 'small';
    
                if (canDragPiece('player', size)) {
                    piece.setAttribute('draggable', true);
                    addPieceEventListeners(piece);
                }
            });
        }
    }
    
    // Helper function to remove piece event listeners
    function removePieceEventListeners(piece) {
        piece.removeEventListener('dragstart', handleDragStart);
        piece.removeEventListener('touchstart', handleTouchStart);
        piece.removeEventListener('touchmove', handleTouchMove);
        piece.removeEventListener('touchend', handleTouchEnd);
    }
    
    // Helper function to add piece event listeners
    function addPieceEventListeners(piece) {
        piece.addEventListener('dragstart', handleDragStart);
        piece.addEventListener('touchstart', handleTouchStart);
        piece.addEventListener('touchmove', handleTouchMove);
        piece.addEventListener('touchend', handleTouchEnd);
    }
    
    // Helper function to check if a piece can be dragged (i.e., count > 0)
    function canDragPiece(role, size) {
        const pieceCountElement = document.getElementById(`${role}-${size}-number`);
        const count = parseInt(pieceCountElement.textContent);
        return count > 0;
    }
    
    // Event Listeners for the board and restart button
    cells.forEach(cell => {
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('drop', handleDrop);
    });
    
    restartButton.addEventListener('click', restartGame);
    


});
