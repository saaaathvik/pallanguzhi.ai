import pygame
import sys
import random
import time
import math

pygame.init()

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
DARK_OVERLAY = (0, 0, 0, 120)
RED_OVERLAY = (180, 0, 0, 100)
GREEN_OVERLAY = (0, 180, 0, 100)
YELLOW_OVERLAY = (180, 180, 0, 100)
GREY_OVERLAY = (169, 169, 169, 120)

WINDOW_WIDTH = 1000
WINDOW_HEIGHT = 600
SCREEN = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption("Pallanguzhi")

NUM_CIRCLES = 7
CIRCLE_RADIUS = 40
CIRCLE_DIAMETER = 2 * CIRCLE_RADIUS

GAP = 30
VERTICAL_SPACING = 20

RECT_WIDTH = NUM_CIRCLES * CIRCLE_DIAMETER + GAP * (NUM_CIRCLES + 1)
RECT_HEIGHT = CIRCLE_DIAMETER + GAP * 2
RECT_POSITIONS = [
    (WINDOW_WIDTH // 2 - RECT_WIDTH // 2, WINDOW_HEIGHT // 2 - RECT_HEIGHT - VERTICAL_SPACING // 2),
    (WINDOW_WIDTH // 2 - RECT_WIDTH // 2, WINDOW_HEIGHT // 2 + VERTICAL_SPACING // 2)
]

WOOD_IMAGE = pygame.image.load('wood.jpeg')
WOOD_IMAGE = pygame.transform.scale(WOOD_IMAGE, (RECT_WIDTH, RECT_HEIGHT))

SCALE_FACTOR = 0.08
SHELL_IMAGE = pygame.image.load('shell.jpeg')
SHELL_WIDTH, SHELL_HEIGHT = SHELL_IMAGE.get_size()
SHELL_WIDTH, SHELL_HEIGHT = int(SCALE_FACTOR * SHELL_WIDTH), int(SCALE_FACTOR * SHELL_HEIGHT)
SHELL_IMAGE = pygame.transform.scale(SHELL_IMAGE, (SHELL_WIDTH, SHELL_HEIGHT))

FONT_SIZE = 35
FONT = pygame.font.Font(None, FONT_SIZE)

class Node:
  """Represents a game tree node for AI decision-making."""
  
  def __init__(self, human, ai_wallet, human_wallet, hole):
    self.hole = hole
    self.human = human
    self.ai_wallet = ai_wallet
    self.human_wallet = human_wallet
    self.children = []

class PallanguzhiBoard:
    """Handles the Pallanguzhi board, pits, and shell rendering."""
    
    def __init__(self):
        self.pits = [[6] * 7 for _ in range(2)]
        
        self.circle_shell_data = self.initialize_shell_data(self.pits)
        
        self.selected_circle = None
        self.redraw = True
        self.selection_enabled = True
        self.make_move_enabled = False
        self.ai_move_enabled = False
        self.move_message = None
    
    def generate_random_shell_positions(self, shell_count, center):
        """Generate random shell positions for each pit"""
        positions = []
        
        for i in range(shell_count):
            angle = random.uniform(0, 2 * math.pi)
            distance = random.uniform(0, CIRCLE_RADIUS-20)
            offset_x = int(distance * math.cos(angle))
            offset_y = int(distance * math.sin(angle))
            shell_x = center[0] + offset_x
            shell_y = center[1] + offset_y
            rotation_angle = random.randint(0, 360)
            positions.append((shell_x, shell_y, rotation_angle))
        
        return positions
    
    def initialize_shell_data(self, pits):
        """Initialize shell data with random rotations."""
        circle_shell_data = []
        
        for j in range(2):
            row_data = []
            
            for i in range(NUM_CIRCLES):
                circle_x = RECT_POSITIONS[j][0] + GAP + CIRCLE_RADIUS + (CIRCLE_DIAMETER + GAP) * i
                circle_y = RECT_POSITIONS[j][1] + RECT_HEIGHT // 2
                shell_positions = self.generate_random_shell_positions(pits[j][i], (circle_x, circle_y))
                row_data.append([circle_x, circle_y, shell_positions])
            
            circle_shell_data.append(row_data)
        
        return circle_shell_data
    
    def on_click_behaviour(self, mouse_x, mouse_y):
        """Set flags based on mouse click."""
        if self.selection_enabled:
            for row_index, row_data in enumerate(self.circle_shell_data):
                    for i, (circle_x, circle_y, _) in enumerate(row_data):
                        distance = math.sqrt((mouse_x - circle_x) ** 2 + (mouse_y - circle_y) ** 2)
                        
                        if distance <= CIRCLE_RADIUS:
                            self.selected_circle = (row_index, i) if self.selected_circle != (row_index, i) and row_index != 0 else None
                            self.redraw = True
                            
                            if self.selected_circle and self.pits[self.selected_circle[0]][self.selected_circle[1]] > 0:
                                self.make_move_enabled = True
                                self.ai_move_enabled = False
                            
                            else:
                                self.make_move_enabled = False
                                self.ai_move_enabled = False
    
    def draw_shaded_circle(self, surface, center, shade_color):
        """Draw circle on the board."""
        pygame.draw.circle(surface, WHITE, center, CIRCLE_RADIUS, 1)
        shaded_circle = pygame.Surface((CIRCLE_RADIUS * 2, CIRCLE_RADIUS * 2), pygame.SRCALPHA)
        pygame.draw.circle(shaded_circle, shade_color, (CIRCLE_RADIUS, CIRCLE_RADIUS), CIRCLE_RADIUS)
        surface.blit(shaded_circle, (center[0] - CIRCLE_RADIUS, center[1] - CIRCLE_RADIUS))
    
    def draw_shells(self, surface, shell_data):
        """Draw shells within a circle."""
        for shell_x, shell_y, rotation_angle in shell_data:
            rotated_shell = pygame.transform.rotate(SHELL_IMAGE, rotation_angle)
            shell_rect = rotated_shell.get_rect(center=(shell_x, shell_y))
            surface.blit(rotated_shell, shell_rect)
        
    def render_shell_count(self, surface, count, position, is_top_row):
        """Display the shell count next to a circle."""
        text = FONT.render(str(count), True, WHITE)
        text_rect = text.get_rect(center=position)
        
        if is_top_row:
            text_rect.bottom = position[1] - CIRCLE_RADIUS - 5
        
        else:
            text_rect.top = position[1] + CIRCLE_RADIUS + 5
        
        surface.blit(text, text_rect)
    
    def draw_board(self, your_score, ai_score, x = None, y = None, oc = None, coins = None):
        """Display the board on screen."""
        SCREEN.fill(BLACK)
        transition = x != None and y != None
        
        for row_index, (row_data, (rect_x, rect_y)) in enumerate(zip(self.circle_shell_data, RECT_POSITIONS)):
            SCREEN.blit(WOOD_IMAGE, (rect_x, rect_y))
            pygame.draw.rect(SCREEN, WHITE, (rect_x, rect_y, RECT_WIDTH, RECT_HEIGHT), 1)
            
            for i, (circle_x, circle_y, shell_data) in enumerate(row_data):
                if transition:
                    overlay_color = oc if (row_index == x and i == y) else DARK_OVERLAY
                
                else:
                    overlay_color = GREEN_OVERLAY if self.selected_circle == (row_index, i) and self.pits[row_index][i] > 0 else DARK_OVERLAY
                
                self.draw_shaded_circle(SCREEN, (circle_x, circle_y), overlay_color)
                if not transition:
                    self.draw_shells(SCREEN, shell_data)
                self.render_shell_count(SCREEN, self.pits[row_index][i], (circle_x, circle_y), (row_index == 0))

        button_width = 200
        button_height = 60

        if not transition:
            move_message_render = FONT.render(self.move_message, True, WHITE)
            SCREEN.blit(move_message_render, (WINDOW_WIDTH // 2 - move_message_render.get_width() // 2, 20))

            make_move_color = WHITE if self.make_move_enabled else GREY_OVERLAY
            pygame.draw.rect(SCREEN, make_move_color, (20, WINDOW_HEIGHT - button_height - 20, button_width, button_height))

            make_move_text = FONT.render("Make Move", True, BLACK if self.make_move_enabled else WHITE)
            make_move_text_rect = make_move_text.get_rect(center=(20 + button_width // 2, WINDOW_HEIGHT - button_height // 2 - 20))
            SCREEN.blit(make_move_text, make_move_text_rect)

            ai_move_color = WHITE if self.ai_move_enabled else GREY_OVERLAY
            pygame.draw.rect(SCREEN, ai_move_color, (WINDOW_WIDTH - button_width - 20, WINDOW_HEIGHT - button_height - 20, button_width, button_height))

            ai_move_text = FONT.render("AI Move", True, BLACK if self.ai_move_enabled else WHITE)
            ai_move_text_rect = ai_move_text.get_rect(center=(WINDOW_WIDTH - button_width // 2 - 20, WINDOW_HEIGHT - button_height // 2 - 20))
            SCREEN.blit(ai_move_text, ai_move_text_rect)

        your_score_text = FONT.render(f"Your score: {your_score}", True, WHITE)
        SCREEN.blit(your_score_text, (20, 20))

        ai_score_text = FONT.render(f"AI score: {ai_score}", True, WHITE)
        SCREEN.blit(ai_score_text, (WINDOW_WIDTH - 20 - ai_score_text.get_width(), 20))

        if transition:
            coins_text = FONT.render(f"Coins: {coins}", True, WHITE)
            SCREEN.blit(coins_text, (WINDOW_WIDTH // 2 - coins_text.get_width() // 2, 100))

        pygame.display.flip()
        self.redraw = False
        time.sleep(1)

class Player:
    """Base class for human and AI players."""

    def __init__(self, human):
        self.human = human
        self.wallet = 0

class Game:
    """Handles the game logic, AI decision-making, and moves."""
    
    def __init__(self, human_player, ai_player):
        self.human_player = human_player
        self.ai_player = ai_player

    def anti_clockwise_next(self, i, j):
        """Find the next location to play on the board."""
        if i == 0 and j == 0:
            return 1, 0

        if i == 1 and j == 6:
            return 0, 6

        if i == 0:
            return 0, j - 1

        if i == 1:
            return 1, j + 1
    
    def make_move(self, board, human, hole):
        """Performs moves until no more moves are possible."""
        x = human
        y = hole
        
        coins = board.pits[x][y]
        board.pits[x][y] = 0

        board.draw_board(self.human_player.wallet, self.ai_player.wallet, x, y, RED_OVERLAY, coins)

        while True:
            while coins > 0:
                x, y = self.anti_clockwise_next(x, y)
                board.pits[x][y] += 1
                coins -= 1

                board.draw_board(self.human_player.wallet, self.ai_player.wallet, x, y, YELLOW_OVERLAY, coins)

            x, y = self.anti_clockwise_next(x, y)

            if board.pits[x][y] > 0:
                coins = board.pits[x][y]
                board.pits[x][y] = 0

                board.draw_board(self.human_player.wallet, self.ai_player.wallet, x, y, RED_OVERLAY, coins)
                
                continue
            
            if board.pits[x][y] == 0:
                board.draw_board(self.human_player.wallet, self.ai_player.wallet, x, y, RED_OVERLAY, coins)
                
                return x, y
    
    def make_move_ai(self, pits, human, hole):
        """Same function as above but faster computation for game tree."""
        x = human
        y = hole
        
        coins = pits[x][y]
        pits[x][y] = 0

        while True:
            while coins > 0:
                x, y = self.anti_clockwise_next(x, y)
                pits[x][y] += 1
                coins -= 1

            x, y = self.anti_clockwise_next(x, y)

            if pits[x][y] > 0:
                coins = pits[x][y]
                pits[x][y] = 0
                continue
            
            if pits[x][y] == 0:
                return x, y
    
    def add_coins(self, pits, i, j):
        """Add the coins won to your wallet."""
        reward_i, reward_j = self.anti_clockwise_next(i, j)

        reward = pits[reward_i][reward_j]
        pits[reward_i][reward_j] = 0

        return reward
    
    def create_tree(self, pits, current_depth, max_depth, parent_hole, human_wallet, ai_wallet):
        """Generate a new game tree."""
        x = current_depth % 2

        if current_depth == max_depth:
            return Node(x, ai_wallet, human_wallet, parent_hole)

        node = Node(x, ai_wallet, human_wallet, parent_hole)

        for hole in range(7):
            if pits[x][hole] == 0:
                continue

            new_state = [row[:] for row in pits]

            new_ai_wallet = ai_wallet
            new_human_wallet = human_wallet

            i1, j1 = self.make_move_ai(new_state, x, hole)

            if x == 0:
                new_ai_wallet += self.add_coins(new_state, i1, j1)
            else:
                new_human_wallet += self.add_coins(new_state, i1, j1)

            child_node = self.create_tree(new_state, current_depth + 1, max_depth, hole, new_human_wallet, new_ai_wallet)
            node.children.append(child_node)

        return node

    def alpha_beta_pruning(self, node, alpha, beta, player):
        """Minimax algorithm with alpha beta pruning."""
        if len(node.children) == 0:
            return node.ai_wallet - node.human_wallet, -1

        best_move = -1

        if player == 0:
            best_score = -math.inf

            for child in node.children:
                score, _ = self.alpha_beta_pruning(child, alpha, beta, 1)

                if score > best_score:
                    best_score = score
                    best_move = child.hole

                alpha = max(alpha, best_score)
                if beta <= alpha:
                    break
            
            return best_score, best_move

        else:
            best_score = math.inf

            for child in node.children:
                score, _ = self.alpha_beta_pruning(child, alpha, beta, 0)

                if score < best_score:
                    best_score = score
                    best_move = child.hole

                beta = min(beta, best_score)
                
                if beta <= alpha:
                    break
            
            return best_score, best_move

    def display_end_screen(self, winner):
        """Exit function."""    
        SCREEN.fill(BLACK)

        if winner == "You":
            message = "Congratulations! You Win!"
                
        elif winner == "AI":
            message = "AI Wins! Better luck next time!"
                
        else:
            message = "Draw! Well Played!"
                
        result_message = FONT.render(message, True, WHITE)
        SCREEN.blit(result_message, (WINDOW_WIDTH // 2 - result_message.get_width() // 2, WINDOW_HEIGHT // 2 - 100))
                
        your_score_text = FONT.render(f"Your final score: {self.human_player.wallet}", True, WHITE)
        ai_score_text = FONT.render(f"AI final score: {self.ai_player.wallet}", True, WHITE)
        SCREEN.blit(your_score_text, (WINDOW_WIDTH // 2 - your_score_text.get_width() // 2, WINDOW_HEIGHT // 2))
        SCREEN.blit(ai_score_text, (WINDOW_WIDTH // 2 - ai_score_text.get_width() // 2, WINDOW_HEIGHT // 2 + 50))
                
        exit_message = FONT.render("Press any key to exit", True, GREY_OVERLAY)
        SCREEN.blit(exit_message, (WINDOW_WIDTH // 2 - exit_message.get_width() // 2, WINDOW_HEIGHT // 2 + 150))
                
        pygame.display.flip()
                
        waiting = True
        while waiting:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    exit()
                elif event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
                    waiting = False
        pygame.quit()
        exit() 

board = PallanguzhiBoard()
game = Game(Player(1), Player(0))

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False
        
        elif event.type == pygame.MOUSEBUTTONDOWN:
            mouse_x, mouse_y = event.pos
            board.on_click_behaviour(mouse_x, mouse_y)

            if board.make_move_enabled and 20 <= mouse_x <= 220 and WINDOW_HEIGHT - 80 <= mouse_y <= WINDOW_HEIGHT - 20:
                i1, j1 = game.make_move(board, 1, board.selected_circle[1])
                game.human_player.wallet += game.add_coins(board.pits, i1, j1)
                
                board.circle_shell_data = board.initialize_shell_data(board.pits)
                board.selection_enabled = False
                board.make_move_enabled = False
                board.ai_move_enabled = True
                board.move_message = "You played pit " + str(board.selected_circle[1]+1) + ". AI's move."
                board.selected_circle = None
                board.redraw = True
            
            if board.pits[0] == [0, 0, 0, 0, 0, 0, 0]:
                for coins in board.pits[1]:
                    game.human_player.wallet += coins
                
                if game.human_player.wallet > game.ai_player.wallet:
                    game.display_end_screen("You")
                
                elif game.human_player.wallet < game.ai_player.wallet:
                    game.display_end_screen("AI")
                
                else:
                    game.display_end_screen("Draw")

            if game.human_player.wallet > 42:
                    game.display_end_screen("You")

            if board.ai_move_enabled and WINDOW_WIDTH - 220 <= mouse_x <= WINDOW_WIDTH - 20 and WINDOW_HEIGHT - 80 <= mouse_y <= WINDOW_HEIGHT - 20:
                root = game.create_tree(board.pits, 0, 6, -1, game.human_player.wallet, game.ai_player.wallet)
                cost, ai_pit = game.alpha_beta_pruning(root, -math.inf, math.inf, 0)
                i2, j2 = game.make_move(board, 0, ai_pit)
                game.ai_player.wallet += game.add_coins(board.pits, i2, j2)
                
                board.circle_shell_data = board.initialize_shell_data(board.pits)
                board.selected_circle = None
                board.selection_enabled = True
                board.ai_move_enabled = False
                board.make_move_enabled = False
                board.move_message = f"AI played pit {ai_pit + 1}. Your move."
                board.redraw = True
            
            if board.pits[1] == [0, 0, 0, 0, 0, 0, 0]:
                for coins in board.pits[0]:
                    game.ai_player.wallet += coins
                
                if game.human_player.wallet > game.ai_player.wallet:
                    game.display_end_screen("You")
                
                elif game.human_player.wallet < game.ai_player.wallet:
                    game.display_end_screen("AI")
                
                else:
                    game.display_end_screen("Draw")

            if game.ai_player.wallet > 42:
                    game.display_end_screen("AI")

    if board.redraw:
        board.draw_board(game.human_player.wallet, game.ai_player.wallet)

pygame.quit()
sys.exit()