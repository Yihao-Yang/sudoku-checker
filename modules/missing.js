import { 
    show_result, 
    clear_result, 
    bold_border, 
    add_Extra_Button,
    create_base_grid,
    create_base_cell,
    add_base_input_handlers,
    handle_key_navigation,
    base_solve,
    fill_solution,
    log_process,
    backup_original_board
} from './core.js';
import { state } from './state.js';
import { solve } from '../solver/solver_tool.js';
import { create_technique_panel } from './classic.js';
import { shuffle,get_symmetric_positions } from '../solver/generate.js';

let is_missing_mode_active = false;
let missing_cells = [];

/**
 * 创建缺一门数独网格
 */
export function create_missing_sudoku(size) {
    // 确保必要元素存在
    const gridDisplay = document.getElementById('gridDisplay');
    const extraButtons = document.getElementById('extraButtons');
    if (!gridDisplay || !extraButtons) {
        console.error('缺少必要的DOM元素');
        return;
    }
    
    // 重置状态
    state.is_missing_mode = true;
    clear_result();
    missing_cells = [];

    // 修改技巧开关 - 关闭不适合缺一门数独的技巧
    state.techniqueSettings = {
        Box_Elimination: false,
        Row_Col_Elimination: false,
        Box_Block: false,        // 关闭宫区块
        Row_Col_Block: false,    // 关闭行列区块
        Box_Naked_Pair: true,   // 关闭宫显性数对
        Row_Col_Naked_Pair: true, // 关闭行列显性数对
        Box_Hidden_Pair: false,  // 关闭宫隐性数对
        Row_Col_Hidden_Pair: false, // 关闭行列隐性数对
        Box_Naked_Triple: true, // 关闭宫显性三数组
        Row_Col_Naked_Triple: true, // 关闭行列显性三数组
        Box_Hidden_Triple: false, // 关闭宫隐性三数组
        Row_Col_Hidden_Triple: false, // 关闭行列隐性三数组
        All_Quad: false,         // 关闭所有四数组
        Cell_Elimination: true,  // 保持唯余开启
        Brute_Force: false       // 保持暴力求解关闭
    };

    // 刷新技巧面板
    create_technique_panel();
    
    // 创建网格
    const { container, grid } = create_base_grid(size);
    container.style.position = 'relative';
    
    // 存储所有输入框的引用
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 创建单元格
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const { cell, input } = create_base_cell(row, col, size);
            inputs[row][col] = input;
            
            // 添加输入处理
            add_base_input_handlers(input, size);
            
            // 添加键盘导航
            input.addEventListener('keydown', (e) => {
                handle_key_navigation(e, row, col, size, inputs);
            });
            
            cell.appendChild(input);
            grid.appendChild(cell);
        }
    }

    container.appendChild(grid);
    
    // 添加缺一门数独专属按钮

    extraButtons.innerHTML = '';
    
    // 主功能按钮
    
    extraButtons.innerHTML = '';
    add_Extra_Button('添加标记', toggle_marking_mode);
    add_Extra_Button('验证唯一性', check_missing_uniqueness);
    add_Extra_Button('清除数字', clear_numbers);
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('生成题目', () => generate_missing_puzzle(size));
    
    
    gridDisplay.appendChild(container);
    setup_missing_event_listeners();
}

/**
 * 设置缺一门数独事件监听
 */
function setup_missing_event_listeners() {
    const container = document.querySelector('.sudoku-container');
    const cells = container.querySelectorAll('.sudoku-cell');
    
    cells.forEach(cell => {
        cell.addEventListener('click', function(e) {
            if (!is_missing_mode_active) return;
            
            const row = parseInt(this.dataset.row);
            const col = parseInt(this.dataset.col);
            
            toggle_missing_cell(row, col);
        });
    });
}

/**
 * 切换标记模式
 */
function toggle_marking_mode() {
    const btn = document.querySelector('#extraButtons button:first-child');
    
    is_missing_mode_active = !is_missing_mode_active;
    
    if (is_missing_mode_active) {
        btn.textContent = '退出标记';
        show_result("标记模式已激活，点击格子添加/移除黑格标记", 'info');
    } else {
        btn.textContent = '添加标记';
        show_result("标记模式已退出", 'info');
    }
}

/**
 * 切换格子标记状态
 */
