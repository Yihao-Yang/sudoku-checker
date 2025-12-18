import { create_skyscraper_sudoku } from '../modules/skyscraper.js';
import { create_vx_sudoku } from '../modules/vx.js';
import { create_candidates_sudoku } from '../modules/candidates.js';
import { state } from './state.js';
import { solve_By_Elimination } from './Technique.js';
import { check_uniqueness } from './classic.js';
import { clear_multi_diagonal_marks } from '../modules/multi_diagonal.js'
import { check_missing_uniqueness } from '../modules/missing.js';

// 文件名计数器，记录分值和技巧组合出现次数
const fileNameCounter = {};

/**
 * 显示结果消息
 */
export function show_result(message, type = 'info') {
    resultDisplay.textContent = message;
    resultDisplay.className = '';
    resultDisplay.classList.add(type);
}

/**
 * 显示中间过程日志
 */
export function log_process(message, clearBeforeLog = false) {
    let logContainer = document.getElementById('processLogContainer');
    
    // 如果需要先清空日志
    if (clearBeforeLog) {
        if (logContainer) {
            logContainer.innerHTML = '';  // 清空现有日志
        } else {
            logContainer = document.createElement('div');
            logContainer.id = 'processLogContainer';
            logContainer.style.position = 'absolute';
            logContainer.style.left = 'calc(50% + 350px)';  // 放在数独容器右侧
            logContainer.style.top = '290px';
            logContainer.style.width = '300px';
            logContainer.style.maxHeight = '500px';
            logContainer.style.overflowY = 'auto';
            logContainer.style.backgroundColor = '#f8f9fa';
            logContainer.style.borderRadius = '8px';
            logContainer.style.padding = '10px';
            logContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            document.body.appendChild(logContainer);
        }
    } else if (!logContainer) {
        logContainer = document.createElement('div');
        logContainer.id = 'processLogContainer';
        logContainer.style.position = 'absolute';
        logContainer.style.left = 'calc(50% + 350px)';
        logContainer.style.top = '290px';
        logContainer.style.width = '300px';
        logContainer.style.maxHeight = '500px';
        logContainer.style.overflowY = 'auto';
        logContainer.style.backgroundColor = '#f8f9fa';
        logContainer.style.borderRadius = '8px';
        logContainer.style.padding = '10px';
        logContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        document.body.appendChild(logContainer);
    }
    
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * 清除结果显示区域
 */
export function clear_result() {
    resultDisplay.textContent = '';
    resultDisplay.className = '';
}

// core.js (新增辅助函数)

/**
 * 创建基础数独网格结构
 */
export function create_base_grid(size, isSkyscraper = false) {
    state.current_grid_size = size;
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');

    const container = document.createElement('div');
    container.className = 'sudoku-container';

    const grid = document.createElement('div');
    grid.className = 'sudoku-grid';
    
    // 摩天楼模式需要额外的边线空间
    const gridSize = isSkyscraper ? size + 2 : size;
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 60px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, 60px)`;

    return { container, grid };
}


/**
 * 创建基础单元格和输入框
 */
export function create_base_cell(row, col, size, isSkyscraper = false) {
    // 创建单元格容器
    const cell = document.createElement('div');
    cell.className = 'sudoku-cell';
    cell.dataset.row = row;
    cell.dataset.col = col;

    // 创建主输入框
    const main_input = document.createElement('input');
    main_input.type = 'text';
    main_input.className = 'main-input';
    main_input.maxLength = size;
    main_input.dataset.row = row;
    main_input.dataset.col = col;

    // 创建候选数容器
    const candidates_grid = document.createElement('div');
    candidates_grid.className = 'candidates-grid';
    candidates_grid.style.display = 'none';
    // 设置候选数格子布局（和 classic.js 一样）
    const sub_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    candidates_grid.style.gridTemplateColumns = `repeat(${sub_size[1]}, 1fr)`;
    candidates_grid.style.gridTemplateRows = `repeat(${sub_size[0]}, 1fr)`;
    for (let n = 1; n <= size; n++) {
        const candidate_cell = document.createElement('div');
        candidate_cell.className = 'candidates-cell';
        candidate_cell.dataset.number = n;
        candidate_cell.textContent = n;
        candidate_cell.style.display = 'none';
        candidate_cell.style.gridArea = get_grid_area(n, sub_size);
        candidates_grid.appendChild(candidate_cell);
    }

    function get_grid_area(number, sub_size) {
        if (size === 6) {
            // 六宫格特殊布局 (2行3列)
            const row = Math.ceil(number / sub_size[1]);
            const col = ((number - 1) % sub_size[1]) + 1;
            return `${row} / ${col} / ${row} / ${col}`;
        } else {
            // 标准正方形宫格布局
            const row = Math.ceil(number / sub_size[0]);
            const col = ((number - 1) % sub_size[0]) + 1;
            return `${row} / ${col} / ${row} / ${col}`;
        }
    }

    // 添加加粗线以增强宫格感
    if (!isSkyscraper || (row > 0 && row < size + 1 && col > 0 && col < size + 1)) {
        bold_border(cell, isSkyscraper ? row - 1 : row, isSkyscraper ? col - 1 : col, size);
    }

    return { cell, main_input, candidates_grid };
}

/**
 * 添加基础输入事件处理
 */
export function add_base_input_handlers(input, size, isCandidatesMode = false) {
    input.addEventListener('input', function() {
        const maxValue = size;
        const regex = new RegExp(`[^1-${maxValue}]`, 'g');
        this.value = this.value.replace(regex, '');
        
        if (isCandidatesMode) {
            const inputNumbers = [...new Set(this.value.split(''))]
                .filter(c => c >= '1' && c <= maxValue.toString())
                .map(Number)
                .sort((a, b) => a - b);
            this.value = inputNumbers.join('');
        }
    });

    input.addEventListener('keydown', function(e) {
        if (e.key >= '1' && e.key <= size.toString()) {
            if (isCandidatesMode) {
                e.preventDefault();
                const num = parseInt(e.key);
                const currentNumbers = [...new Set(this.value.split('').map(Number))];
                const newNumbers = currentNumbers.includes(num)
                    ? currentNumbers.filter(n => n !== num)
                    : [...currentNumbers, num].sort((a, b) => a - b);
                this.value = newNumbers.join('');
                this.dispatchEvent(new Event('input'));
            } else if (this.value) {
                this.value = '';
            }
        }
    });
}

/**
 * 键盘导航处理函数
 */
export function handle_key_navigation(e, row, col, size, inputs) {
    const key = e.key;
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        
        let targetRow = row, targetCol = col;
        
        switch(key) {
            case 'ArrowUp': targetRow--; break;
            case 'ArrowDown': targetRow++; break;
            case 'ArrowLeft': targetCol--; break;
            case 'ArrowRight': targetCol++; break;
        }
        
        // 摩天楼模式有额外的边线空间
        const maxIndex = state.is_skyscraper_mode ? size + 1 : size - 1;
        if (targetRow >= 0 && targetRow <= maxIndex && targetCol >= 0 && targetCol <= maxIndex) {
            const targetInput = inputs[targetRow][targetCol];
            targetInput.focus();
            targetInput.select();
        }
    }
}

// 切换候选数模式函数
export function change_candidates_mode(inputs, size, is_skyscraper = false) {

    const is_candidates_mode = state.is_candidates_mode;

    const start_row = is_skyscraper ? 1 : 0;
    const end_row = is_skyscraper ? size : size - 1;
    const start_col = is_skyscraper ? 1 : 0;
    const end_col = is_skyscraper ? size : size - 1;

    for (let row = start_row; row <= end_row; row++) {
        if (!inputs[row] || !Array.isArray(inputs[row])) continue;
        for (let col = start_col; col <= end_col; col++) {
            const main_input = inputs[row][col];
            if (!main_input || !main_input.parentElement) continue;
            const cell = main_input.parentElement;
            const candidates_grid = cell.querySelector('.candidates-grid');
            let value = main_input.value.trim();

            if (is_candidates_mode && !value && main_input.dataset.candidates) {
                value = main_input.dataset.candidates;
                main_input.value = value;
            }
            
            if (is_candidates_mode) {
                // 判断是否为单个数字
                if (value.length === 1) {
                    // 只显示主输入框，不显示候选数网格
                    main_input.style.display = 'block';
                    main_input.classList.remove('hide-input-text');
                    if (candidates_grid) candidates_grid.style.display = 'none';
                } else {
                    // 多个数字，显示候选数网格
                    main_input.style.display = 'block';
                    main_input.classList.add('hide-input-text');
                    if (candidates_grid) {
                        update_candidates_display(main_input, candidates_grid, size);
                        candidates_grid.style.display = 'grid';
                    }
                }
                // // 切换到候选数模式
                // main_input.style.display = 'block';
                // main_input.classList.add('hide-input-text');
                // candidates_grid.style.display = 'grid';
                // update_candidates_display(main_input, candidates_grid, size);
            } else {
                // 切换回普通模式
                if (value.length > 1) {
                    // 多个数字，全部隐藏
                    // main_input.value = '';
                    main_input.dataset.candidates = main_input.value;
                    main_input.value = '';
                    // main_input.style.display = 'block';
                    // if (candidates_grid) candidates_grid.style.display = 'none';
                } 
                // else {
                //     // 单个数字或空，正常显示
                //     main_input.style.display = 'block';
                    main_input.classList.remove('hide-input-text');
                    if (candidates_grid) candidates_grid.style.display = 'none';
                // }
                // // 切换回普通模式
                // main_input.style.display = 'block';
                // main_input.classList.remove('hide-input-text');
                // candidates_grid.style.display = 'none';
            }
        }
    }

    // 辅助函数：更新候选数显示
    function update_candidates_display(main_input, candidates_grid, size) {
        const input_numbers = [...new Set(main_input.value.split(''))]
            .map(Number)
            .filter(n => !isNaN(n) && n >= 1 && n <= size);
        
        candidates_grid.querySelectorAll('.candidates-cell').forEach(cell => {
            const num = parseInt(cell.dataset.number);
            cell.style.display = input_numbers.includes(num) ? 'flex' : 'none';
        });
    }
}

export function show_logical_solution() {

    // 先备份当前状态
    if (!state.originalBoard) {
        backup_original_board();
    }

    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let input;
            if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
                input = container.querySelector(`input[data-row="${i + 1}"][data-col="${j + 1}"]`);
            } else {
                input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            }
            const cell = input.parentElement;
            const candidatesGrid = cell.querySelector('.candidates-grid');
            
            // 只修改空单元格或候选数单元格
            if (input.value === "" || state.originalBoard[i][j].isCandidateMode) {
                if (typeof state.logical_solution[i][j] === 'number') {
                    // 单个数字直接显示
                    input.value = state.logical_solution[i][j];
                    input.classList.add("solution-cell");
                    input.style.display = 'block';
                    input.classList.remove('hide-input-text');
                    if (candidatesGrid) candidatesGrid.style.display = 'none';
                    // 清除候选数记录
                    delete input.dataset.candidates;
                } else if (Array.isArray(state.logical_solution[i][j])) {
                    const candidates = state.logical_solution[i][j];
                    // 多个候选数显示候选数网格
                    // log_process(candidates);
                    if (state.is_candidates_mode) {
                        input.value = candidates.join('');
                        input.classList.add('hide-input-text');
                        input.style.display = 'block';
                        if (candidatesGrid) {
                            candidatesGrid.querySelectorAll('.candidates-cell').forEach(cell => {
                                const num = parseInt(cell.dataset.number);
                                cell.style.display = candidates.includes(num) ? 'flex' : 'none';
                            });
                            candidatesGrid.style.display = 'grid';
                        }
                        // 记录候选数
                        input.dataset.candidates = candidates.join('');
                    } else {
                        // 非候选数模式下不显示候选数网格，只清空输入框
                        // log_process(candidates);
                        // input.value = '';
                        input.dataset.candidates = candidates.join('');
                        input.style.display = 'block';
                        input.classList.remove('hide-input-text');
                        if (candidatesGrid) candidatesGrid.style.display = 'none';
                    }
                }
            }
        }
    }
}

// /**
//  * 基础求解函数
//  */
// export function base_solve(board, size, isValidFunc, saveSolution = false) {
//     let solution = null;
//     state.solve_stats.solution_count = 0;


//     function solve(r = 0, c = 0) {
//         if (state.solve_stats.solution_count >= 101) return;
//         if (r === size) {
//             state.solve_stats.solution_count++;
//             if (saveSolution && state.solve_stats.solution_count === 1) {
//                 solution = board.map(row => [...row]);
//             }
//             return;
//         }

//         const nextRow = c === size - 1 ? r + 1 : r;
//         const nextCol = (c + 1) % size;

//         if (board[r][c] !== 0) {
//             const num = board[r][c];
//             // Temporarily set the cell to 0 to check validity
//             board[r][c] = 0;
//             if (!isValidFunc(r, c, num)) {
//                 // Invalid starting board
//                 return { solution_count: 0, solution: null };
//             }
//             board[r][c] = num;
//             solve(nextRow, nextCol);
//         } else {
//             for (let num = 1; num <= size; num++) {
//                 if (isValidFunc(r, c, num)) {
//                     board[r][c] = num;
//                     solve(nextRow, nextCol);
//                     board[r][c] = 0;
//                 }
//             }
//         }
//     }

//     solve(0, 0);
//     return { solution_count: state.solve_stats.solution_count, solution };
// }

/**
 * 填充解决方案到网格
 */
export function fill_solution(container, solution, size, isSkyscraper = false) {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const row = isSkyscraper ? i + 1 : i;
            const col = isSkyscraper ? j + 1 : j;
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            
            if (input && solution[i][j] > 0 && (input.value === "" || input.value === "0")) {
                input.value = solution[i][j];
                input.classList.add("solution-cell");
            }
        }
    }
}

/**
 * 创建候选数网格
 */
export function create_candidates_grid(cell, size) {
    const candidatesGrid = document.createElement('div');
    candidatesGrid.className = 'candidates-grid';
    candidatesGrid.style.display = 'none';

    // const subSize = Math.sqrt(size);
    // candidatesGrid.style.gridTemplateColumns = `repeat(${subSize}, 1fr)`;
    // candidatesGrid.style.gridTemplateRows = `repeat(${subSize}, 1fr)`;
    const subSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    candidatesGrid.style.gridTemplateColumns = `repeat(${subSize[1]}, 1fr)`;
    candidatesGrid.style.gridTemplateRows = `repeat(${subSize[0]}, 1fr)`;
    
    for (let n = 1; n <= size; n++) {
        const candidateCell = document.createElement('div');
        candidateCell.className = 'candidates-cell';
        candidateCell.dataset.number = n;
        candidateCell.textContent = n;
        candidateCell.style.display = 'none';
        candidateCell.style.gridArea = getGridArea(n, subSize);
        candidatesGrid.appendChild(candidateCell);
    }

    return candidatesGrid;

    // function getGridArea(number, subSize) {
    //     const row = Math.ceil(number / subSize);
    //     const col = ((number - 1) % subSize) + 1;
    //     return `${row} / ${col} / ${row} / ${col}`;
    // }
    function getGridArea(number, subSize) {
        if (size === 6) {
            const row = Math.ceil(number / subSize[1]);
            const col = ((number - 1) % subSize[1]) + 1;
            return `${row} / ${col} / ${row} / ${col}`;
        } else {
            const row = Math.ceil(number / subSize[0]);
            const col = ((number - 1) % subSize[0]) + 1;
            return `${row} / ${col} / ${row} / ${col}`;
        }
    }
}

export function bold_border(cell, row, col, size) {
    // 计算宫格大小
    let boxRows, boxCols;
    if (size === 6) {
        boxRows = 2; boxCols = 3;
    } else {
        boxRows = Math.sqrt(size);
        boxCols = Math.sqrt(size);
    }

    // 四个方向的边框
    let borders = {
        top: '',
        left: '',
        right: '',
        bottom: ''
    };

    // 顶部边框
    if (row === 0) {
        borders.top = '5px solid #000';
    } else if (row % boxRows === 0) {
        borders.top = '2.5px solid #000';
    } else {
        borders.top = '0.75px solid #000';
    }
    // 左侧边框
    if (col === 0) {
        borders.left = '5px solid #000';
    } else if (col % boxCols === 0) {
        borders.left = '2.5px solid #000';
    } else {
        borders.left = '0.75px solid #000';
    }
    // 右侧边框
    if (col === size - 1) {
        borders.right = '5px solid #000';
    } else if ((col + 1) % boxCols === 0) {
        borders.right = '2.5px solid #000';
    } else {
        borders.right = '0.75px solid #000';
    }
    // 底部边框
    if (row === size - 1) {
        borders.bottom = '5px solid #000';
    } else if ((row + 1) % boxRows === 0) {
        borders.bottom = '2.5px solid #000';
    } else {
        borders.bottom = '0.75px solid #000';
    }

    cell.style.borderTop = borders.top;
    cell.style.borderLeft = borders.left;
    cell.style.borderRight = borders.right;
    cell.style.borderBottom = borders.bottom;
}

// 添加额外按钮
export function add_Extra_Button(label, handler, color = '#2196F3') {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.backgroundColor = '#2196F3';
    btn.style.borderRadius = '8px';
    btn.style.color = 'white';
    btn.style.padding = '10px 16px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    btn.addEventListener('click', handler);
    extraButtons.appendChild(btn);
}

// export function check_solution() {
//     const container = document.querySelector('.sudoku-container');
//     const isValidSet = arr => new Set(arr).size === arr.length;
//     const size = state.current_grid_size;
    
//     // 对于摩天楼数独，我们只检查内部的正方形区域
//     const startRow = state.is_skyscraper_mode ? 1 : 0;
//     const endRow = state.is_skyscraper_mode ? size + 1 : size;
//     const startCol = state.is_skyscraper_mode ? 1 : 0;
//     const endCol = state.is_skyscraper_mode ? size + 1 : size;
//     const actualSize = size; // 内部区域的实际大小

//     // 检查行
//     for (let row = startRow; row < endRow; row++) {
//         const rowValues = [];
//         for (let col = startCol; col < endCol; col++) {
//             const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
//             if (input && input.value) rowValues.push(input.value);
//         }
//         if (!isValidSet(rowValues)) return show_result("解答有误，请检查！");
//     }

//     // 检查列
//     for (let col = startCol; col < endCol; col++) {
//         const colValues = [];
//         for (let row = startRow; row < endRow; row++) {
//             const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
//             if (input && input.value) colValues.push(input.value);
//         }
//         if (!isValidSet(colValues)) return show_result("解答有误，请检查！");
//     }

//     // 检查宫
//     const boxSize = size === 6 ? [2, 3] : [Math.sqrt(actualSize), Math.sqrt(actualSize)];
//     for (let boxRow = startRow; boxRow < endRow; boxRow += boxSize[0]) {
//         for (let boxCol = startCol; boxCol < endCol; boxCol += boxSize[1]) {
//             const boxValues = [];
//             for (let r = 0; r < boxSize[0]; r++) {
//                 for (let c = 0; c < boxSize[1]; c++) {
//                     const input = container.querySelector(`input[data-row="${boxRow + r}"][data-col="${boxCol + c}"]`);
//                     if (input && input.value) boxValues.push(input.value);
//                 }
//             }
//             if (!isValidSet(boxValues)) return show_result("解答有误，请检查！");
//         }
//     }

//     show_result("恭喜！解答正确！");
// }


export function hide_solution() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    
    const solutionCells = container.querySelectorAll('.solution-cell');
    
    solutionCells.forEach(cell => {
        cell.value = '';
        cell.classList.remove('solution-cell');
    });
    
    show_result("已隐藏所有系统自动填充的答案和提示数字！");
}

export function clear_all_inputs() {
    // clear_multi_diagonal_marks();
    const container = document.querySelector('.sudoku-container');
    if (!container) return;

    const size = 2 * state.current_grid_size;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            if (!input) continue;
            
            // 清除输入框值
            input.value = '';

            // 重置单元格样式为出题样式
            input.classList.remove("solution-cell");
            input.classList.remove("hide-input-text");
            input.style.color = ""; // 重置颜色
            input.style.backgroundColor = ""; // 重置背景色
            
            // 如果是候选数模式，还需要清除候选数显示
            if (state.is_candidates_mode) {
                const cell = input.parentElement;
                const candidatesGrid = cell.querySelector('.candidates-grid');
                if (candidatesGrid) {
                    candidatesGrid.querySelectorAll('.candidates-cell').forEach(cell => {
                        cell.style.display = 'none';
                    });
                }
            }
        }
    }
    
    show_result("已清除所有数字！", 'info');
}
export function clear_inner_numbers() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;

    const size = state.current_grid_size;

    // 清除内部（1..size）的值与样式，行为与 clear_all_inputs 对齐，但只作用于内圈
    for (let row = 1; row <= size; row++) {
        for (let col = 1; col <= size; col++) {
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (!input) continue;

            // 清除输入框值
            input.value = '';

            // 重置样式与类
            input.classList.remove("solution-cell");
            input.classList.remove("hide-input-text");
            input.style.color = "";
            input.style.backgroundColor = "";

            // 清除候选数相关记录
            delete input.dataset.candidates;
            if (state.is_candidates_mode) {
                const cell = input.parentElement;
                const candidatesGrid = cell?.querySelector('.candidates-grid');
                if (candidatesGrid) {
                    candidatesGrid.querySelectorAll('.candidates-cell').forEach(cc => {
                        cc.style.display = 'none';
                    });
                    // 保持候选数网格隐藏
                    candidatesGrid.style.display = 'none';
                }
            }
        }
    }

    show_result("已清除所有内部数字！", 'info');
}
export function clear_outer_clues() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;

    const size = state.current_grid_size;

    // 清除顶部/底部外部提示（row 0 和 row size+1）
    for (let col = 1; col <= size; col++) {
        const top = container.querySelector(`input[data-row="0"][data-col="${col}"]`);
        const bottom = container.querySelector(`input[data-row="${size + 1}"][data-col="${col}"]`);
        [top, bottom].forEach(input => {
            if (!input) return;
            input.value = '';
            input.classList.remove("solution-cell");
            input.classList.remove("hide-input-text");
            input.style.color = "";
            input.style.backgroundColor = "";
            delete input.dataset.candidates;
            if (state.is_candidates_mode) {
                const cell = input.parentElement;
                const candidatesGrid = cell?.querySelector('.candidates-grid');
                if (candidatesGrid) {
                    candidatesGrid.querySelectorAll('.candidates-cell').forEach(cc => cc.style.display = 'none');
                    candidatesGrid.style.display = 'none';
                }
            }
        });
    }

    // 清除左侧/右侧外部提示（col 0 和 col size+1）
    for (let row = 1; row <= size; row++) {
        const left = container.querySelector(`input[data-row="${row}"][data-col="0"]`);
        const right = container.querySelector(`input[data-row="${row}"][data-col="${size + 1}"]`);
        [left, right].forEach(input => {
            if (!input) return;
            input.value = '';
            input.classList.remove("solution-cell");
            input.classList.remove("hide-input-text");
            input.style.color = "";
            input.style.backgroundColor = "";
            delete input.dataset.candidates;
            if (state.is_candidates_mode) {
                const cell = input.parentElement;
                const candidatesGrid = cell?.querySelector('.candidates-grid');
                if (candidatesGrid) {
                    candidatesGrid.querySelectorAll('.candidates-cell').forEach(cc => cc.style.display = 'none');
                    candidatesGrid.style.display = 'none';
                }
            }
        });
    }

    show_result("已清除所有外部提示数字！", 'info');
}

export function clear_marks() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    container.querySelectorAll('.vx-mark').forEach(mark => mark.remove());
}

export function import_sudoku_from_string() {
    const sudokuString = document.getElementById('sudokuString').value.trim();
    if (!sudokuString) {
        show_result('请输入数独字符串！');
        return;
    }

    if (!state.current_grid_size) {
        show_result('请先选择数独大小！');
        return;
    }

    clear_all_inputs();

    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    let index = 0;
    const cells = sudokuString.split(',');

    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
        for (let i = 0; i < size && index < sudokuString.length; i++) {
            for (let j = 0; j < size && index < sudokuString.length; j++) {
                const char = sudokuString[index++];
                if (char !== '.' && char !== '0') {
                    const input = container.querySelector(`input[data-row="${i + 1}"][data-col="${j + 1}"]`);
                    if (input) input.value = char;
                }
            }
        }
    } else if (state.is_candidates_mode) {
        // 候选数模式导入
        for (let i = 0; i < size * size && i < cells.length; i++) {
            const row = Math.floor(i / size);
            const col = i % size;
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (!input) continue;
            
            const cellContent = cells[i].trim();
            if (cellContent === '.') {
                input.value = '';
            } else {
                // 提取所有有效数字作为候选数
                const candidates = [...cellContent].filter(c => 
                    c >= '1' && c <= size.toString()
                ).join('');
                input.value = candidates;
                input.dispatchEvent(new Event('input')); // 触发候选数更新
            }
        }
    } else {
        for (let i = 0; i < size && index < sudokuString.length; i++) {
            for (let j = 0; j < size && index < sudokuString.length; j++) {
                const char = sudokuString[index++];
                if (char !== '.' && char !== '0') {
                    const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                    if (input) input.value = char;
                }
            }
        }
    }

    show_result('题目导入完成！');
}

export function export_sudoku_to_string() {
    if (!state.current_grid_size) {
        show_result('请先选择数独大小！');
        return;
    }

    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    // let result = "";
    let result = [];

    if (state.is_skyscraper_mode) {
        for (let i = 0; i < size + 2; i++) {
            for (let j = 0; j < size + 2; j++) {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const value = input?.value.trim();
                result += (value === "" || value === "0") ? "." : value;
            }
        }
    } else if (state.is_candidates_mode) {
        // 候选数模式导出
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const value = input?.value.trim();
                result.push(value ? value : '.');
            }
        }
    } else {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const value = input?.value.trim();
                result += (value === "" || value === "0") ? "." : value;
            }
        }
    }

    document.getElementById("exportedString").value = result;
    show_result('题目导出成功！');
}

/**
 * 备份当前题目状态
 */
export function backup_original_board() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    state.originalBoard = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            return {
                value: input.value,
                isCandidateMode: state.is_candidates_mode,
                displayStyle: input.style.display,
                classList: [...input.classList]
            };
        })
    );
}

export function restore_original_board() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    if (!state.originalBoard) return;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const original = state.originalBoard[i][j];
            const candidatesGrid = input.parentElement.querySelector('.candidates-grid');
            
            // 完全恢复原始值
            input.value = original.value;
            input.className = 'main-input';
            input.classList.remove("solution-cell");
            original.classList.forEach(cls => input.classList.add(cls));
            
            // 恢复候选数显示
            if (candidatesGrid) {
                if (original.isCandidateMode) {
                    const nums = original.value ? [...original.value].map(Number).filter(n => !isNaN(n)) : [];
                    candidatesGrid.querySelectorAll('.candidates-cell').forEach(cell => {
                        const num = parseInt(cell.dataset.number);
                        cell.style.display = nums.includes(num) ? 'flex' : 'none';
                    });
                    candidatesGrid.style.display = 'grid';
                    input.classList.add('hide-input-text');
                } else {
                    candidatesGrid.style.display = 'none';
                    input.classList.remove('hide-input-text');
                }
            }
        }
    }
    
    // 恢复模式状态
    state.is_candidates_mode = state.originalBoard[0][0].isCandidateMode;
    document.getElementById('toggleCandidatesMode').textContent = 
        state.is_candidates_mode ? '退出候选数模式' : '切换候选数模式';
}

export function save_sudoku_as_image(is_puzzle = true) {
    const container = document.querySelector('.sudoku-container');
    if (!container) {
        show_result('请先创建数独网格！', 'error');
        return;
    }

    
    if (is_puzzle) {
        if (state.current_mode === 'missing') {
            check_missing_uniqueness();
        } else {
            check_uniqueness();
        }
        hide_solution();
    }

    // 统计信息
    const score = state.solve_stats.total_score || 0;
    const technique_counts = state.solve_stats.technique_counts || {};
    // 获取当前题型
    const mode = state.current_mode || 'classic';
    // 题型中文名称映射表
    const mode_name_map = {
        'classic': '标准',
        'candidates': '候选数',
        'diagonal': '对角线',
        'anti_diagonal': '反对角',
        'hashtag': '斜井',
        'multi_diagonal': '斜线',
        'VX': 'VX',
        'kropki': '黑白点',
        'consecutive': '连续',
        'missing': '缺一门',
        'window': '窗口',
        'pyramid': '金字塔',
        'isomorphic': '同位',
        'extra_region': '额外区域',
        'renban': '灰格连续',
        'fortress': '堡垒',
        'clone': '克隆',
        'anti_king': '无缘',
        'anti_knight': '无马',
        'anti_elephant': '无象',
        'exclusion': '排除',
        'quadruple': '四格提示',
        'add': '加法',
        'product': '乘积',
        'ratio': '比例',
        'inequality': '不等号',
        'odd': '奇数',
        'odd_even': '奇偶',
        'palindrome': '回文',
        'skyscraper': '摩天楼',
        'X_sums': 'X和',
        'sandwich': '三明治',
        'new': '新'
    };
    // 获取题型中文名称
    const mode_name = mode_name_map[mode] || mode;
    
    // // technique_counts 转为字符串，如 naked_single_2_hidden_pair_1
    // 判断是否有非零技巧
    const hasTechnique = Object.values(technique_counts).some(count => count > 0);

    // 仅当有技巧统计且次数大于0时才输出技巧字符串
    let technique_str = '';
    if (hasTechnique) {
        const counts = Object.entries(technique_counts).filter(([_, count]) => count > 0);
        
        // 分组
        const groups = {};
        counts.forEach(([tech, count]) => {
            // 匹配 "名称_数字" 格式，例如 "宫排除_3"
            const match = tech.match(/^(.*)_(\d+)$/);
            if (match) {
                const name = match[1];
                const num = match[2];
                if (!groups[name]) groups[name] = [];
                groups[name].push(`${num}x${count}`); // 使用 x 连接后缀和次数
            } else {
                // 不带数字后缀的技巧
                if (!groups[tech]) groups[tech] = [];
                groups[tech].push(`${count}`);
            }
        });

        // 拼接
        technique_str = Object.entries(groups).reverse().map(([name, values]) => {
            // 检查 values 中的元素是否包含 x，判断是否是带后缀的技巧
            const isSuffixGroup = values.some(v => v.includes('x'));
            
            if (isSuffixGroup) {
                // 带后缀的技巧，合并为：名称_后缀x次数_后缀x次数...
                return `${name}${values.join('_')}`;
            } else {
                // 不带后缀的技巧，直接：名称_次数
                return `${name}${values[0]}`;
            }
        }).join('_');
        // }).join('');

        // 简化名称以缩短文件名
        technique_str = technique_str
            .replace(/排除/g, '')
            .replace(/唯余法/g, '余')
            .replace(/区块/g, '区')
            .replace(/特定组合/g, '特')
            .replace(/组合/g, '组')
            .replace(/额外区域/g, '额')
            .replace(/行列/g, '行')
            .replace(/变型/g, '变')
            .replace(/隐性/g, '隐')
            .replace(/显性/g, '显')
            .replace(/数对/g, '对')
            .replace(/数组/g, '组');
    }

    // 创建临时容器只包含需要截图的部分
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.backgroundColor = null;//'#f4f7fb'; // 匹配页面背景色
    tempContainer.style.padding = '0px';
    tempContainer.style.borderRadius = '8px';
    
    // 克隆数独容器和结果显示
    const clone = container.cloneNode(true);
    // const resultClone = document.getElementById('resultDisplay').cloneNode(true);
    
    const inputs = clone.querySelectorAll('input');
    inputs.forEach(input => {
        const span = document.createElement('span');
        span.textContent = input.value;
        span.className = input.className;
        span.style.display = 'inline-flex';
        span.style.justifyContent = 'center';
        span.style.alignItems = 'center';
        span.style.width = input.style.width || '80%';
        span.style.height = input.style.height || '80%';
        span.style.fontSize = input.style.fontSize || '48px';
        span.style.fontFamily = 'Arial, sans-serif';
        span.style.fontWeight = 'normal';
        span.style.border = 'none';
        span.style.background = 'transparent';
        span.style.boxSizing = 'border-box';
        span.style.textAlign = 'center';
        span.style.lineHeight = 'normal'; // 避免基线错位
        input.replaceWith(span);
    });

    tempContainer.appendChild(clone);
    // tempContainer.appendChild(resultClone);
    document.body.appendChild(tempContainer);

    html2canvas(tempContainer, {
        backgroundColor: null,
        scale: 10,
        logging: false,
        useCORS: true,
        allowTaint: true,
        // 禁用抗锯齿
        imageSmoothingEnabled: false
    }).then(canvas => {
        // 移除临时容器
        document.body.removeChild(tempContainer);

        // 文件名唯一性处理
    const key = `${mode_name}_${score}_${technique_str}_${is_puzzle ? '题目' : '答案'}`;
    if (!fileNameCounter[key]) {
        fileNameCounter[key] = 1;
    } else {
        fileNameCounter[key]++;
    }
    const count = fileNameCounter[key];

    // 文件名格式：分值_分值_技巧_题目/答案_序号.png
    const fileName = `${mode_name}_${score}_${technique_str}_${is_puzzle ? '题目' : '答案'}_${count}.png`;
        
        // // 创建下载链接
        // const link = document.createElement('a');
        // link.download = 'sudoku-' + new Date().toISOString().slice(0, 10) + (is_puzzle ? '-puzzle' : '-solution') + '.png';
        // link.href = canvas.toDataURL('image/png');
        // link.click();

        // 文件名格式：sudoku_2025_08_11_puzzle_score_XX_technique_xxx.png
    // const fileName = `分值_${score}_${technique_str}_${is_puzzle ? '题目' : '答案'}.png`;
    // const fileName = `score_${score}_technique_${technique_str}.png`;

    // 创建下载链接
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
        
        // show_result('数独已保存为图片！', 'success');
        show_result(is_puzzle ? '数独题目已保存为图片！' : '数独解答已保存为图片！', 'success');

        // 如果是题目模式，自动解题并保存解答图片
        if (is_puzzle) {
            // check_uniqueness();
            if (state.current_mode === 'missing') {
                check_missing_uniqueness();
            } else {
                check_uniqueness();
            }
            setTimeout(() => {
                save_sudoku_as_image(false);
            }, 500); // 延迟，确保解答已填充
        }
    }).catch(err => {
        // document.body.removeChild(tempContainer);
        show_result('保存图片失败: ' + err.message, 'error');
    });
}
