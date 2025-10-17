import { state, set_current_mode } from './state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_inner_numbers, clear_outer_clues } from './core.js';
import { create_technique_panel } from './classic.js';
import { get_all_regions, isValid, solve } from '../solver/solver_tool.js';

// 新数独主入口
export function create_X_sums_sudoku(size) {
    set_current_mode('X_sums');
    state.current_grid_size = size;

    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');

    // 技巧设置（可根据需要调整）
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,
        Box_Pair_Block: true,
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
        Brute_Force: false,
        Special_Combination_Region_Elimination: true,
        Special_Combination_Region_Block: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

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
            } else {
                // 外部格子：调整数字尺寸
                main_input.style.fontSize = '36px'; // 将字体大小改为16px
            }

            main_input.addEventListener('input', function() {
                let regex;
                if (row >= 1 && row <= size && col >= 1 && col <= size) {
                    // 内部格子：只允许1~size
                    regex = new RegExp(`[^1-${size}]`, 'g');
                    this.value = this.value.replace(regex, '');
                    if (this.value.length > 1) {
                        this.value = this.value[this.value.length - 1];
                    }
                } else {
                    // 外部格子：只允许数字，最大为size的阶乘
                    const max_sum = (size * (size + 1)) / 2;
                    regex = /[^\d]/g;
                    this.value = this.value.replace(regex, '');
                    if (parseInt(this.value) > max_sum) {
                        this.value = max_sum.toString();
                    }
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
    add_Extra_Button('清除内部数字', clear_inner_numbers, '#2196F3'); // 添加清除内部数字按钮
    add_Extra_Button('清除外部提示数', clear_outer_clues, '#2196F3'); // 清除外部提示数
    add_Extra_Button('标记外部提示数', () => mark_outer_clues(size), '#2196F3'); // 添加标记外部提示数按钮
    add_Extra_Button('自动出题', () => generate_X_sums_puzzle(size), '#2196F3');
    // add_Extra_Button('一键标记', auto_mark_skyscraper_clues, '#2196F3');
    // add_Extra_Button('验证摩天楼唯一性', check_skyscraper_uniqueness, '#2196F3');
    // add_Extra_Button('清除标记', clear_outer_clues, '#2196F3');
}

// 生成多斜线数独题目
export function generate_X_sums_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    size = size + 2;
    clear_inner_numbers();
    clear_outer_clues();
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    // 选取对称类型
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical',
        // 'none'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    // // 添加提示数
    // const add_clue = (row, col, value) => {
    //     const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
    //     if (input) {
    //         input.value = value;
    //     }
    // };
        // 初始化空盘面
    let board = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0)
    );

    // 添加提示数
    const add_clue = (row, col, value) => {
        const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
        if (input) {
            input.value = value;
            board[row][col] = value; // 同步更新到 board
        }
    };


    // 获取对称位置
    const get_symmetric_position = (row, col, size, symmetry) => {
        switch (symmetry) {
            case 'central':
                return [size - 1 - row, size - 1 - col];
            case 'diagonal':
                return [col, row];
            case 'anti-diagonal':
                return [size - 1 - col, size - 1 - row];
            case 'horizontal':
                return [size - 1 - row, col];
            case 'vertical':
                return [row, size - 1 - col];
            default:
                return [row, col];
        }
    };


    // 随机生成提示数，只在首行、首列、尾行、尾列
    const positions_set = new Set();
    let marks_added = 0;
    let try_limit = 1000; // 防止死循环
    while (try_limit-- > 0) {
        let row, col;

        // 随机选择提示数位置：首行、首列、尾行、尾列
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
            // 首行，跳过左上角和右上角
            row = 0;
            col = Math.floor(Math.random() * (size - 2)) + 1; // 列范围为 [1, size - 2]
        } else if (edge === 1) {
            // 尾行，跳过左下角和右下角
            row = size - 1;
            col = Math.floor(Math.random() * (size - 2)) + 1; // 列范围为 [1, size - 2]
        } else if (edge === 2) {
            // 首列，跳过左上角和左下角
            row = Math.floor(Math.random() * (size - 2)) + 1; // 行范围为 [1, size - 2]
            col = 0;
        } else {
            // 尾列，跳过右上角和右下角
            row = Math.floor(Math.random() * (size - 2)) + 1; // 行范围为 [1, size - 2]
            col = size - 1;
        }

        // const excluded_values = [1, 3, 4, 5, 7, 9, 11, 16, 19, 20, 21]; // 要排除的值
        const excluded_values = [4]; // 要排除的值
        let value1, value2;
        
        do {
            value1 = Math.floor(Math.random() * ((size - 2) * (size - 1) / 2)) + 1;
        } while (size === 8 && excluded_values.includes(value1)); // 如果 size=8 且 value1 在排除列表中，则重新生成
        
        do {
            value2 = Math.floor(Math.random() * ((size - 2) * (size - 1) / 2)) + 1;
        } while (size === 8 && excluded_values.includes(value2)); // 如果 size=8 且 value2 在排除列表中，则重新生成
        // const value1 = Math.floor(Math.random() * ((size - 2) * (size - 1) / 2)) + 1; // 提示数值范围为1到size
        // const value2 = Math.floor(Math.random() * ((size - 2) * (size - 1) / 2)) + 1; // 对称位置的提示数值
        const [sym_row, sym_col] = get_symmetric_position(row, col, size, symmetry);

        if (positions_set.has(`${row},${col}`) || positions_set.has(`${sym_row},${sym_col}`)) continue;

        // 添加标记
        add_clue(row, col, value1);
        add_clue(sym_row, sym_col, value2);

        // // 检查是否有解
        // let board = [];

        // log_process(`尝试添加提示数 (${row},${col})=${value1} 和 (${sym_row},${sym_col})=${value2}，当前已添加 ${marks_added} 个提示数`);
        backup_original_board();
        // const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, isValid, true);
        const result = solve(board, size - 2, isValid, true);

        if (result.solution_count === 0 || result.solution_count === -2) {
            log_process(`添加提示数 (${row},${col})=${value1} 和 (${sym_row},${sym_col})=${value2} 后无解，撤销标记`);
            restore_original_board();
            // 无解，撤销标记
            const input1 = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            const input2 = grid.querySelector(`input[data-row="${sym_row}"][data-col="${sym_col}"]`);
            if (input1) input1.value = '';
            if (input2) input2.value = '';
            continue;
        }
        if (result.solution_count === 1) {
            positions_set.add(`${row},${col}`);
            positions_set.add(`${sym_row},${sym_col}`);
            marks_added += (row === sym_row && col === sym_col) ? 1 : 2;
            break;
        }
        positions_set.add(`${row},${col}`);
        positions_set.add(`${sym_row},${sym_col}`);
        marks_added += (row === sym_row && col === sym_col) ? 1 : 2;
    }

    // generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
}