function toggle_missing_cell(row, col) {
    const container = document.querySelector('.sudoku-container');
    const cell = container.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    const input = cell.querySelector('input');
    
    // 检查是否已标记
    const index = missing_cells.findIndex(c => c.row === row && c.col === col);
    
    if (index >= 0) {
        // 移除标记
        cell.style.backgroundColor = '';
        input.disabled = false;
        input.style.backgroundColor = '';
        input.style.color = '';
        missing_cells.splice(index, 1);
    } else {
        // 添加标记
        cell.style.backgroundColor = '#000';
        input.disabled = true;
        input.value = '';
        input.style.backgroundColor = 'transparent';
        input.style.color = 'transparent';
        missing_cells.push({ row, col, element: cell });
    }
}



/**
 * 验证缺一门数独唯一性（修正版）
 */
export function check_missing_uniqueness() {
    log_process('', true);
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    // 1. 检查黑格数量是否符合要求
    if (!validate_missing_cells_count(size)) {
        return;
    }
    
    // 2. 收集当前盘面数据
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            // 如果是黑格，记为-1
            if (missing_cells.some(c => c.row === i && c.col === j)) {
                return -1; // 使用-1表示黑格
            }
            
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const val = input ? parseInt(input.value) : NaN;
            return isNaN(val) ? 0 : val; // 0表示空格
        })
    );
    
    // 3. 使用改进的求解函数验证
    const { solutionCount, solution } = missing_solve(
        board, 
        size,
        missing_cells
    );
    state.solutionCount = solutionCount;
    // const { solutionCount, solution } = solve(board, size);
    
    // 4. 显示结果


    if (state.solutionCount === -1) {
        show_result("当前技巧无法解出");
    } else if (state.solutionCount === 0 || state.solutionCount === -2) {
        show_result("当前缺一门数独无解。", 'error');
    } else if (solutionCount === 1) {
        // show_result("当前缺一门数独有唯一解！", 'success');
        
        // // 可选：填充唯一解
        // if (confirm("是否要填充唯一解？")) {
        //     fill_missing_solution(container, solution, size, missing_cells);
        // }
        // 退出候选数模式
        state.is_candidates_mode = false;
        document.getElementById('toggleCandidatesMode').textContent = '切换候选数模式';
        
        // 填充唯一解
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const cell = input.parentElement;
                const candidatesGrid = cell.querySelector('.candidates-grid');
                
                // 更新显示状态
                input.style.display = 'block';
                input.classList.remove('hide-input-text');
                if (candidatesGrid) {
                    candidatesGrid.style.display = 'none';
                }
                
                // 填充答案
                if (solution[i][j] > 0) {
                    // 如果是标准数独模式且该格已有数字，则跳过
                    if (!state.is_candidates_mode && input.value) {
                        continue;
                    }
                    input.value = solution[i][j];
                    input.classList.add("solution-cell");
                }
            }
        }
        show_result("当前数独恰好有唯一解！已自动填充答案。");
    } else if (solutionCount > 50) {
        show_result("当前数独有多于50个解。");
    } else {
        show_result(`当前缺一门数独有${solutionCount}个解！`, 'error');
    }
}

/**
 * 验证当前盘面是否有效
 */
function isValid_Missing(board, size, row, col, num) {
    // 如果是黑格，直接返回false（不应该被填充）
    if (board[row][col] === -1) return false;

    for (let i = 0; i < size; i++) {
        // 跳过黑格
        if (board[row][i] !== -1 && board[row][i] === num) return false;
        if (board[i][col] !== -1 && board[i][col] === num) return false;
    }

    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    const startRow = Math.floor(row / boxSize[0]) * boxSize[0];
    const startCol = Math.floor(col / boxSize[1]) * boxSize[1];

    for (let r = startRow; r < startRow + boxSize[0]; r++) {
        for (let c = startCol; c < startCol + boxSize[1]; c++) {
            // 跳过黑格
            if (board[r][c] !== -1 && board[r][c] === num) return false;
        }
    }
    return true;
}

/**
 * 缺一门数独专用求解器（改进版）
 */
