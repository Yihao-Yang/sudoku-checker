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
    fill_solution
} from './core.js';
import { state } from './state.js';

let is_missing_mode_active = false;
let missing_cells = [];

/**
 * 创建缺一门数独网格
 */
export function create_missing_sudoku(size = 9) {
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

// /**
//  * 切换格子标记状态
//  */
// function toggle_missing_cell(row, col) {
//     const container = document.querySelector('.sudoku-container');
//     const cell = container.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
//     const input = cell.querySelector('input');
    
//     // 检查是否已标记
//     const index = missing_cells.findIndex(c => c.row === row && c.col === col);
    
//     if (index >= 0) {
//         // 移除标记
//         cell.style.backgroundColor = '';
//         input.disabled = false;
//         missing_cells.splice(index, 1);
//         // cell.style.backgroundColor = '';
//         // input.style.backgroundColor = '';
//     } else {
//         // 添加标记
//         cell.style.backgroundColor = '#000';
//         input.disabled = true;
//         input.value = '';
//         missing_cells.push({ row, col, element: cell });
//         // cell.style.backgroundColor = '#000';
//         // input.style.backgroundColor = 'transparent'; // 关键修改：输入框透明
//         // input.style.color = 'transparent'; // 隐藏可能残留的文字
//     }
// }

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
 * 验证缺一门数独唯一性
 */
export function check_missing_uniqueness() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    // 1. 检查黑格数量是否符合要求
    if (!validate_missing_cells_count(size)) {
        return;
    }
    
    // 2. 收集当前盘面数据
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            // 如果是黑格，记为0
            if (missing_cells.some(c => c.row === i && c.col === j)) {
                return 0;
            }
            
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const val = input ? parseInt(input.value) : NaN;
            return isNaN(val) ? 0 : val;
        })
    );
    
    let solutionCount = 0;
    let solution = null;

    // 主求解函数
    function solve() {
        // 先尝试逻辑求解
        const logicalResult = solve_By_Logic(board, size);
        
        // 如果逻辑求解未完成，则尝试暴力求解
        if (!logicalResult.isSolved) {
            solve_By_BruteForce();
        }
    }

    // 逻辑求解函数
    function solve_By_Logic(board, size) {
        let changed;
        do {
            changed = false;
            
            // 1. 唯一候选数法
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    if (board[row][col] !== 0 || missing_cells.some(c => c.row === row && c.col === col)) {
                        continue;
                    }
                    
                    const possible = getPossibleNumbers(row, col, board, size);
                    if (possible.length === 1) {
                        board[row][col] = possible[0];
                        changed = true;
                    }
                }
            }
            
            // 2. 隐式唯一候选数法
            if (!changed) {
                for (let num = 1; num <= size; num++) {
                    // 检查行
                    for (let row = 0; row < size; row++) {
                        const possibleCols = [];
                        for (let col = 0; col < size; col++) {
                            if (board[row][col] === 0 && 
                                !missing_cells.some(c => c.row === row && c.col === col) &&
                                isValidMissingPlacement(row, col, num, board, size)) {
                                possibleCols.push(col);
                            }
                        }
                        if (possibleCols.length === 1) {
                            board[row][possibleCols[0]] = num;
                            changed = true;
                        }
                    }
                    
                    // 检查列
                    for (let col = 0; col < size; col++) {
                        const possibleRows = [];
                        for (let row = 0; row < size; row++) {
                            if (board[row][col] === 0 && 
                                !missing_cells.some(c => c.row === row && c.col === col) &&
                                isValidMissingPlacement(row, col, num, board, size)) {
                                possibleRows.push(row);
                            }
                        }
                        if (possibleRows.length === 1) {
                            board[possibleRows[0]][col] = num;
                            changed = true;
                        }
                    }
                }
            }
        } while (changed);

        // 检查是否已完全解出
        let isSolved = true;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (board[i][j] === 0 && !missing_cells.some(c => c.row === i && c.col === j)) {
                    isSolved = false;
                    break;
                }
            }
            if (!isSolved) break;
        }

        if (isSolved) {
            solutionCount = 1;
            solution = board.map(row => [...row]);
            return { isSolved: true };
        }

        return { isSolved: false };
    }

    // 暴力求解函数
    function solve_By_BruteForce(r = 0, c = 0) {
        if (solutionCount >= 2) return;
        if (r === size) {
            solutionCount++;
            if (solutionCount === 1) {
                solution = board.map(row => [...row]);
            }
            return;
        }

        const nextRow = c === size - 1 ? r + 1 : r;
        const nextCol = (c + 1) % size;

        // 如果是黑格，跳过
        if (missing_cells.some(cell => cell.row === r && cell.col === c)) {
            solve_By_BruteForce(nextRow, nextCol);
            return;
        }

        // 如果已有数字，跳过
        if (board[r][c] !== 0) {
            solve_By_BruteForce(nextRow, nextCol);
            return;
        }

        // 尝试所有可能的数字
        for (let num = 1; num <= size; num++) {
            if (isValidMissingPlacement(r, c, num, board, size)) {
                board[r][c] = num;
                solve_By_BruteForce(nextRow, nextCol);
                if (solutionCount >= 2) return;
                board[r][c] = 0;
            }
        }
    }

    // 获取可能的数字
    function getPossibleNumbers(row, col, board, size) {
        const possible = [];
        for (let num = 1; num <= size; num++) {
            if (isValidMissingPlacement(row, col, num, board, size)) {
                possible.push(num);
            }
        }
        return possible;
    }

    solve(); // 调用主求解函数

    // 4. 显示结果
    if (solutionCount === 0) {
        show_result("当前缺一门数独无解！请检查数字和黑格标记是否正确。", 'error');
    } else if (solutionCount === 1) {
        show_result("当前缺一门数独有唯一解！", 'success');
        
        // 可选：填充唯一解
        if (confirm("是否要填充唯一解？")) {
            fill_solution(container, solution, size, missing_cells);
        }
    } else {
        show_result("当前缺一门数独有多个解！", 'error');
    }
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
    
    // 检查每宫
    const boxSize = Math.sqrt(size);
    for (let boxRow = 0; boxRow < boxSize; boxRow++) {
        for (let boxCol = 0; boxCol < boxSize; boxCol++) {
            const startRow = boxRow * boxSize;
            const startCol = boxCol * boxSize;
            
            const boxMissing = missing_cells.filter(c => 
                c.row >= startRow && c.row < startRow + boxSize &&
                c.col >= startCol && c.col < startCol + boxSize
            ).length;
            
            if (boxMissing !== 1) {
                show_result(`第${boxRow * boxSize + boxCol + 1}宫必须有且只有一个黑格，当前有${boxMissing}个`, 'error');
                return false;
            }
        }
    }
    
    return true;
}

/**
 * 检查数字放置是否有效（缺一门专用）
 */
function isValidMissingPlacement(row, col, num, board, size) {
    // 如果是黑格，直接返回true（黑格不填数字）
    if (missing_cells.some(c => c.row === row && c.col === col)) {
        return true;
    }
    
    // 检查行
    for (let i = 0; i < size; i++) {
        if (i !== col && board[row][i] === num) return false;
    }
    
    // 检查列
    for (let i = 0; i < size; i++) {
        if (i !== row && board[i][col] === num) return false;
    }
    
    // 检查宫
    const boxSize = Math.sqrt(size);
    const startRow = Math.floor(row / boxSize) * boxSize;
    const startCol = Math.floor(col / boxSize) * boxSize;
    
    for (let r = startRow; r < startRow + boxSize; r++) {
        for (let c = startCol; c < startCol + boxSize; c++) {
            if (r !== row && c !== col && board[r][c] === num) return false;
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