export function apply_X_sums_marks(board, size) {
    // X sums提示数对应候选数映射
    // 根据 size 动态生成 X sums 提示数对应候选数映射
    const X_SUMS_CANDIDATES_MAP = (() => {
        if (size === 9) {
            return {
                1: [1],
                3: [2],
                5: [2],
                6: [2, 3],
                7: [2],
                8: [2, 3],
                9: [2, 3],
                10: [2, 3, 4],
                11: [2, 3],
                12: [3, 4],
                13: [3, 4],
                14: [3, 4],
                15: [3, 4, 5],
                16: [3, 4],
                17: [3, 4, 5],
                18: [3, 4, 5],
                19: [3, 4, 5],
                20: [3, 4, 5],
                21: [4, 5, 6],
                22: [4, 5],
                23: [4, 5, 6],
                24: [4, 5, 6],
                25: [4, 5, 6],
                26: [4, 5, 6],
                27: [4, 5, 6],
                28: [4, 5, 6, 7],
                29: [5, 6],
                30: [5, 6, 7],
                31: [5, 6, 7],
                32: [5, 6, 7],
                33: [5, 6, 7],
                34: [6, 7],
                35: [5, 6, 7],
                36: [6, 7, 8],
                37: [6, 7],
                38: [6, 7, 8],
                39: [6, 7, 8],
                40: [7, 8],
                41: [7, 8],
                42: [7, 8],
                43: [8],
                44: [8],
                45: [9],
            };
        } else if (size === 6) {
            return {
                1: [1],
                3: [2],
                5: [2],
                6: [2, 3],
                7: [2],
                8: [2, 3],
                9: [3],
                10: [3, 4],
                11: [3],
                12: [3, 4],
                13: [3, 4],
                14: [3, 4],
                15: [4, 5],
                16: [4],
                17: [4, 5],
                18: [4, 5],
                19: [5],
                20: [5],
                21: [6],
            };
        } else if (size === 4) {
            return {
                1: [1],
                3: [2],
                5: [2],
                6: [2, 3],
                8: [3],
                9: [3],
                10: [4],
            };
        } else {
            return {}; // 默认返回空映射
        }
    })();

    // 第一行提示，作用于第二行
    for (let col = 1; col <= size; col++) {
        let clue = board[0][col];
        if (Array.isArray(clue)) {
            if (clue.length !== 1) continue;
            clue = clue[0];
        }
        clue = parseInt(clue);
        if (clue && X_SUMS_CANDIDATES_MAP[clue]) {
            const candidates = X_SUMS_CANDIDATES_MAP[clue];
            if (Array.isArray(board[1][col])) {
                board[1][col] = board[1][col].filter(n => candidates.includes(n));
                log_process(`根据顶部提示 ${clue}，更新 (2,${col + 1}) 的候选数为 [${board[1][col].join(',')}]`);
            }
        }
    }
    // 最后一行提示，作用于倒数第二行
    for (let col = 1; col <= size; col++) {
        let clue = board[size + 1][col];
        if (Array.isArray(clue)) {
            if (clue.length !== 1) continue;
            clue = clue[0];
        }
        clue = parseInt(clue);
        if (clue && X_SUMS_CANDIDATES_MAP[clue]) {
            const candidates = X_SUMS_CANDIDATES_MAP[clue];
            if (Array.isArray(board[size][col])) {
                board[size][col] = board[size][col].filter(n => candidates.includes(n));
                log_process(`根据底部提示 ${clue}，更新 (${size},${col + 1}) 的候选数为 [${board[size][col].join(',')}]`);
            }
        }
    }
    // 第一列提示，作用于第二列
    for (let row = 1; row <= size; row++) {
        let clue = board[row][0];
        if (Array.isArray(clue)) {
            if (clue.length !== 1) continue;
            clue = clue[0];
        }
        clue = parseInt(clue);
        if (clue && X_SUMS_CANDIDATES_MAP[clue]) {
            const candidates = X_SUMS_CANDIDATES_MAP[clue];
            if (Array.isArray(board[row][1])) {
                board[row][1] = board[row][1].filter(n => candidates.includes(n));
                log_process(`根据左侧提示 ${clue}，更新 (${row + 1},2) 的候选数为 [${board[row][1].join(',')}]`);
            }
        }
    }
    // 最后一列提示，作用于倒数第二列
    for (let row = 1; row <= size; row++) {
        let clue = board[row][size + 1];
        if (Array.isArray(clue)) {
            if (clue.length !== 1) continue;
            clue = clue[0];
        }
        clue = parseInt(clue);
        if (clue && X_SUMS_CANDIDATES_MAP[clue]) {
            const candidates = X_SUMS_CANDIDATES_MAP[clue];
            if (Array.isArray(board[row][size])) {
                board[row][size] = board[row][size].filter(n => candidates.includes(n));
                log_process(`根据右侧提示 ${clue}，更新 (${row + 1},${size}) 的候选数为 [${board[row][size].join(',')}]`);
            }
        }
    }
}

