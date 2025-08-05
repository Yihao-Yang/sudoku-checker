import { 
    show_result, 
    clear_result, 
    clear_outer_clues, 
    bold_border, 
    add_Extra_Button,
    create_base_grid,
    create_base_cell,
    handle_key_navigation,
    base_solve,
    fill_solution,
    change_Candidates_Mode
} from './core.js';
import { state, set_current_mode } from './state.js';
import { create_candidates_grid } from './core.js';

/**
 * 创建摩天楼数独网格
 */
export function create_skyscraper_sudoku(size) {
    set_current_mode('skyscraper');
    // state.is_skyscraper_mode = true;
    // state.is_vx_mode = false;
    // state.is_candidates_mode = false;

        // 移除旧的事件监听器
    const toggleBtn = document.getElementById('toggleCandidatesMode');
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    
    // 使用基础网格创建函数
    const { container, grid } = create_base_grid(size, true);

    // 存储所有输入框的引用（包括边线）
    const inputs = Array.from({ length: size + 2 }, () => new Array(size + 2));

    // // 为内部网格创建候选数网格
    // for (let row = 1; row <= size; row++) {
    //     for (let col = 1; col <= size; col++) {
    //         const { cell, input } = create_base_cell(row, col, size, true);
    //         inputs[row][col] = input;
            
    //         // 添加候选数网格(但初始隐藏)
    //         const candidatesGrid = create_candidates_grid(cell, size);
    //         cell.appendChild(candidatesGrid);
    //         candidatesGrid.style.display = 'none';
            
    //         // ... 其余单元格初始化代码 ...
    //     }
    // }

    // 添加切换候选数模式按钮事件 (保持原状)
    document.getElementById('toggleCandidatesMode').addEventListener('click', function() {
        state.is_candidates_mode = !state.is_candidates_mode;
        this.textContent = state.is_candidates_mode ? '退出候选数模式' : '切换候选数模式';

        change_Candidates_Mode(inputs, size, state.is_candidates_mode, true);
    });
    
    for (let row = 0; row < size + 2; row++) {
        for (let col = 0; col < size + 2; col++) {
            // 使用基础单元格创建函数
            const { cell, input } = create_base_cell(row, col, size, true);
            inputs[row][col] = input;

            // 在这里添加候选数网格(仅内部网格)
            if (row >= 1 && row <= size && col >= 1 && col <= size) {
                const candidatesGrid = create_candidates_grid(cell, size);
                cell.appendChild(candidatesGrid);
                candidatesGrid.style.display = 'none';
            }

            // 摩天楼特有的边线处理
            if ((row === 0 || row === size + 1 || col === 0 || col === size + 1) &&
                !(row === 0 && col === 0) &&
                !(row === 0 && col === size + 1) &&
                !(row === size + 1 && col === 0) &&
                !(row === size + 1 && col === size + 1)) {
                // 这是摩天楼提示区域
                input.placeholder = '';
                input.style.backgroundColor = '#eef';
                input.style.border = 'none';
                input.style.textAlign = 'center';
                input.style.fontSize = '24px';
                cell.style.backgroundColor = 'transparent';
                cell.style.border = 'none';
                cell.style.boxShadow = 'none';
            } 
            else if ((row === 0 && col === 0) ||
                     (row === 0 && col === size + 1) ||
                     (row === size + 1 && col === 0) ||
                     (row === size + 1 && col === size + 1)) {
                // 四个角落的空白区域
                input.placeholder = '';
                input.style.backgroundColor = 'transparent';
                input.style.border = 'none';
                input.style.textAlign = 'center';
                input.style.fontSize = '24px';
                cell.style.backgroundColor = 'transparent';
                cell.style.border = 'none';
                cell.style.boxShadow = 'none';
                cell.style.pointerEvents = 'none';
            }
            else {
                // 正常的数独格
                input.style.backgroundColor = '#fff';
            }

            // 添加键盘导航
            input.addEventListener('keydown', (e) => handle_key_navigation(e, row, col, size, inputs));
            
            // 添加点击事件，选中时全选文本
            input.addEventListener('click', function() {
                this.select();
            });

            cell.appendChild(input);
            grid.appendChild(cell);
        }
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加摩天楼专属按钮
    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';
    add_Extra_Button('一键标记', auto_mark_skyscraper_clues, '#2196F3');
    add_Extra_Button('验证摩天楼唯一性', check_skyscraper_uniqueness, '#2196F3');
    add_Extra_Button('清除标记', clear_outer_clues, '#2196F3');
}

/**
 * 验证摩天楼数独唯一性
 */
export function check_skyscraper_uniqueness() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    // 构建内部数独板
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const val = parseInt(container.querySelector(`input[data-row="${i + 1}"][data-col="${j + 1}"]`).value);
            return isNaN(val) ? 0 : val;
        })
    );

    // 收集边线提示数字
    const clues = {
        top: Array.from({ length: size }, (_, i) => {
            const val = parseInt(container.querySelector(`input[data-row="0"][data-col="${i + 1}"]`).value);
            return isNaN(val) ? 0 : val;
        }),
        bottom: Array.from({ length: size }, (_, i) => {
            const val = parseInt(container.querySelector(`input[data-row="${size + 1}"][data-col="${i + 1}"]`).value);
            return isNaN(val) ? 0 : val;
        }),
        left: Array.from({ length: size }, (_, i) => {
            const val = parseInt(container.querySelector(`input[data-row="${i + 1}"][data-col="0"]`).value);
            return isNaN(val) ? 0 : val;
        }),
        right: Array.from({ length: size }, (_, i) => {
            const val = parseInt(container.querySelector(`input[data-row="${i + 1}"][data-col="${size + 1}"]`).value);
            return isNaN(val) ? 0 : val;
        })
    };

    // 计算摩天楼可见数量
    function get_skyscraper_length(arr) {
        let maxSeen = 0, count = 0;
        for (let val of arr) {
            if (val > maxSeen) {
                maxSeen = val;
                count++;
            }
        }
        return count;
    }

    // 自定义有效性检查函数（包含摩天楼规则）
    function isValid(row, col, num) {
        // 基础数独规则检查
        for (let i = 0; i < size; i++) {
            if (board[row][i] === num || board[i][col] === num) return false;
        }

        // 宫规则检查
        const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
        const startRow = Math.floor(row / boxSize[0]) * boxSize[0];
        const startCol = Math.floor(col / boxSize[1]) * boxSize[1];

        for (let r = startRow; r < startRow + boxSize[0]; r++) {
            for (let c = startCol; c < startCol + boxSize[1]; c++) {
                if (board[r][c] === num) return false;
            }
        }

        // 临时放置数字以检查摩天楼规则
        board[row][col] = num;

        // 检查行规则（当列填满时）
        if (col === size - 1) {
            const rowData = board[row];
            if (clues.left[row] > 0 && get_skyscraper_length(rowData) !== clues.left[row]) {
                board[row][col] = 0;
                return false;
            }
            if (clues.right[row] > 0 && get_skyscraper_length([...rowData].reverse()) !== clues.right[row]) {
                board[row][col] = 0;
                return false;
            }
        }

        // 检查列规则（当行填满时）
        if (row === size - 1) {
            const colData = board.map(r => r[col]);
            if (clues.top[col] > 0 && get_skyscraper_length(colData) !== clues.top[col]) {
                board[row][col] = 0;
                return false;
            }
            if (clues.bottom[col] > 0 && get_skyscraper_length([...colData].reverse()) !== clues.bottom[col]) {
                board[row][col] = 0;
                return false;
            }
        }

        board[row][col] = 0;
        return true;
    }

    // 使用基础求解函数
    let solution = null;
    let solutionCount = 0;

    // function solve(r = 0, c = 0, saveSolution = false) {
    //     // 预处理：根据已有数字减少候选数
    //     if (r === 0 && c === 0) {
    //         for (let i = 0; i < size; i++) {
    //             for (let j = 0; j < size; j++) {
    //                 // 将空单元格初始化为全候选数
    //                 if (board[i][j] === 0) {
    //                     board[i][j] = Array.from({length: size}, (_, n) => n + 1);
    //                 }
                    
    //             }
    //         }
    //     }
    //     if (r === 0 && c === 0) {
    //         for (let i = 0; i < size; i++) {
    //             for (let j = 0; j < size; j++) {
    //                 const cell = board[i][j];
    //                 if (typeof cell === 'number' && cell !== 0) {
    //                     // 移除同行同列同宫的候选数
    //                     const num = cell;
    //                     for (let k = 0; k < size; k++) {
    //                         // 处理行
    //                         if (Array.isArray(board[i][k])) {
    //                             board[i][k] = board[i][k].filter(n => n !== num);
    //                         }
    //                         // 处理列
    //                         if (Array.isArray(board[k][j])) {
    //                             board[k][j] = board[k][j].filter(n => n !== num);
    //                         }
    //                     }
    //                     // 处理宫
    //                     const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    //                     const startRow = Math.floor(i / boxSize[0]) * boxSize[0];
    //                     const startCol = Math.floor(j / boxSize[1]) * boxSize[1];
    //                     for (let r = startRow; r < startRow + boxSize[0]; r++) {
    //                         for (let c = startCol; c < startCol + boxSize[1]; c++) {
    //                             if (Array.isArray(board[r][c])) {
    //                                 board[r][c] = board[r][c].filter(n => n !== num);
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     if (r === 0 && c === 0) {
    //         // 删减候选数后检查空候选情况
    //         for (let i = 0; i < size; i++) {
    //             for (let j = 0; j < size; j++) {
    //                 if (Array.isArray(board[i][j]) && board[i][j].length === 0) {
    //                     // solutionCount = 0; // 标记无解
    //                     return; // 提前终止
    //                 }
    //             }
    //         }
    //     }

    //     if (solutionCount >= 2) return;
    //     if (r === size) {
    //         // 最终检查所有摩天楼规则
    //         for (let i = 0; i < size; i++) {
    //             const rowData = board[i];
    //             const colData = board.map(row => row[i]);

    //             if ((clues.left[i] > 0 && get_skyscraper_length(rowData) !== clues.left[i]) ||
    //                 (clues.right[i] > 0 && get_skyscraper_length([...rowData].reverse()) !== clues.right[i]) ||
    //                 (clues.top[i] > 0 && get_skyscraper_length(colData) !== clues.top[i]) ||
    //                 (clues.bottom[i] > 0 && get_skyscraper_length([...colData].reverse()) !== clues.bottom[i])) {
    //                 return;
    //             }
    //         }

    //         solutionCount++;
    //         if (saveSolution && solutionCount === 1) {
    //             solution = board.map(row => [...row]);
    //         }
    //         return;
    //     }

    //     const nextRow = c === size - 1 ? r + 1 : r;
    //     const nextCol = (c + 1) % size;

    //     // 如果单元格已经有确定值，判断该值是否合理，再跳到下一个
    //     if (typeof board[r][c] === 'number' && board[r][c] !== 0) {
    //         const num = board[r][c];
    //         board[r][c] = 0;
    //         if (!isValid(r, c, num)) {
    //             board[r][c] = num;
    //             return;
    //         }
    //         board[r][c] = num;
    //         solve(nextRow, nextCol, saveSolution);
    //         return;
    //     }
        
    //     // 如果是候选数数组，只尝试数组中的数字
    //     if (Array.isArray(board[r][c])) {
    //         for (const num of board[r][c]) {
    //             if (isValid(r, c, num)) {
    //                 const original = board[r][c];
    //                 board[r][c] = num;
    //                 solve(nextRow, nextCol, saveSolution);
    //                 board[r][c] = original;
    //             }
    //         }
    //         return;
    //     }
    //     // 普通空单元格处理
    //     for (let num = 1; num <= size; num++) {
    //         if (isValid(r, c, num)) {
    //             board[r][c] = num;
    //             solve(nextRow, nextCol, saveSolution);
    //             board[r][c] = 0;
    //         }
    //     }
    // }

    function solve(r = 0, c = 0, saveSolution = false) {
        // 预处理：根据已有数字减少候选数
        if (r === 0 && c === 0) {
            // 逻辑求解部分（原solve_By_Logic）
            let changed;
            do {
                changed = false;
                for (let i = 0; i < size; i++) {
                    for (let j = 0; j < size; j++) {
                        // 将空单元格初始化为全候选数
                        if (board[i][j] === 0) {
                            board[i][j] = Array.from({length: size}, (_, n) => n + 1);
                        }
                        
                        // 处理已确定的数字
                        if (typeof board[i][j] === 'number' && board[i][j] !== 0) {
                            const num = board[i][j];
                            // 移除同行同列同宫的候选数
                            for (let k = 0; k < size; k++) {
                                // 处理行
                                if (Array.isArray(board[i][k])) {
                                    board[i][k] = board[i][k].filter(n => n !== num);
                                    if (board[i][k].length === 1) {
                                        board[i][k] = board[i][k][0];
                                        changed = true;
                                    }
                                }
                                // 处理列
                                if (Array.isArray(board[k][j])) {
                                    board[k][j] = board[k][j].filter(n => n !== num);
                                    if (board[k][j].length === 1) {
                                        board[k][j] = board[k][j][0];
                                        changed = true;
                                    }
                                }
                            }
                            // 处理宫
                            const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
                            const startRow = Math.floor(i / boxSize[0]) * boxSize[0];
                            const startCol = Math.floor(j / boxSize[1]) * boxSize[1];
                            for (let r = startRow; r < startRow + boxSize[0]; r++) {
                                for (let c = startCol; c < startCol + boxSize[1]; c++) {
                                    if (Array.isArray(board[r][c])) {
                                        board[r][c] = board[r][c].filter(n => n !== num);
                                        if (board[r][c].length === 1) {
                                            board[r][c] = board[r][c][0];
                                            changed = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } while (changed);

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

            if (isSolved) {
                solutionCount = 1;
                if (saveSolution) {
                    solution = board.map(row => [...row]);
                }
                return;
            }
        }

        // 暴力求解部分（原solve_By_BruteForce）
        if (solutionCount >= 2) return;
        if (r === size) {
            // 最终检查所有摩天楼规则
            for (let i = 0; i < size; i++) {
                const rowData = board[i];
                const colData = board.map(row => row[i]);

                if ((clues.left[i] > 0 && get_skyscraper_length(rowData) !== clues.left[i]) ||
                    (clues.right[i] > 0 && get_skyscraper_length([...rowData].reverse()) !== clues.right[i]) ||
                    (clues.top[i] > 0 && get_skyscraper_length(colData) !== clues.top[i]) ||
                    (clues.bottom[i] > 0 && get_skyscraper_length([...colData].reverse()) !== clues.bottom[i])) {
                    return;
                }
            }

            solutionCount++;
            if (saveSolution && solutionCount === 1) {
                solution = board.map(row => [...row]);
            }
            return;
        }

        const nextRow = c === size - 1 ? r + 1 : r;
        const nextCol = (c + 1) % size;

        // 如果单元格已经有确定值，判断该值是否合理，再跳到下一个
        if (typeof board[r][c] === 'number' && board[r][c] !== 0) {
            const num = board[r][c];
            board[r][c] = 0;
            if (!isValid(r, c, num)) {
                board[r][c] = num;
                return;
            }
            board[r][c] = num;
            solve(nextRow, nextCol, saveSolution);
            return;
        }
        
        // 如果是候选数数组，只尝试数组中的数字
        if (Array.isArray(board[r][c])) {
            for (const num of board[r][c]) {
                if (isValid(r, c, num)) {
                    const original = board[r][c];
                    board[r][c] = num;
                    solve(nextRow, nextCol, saveSolution);
                    board[r][c] = original;
                }
            }
            return;
        }
        // 普通空单元格处理
        for (let num = 1; num <= size; num++) {
            if (isValid(r, c, num)) {
                board[r][c] = num;
                solve(nextRow, nextCol, saveSolution);
                board[r][c] = 0;
            }
        }
    }

    solve(0, 0, true);

    // 处理结果
    if (solutionCount === 0) {
        show_result("当前数独无解！");
    } else if (solutionCount === 1) {
        // 填充内部数独解答
        fill_solution(container, solution, size, true);

        // 填充边线提示数字
        for (let i = 0; i < size; i++) {
            const column = solution.map(row => row[i]);
            const rowVals = solution[i];

            const inputs = [
                [`input[data-row="0"][data-col="${i + 1}"]`, get_skyscraper_length(column)],
                [`input[data-row="${size + 1}"][data-col="${i + 1}"]`, get_skyscraper_length([...column].reverse())],
                [`input[data-row="${i + 1}"][data-col="0"]`, get_skyscraper_length(rowVals)],
                [`input[data-row="${i + 1}"][data-col="${size + 1}"]`, get_skyscraper_length([...rowVals].reverse())]
            ];

            for (const [selector, val] of inputs) {
                const input = container.querySelector(selector);
                if (input && (input.value === "" || input.value === "0")) {
                    input.value = val;
                    input.classList.add("solution-cell");
                }
            }
        }

        show_result("当前数独恰好有唯一解！已自动填充答案和提示数字。");
    } else {
        show_result("当前数独有多个解！");
    }
}

/**
 * 一键标记所有符合摩天楼规则的提示数字
 */
function auto_mark_skyscraper_clues() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;

    // 构建内部数独板
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const val = parseInt(container.querySelector(`input[data-row="${i + 1}"][data-col="${j + 1}"]`).value);
            return isNaN(val) ? 0 : val;
        })
    );

    // 计算摩天楼可见数量
    function get_skyscraper_length(arr) {
        let maxSeen = 0, count = 0;
        for (let val of arr) {
            if (val > maxSeen) {
                maxSeen = val;
                count++;
            }
        }
        return count;
    }

    // 标记所有完整行列的提示数字
    for (let i = 0; i < size; i++) {
        const column = board.map(row => row[i]);
        const rowVals = board[i];

        const inputs = [];

        // 判断每个方向是否已填满，再决定是否生成线索
        if (!column.includes(0)) {
            inputs.push([
                `input[data-row="0"][data-col="${i + 1}"]`,
                get_skyscraper_length(column)
            ]);
            inputs.push([
                `input[data-row="${size + 1}"][data-col="${i + 1}"]`,
                get_skyscraper_length([...column].reverse())
            ]);
        }
        
        if (!rowVals.includes(0)) {
            inputs.push([
                `input[data-row="${i + 1}"][data-col="0"]`,
                get_skyscraper_length(rowVals)
            ]);
            inputs.push([
                `input[data-row="${i + 1}"][data-col="${size + 1}"]`,
                get_skyscraper_length([...rowVals].reverse())
            ]);
        }

        // 填充提示数字
        for (const [selector, val] of inputs) {
            const input = container.querySelector(selector);
            if (input && (input.value === "" || input.value === "0")) {
                input.value = val;
                input.classList.add("solution-cell");
            }
        }
    }

    show_result("已根据当前完整行列自动填充摩天楼提示数字。", 'info');
}