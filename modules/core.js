import { create_skyscraper_sudoku } from './skyscraper.js';
import { create_vx_sudoku } from './vx.js';
import { create_candidates_sudoku } from './candidates.js';
import { state } from './state.js';
import { solve_By_Elimination } from '../solver/Technique.js';


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
            logContainer.style.marginTop = '10px';
            logContainer.style.width = '80%';
            logContainer.style.maxWidth = '800px';
            resultDisplay.parentNode.insertBefore(logContainer, resultDisplay.nextSibling);
        }
    } else if (!logContainer) {
        logContainer = document.createElement('div');
        logContainer.id = 'processLogContainer';
        logContainer.style.marginTop = '10px';
        logContainer.style.width = '80%';
        logContainer.style.maxWidth = '800px';
        resultDisplay.parentNode.insertBefore(logContainer, resultDisplay.nextSibling);
    }
    
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logContainer.appendChild(logEntry);
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
    const cell = document.createElement('div');
    cell.className = 'sudoku-cell';
    cell.dataset.row = row;
    cell.dataset.col = col;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = isSkyscraper ? 1 : size;
    input.dataset.row = row;
    input.dataset.col = col;

    // 添加加粗线以增强宫格感
    if (!isSkyscraper || (row > 0 && row < size + 1 && col > 0 && col < size + 1)) {
        bold_border(cell, isSkyscraper ? row - 1 : row, isSkyscraper ? col - 1 : col, size);
    }

    return { cell, input };
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
export function change_Candidates_Mode(inputs, size, isCandidatesMode, isSkyscraper = false) {
    const startRow = isSkyscraper ? 1 : 0;
    const endRow = isSkyscraper ? size : size - 1;
    const startCol = isSkyscraper ? 1 : 0;
    const endCol = isSkyscraper ? size : size - 1;

    for (let row = startRow; row <= endRow; row++) {
        if (!inputs[row] || !Array.isArray(inputs[row])) continue;
        for (let col = startCol; col <= endCol; col++) {
            const mainInput = inputs[row][col];
            if (!mainInput || !mainInput.parentElement) continue;
            const cell = inputs[row][col].parentElement;
            const candidatesGrid = cell.querySelector('.candidates-grid');
            
            if (isCandidatesMode) {
                // 切换到候选数模式
                mainInput.style.display = 'block';
                mainInput.classList.add('hide-input-text');
                candidatesGrid.style.display = 'grid';
                
                // 更新候选数显示
                updateCandidatesDisplay(mainInput, candidatesGrid, size);
            } else {
                // 切换回普通模式
                mainInput.style.display = 'block';
                mainInput.classList.remove('hide-input-text');
                candidatesGrid.style.display = 'none';
            }
        }
    }

    // 辅助函数：更新候选数显示 (保持原状)
    function updateCandidatesDisplay(mainInput, candidatesGrid, size) {
        const inputNumbers = [...new Set(mainInput.value.split(''))]
            .map(Number)
            .filter(n => !isNaN(n) && n >= 1 && n <= size);
        
        candidatesGrid.querySelectorAll('.candidates-cell').forEach(cell => {
            const num = parseInt(cell.dataset.number);
            cell.style.display = inputNumbers.includes(num) ? 'flex' : 'none';
        });
    }
}

/**
 * 基础求解函数
 */
export function base_solve(board, size, isValidFunc, saveSolution = false) {
    let solution = null;
    let solutionCount = 0;


    function solve(r = 0, c = 0) {
        if (solutionCount >= 101) return;
        if (r === size) {
            solutionCount++;
            if (saveSolution && solutionCount === 1) {
                solution = board.map(row => [...row]);
            }
            return;
        }

        const nextRow = c === size - 1 ? r + 1 : r;
        const nextCol = (c + 1) % size;

        if (board[r][c] !== 0) {
            const num = board[r][c];
            // Temporarily set the cell to 0 to check validity
            board[r][c] = 0;
            if (!isValidFunc(r, c, num)) {
                // Invalid starting board
                return { solutionCount: 0, solution: null };
            }
            board[r][c] = num;
            solve(nextRow, nextCol);
        } else {
            for (let num = 1; num <= size; num++) {
                if (isValidFunc(r, c, num)) {
                    board[r][c] = num;
                    solve(nextRow, nextCol);
                    board[r][c] = 0;
                }
            }
        }
    }

    solve(0, 0);
    return { solutionCount, solution };
}

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
    // 加粗最外层边框（统一逻辑）
    if (row === 0) cell.classList.add('bold-top');
    if (col === 0) cell.classList.add('bold-left');
    if (col === size - 1) cell.classList.add('bold-right');
    if (row === size - 1) cell.classList.add('bold-bottom');

    // 加粗宫格线（根据尺寸判断）
    if (size === 4) {
        if (row === 2) cell.classList.add('bold-top');
        if (col === 2) cell.classList.add('bold-left');
    } else if (size === 6) {
        if (row === 2 || row === 4) cell.classList.add('bold-top');
        if (col === 3) cell.classList.add('bold-left');
    } else if (size === 9) {
        if (row === 3 || row === 6) cell.classList.add('bold-top');
        if (col === 3 || col === 6) cell.classList.add('bold-left');
    }
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