function missing_solve(board, size, missingCells, silent = false) {
    // 首先验证当前盘面是否有效
    // if (!isValidMissingBoard(board, size, missingCells)) {
    //     return { solutionCount: 0, solution: null };
    // }

    if (silent) {
        // log_process = () => {}; // 静默模式下不输出
        state.silentMode = true;
    }
    else {
        state.silentMode = false;
    }
    
    // 如果盘面已经完整且有效，直接返回
    if (isBoardComplete(board, size, missingCells)) {
        return { solutionCount: 1, solution: cloneBoard(board) };
    }

    // 转换为候选数板
    const candidateBoard = board.map((row, i) => 
        row.map((cell, j) => {
            // 黑格保持为-1
            if (missingCells.some(c => c.row === i && c.col === j)) {
                return -1;
            }
            // 空格转换为候选数数组
            return cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell;
        })
    );

    // log_process("1")
    // 调用主求解函数
    const result = solve(candidateBoard, size, isValid_Missing, state.silentMode);
    
    // 处理结果
    if (result.solutionCount === -2) {
        return { solutionCount: -2, solution: null }; // 无解
    } else if (result.solutionCount === -1) {
        return { solutionCount: -1, solution: null }; // 技巧无法解出
    } else {
        // 过滤掉黑格
        const filteredSolution = result.solution?.map((row, i) => 
            row.map((cell, j) => 
                missingCells.some(c => c.row === i && c.col === j) ? -1 : cell
            )
        );
        return {
            solutionCount: result.solutionCount,
            solution: filteredSolution,
            techniqueCounts: result.techniqueCounts
        };
    }
}

/**
 * 检查盘面是否已完整
 */
