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
 * 专门用于缺一门数独的填充解决方案
 */
function fill_missing_solution(container, solution, size, missingCells) {
    // 填充解决方案，跳过黑格
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // 跳过黑格
            if (missingCells.some(c => c.row === row && c.col === col)) {
                continue;
            }

            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (input && solution[row][col] > 0 && (input.value === "" || input.value === "0")) {
                input.value = solution[row][col];
                input.classList.add("solution-cell");
            }
        }
    }
}

/**
 * 验证缺一门数独唯一性（修正版）
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
    
    // 4. 显示结果
    if (solutionCount === 0) {
        show_result("当前缺一门数独无解。", 'error');
    } else if (solutionCount === 1) {
        show_result("当前缺一门数独有唯一解！", 'success');
        
        // 可选：填充唯一解
        if (confirm("是否要填充唯一解？")) {
            fill_missing_solution(container, solution, size, missing_cells);
        }
    } else if (solutionCount > 50) {
        show_result("当前数独有多于50个解。");
    } else {
        show_result(`当前缺一门数独有${solutionCount}个解！`, 'error');
    }
}

/**
 * 验证当前盘面是否有效
 */
function isValidMissingBoard(board, size, missingCells) {
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // 跳过黑格和空格
            if (board[row][col] === -1 || board[row][col] === 0) continue;
            
            const num = board[row][col];
            board[row][col] = 0; // 临时清空当前位置
            
            const isValid = isValidMissingPlacement(row, col, num, board, size, missingCells);
            board[row][col] = num; // 恢复
            
            if (!isValid) return false;
        }
    }
    return true;
}


/**
 * 缺一门数独专用求解器
 */
function missing_solve(board, size, missingCells) {
    let solutionCount = 0;
    let firstSolution = null;

    // 首先验证当前盘面是否有效
    if (!isValidMissingBoard(board, size, missingCells)) {
        return { solutionCount: 0, solution: null };
    }
    
    // 如果盘面已经完整且有效，直接返回
    if (isBoardComplete(board, size, missingCells)) {
        return { solutionCount: 1, solution: cloneBoard(board) };
    }
    
    // 回溯求解

    function solve() {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                // 跳过黑格和已有数字的格子
                if (board[row][col] === -1 || board[row][col] > 0) continue;
                
                for (let num = 1; num <= size; num++) {
                    if (isValidMissingPlacement(row, col, num, board, size, missingCells)) {
                        board[row][col] = num;
                        
                        if (solve()) {
                            if (solutionCount === 0) {
                                // 保存第一个解
                                firstSolution = board.map(row => [...row]);
                            }
                            solutionCount++;
                            
                            // 如果已经找到2个解，提前终止
                            if (solutionCount > 50) return true;
                        }
                        
                        board[row][col] = 0; // 回溯
                    }
                }
                return false; // 当前格子没有有效数字
            }
        }
        return true; // 所有格子已填满
    }
    
    solve();
    return { solutionCount, solution: firstSolution };
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
 * 检查数字放置是否有效（改进版）
 */
function isValidMissingPlacement(row, col, num, board, size, missingCells) {
    // 检查行
    for (let c = 0; c < size; c++) {
        // 跳过黑格和当前列
        if (c === col || isMissingCell(row, c, missingCells)) continue;
        if (board[row][c] === num) return false;
    }
    
    // 检查列
    for (let r = 0; r < size; r++) {
        // 跳过黑格和当前行
        if (r === row || isMissingCell(r, col, missingCells)) continue;
        if (board[r][col] === num) return false;
    }
    
    // 检查宫 - 修改为与classic.js一致的宫格判断逻辑
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    const startRow = Math.floor(row / boxSize[0]) * boxSize[0];
    const startCol = Math.floor(col / boxSize[1]) * boxSize[1];
    
    for (let r = startRow; r < startRow + boxSize[0]; r++) {
        for (let c = startCol; c < startCol + boxSize[1]; c++) {
            // 跳过黑格和当前格子
            if ((r === row && c === col) || isMissingCell(r, c, missingCells)) continue;
            if (board[r][c] === num) return false;
        }
    }
    
    return true;
}

/**
 * 判断是否是黑格
 */
function isMissingCell(row, col, missingCells) {
    return missingCells.some(c => c.row === row && c.col === col);
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