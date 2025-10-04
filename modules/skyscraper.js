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
    change_candidates_mode
} from './core.js';
import { state, set_current_mode } from './state.js';
import { create_candidates_grid } from './core.js';

// /**
//  * 创建摩天楼数独网格
//  */
export function create_skyscraper_sudoku(size) {
    set_current_mode('skyscraper');
    state.current_grid_size = size;

    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');

    // 技巧设置（如有需要可添加）
    // state.techniqueSettings = {...};

    const { container, grid } = create_base_grid(size, true);
    const inputs = Array.from({ length: size + 2 }, () => new Array(size + 2));

    for (let row = 0; row < size + 2; row++) {
        for (let col = 0; col < size + 2; col++) {
            const { cell, main_input, candidates_grid } = create_base_cell(row, col, size, true);
            cell.appendChild(main_input);
            cell.appendChild(candidates_grid);
            grid.appendChild(cell);
            inputs[row][col] = main_input;

            // 内部格子添加候选数网格
            if (row >= 1 && row <= size && col >= 1 && col <= size) {
                cell.appendChild(candidates_grid);
            }

            main_input.addEventListener('input', function() {
                const max_value = size;
                const regex = new RegExp(`[^1-${max_value}]`, 'g');
                this.value = this.value.replace(regex, '');
                if (this.value.length > 1) {
                    this.value = this.value[this.value.length - 1];
                }
            });

            // 键盘导航
            main_input.addEventListener('keydown', function(e) {
                handle_key_navigation(e, row, col, size + 2, inputs);
            });

            // 点击全选
            main_input.addEventListener('click', function() {
                this.select();
            });
        }
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 摩天楼专属按钮
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
    let solution_count = 0;

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
    //                     // solution_count = 0; // 标记无解
    //                     return; // 提前终止
    //                 }
    //             }
    //         }
    //     }

    //     if (solution_count >= 2) return;
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

    //         solution_count++;
    //         if (saveSolution && solution_count === 1) {
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
                solution_count = 1;
                if (saveSolution) {
                    solution = board.map(row => [...row]);
                }
                return;
            }
        }

        // 暴力求解部分（原solve_By_BruteForce）
        if (solution_count >= 2) return;
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

            solution_count++;
            if (saveSolution && solution_count === 1) {
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
    if (solution_count === 0) {
        show_result("当前数独无解！");
    } else if (solution_count === 1) {
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