function isBoardComplete(board, size, missingCells) {
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // 非黑格必须填有1-size的数字
            if (!missingCells.some(c => c.row === row && c.col === col)) {
                if (board[row][col] <= 0 || board[row][col] > size) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * 深拷贝盘面
 */
function cloneBoard(board) {
    return board.map(row => [...row]);
}

/**
 * 验证黑格数量是否符合缺一门规则
 */
function validate_missing_cells_count(size) {
    // 检查每行
    for (let row = 0; row < size; row++) {
        const rowMissing = missing_cells.filter(c => c.row === row).length;
        if (rowMissing !== 1) {
            show_result(`第${row+1}行必须有且只有一个黑格，当前有${rowMissing}个`, 'error');
            return false;
        }
    }
    
    // 检查每列
    for (let col = 0; col < size; col++) {
        const colMissing = missing_cells.filter(c => c.col === col).length;
        if (colMissing !== 1) {
            show_result(`第${col+1}列必须有且只有一个黑格，当前有${colMissing}个`, 'error');
            return false;
        }
    }
    
    // 检查每宫 - 修改为与classic.js一致的宫格判断逻辑
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    for (let boxRow = 0; boxRow < boxSize[1]; boxRow++) {
        for (let boxCol = 0; boxCol < boxSize[0]; boxCol++) {
            const startRow = boxRow * boxSize[0];
            const startCol = boxCol * boxSize[1];
            
            const boxMissing = missing_cells.filter(c => 
                c.row >= startRow && c.row < startRow + boxSize[0] &&
                c.col >= startCol && c.col < startCol + boxSize[1]
            ).length;
            
            if (boxMissing !== 1) {
                show_result(`第${boxRow * boxSize[0] + boxCol + 1}宫必须有且只有一个黑格，当前有${boxMissing}个`, 'error');
                return false;
            }
        }
    }
    
    return true;
}

/**
 * 清除所有数字，保留标记
 */
export function clear_numbers() {
    const container = document.querySelector('.sudoku-container');
    const inputs = container.querySelectorAll('input');
    
    inputs.forEach(input => {
        if (!input.disabled) {
            input.value = '';
        }
    });
    
    show_result("已清除所有数字，保留黑格标记", 'info');
}

/**
 * 清除所有标记，保留数字
 */
export function clear_marks() {
    const container = document.querySelector('.sudoku-container');
    
    missing_cells.forEach(cell => {
        cell.element.style.backgroundColor = '';
        const input = cell.element.querySelector('input');
        input.disabled = false;
    });
    
    missing_cells = [];
    is_missing_mode_active = false;
    
    // 重置按钮文本
    const btn = document.querySelector('#extraButtons button:first-child');
    if (btn) btn.textContent = '添加标记';
    
    show_result("已清除所有黑格标记，保留数字", 'info');
}

/**
 * 生成缺一门数独终盘
 * @param {number} size - 数独大小 (4,6,9)
 */
function generate_missing_solution(size) {
    // 1. 创建空盘面
    const board = Array.from({ length: size }, () => 
        Array.from({ length: size }, () => 0)
    );
    
    // 2. 随机生成黑格位置 (每行、每列、每宫各一个)
    const missingCells = generate_missing_cells(size);
    
    // 3. 标记黑格位置
    missingCells.forEach(({row, col}) => {
        board[row][col] = -1; // 使用-1表示黑格
    });
    
    // 4. 回溯填充数字
    function backtrack() {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                // 跳过黑格
                if (board[row][col] === -1) continue;
                
                if (board[row][col] === 0) {
                    const nums = shuffle([...Array(size)].map((_, i) => i + 1));
                    
                    for (const num of nums) {
                        if (isValid_Missing(board, size, row, col, num)) {
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
    return { board, missingCells };
}

/**
 * 生成符合缺一门规则的黑格位置
 */
function generate_missing_cells(size) {
    const missingCells = [];
    const usedRows = new Set();
    const usedCols = new Set();
    const usedBoxes = new Set();
    
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    
    // 随机生成每行的黑格位置
    for (let row = 0; row < size; row++) {
        let col;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            col = Math.floor(Math.random() * size);
            attempts++;
            
            if (attempts > maxAttempts) {
                // 如果尝试次数过多，重新开始生成
                return generate_missing_cells(size);
            }
        } while (
            usedCols.has(col) || 
            usedBoxes.has(get_box_index(row, col, boxSize))
        );
        
        missingCells.push({ row, col });
        usedRows.add(row);
        usedCols.add(col);
        usedBoxes.add(get_box_index(row, col, boxSize));
    }
    
    return missingCells;
}

/**
 * 获取宫索引
 */
function get_box_index(row, col, boxSize) {
    const boxRow = Math.floor(row / boxSize[0]);
    const boxCol = Math.floor(col / boxSize[1]);
    return boxRow * boxSize[1] + boxCol;
}

const SYMMETRY_TYPES = ['horizontal', 'vertical', 'central', 'diagonal', 'anti-diagonal'];

/**
 * 生成缺一门数独题目
 */
export function generate_missing_puzzle(size) {
    let puzzle, solution, missingCells;
    // do {    
    //     log_process('', true);

    //     // 1. 重置盘面 - 清除所有数字和标记
    //     const container = document.querySelector('.sudoku-container');
    //     const inputs = container.querySelectorAll('input');
        
    //     // 清除所有数字
    //     inputs.forEach(input => {
    //         input.value = '';
    //         input.disabled = false;
    //         input.style.backgroundColor = '';
    //         input.style.color = '';
    //         input.classList.remove('solution-cell');
    //     });
        
    //     // 清除所有黑格标记
    //     const cells = container.querySelectorAll('.sudoku-cell');
    //     cells.forEach(cell => {
    //         cell.style.backgroundColor = '';
    //     });
        
    //     // 重置黑格数组
    //     missing_cells = [];
    //     is_missing_mode_active = false;
        
    //     // 1. 生成终盘和黑格位置
    //     const { board: solution, missingCells } = generate_missing_solution(size);
        
    //     // 2. 创建可挖洞的盘面副本
    //     const puzzle = solution.map(row => [...row]);
        
    //     // 3. 随机挖洞（保留黑格）
    //     // dig_missing_holes(puzzle, size, missingCells);
    //     const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
    //     // dig_missing_holes(puzzle, size, missingCells, symmetry);
    //     const digResult = dig_missing_holes(puzzle, size, missingCells, symmetry);
    //     if (digResult !== false) {
    //         break; // 挖洞成功，退出循环
    //     }
    // } while (true);

    do {
        log_process('', true);
        
        // 1. 重置盘面
        const container = document.querySelector('.sudoku-container');
        if (!container) return;
        
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
            input.disabled = false;
            input.style.backgroundColor = '';
            input.style.color = '';
            input.classList.remove('solution-cell');
        });
        
        const cells = container.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => {
            cell.style.backgroundColor = '';
        });
        
        missing_cells = [];
        is_missing_mode_active = false;
        
        // 2. 生成新终盘
        const result = generate_missing_solution(size);
        solution = result.board;
        missingCells = result.missingCells;
        
        // 3. 创建可挖洞的盘面副本
        puzzle = solution.map(row => [...row]);
        
        // 4. 尝试挖洞
        const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
        const digResult = dig_missing_holes(puzzle, size, missingCells, symmetry);
        
        if (digResult !== false) {
            break; // 挖洞成功，退出循环
        }
        
    } while (true);
    

    // 4. 填充到网格
    const container = document.querySelector('.sudoku-container');
    
    // 先清除现有标记
    // clear_marks();
    
    // 设置黑格标记
    missingCells.forEach(({row, col}) => {
        toggle_missing_cell(row, col);
    });
    
    // 填充数字
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            if (puzzle[i][j] > 0) {
                input.value = puzzle[i][j];
            } else if (puzzle[i][j] === 0) {
                input.value = '';
            }
        }
    }
    
    backup_original_board();
    show_result(`已生成${size}宫格缺一门数独题目`);

    // 4. 验证题目唯一性并显示技巧统计
    const testBoard = puzzle.map(row => [...row]);
    // const testBoard = puzzle.map(row => 
    //     row.map(cell => cell === 0 ? 
    //         [...Array(size)].map((_, n) => n + 1) :  // 空格转为全候选数
    //         cell  // 已有数字保持不变
    //     )
    // );
    const result = missing_solve(testBoard, size, missingCells, true);
    if (result.techniqueCounts) {
        log_process("\n=== 技巧使用统计 ===");
        for (const [technique, count] of Object.entries(result.techniqueCounts)) {
            if (count > 0) {
                log_process(`${technique}: ${count}次`);
            }
        }
    }
    
    return {
        puzzle,
        solution,
        missingCells
    };
}


