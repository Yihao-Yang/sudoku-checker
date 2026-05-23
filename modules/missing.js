import { 
    show_result, 
    add_Extra_Button,
    create_base_grid,
    create_base_cell,
    add_base_input_handlers,
    handle_key_navigation,
    log_process,
    backup_original_board,
    show_generating_timer,
    hide_generating_timer
} from '../solver/core.js';
import { state, set_current_mode } from '../solver/state.js';
import { solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { create_technique_panel } from '../solver/classic.js';
import { shuffle, generate_puzzle } from '../solver/generate.js';

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
    set_current_mode('missing');
    show_result(`当前模式为缺一门数独`);
    log_process('', true);
    log_process('规则：');
    log_process('黑格：无需填写数字');
    log_process('');
    log_process('技巧：');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('若手动给的标记不合理可能会被代码忽视');
    log_process('');
    log_process('自动出题：');
    log_process('蓝色：自动添加标记出题');
    log_process('绿色：根据给定标记出题（功能未完成）');
    invalidate_regions_cache();
    missing_cells = [];

    // 修改技巧开关 - 关闭不适合缺一门数独的技巧
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,        
        Box_Pair_Block: true,   // 宫组合区块打开
        Row_Col_Block: true,    
        Box_Naked_Pair: true,   
        Row_Col_Naked_Pair: true, 
        Box_Hidden_Pair: true,  
        Row_Col_Hidden_Pair: true, 
        Box_Naked_Triple: true, 
        Row_Col_Naked_Triple: true, 
        Box_Hidden_Triple: true, 
        Row_Col_Hidden_Triple: true, 
        All_Quad: false,         
        Cell_Elimination: true,  
        Brute_Force: false
    };
        // 唯余法全部默认开启
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

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
            const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

            // 添加元素到DOM
            cell.appendChild(main_input);
            cell.appendChild(candidates_grid);
            grid.appendChild(cell);
            inputs[row][col] = main_input;

            // 添加输入处理
            add_base_input_handlers(main_input, size);

            // 添加键盘导航
            main_input.addEventListener('keydown', (e) => {
                handle_key_navigation(e, row, col, size, inputs);
            });
        }
    }

    container.appendChild(grid);
    
    // 添加缺一门数独专属按钮
    extraButtons.innerHTML = '';
    add_Extra_Button('缺一门', () => {create_missing_sudoku(size)});
    add_Extra_Button('添加标记', toggle_marking_mode);
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', () => generate_missing_puzzle(size));
    
    
    gridDisplay.appendChild(container);
    setup_missing_event_listeners();
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
    const board = Array.from({ length: size }, (_, i) =>
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
    const { solution_count, solution } = missing_solve(
        board, 
        size,
        missing_cells
    );
    state.solve_stats.solution_count = solution_count;
    
    if (state.solve_stats.solution_count === -1) {
        show_result("当前技巧无法解出");
    } else if (state.solve_stats.solution_count === 0 || state.solve_stats.solution_count === -2) {
        show_result("当前缺一门数独无解。", 'error');
    } else if (solution_count === 1) {
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
    } else if (solution_count > 50) {
        show_result("当前数独有多于50个解。");
    } else {
        show_result(`当前缺一门数独有${solution_count}个解！`, 'error');
    }
}

/**
 * 生成缺一门数独题目
 */
export async function generate_missing_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    show_result('正在生成题目，请稍候...');
    show_generating_timer();

    // 先让浏览器完成一次重绘，确保计时提示可见
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
    // 重置状态
    invalidate_regions_cache();

    let puzzle, solution, missingCells;

    while (true) {
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

        // 3. 把缺一门终盘喂给通用出题器，由 generate_puzzle 负责挖洞出题
        const generated = generate_puzzle(size, score_lower_limit, holes_count, solution);
        if (!generated || !generated.puzzle) {
            continue;
        }
        puzzle = generated.puzzle;

        // 4. 二次校验（缺一门求解器口径）
        const testBoard = puzzle.map(row => [...row]);
        const solveResult = missing_solve(testBoard, size, missingCells, true);
        if (solveResult.solution_count !== 1) {
            continue;
        }

        break;
    }

    // 4. 填充到网格
    const container = document.querySelector('.sudoku-container');
    
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
    const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
    show_result(`已生成${size}宫格缺一门数独题目（耗时${elapsed}秒）`);
    
    return {
        puzzle,
        solution,
        missingCells
    };
    } finally {
        hide_generating_timer();
    }
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
                        if (is_valid_missing(board, size, row, col, num)) {
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
 * 设置缺一门数独事件监听
 */
function setup_missing_event_listeners() {
    const container = document.querySelector('.sudoku-container');
    const cells = container.querySelectorAll('.sudoku-cell');
    
    cells.forEach(cell => {
        cell.addEventListener('click', function() {
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
    const btns = document.querySelectorAll('#extraButtons button');
    const btn = btns[1]; // 第二个按钮是“添加标记”
    
    
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
 * 验证当前盘面是否有效
 */
export function is_valid_missing(board, size, row, col, num) {
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
    if (silent) {
        state.silentMode = true;
    }
    else {
        state.silentMode = false;
    }
    
    // 如果盘面已经完整且有效，直接返回
    if (isBoardComplete(board, size, missingCells)) {
        return { solution_count: 1, solution: cloneBoard(board) };
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

    // 调用主求解函数
    const result = solve(candidateBoard, size, is_valid_missing, state.silentMode);
    
    // 处理结果
    if (result.solution_count === -2) {
        return { solution_count: -2, solution: null }; // 无解
    } else if (result.solution_count === -1) {
        return { solution_count: -1, solution: null, total_score: result.total_score }; // 技巧无法解出
    } else {
        // 过滤掉黑格
        const filteredSolution = result.solution?.map((row, i) => 
            row.map((cell, j) => 
                missingCells.some(c => c.row === i && c.col === j) ? -1 : cell
            )
        );
        return {
            solution_count: result.solution_count,
            solution: filteredSolution,
            total_score: result.total_score
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
 * 清除所有标记，保留数字
 */
export function clear_marks() {
    missing_cells.forEach(cell => {
        cell.element.style.backgroundColor = '';
        const input = cell.element.querySelector('input');
        input.disabled = false;
    });
    
    missing_cells = [];
    is_missing_mode_active = false;
    
    // 重置按钮文本
    const btns = document.querySelectorAll('#extraButtons button');
    const btn = btns[1]; // 第二个按钮
    if (btn) btn.textContent = '添加标记';
    
    show_result("已清除所有黑格标记，保留数字", 'info');
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
