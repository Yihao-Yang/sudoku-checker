import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid, backup_original_board, restore_original_board, show_logical_solution } from '../solver/core.js';
import { eliminate_candidates, getRowLetter, isValid } from '../solver/solver_tool.js';
import { solve_By_Elimination } from '../solver/Technique.js';


export function create_candidates_sudoku(size) {
    set_current_mode('candidates');
    // 初始化状态 - 强制设置为候选数模式
    // state.is_skyscraper_mode = false;
    // state.is_vx_mode = false;
    // state.is_candidates_mode = true; // 强制为候选数模式
    const { container, grid } = create_base_grid(size, false);
    

    // 存储所有输入框的引用
    const inputs = Array.from({ length: size }, () => new Array(size));

    // // 隐藏切换候选数模式的按钮（因为始终是候选数模式）
    // document.getElementById('toggleCandidatesMode').style.display = 'none';
    // 修改：不再隐藏切换候选数模式的按钮
    document.getElementById('toggleCandidatesMode').textContent = '退出候选数模式';

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        // 创建单元格容器
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell candidates-mode'; // 添加候选数模式class
        cell.dataset.row = row;
        cell.dataset.col = col;

        // 创建主输入框
        const mainInput = document.createElement('input');
        mainInput.type = 'text';
        mainInput.className = 'main-input hide-input-text'; // 默认隐藏文字
        mainInput.maxLength = size;
        mainInput.dataset.row = row;
        mainInput.dataset.col = col;

        // 创建候选数容器
        const candidatesGrid = document.createElement('div');
        candidatesGrid.className = 'candidates-grid';
        candidatesGrid.style.display = 'grid'; // 默认显示候选数网格

        // 根据数独尺寸创建候选数格子
        // const subSize = Math.sqrt(size);
        // candidatesGrid.style.gridTemplateColumns = `repeat(${subSize}, 1fr)`;
        // candidatesGrid.style.gridTemplateRows = `repeat(${subSize}, 1fr)`;
        const subSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)]; // 六宫格特殊处理
        candidatesGrid.style.gridTemplateColumns = `repeat(${subSize[1]}, 1fr)`; // 列数
        candidatesGrid.style.gridTemplateRows = `repeat(${subSize[0]}, 1fr)`; // 行数
        
        // 创建固定位置的候选数格子
        for (let n = 1; n <= size; n++) {
            const candidateCell = document.createElement('div');
            candidateCell.className = 'candidates-cell';
            candidateCell.dataset.number = n;
            candidateCell.textContent = n;
            candidateCell.style.display = 'none';
            candidateCell.style.gridArea = getGridArea(n, subSize);
            candidatesGrid.appendChild(candidateCell);
        }

        // 辅助函数：计算固定位置
        // function getGridArea(number, subSize) {
        //     const row = Math.ceil(number / subSize);
        //     const col = ((number - 1) % subSize) + 1;
        //     return `${row} / ${col} / ${row} / ${col}`;
        // }
        function getGridArea(number, subSize) {
            if (size === 6) {
                // 六宫格特殊布局 (2行3列)
                const row = Math.ceil(number / subSize[1]);
                const col = ((number - 1) % subSize[1]) + 1;
                return `${row} / ${col} / ${row} / ${col}`;
            } else {
                // 标准正方形宫格布局
                const row = Math.ceil(number / subSize[0]);
                const col = ((number - 1) % subSize[0]) + 1;
                return `${row} / ${col} / ${row} / ${col}`;
            }
        }

        // 添加元素到DOM
        cell.appendChild(mainInput);
        cell.appendChild(candidatesGrid);
        
        // 存储输入框引用
        inputs[row][col] = mainInput;

        // 输入事件处理（仅候选数模式逻辑）
        mainInput.addEventListener('input', function() {
            // 根据数独尺寸限制输入范围
            const maxValue = size;
            const regex = new RegExp(`[^1-${maxValue}]`, 'g');
            this.value = this.value.replace(regex, '');
            
            // 提取有效数字
            const inputNumbers = [...new Set(this.value.split(''))]
                .filter(c => c >= '1' && c <= maxValue.toString())
                .map(Number)
                .sort((a, b) => a - b);
            
            // 更新候选数显示
            cell.querySelectorAll('.candidates-cell').forEach(cell => {
                const num = parseInt(cell.dataset.number);
                cell.style.display = inputNumbers.includes(num) ? 'flex' : 'none';
            });
            
            // 存储实际值（去重排序）
            this.value = inputNumbers.join('');
        });

        // 键盘事件监听（仅候选数模式逻辑）
        mainInput.addEventListener('keydown', function(e) {
            // 处理数字键
            if (e.key >= '1' && e.key <= size.toString()) {
                e.preventDefault();
                const num = parseInt(e.key);
                const currentNumbers = [...new Set(this.value.split('').map(Number))];
                
                // 切换数字状态
                const newNumbers = currentNumbers.includes(num)
                    ? currentNumbers.filter(n => n !== num)
                    : [...currentNumbers, num].sort((a, b) => a - b);
                
                this.value = newNumbers.join('');
                this.dispatchEvent(new Event('input'));
            }
            // 处理导航键
            handleKeyNavigation(e, row, col);
        });

        // 加粗边框
        bold_border(cell, row, col, size);

        grid.appendChild(cell);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 键盘导航函数
    function handleKeyNavigation(e, row, col) {
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
            
            if (targetRow >= 0 && targetRow < size && targetCol >= 0 && targetCol < size) {
                const targetInput = inputs[targetRow][targetCol];
                targetInput.focus();
                targetInput.select();
            }
        }
    }

    // 添加候选数专属按钮
    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';

    add_Extra_Button('验证候选数唯一性', check_candidates_uniqueness, '#2196F3');
    add_Extra_Button('显示可逻辑解部分', show_logical_solution, '#2196F3');
    add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
}