/**
 * 挖洞函数（保留黑格，支持对称挖洞）
 */
function dig_missing_holes(puzzle, size, missingCells, symmetry = 'none') {
    // 收集所有可挖洞的位置（非黑格）
    const positions = [];
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (!missingCells.some(c => c.row === i && c.col === j)) {
                positions.push(i * size + j);
            }
        }
    }
    shuffle(positions);
    
    let holesDug = 0;
    let changed;
    
    do {
        changed = false;
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            const row = Math.floor(pos / size);
            const col = pos % size;
            
            if (puzzle[row][col] === 0) continue;
            
            // 获取对称位置（过滤掉黑格）
            const symmetricPositions = get_symmetric_positions(row, col, size, symmetry)
                // .filter(([r, c]) => !missingCells.some(cell => cell.row === r && cell.col === c));
            // 检查是否有对称位置是黑格
            const hasSymmetricBlackCell = symmetricPositions.some(([r, c]) => 
                missingCells.some(cell => cell.row === r && cell.col === c)
            );
            
            // // 如果有对称位置是黑格，则跳过不挖
            // if (hasBlackCellInSymmetry) continue;

            // 如果对称位置是黑格，则直接挖除当前格
            // if (hasSymmetricBlackCell) {
            //     puzzle[row][col] = 0;
            //     holesDug++;
            //     changed = true;
            //     continue;
            // }
            if (hasSymmetricBlackCell) {
                // 临时保存数字
                const tempValue = puzzle[row][col];
                
                // 尝试挖洞
                puzzle[row][col] = 0;
                
                // 验证唯一解
                const testBoard = puzzle.map(row => [...row]);
                const { solutionCount } = missing_solve(
                    testBoard, 
                    size,
                    missingCells,
                    true
                );
                
                if (solutionCount === 1) {
                    holesDug++;
                    changed = true;
                    continue; // 成功挖洞，继续下一个位置
                } else {
                    return false;
                }
            }

            // // 否则正常处理对称挖洞
            // // 过滤掉黑格
            // const validSymmetricPositions = symmetricPositions.filter(([r, c]) => 
            //     !missingCells.some(cell => cell.row === r && cell.col === c)
            // );
            
            // 所有要挖的位置（包括对称位置）
            const positionsToDig = [ [row, col], ...symmetricPositions ];
            
            // 临时保存数字
            const tempValues = positionsToDig.map(([r, c]) => puzzle[r][c]);
            
            // 尝试挖洞
            for (const [r, c] of positionsToDig) {
                puzzle[r][c] = 0;
            }
            
            // 验证唯一解
            const testBoard = puzzle.map(row => [...row]);
            const { solutionCount } = missing_solve(
                testBoard, 
                size,
                missingCells,
                true
            );
            
            if (solutionCount === 1) {
                holesDug += positionsToDig.length;
                changed = true;
            } else {
                // 恢复数字
                positionsToDig.forEach(([r, c], idx) => {
                    puzzle[r][c] = tempValues[idx];
                });
            }
        }
    } while (changed);
    
    // log_process(`实际挖洞数: ${holesDug}，对称模式: ${symmetry}`);
    log_process(`生成${size}宫格缺一门数独，实际挖洞数: ${holesDug}，对称模式: ${symmetry}`);
    return holesDug;
}

// ... rest of existing code ...