// 添加标记外部提示数的功能
function mark_outer_clues(size) {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    // 遍历外部提示格子
    for (let row = 0; row < size + 2; row++) {
        for (let col = 0; col < size + 2; col++) {
            // 跳过第一行和最后一行的第一格和最后一格
            if ((row === 0 || row === size + 1) && (col === 0 || col === size + 1)) {
                continue;
            }

            if (row === 0 || row === size + 1 || col === 0 || col === size + 1) {
                const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
                if (input && !input.value) {
                    let x; // X 表示外部提示对应的格子数
                    let sum = 0;
                    let allFilled = true;

                    if (row === 0) {
                        // 上方提示
                        const firstCell = grid.querySelector(`input[data-row="1"][data-col="${col}"]`);
                        if (firstCell && firstCell.value) {
                            x = parseInt(firstCell.value);
                            for (let i = 1; i <= x; i++) {
                                const cell = grid.querySelector(`input[data-row="${i}"][data-col="${col}"]`);
                                if (cell && cell.value) {
                                    sum += parseInt(cell.value);
                                } else {
                                    allFilled = false;
                                    break;
                                }
                            }
                        }
                    } else if (row === size + 1) {
                        // 下方提示
                        const firstCell = grid.querySelector(`input[data-row="${size}"][data-col="${col}"]`);
                        if (firstCell && firstCell.value) {
                            x = parseInt(firstCell.value);
                            for (let i = 0; i < x; i++) {
                                const cell = grid.querySelector(`input[data-row="${size - i}"][data-col="${col}"]`);
                                if (cell && cell.value) {
                                    sum += parseInt(cell.value);
                                } else {
                                    allFilled = false;
                                    break;
                                }
                            }
                        }
                    } else if (col === 0) {
                        // 左侧提示
                        const firstCell = grid.querySelector(`input[data-row="${row}"][data-col="1"]`);
                        if (firstCell && firstCell.value) {
                            x = parseInt(firstCell.value);
                            for (let i = 1; i <= x; i++) {
                                const cell = grid.querySelector(`input[data-row="${row}"][data-col="${i}"]`);
                                if (cell && cell.value) {
                                    sum += parseInt(cell.value);
                                } else {
                                    allFilled = false;
                                    break;
                                }
                            }
                        }
                    } else if (col === size + 1) {
                        // 右侧提示
                        const firstCell = grid.querySelector(`input[data-row="${row}"][data-col="${size}"]`);
                        if (firstCell && firstCell.value) {
                            x = parseInt(firstCell.value);
                            for (let i = 0; i < x; i++) {
                                const cell = grid.querySelector(`input[data-row="${row}"][data-col="${size - i}"]`);
                                if (cell && cell.value) {
                                    sum += parseInt(cell.value);
                                } else {
                                    allFilled = false;
                                    break;
                                }
                            }
                        }
                    }

                    // 如果所有格子都已填满，标记提示数
                    if (allFilled && x) {
                        input.value = sum;
                    }
                }
            }
        }
    }
}