/**
 * 验证候选数数独的唯一解
 */
export function check_candidates_uniqueness() {
    // 清空之前的日志
    log_process('', true);

    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;

    // 备份当前题目状态
    backup_original_board();
    
    // 获取当前数独状态，包括候选数信息
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const val = parseInt(input.value);
            
            // 如果是候选数模式且有候选数，则返回候选数数组，否则返回单个数字或0
            if (state.is_candidates_mode && input.value.length > 1) {
                return [...new Set(input.value.split('').map(Number))].filter(n => n >= 1 && n <= size);
            }
            return isNaN(val) ? Array.from({length: size}, (_, n) => n + 1) : val;
        })
    );

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = board[i][j];
            if (cell === 0) {
                board[i][j] = Array.from({length: size}, (_, n) => n + 1);
            }
            else if (typeof cell === 'number' && cell !== 0) {
                const num = cell;
                board[i][j] = 0; // 临时清空
                if (!isValid(board, size, i, j, num)) {
                    show_result(`[冲突] ${getRowLetter(i+1)}${j+1}=${num}与已有数字冲突，无解！`);
                    return { changed: false, hasEmptyCandidate: true }; // 直接返回冲突状态
                }
                board[i][j] = num; // 恢复原值
                eliminate_candidates(board, size, i, j, num); // 移除相关候选数
            }
        }
    }

    let solution_count = 0;
    let solution = null;

    // 主求解函数
    function solve() {
        // 先尝试逻辑求解
        const logicalResult = solve_By_Logic();
        
        // 如果逻辑求解未完成，则尝试暴力求解
        if (!logicalResult.isSolved) {
            if (state.techniqueSettings.Brute_Force) {
                solve_By_BruteForce();
            } else {
                if (solution_count === -2) {
                    return;
                }
                else {
                    solution_count = -1;  // 设置特殊标记值
                    return;  // 提前返回防止后续覆盖
                }
            }
        }
        // 添加技巧使用统计
        if (logicalResult.technique_counts) {
            log_process("\n=== 技巧使用统计 ===");
            for (const [technique, count] of Object.entries(logicalResult.technique_counts)) {
                if (count > 0) {
                    log_process(`${technique}: ${count}次`);
                }
            }
        }
    }

    // 逻辑求解函数
    function solve_By_Logic() {
        const { changed, hasEmptyCandidate, technique_counts } = solve_By_Elimination(board, size);
        log_process("1...判断当前数独是否有解");
        
        if (hasEmptyCandidate) {
            solution_count = -2;
            return { isSolved: false };
        }
        log_process("2...当前数独有解");

        state.logical_solution = board.map(row => [...row]);

        // 检查是否已完全解出
        let isSolved = true;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (Array.isArray(board[i][j])) {
                    isSolved = false;
                    break;
                }
            }
            if (!isSolved) break;
        }
        log_process("3...判断当前数独能通过逻辑推理完全解出");

        if (isSolved) {
            solution_count = 1;
            solution = board.map(row => [...row]);
            return { isSolved: true, technique_counts };
        }

        log_process("4...当前候选数数独无法通过逻辑推理完全解出，尝试暴力求解...");
        return { isSolved: false, technique_counts };
    }

    // 暴力求解函数
    function solve_By_BruteForce(r = 0, c = 0) {
        const backup = board.map(row => [...row]);
        
        if (solution_count >= 2) return;
        if (r === size) {
            solution_count++;
            if (solution_count === 1) {
                solution = board.map(row => row.map(cell => 
                    Array.isArray(cell) ? cell[0] : cell
                ));
            }
            return;
        }

        const nextRow = c === size - 1 ? r + 1 : r;
        const nextCol = (c + 1) % size;

        const cellValue = board[r][c];
        
        if (typeof cellValue === 'number' && cellValue !== 0) {
            solve_By_BruteForce(nextRow, nextCol);
            return;
        }
        
        if (Array.isArray(cellValue)) {
            for (const num of cellValue) {
                if (isValid(board, size, r, c, num)) {
                    const boardBackup = JSON.parse(JSON.stringify(board));
                    board[r][c] = num;
                    log_process(`[试数] ${getRowLetter(r+1)}${c+1}=${num}`);
                    eliminate_candidates(board, size, r, c, num);
                    
                    const { changed, hasEmptyCandidate } = solve_By_Elimination(board, size);
                    if (hasEmptyCandidate) {
                        board = JSON.parse(JSON.stringify(boardBackup));
                        continue;
                    }
                    
                    solve_By_BruteForce(nextRow, nextCol);
                    board = JSON.parse(JSON.stringify(boardBackup));
                }
            }
            return;
        }
    }

    solve(); // 调用主求解函数


    // 显示结果
    if (state.solution_count === -1) {
        show_result("当前技巧无法解出");
    } else if (state.solution_count === 0 || state.solution_count === -2) {
        show_result("当前数独无解！");
    } else if (state.solution_count === 1) {
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
    } else if (state.solution_count > 1) {
        show_result("当前数独有多个解。");
    } else {
        show_result(`当前数独有${state.solution_count}个解！`);
    }
    show_logical_solution();
}
