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
    // const size_weights = [2, 2.5, 1.5];
    const size_weights = [1, 2, 3];
    
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

    // --- WEB WORKER SETUP ---
    const aiWorker = new Worker('worker.js');

    // Listen for the worker's response
    aiWorker.onmessage = function(event) {
        const { bestMoveFound, move } = event.data;
        
        // Remove the thinking state
        document.body.classList.remove('thinking');
    
        if (bestMoveFound) {
            let index_tmp = move[0];
            let size_tmp = move[1];
    
            playerText.textContent = `Eggy Chess`;

            // IMPORTANT: We must update the main thread's board! 
            // The worker only modified its own copy.
            place_piece(board, index_tmp, 2, size_tmp, ai_pieces);
    
            // Update UI
            cells[index_tmp].setAttribute('data-role', 'ai');
            cells[index_tmp].setAttribute('data-size', reversedSizeValue[size_tmp]);
            updatePieceCountText(player_pieces, ai_pieces);
    
            if (checkWin(2)) {
                game_over = true;
                playerText.textContent = `AI Wins!`;
            }
        } else {
            // Trigger your fallback random move logic here
            playerText.textContent = `All AI moves are futile! It will do a random move.`;
            let possible_moves = generate_possible_moves(board, 2, ai_pieces);
            let random_index = random(0, possible_moves.length);
            let random_move = possible_moves[random_index];
            
            place_piece(board, random_move[0], 2, random_move[1], ai_pieces);
            cells[random_move[0]].setAttribute('data-role', 'ai');
            cells[random_move[0]].setAttribute('data-size', reversedSizeValue[random_move[1]]);
            updatePieceCountText(player_pieces, ai_pieces);

            if (checkWin(2)) {
                game_over = true;
                playerText.textContent = `AI Wins!`;
            }
        }

        // Switch back to player and unlock draggable pieces
        currentPlayer = 'player';
        updateDraggableState(); 
    };

    // Helper function to ask the worker for a move
    function requestAIMove() {
        currentPlayer = 'ai';
        playerText.textContent = "AI is thinking...";
        document.body.classList.add('thinking'); 
        
        // Disable drag while AI is thinking so the player can't cheat!
        playerPieces.forEach(piece => piece.setAttribute('draggable', false));

        // Send a copy of the current game state to the worker
        aiWorker.postMessage({
            board: JSON.parse(JSON.stringify(board)), 
            player_pieces: [...player_pieces],
            ai_pieces: [...ai_pieces]
        });
    }
    // --- END WEB WORKER SETUP ---

    function start() {
        playerButton.addEventListener('click', () => {
            currentPlayer = 'player';
            startingMessage.style.display = 'none';
        })

        aiButton.addEventListener('click', () => {
            startingMessage.style.display = 'none';
            requestAIMove(); // <--- Calls the worker instead of calculating locally
        })
    }

    start();
    updateDraggableState();

    function place_piece(board, index, role, size, available_pieces) {
        board[index] = [role, size];
        available_pieces[size]--;
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

    function handleDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.classList);
    }

    function handleTouchStart(event) {
        if (event.target.getAttribute('draggable') === 'true') {
            event.target.classList.add('dragging');
        }
    }

    function handleTouchMove(event) {
        const piece = document.querySelector('.dragging');
        if (piece) {
            event.preventDefault();  // prevent the screen from scrolling while dragging
            
            const touchLocation = event.touches[0];
            
            piece.style.position = 'fixed'; 
            piece.style.left = `${touchLocation.clientX - piece.offsetWidth / 2}px`;
            piece.style.top = `${touchLocation.clientY - piece.offsetHeight / 2}px`;
            piece.style.zIndex = '1000'; // Make sure it floats above other elements
        }
    }

    function handleTouchEnd(event) {
        const piece = document.querySelector('.dragging');
        if (piece) {
            piece.classList.remove('dragging');

            // 1. Reset the piece's visual styles back to normal
            piece.style.position = 'relative';
            piece.style.left = '0';
            piece.style.top = '0';
            piece.style.zIndex = '';

            const touchLocation = event.changedTouches[0];

            // 2. Hide the piece for a millisecond so we can see the cell underneath it!
            piece.style.display = 'none'; 
            const cell = document.elementFromPoint(touchLocation.clientX, touchLocation.clientY);
            piece.style.display = ''; // Bring the piece back instantly

            // 3. If they dropped it on a cell, trigger the drop logic
            if (cell && cell.classList.contains('cell')) {
                handleDrop({ 
                    preventDefault: () => {}, // Mock prevent default so handleDrop doesn't crash
                    target: cell, 
                    dataTransfer: { getData: () => piece.className } // Use className to pass a String!
                });
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
                requestAIMove(); // <--- Asks the worker to calculate the response
            }
        }
    }
    

    function handleDragOver(event) {
        event.preventDefault();
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


    function restartGame() {
        startingMessage.style.display = 'flex';

        game_over = false;
    
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

        updatePieceCountText(player_pieces, ai_pieces); 
    
        // Re-enable dragging for all pieces
        playerPieces.forEach(piece => {
            piece.setAttribute('draggable', true);
            removePieceEventListeners(piece);
            addPieceEventListeners(piece);
        });
    
        // Disable dragging for AI pieces
        aiPieces.forEach(piece => {
            piece.setAttribute('draggable', false);
        });
    
        // Remove and re-attach event listeners for each cell
        cells.forEach(cell => {
            cell.removeEventListener('dragover', handleDragOver);
            cell.removeEventListener('drop', handleDrop);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', handleDrop);
        });
    
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