/**
 * 验证 X 和数独的有效性
 * @param {Array} board - 数独盘面（不包含提示数）
 * @param {number} size - 数独大小
 * @param {number} row - 当前行
 * @param {number} col - 当前列
 * @param {number} num - 当前填入的数字
 * @returns {boolean} 是否有效
 */
export function is_valid_X_sums(board, size, row, col, num) {
    const container = document.querySelector('.sudoku-container');

    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'X_sums';
    const regions = get_all_regions(size, mode);
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col)) {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }

    // 2. 检查外提示规则
    const left_cell = board[row][0]; // 该行的第一格
    const right_cell = board[row][size - 1]; // 该行的最后一格
    if ((typeof left_cell === 'number' && left_cell > 0) || col === 0) {
        let x = left_cell; // x = 第一格的数字
        if (col === 0) {
            // 如果是左侧提示，使用第一格的数字
            x = num;
        }

        // 临时将当前格子视为已填入 num
        const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

        // 检查 x 个格子是否都已填入数字
        const row_values = temp_board[row].slice(0, x); // 获取前 x 个格子
        if (row_values.some(val => typeof val !== 'number' || val <= 0)) {
            // return true; // 如果前 x 个格子未填满，跳过外提示规则判断
        }

        // 检查当前位置是否在前 x 个格子范围内
        else if (col >= x) {
            // return true; // 如果当前位置不在范围内，跳过外提示规则判断
        }

        else {
            // 获取外提示数字（从 container 中获取）
            const clue_input = container.querySelector(`input[data-row="${row + 1}"][data-col="0"]`);
            const clue = clue_input ? parseInt(clue_input.value) : null;

            if (clue && typeof clue === 'number') {
                const sum = row_values.reduce((acc, val) => acc + val, 0); // 计算前 x 个格子的和
                if (sum !== clue) {
                    return false; // 外提示规则不满足
                }
            }
        }
    }
    // 检查最后一格是否为数字并大于 0
    if ((typeof right_cell === 'number' && right_cell > 0) || col === size - 1) {
        let x = right_cell; // x = 最后一格的数字
        if (col === size - 1) {
            // 如果是左侧提示，使用第一格的数字
            x = num;
        }

        // 临时将当前格子视为已填入 num
        const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

        // 检查最后 x 个格子是否都已填入数字
        const row_values = temp_board[row].slice(size - x); // 获取最后 x 个格子
        if (row_values.some(val => typeof val !== 'number' || val <= 0)) {
            // return true; // 如果最后 x 个格子未填满，跳过外提示规则判断
        }

        // 检查当前位置是否在最后 x 个格子范围内
        else if (col < size - x) {
            // return true; // 如果当前位置不在范围内，跳过外提示规则判断
        }

        else {         
            // 获取外提示数字（从 container 中获取）
            const clue_input = container.querySelector(`input[data-row="${row + 1}"][data-col="${size + 1}"]`);
            const clue = clue_input ? parseInt(clue_input.value) : null;

            if (clue && typeof clue === 'number') {
                const sum = row_values.reduce((acc, val) => acc + val, 0); // 计算最后 x 个格子的和
                if (sum !== clue) {
                    return false; // 外提示规则不满足
                }
            }
        }
    }
    // 检查上方提示规则
    const top_cell = board[0][col]; // 该列的第一格
    const bottom_cell = board[size - 1][col]; // 该列的最后一格
    if ((typeof top_cell === 'number' && top_cell > 0) || row === 0) {
        let x = top_cell; // x = 第一格的数字
        if (row === 0) {
            // 如果是左侧提示，使用第一格的数字
            x = num;
        }

        // 临时将当前格子视为已填入 num
        const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

        // 检查前 x 行是否都已填入数字
        const col_values = temp_board.slice(0, x).map(r => r[col]); // 获取前 x 行的该列值
        if (col_values.some(val => typeof val !== 'number' || val <= 0)) {
            // return true; // 如果前 x 行未填满，跳过外提示规则判断
        }

        // 检查当前位置是否在前 x 行范围内
        else if (row >= x) {
            // return true; // 如果当前位置不在范围内，跳过外提示规则判断
        }

        else {
            // 获取外提示数字（从 container 中获取）
            const clue_input = container.querySelector(`input[data-row="0"][data-col="${col + 1}"]`);
            const clue = clue_input ? parseInt(clue_input.value) : null;

            if (clue && typeof clue === 'number') {
                const sum = col_values.reduce((acc, val) => acc + val, 0); // 计算前 x 行的和
                if (sum !== clue) {
                    return false; // 外提示规则不满足
                }
            }
        }
    }
    // 检查下方提示规则
    if ((typeof bottom_cell === 'number' && bottom_cell > 0) || row === size - 1) {
        let x = bottom_cell; // x = 最后一格的数字
        if (row === size - 1) {
            // 如果是左侧提示，使用第一格的数字
            x = num;
        }

        // 临时将当前格子视为已填入 num
        const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

        // 检查最后 x 行是否都已填入数字
        const col_values = temp_board.slice(size - x).map(r => r[col]); // 获取最后 x 行的该列值
        if (col_values.some(val => typeof val !== 'number' || val <= 0)) {
            // return true; // 如果最后 x 行未填满，跳过外提示规则判断
        }

        // 检查当前位置是否在最后 x 行范围内
        else if (row < size - x) {
            // return true; // 如果当前位置不在范围内，跳过外提示规则判断
        }

        else {
            // 获取外提示数字（从 container 中获取）
            const clue_input = container.querySelector(`input[data-row="${size + 1}"][data-col="${col + 1}"]`);
            const clue = clue_input ? parseInt(clue_input.value) : null;

            if (clue && typeof clue === 'number') {
                const sum = col_values.reduce((acc, val) => acc + val, 0); // 计算最后 x 行的和
                if (sum !== clue) {
                    return false; // 外提示规则不满足
                }
            }
        }
    }

    return true; // 所有规则均满足
}