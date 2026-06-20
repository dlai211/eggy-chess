import json
import math
import time

# --- Constants & Weights ---
POSITION_WEIGHTS = [2.2, 2, 2.2, 2, 2.2, 2, 2.2, 2, 2.2]
SIZE_WEIGHTS = [2, 2.5, 1.5]

# Our Transposition Table (Memory)
memo = {}

def get_possible_moves(board, role, pieces):
    moves = []
    for i in range(9):
        for size in range(3):
            if role != board[i][0] and size > board[i][1] and pieces[size] > 0:
                moves.append((i, size))
    return moves

def check_win(board, role):
    win_conditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ]
    for combo in win_conditions:
        if all(board[i][0] == role for i in combo):
            return True
    return False

def heuristic_evaluation(board, depth):
    player_score = 0
    ai_score = 0
    for cell in board:
        if cell[0] == 1:
            player_score += (cell[1] + 1)
        elif cell[0] == 2:
            ai_score += (cell[1] + 1)
    return (ai_score - player_score) / (depth + 1)

# Generate a unique key for the current game state
def get_state_key(board, is_maximizing, p1_pieces, p2_pieces, depth):
    # We include depth in the key because a state evaluated at depth 2 
    # might have a different heuristic score than the same state evaluated at depth 6.
    board_tuple = tuple(board)
    p1_tuple = tuple(p1_pieces)
    p2_tuple = tuple(p2_pieces)
    return (board_tuple, is_maximizing, p1_tuple, p2_tuple, depth)

def minimax(board, depth, alpha, beta, is_maximizing, p1_pieces, p2_pieces, max_depth=8):
    # 1. Check if we have already evaluated this exact state
    state_key = get_state_key(board, is_maximizing, p1_pieces, p2_pieces, depth)
    if state_key in memo:
        return memo[state_key]

    # 2. Check for terminal states
    if check_win(board, 2):
        return 1000 / (depth + 1)
    elif check_win(board, 1):
        return -1000 / (depth + 1)
    
    # 3. Depth limit check (Increase this to push towards absolute depth)
    if depth == max_depth:
        return heuristic_evaluation(board, depth)

    # 4. Minimax recursive logic
    if is_maximizing:
        best_score = -math.inf
        moves = get_possible_moves(board, 2, p2_pieces)
        for i, size in moves:
            tmp = board[i]
            board[i] = (2, size)
            p2_pieces[size] -= 1
            
            score = minimax(board, depth + 1, alpha, beta, False, p1_pieces, p2_pieces, max_depth)
            
            board[i] = tmp
            p2_pieces[size] += 1
            
            best_score = max(best_score, score)
            alpha = max(alpha, score)
            if beta <= alpha:
                break
                
        # Save to memory before returning
        memo[state_key] = best_score
        return best_score
        
    else:
        best_score = math.inf
        moves = get_possible_moves(board, 1, p1_pieces)
        for i, size in moves:
            tmp = board[i]
            board[i] = (1, size)
            p1_pieces[size] -= 1
            
            score = minimax(board, depth + 1, alpha, beta, True, p1_pieces, p2_pieces, max_depth)
            
            board[i] = tmp
            p1_pieces[size] += 1
            
            best_score = min(best_score, score)
            beta = min(beta, score)
            if beta <= alpha:
                break
                
        # Save to memory before returning
        memo[state_key] = best_score
        return best_score

def find_best_move(board, p1_pieces, p2_pieces, max_depth=8):
    best_score = -math.inf
    best_move = None
    moves = get_possible_moves(board, 2, p2_pieces)
    
    for i, size in moves:
        tmp = board[i]
        board[i] = (2, size)
        p2_pieces[size] -= 1
        
        score = minimax(board, 0, -math.inf, math.inf, False, p1_pieces, p2_pieces, max_depth)
        
        board[i] = tmp
        p2_pieces[size] += 1
        
        score += (POSITION_WEIGHTS[i] * SIZE_WEIGHTS[size])
        
        if score > best_score:
            best_score = score
            best_move = [i, size]
            
    return best_move

def generate_opening_book():
    print("Generating Opening Book with Transposition Tables...")
    start_time = time.time()
    opening_book = {}
    
    # You can increase this depth limit. 8 is a good starting point. 
    # If it computes fast, try 10 or 12!
    search_depth = 8 

    # 1. AI goes first (Empty Board)
    empty_board = [(-1, -1) for _ in range(9)]
    print(f"Calculating best first move (Depth {search_depth})...")
    best_ai_start = find_best_move(empty_board, [3, 3, 2], [3, 3, 2], search_depth)
    opening_book["empty"] = best_ai_start

    # 2. Player goes first
    p1_initial_moves = get_possible_moves(empty_board, 1, [3, 3, 2])
    
    for idx, (i, size) in enumerate(p1_initial_moves):
        board = [(-1, -1) for _ in range(9)]
        p1_pieces = [3, 3, 2]
        p2_pieces = [3, 3, 2]
        
        board[i] = (1, size)
        p1_pieces[size] -= 1
        
        board_key = ";".join([f"{r},{s}" for r, s in board])
        
        print(f"Calculating response {idx + 1}/27 (Player placed size {size} at index {i})...")
        best_response = find_best_move(board, p1_pieces, p2_pieces, search_depth)
        opening_book[board_key] = best_response

    with open('opening_moves.json', 'w') as f:
        json.dump(opening_book, f, indent=4)
        
    print(f"Done! Saved to opening_moves.json in {round(time.time() - start_time, 2)} seconds.")
    print(f"Total board states memorized: {len(memo)}")

if __name__ == "__main__":
    generate_opening_book()