export function check_solution() {
    const container = document.querySelector('.sudoku-container');
    const isValidSet = arr => new Set(arr).size === arr.length;
    const size = state.current_grid_size;
    
    // 对于摩天楼数独，我们只检查内部的正方形区域
    const startRow = state.is_skyscraper_mode ? 1 : 0;
    const endRow = state.is_skyscraper_mode ? size + 1 : size;
    const startCol = state.is_skyscraper_mode ? 1 : 0;
    const endCol = state.is_skyscraper_mode ? size + 1 : size;
    const actualSize = size; // 内部区域的实际大小

    // 检查行
    for (let row = startRow; row < endRow; row++) {
        const rowValues = [];
        for (let col = startCol; col < endCol; col++) {
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (input && input.value) rowValues.push(input.value);
        }
        if (!isValidSet(rowValues)) return show_result("解答有误，请检查！");
    }

    // 检查列
    for (let col = startCol; col < endCol; col++) {
        const colValues = [];
        for (let row = startRow; row < endRow; row++) {
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (input && input.value) colValues.push(input.value);
        }
        if (!isValidSet(colValues)) return show_result("解答有误，请检查！");
    }

    // 检查宫
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(actualSize), Math.sqrt(actualSize)];
    for (let boxRow = startRow; boxRow < endRow; boxRow += boxSize[0]) {
        for (let boxCol = startCol; boxCol < endCol; boxCol += boxSize[1]) {
            const boxValues = [];
            for (let r = 0; r < boxSize[0]; r++) {
                for (let c = 0; c < boxSize[1]; c++) {
                    const input = container.querySelector(`input[data-row="${boxRow + r}"][data-col="${boxCol + c}"]`);
                    if (input && input.value) boxValues.push(input.value);
                }
            }
            if (!isValidSet(boxValues)) return show_result("解答有误，请检查！");
        }
    }

    show_result("恭喜！解答正确！");
}


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

// export function clear_all_inputs() {
//     document.querySelectorAll('.sudoku-cell input').forEach(input => input.value = '');
//     show_result("已清除所有数字！", 'info');
// }

export function clear_all_inputs() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;

    const size = state.current_grid_size;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            if (!input) continue;
            
            // 清除输入框值
            input.value = '';
            
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

    // 默认视为摩天楼数独，内圈从 1 到 size
    for (let row = 1; row <= size; row++) {
        for (let col = 1; col <= size; col++) {
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (input) input.value = '';
        }
    }

    show_result("已清除所有内部数字！", 'info');
}

