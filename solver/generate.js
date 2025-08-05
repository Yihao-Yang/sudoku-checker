import { solve, isValid } from './solver_tool.js';
import { log_process,backup_original_board,show_result } from '../modules/core.js';
import { state } from '../modules/state.js';


// 生成数独终盘（直接使用回溯法生成）
export function generate_solution(size) {
    const board = Array.from({ length: size }, () => 
        Array.from({ length: size }, () => 0)
    );
    
    // 回溯填充数字
    function backtrack() {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (board[row][col] === 0) {
                    const nums = shuffle([...Array(size)].map((_, i) => i + 1));
                    
                    for (const num of nums) {
                        if (isValid(board, size, row, col, num)) {
                            board[row][col] = num;
                            
                            if (backtrack()) {
                                return true;
                            }
                            
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    backtrack();
    return board; // 全部填完返回终盘
}

function dig_holes(solution, size, _, symmetry = 'none') {
    const puzzle = solution.map(row => [...row]);
    const positions = [...Array(size * size).keys()];
    shuffle(positions);
    
    let holesDug = 0;
    let changed;
    // let lastTechniqueCounts = {}; // 新增：记录最后一次技巧统计
    
    do {
        changed = false;
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            let row = Math.floor(pos / size);
            let col = pos % size;
            
            if (puzzle[row][col] === 0) continue;
            
            // 获取对称位置
            const symmetricPositions = get_symmetric_positions(row, col, size, symmetry);
            const positionsToDig = [ [row, col], ...symmetricPositions ];
            
            // 临时保存所有位置的数字
            const tempValues = positionsToDig.map(([r, c]) => puzzle[r][c]);
            
            // 尝试挖洞
            for (const [r, c] of positionsToDig) {
                puzzle[r][c] = 0;
            }
            
            // 验证唯一解
            const testBoard = puzzle.map(row => [...row]);
            // const solutionCount = countSolutions(testBoard, size);
            const { solutionCount } = solve(testBoard, size, isValid, true);
            
            if (solutionCount === 1) {
                holesDug += positionsToDig.length;
                changed = true;
                // 记录最后一次技巧统计
                // lastTechniqueCounts = { ...state.lastTechniqueCounts };
            } else {
                // 恢复数字
                positionsToDig.forEach(([r, c], idx) => {
                    puzzle[r][c] = tempValues[idx];
                });
            }
        }
    } while (changed); // 持续循环直到无法再挖洞
    
    // // 输出技巧使用统计
    // if (Object.keys(lastTechniqueCounts).length > 0) {
    //     log_process("\n=== 唯一性检测技巧统计 ===");
    //     for (const [technique, count] of Object.entries(lastTechniqueCounts)) {
    //         if (count > 0) {
    //             log_process(`${technique}: ${count}次`);
    //         }
    //     }
    // }
    
    // log_process(`实际挖洞数: ${holesDug}`);
    return puzzle;
}

export function get_symmetric_positions(row, col, size, symmetry) {
    const positions = [];
    const center = (size - 1) / 2;
    
    switch(symmetry) {
        case 'horizontal':
            if (row !== size - 1 - row) {
                positions.push([size - 1 - row, col]);
            }
            break;
        case 'vertical':
            if (col !== size - 1 - col) {
                positions.push([row, size - 1 - col]);
            }
            break;
        case 'central':
            if (row !== size - 1 - row || col !== size - 1 - col) {
                positions.push([size - 1 - row, size - 1 - col]);
            }
            break;
        case 'diagonal':
            if (row !== col) {
                positions.push([col, row]);
            }
            break;
        case 'anti-diagonal':
            if (row + col !== size - 1) {
                positions.push([size - 1 - col, size - 1 - row]);
            }
            break;
    }
    
    return positions;
}

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}



const SYMMETRY_TYPES = ['horizontal', 'vertical', 'central', 'diagonal', 'anti-diagonal'];



/**
 * 自动生成标准数独题目
 * @param {number} size - 数独大小 (4,6,9)
 * @param {string} difficulty - 难度 ('easy', 'medium', 'hard')
 */
export function generate_puzzle(size, difficulty = 'medium') {
    log_process('', true);

    // 1. 生成终盘
    const solution = generate_solution(size);
    
    // 2. 随机选择对称模式并挖洞
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
    const puzzle = dig_holes(solution, size, 0, symmetry); // 第三个参数不再使用
    // const puzzle = generate_solution(size);
    
    // 计算实际挖洞数
    let holesDug = 0;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (puzzle[i][j] === 0) holesDug++;
        }
    }
    
    log_process(`生成${size}宫格${difficulty}难度数独，提示数: ${size*size-holesDug}，对称模式: ${symmetry}`);
    

    // 3. 填充到网格
    const container = document.querySelector('.sudoku-container');
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            input.value = puzzle[i][j] || '';
        }
    }
    
    backup_original_board();
    show_result(`已生成${size}宫格数独题目`);

    // 4. 验证题目唯一性并显示技巧统计
    // const testBoard = puzzle.map(row => [...row]);
    const testBoard = puzzle.map(row => 
        row.map(cell => cell === 0 ? 
            [...Array(size)].map((_, n) => n + 1) :  // 空格转为全候选数
            cell  // 已有数字保持不变
        )
    );
    const result = solve(testBoard, size, isValid, true);
    if (result.techniqueCounts) {
        log_process("\n=== 技巧使用统计 ===");
        for (const [technique, count] of Object.entries(result.techniqueCounts)) {
            if (count > 0) {
                log_process(`${technique}: ${count}次`);
            }
        }
    }
    
    
    return {
        puzzle: puzzle,
        solution: solution
    };
}

/**
 * 将生成的题目填充到网格
 */
export function fill_puzzle_to_grid(puzzle) {
    const container = document.querySelector('.sudoku-container');
    const size = puzzle.length;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            input.value = puzzle[i][j] || '';
            // input.readOnly = puzzle[i][j] !== 0;
        }
    }
    
    backup_original_board();
    show_result(`已生成${size}宫格数独题目`);
}