export function clear_outer_clues() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;

    const size = state.current_grid_size;

    // 默认清除四周的外部提示
    for (let col = 1; col <= size; col++) {
        const top = container.querySelector(`input[data-row="0"][data-col="${col}"]`);
        const bottom = container.querySelector(`input[data-row="${size + 1}"][data-col="${col}"]`);
        if (top) top.value = '';
        if (bottom) bottom.value = '';
    }

    for (let row = 1; row <= size; row++) {
        const left = container.querySelector(`input[data-row="${row}"][data-col="0"]`);
        const right = container.querySelector(`input[data-row="${row}"][data-col="${size + 1}"]`);
        if (left) left.value = '';
        if (right) right.value = '';
    }

    show_result("已清除所有外部提示数字！", 'info');
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

    if (state.is_skyscraper_mode) {
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

// /**
//  * 恢复原始题目状态
//  */
// export function restore_original_board() {
//     const container = document.querySelector('.sudoku-container');
//     const size = state.current_grid_size;
    
//     if (!state.originalBoard) return;
    
//     // 恢复原始状态
//     for (let i = 0; i < size; i++) {
//         for (let j = 0; j < size; j++) {
//             const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
//             const original = state.originalBoard[i][j];
            
//             input.value = original.value;
//             input.style.display = original.displayStyle;
//             input.className = 'main-input';
//             original.classList.forEach(cls => input.classList.add(cls));
            
//             // 恢复候选数网格显示
//             const candidatesGrid = input.parentElement.querySelector('.candidates-grid');
//             if (candidatesGrid) {
//                 candidatesGrid.style.display = original.isCandidateMode ? 'grid' : 'none';
//             }
//         }
//     }
    
//     // 恢复候选数模式状态
//     state.is_candidates_mode = state.originalBoard[0][0].isCandidateMode;
//     state.isShowingSolution = false;
//     document.getElementById('toggleCandidatesMode').textContent = 
//         state.is_candidates_mode ? '退出候选数模式' : '切换候选数模式';
    
//     // 恢复按钮文本
//     const checkBtn = document.getElementById('checkUniqueness');
//     checkBtn.textContent = checkBtn.dataset.originalText || '验证唯一性';
    
//     show_result("已恢复原始题目状态");
// }

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



// /**
//  * 显示逻辑解出的部分
//  */
// export function show_logical_solution() {
//     if (!state.logicalSolution) {
//         show_result("请先验证候选数唯一性以获取逻辑解");
//         return;
//     }

//     const container = document.querySelector('.sudoku-container');
//     const size = state.current_grid_size;

//     // 备份当前题目状态
//     backup_original_board();

//     // 填充逻辑解出的部分
//     for (let i = 0; i < size; i++) {
//         for (let j = 0; j < size; j++) {
//             const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
//             const cell = input.parentElement;
//             const candidatesGrid = cell.querySelector('.candidates-grid');
            
//             // 处理已确定的数字
//             if (typeof state.logicalSolution[i][j] === 'number' && state.logicalSolution[i][j] !== 0) {
//                 // 只填充空单元格或候选数单元格
//                 if (input.value === "" || Array.isArray(state.originalBoard[i][j])) {
//                     input.value = state.logicalSolution[i][j];
//                     input.classList.add("solution-cell");
                    
//                     // 更新显示状态
//                     input.style.display = 'block';
//                     input.classList.remove('hide-input-text');
//                     if (candidatesGrid) {
//                         candidatesGrid.style.display = 'none';
//                     }
//                 }
//             } 
//             // 处理候选数数组
//             else if (Array.isArray(state.logicalSolution[i][j])) {
//                 // 只更新候选数显示
//                 const candidates = state.logicalSolution[i][j];
//                 const candidateCells = candidatesGrid.querySelectorAll('.candidates-cell');
                
//                 // 更新候选数显示
//                 candidateCells.forEach(cell => {
//                     const num = parseInt(cell.dataset.number);
//                     cell.style.display = candidates.includes(num) ? 'flex' : 'none';
//                 });
                
//                 // 更新输入框值和显示状态
//                 input.value = candidates.join('');
//                 input.classList.add('hide-input-text');
//                 input.style.display = 'block';
//                 candidatesGrid.style.display = 'grid';
//             }
//         }
//     }

//     show_result("已显示通过逻辑推理解出的部分数字和候选数！");
// }

// export function show_logical_solution() {
//     if (!state.logicalSolution) {
//         show_result("请先验证候选数唯一性以获取逻辑解");
//         return;
//     }

//     // 先备份当前状态
//     if (!state.originalBoard) {
//         backup_original_board();
//     }

//     const container = document.querySelector('.sudoku-container');
//     const size = state.current_grid_size;

//     for (let i = 0; i < size; i++) {
//         for (let j = 0; j < size; j++) {
//             const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
//             const cell = input.parentElement;
//             const candidatesGrid = cell.querySelector('.candidates-grid');
            
//             // 只修改空单元格或候选数单元格
//             if (input.value === "" || state.originalBoard[i][j].isCandidateMode) {
//                 if (typeof state.logicalSolution[i][j] === 'number') {
//                     input.value = state.logicalSolution[i][j];
//                     input.classList.add("solution-cell");
//                     candidatesGrid.style.display = 'none';
//                 } else if (Array.isArray(state.logicalSolution[i][j])) {
//                     const candidates = state.logicalSolution[i][j];
//                     input.value = candidates.join('');
//                     candidatesGrid.querySelectorAll('.candidates-cell').forEach(cell => {
//                         const num = parseInt(cell.dataset.number);
//                         cell.style.display = candidates.includes(num) ? 'flex' : 'none';
//                     });
//                     candidatesGrid.style.display = 'grid';
//                 }
//             }
//         }
//     }
// }

export function show_logical_solution() {
    if (!state.logicalSolution) {
        show_result("请先验证候选数唯一性以获取逻辑解");
        return;
    }

    // 先备份当前状态
    if (!state.originalBoard) {
        backup_original_board();
    }

    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const cell = input.parentElement;
            const candidatesGrid = cell.querySelector('.candidates-grid');
            
            // 只修改空单元格或候选数单元格
            if (input.value === "" || state.originalBoard[i][j].isCandidateMode) {
                if (typeof state.logicalSolution[i][j] === 'number') {
                    // 单个数字直接显示
                    input.value = state.logicalSolution[i][j];
                    input.classList.add("solution-cell");
                    input.style.display = 'block';
                    input.classList.remove('hide-input-text');
                    if (candidatesGrid) candidatesGrid.style.display = 'none';
                } else if (Array.isArray(state.logicalSolution[i][j])) {
                    const candidates = state.logicalSolution[i][j];
                    // 多个候选数显示候选数网格
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
                }
            }
        }
    }
}