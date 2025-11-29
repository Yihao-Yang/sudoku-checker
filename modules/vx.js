import {
    show_result,
    clear_result,
    log_process,
    bold_border,
    create_base_grid,
    create_base_cell,
    handle_key_navigation,
    add_Extra_Button,
    clear_all_inputs,
    base_solve,
    fill_solution,
    clear_marks
} from '../solver/core.js';
import { state, set_current_mode } from '../solver/state.js';
import { create_technique_panel } from './classic.js';
import { generate_solved_board_brute_force, generate_puzzle } from '../solver/generate.js';
import { get_all_regions } from '../solver/solver_tool.js';

const MARK_WIDTH = 32;
const MARK_HEIGHT = 26;
const EDGE_CLICK_THRESHOLD_MIN = 12;
let current_vx_type = 'V';

export function create_vx_sudoku(size = 9) {
    set_current_mode('VX');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

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
        Multi_Special_Combination_Region_Elimination: true,
        Special_Combination_Region_Block: true,
        Multi_Special_Combination_Region_Block: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();
    clear_result();
    current_vx_type = 'V';

    const { container, grid } = create_base_grid(size);
    container.style.position = 'relative';
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

            if (main_input) {
                main_input.dataset.row = row;
                main_input.dataset.col = col;
                main_input.addEventListener('input', function () {
                    const maxValue = size;
                    const regex = new RegExp(`[^1-${maxValue}]`, 'g');
                    this.value = this.value.replace(regex, '');
                    if (this.value.length > 1) {
                        this.value = this.value[this.value.length - 1];
                    }
                });
                main_input.addEventListener('keydown', (e) => {
                    handle_key_navigation(e, row, col, size, inputs);
                });
                cell.appendChild(main_input);
            }

            if (candidates_grid) {
                cell.appendChild(candidates_grid);
            }

            bold_border(cell, row, col, size);
            grid.appendChild(cell);
            inputs[row][col] = main_input;
        }
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    enable_vx_mark_mode(size);

    const extraButtons = document.getElementById('extraButtons');
    if (extraButtons) {
        extraButtons.innerHTML = '';
        // add_Extra_Button('默认V标记', () => set_vx_mode('V'));
        // add_Extra_Button('默认X标记', () => set_vx_mode('X'));
        add_Extra_Button('清除标记', clear_marks);
        add_Extra_Button('一键标记', auto_mark_vx);
        add_Extra_Button('自动出题', () => generate_vx_puzzle(size), '#2196F3');
        // add_Extra_Button('检查VX规则', check_vx_rules);
        // add_Extra_Button('验证VX唯一性', check_vx_uniqueness);
    }

    reset_vx_highlights(container);
}

// function set_vx_mode(type) {
//     const normalized = typeof type === 'string' ? type.trim().toUpperCase() : '';
//     if (normalized !== 'V' && normalized !== 'X') {
//         show_result('VX标记模式仅支持V或X', 'error');
//         return;
//     }
//     current_vx_type = normalized;
//     show_result(`默认VX标记类型已切换为${normalized}`, 'info');
// }

// function clear_vx_marks(silent = false) {
//     const container = get_vx_container();
//     if (!container) return;
//     container.querySelectorAll('.vx-mark').forEach((mark) => mark.remove());
//     reset_vx_highlights(container);
//     if (!silent) {
//         show_result('已清除所有VX标记', 'info');
//     }
// }

function auto_mark_vx() {
    const container = get_vx_container();
    if (!container) return;

    reset_vx_highlights(container);
    // clear_vx_marks(true);
    clear_marks;

    const size = state.current_grid_size;
    let added = 0;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (col < size - 1) {
                added += mark_pair_if_needed(container, size, row, col, row, col + 1);
            }
            if (row < size - 1) {
                added += mark_pair_if_needed(container, size, row, col, row + 1, col);
            }
        }
    }

    if (added > 0) {
        show_result(`已自动标记${added}对符合VX规则的相邻格`, 'success');
    } else {
        show_result('未找到需要标记的VX关系', 'info');
    }
}

export function generate_vx_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const effectiveSize = size || state.current_grid_size || 9;
    const container = get_vx_container();
    if (!container) return;

    // 如果调用方未传入分值下限或提示数，尝试从页面输入框读取（与 main.js 行为一致）
    if (score_lower_limit === null) {
        const scoreEl = document.getElementById('scoreLowerLimit');
        score_lower_limit = parseInt(scoreEl?.value, 10) || 0;
    }
    if (holes_count === undefined) {
        const cluesEl = document.getElementById('cluesCount');
        const cluesCount = parseInt(cluesEl?.value, 10);
        if (!isNaN(cluesCount) && cluesCount > 0) {
            holes_count = effectiveSize * effectiveSize - cluesCount;
        } else {
            holes_count = undefined;
        }
    }

    const startTime = performance.now();
    clear_all_inputs();
    log_process('', true);
    reset_vx_highlights(container);
    // clear_vx_marks(true);
    clear_marks;

    log_process('第一步：生成VX数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(effectiveSize);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        show_result('生成VX数独终盘失败', 'error');
        return;
    }

    log_process('第二步：标记全部符合条件的VX关系...');
    const marksAdded = populate_all_vx_marks(container, solvedBoard, effectiveSize);

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    log_process(`总计标记 ${marksAdded} 对符合条件的相邻格`);
    show_result(
        `VX标记生成完成，标记${marksAdded}对（耗时${elapsed}秒）`,
        marksAdded > 0 ? 'success' : 'info'
    );

    generate_puzzle(effectiveSize, score_lower_limit, holes_count, solvedBoard);
}

// function check_vx_uniqueness() {
//     const container = get_vx_container();
//     if (!container) return;

//     const size = state.current_grid_size;
//     const board = Array.from({ length: size }, (_, r) =>
//         Array.from({ length: size }, (_, c) => {
//             const input = container.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//             const val = input ? parseInt(input.value ?? '', 10) : NaN;
//             return Number.isNaN(val) ? 0 : val;
//         })
//     );

//     const { valid: vxMarks } = collect_vx_marks(container);
//     const vxConstraints = vxMarks.map((mark) => ({
//         cell1: { row: mark.row1, col: mark.col1 },
//         cell2: { row: mark.row2, col: mark.col2 },
//         type: mark.type,
//         requiredSum: mark.type === 'V' ? 5 : 10,
//         key: normalize_pair_key(mark.row1, mark.col1, mark.row2, mark.col2),
//     }));
//     const vxConstraintKeySet = new Set(vxConstraints.map((item) => item.key));
//     const allAdjacentPairs = get_all_adjacent_pairs(size);

//     const { solution_count, solution } = base_solve(
//         board,
//         size,
//         (r, c, num) =>
//             isValidPlacement(
//                 r,
//                 c,
//                 num,
//                 board,
//                 size,
//                 vxConstraints,
//                 allAdjacentPairs,
//                vxConstraintKeySet
//             ),
//         true
//     );

//     if (solution_count === 0) {
//         show_result('当前VX数独无解！请检查数字和标记。', 'error');
//     } else if (solution_count === 1) {
//         show_result('当前VX数独有唯一解！', 'success');
//         if (typeof window !== 'undefined' && window.confirm?.('是否要填充唯一解？')) {
//             fill_solution(container, solution, size);
//             reset_vx_highlights(container);
//         }
//     } else {
//         show_result('当前VX数独存在多个解！', 'error');
//     }
// }

// function check_vx_rules() {
//     const container = get_vx_container();
//     if (!container) return;

//     reset_vx_highlights(container);
//     const { valid: marks, invalid } = collect_vx_marks(container);
//     const messages = [];
//     let isValid = true;

//     invalid.forEach(({ mark, row1, col1, row2, col2 }) => {
//         const input = mark.querySelector('input');
//         if (input) input.style.backgroundColor = '#ffcdd2';
//         messages.push(`标记(${row1 + 1},${col1 + 1})与(${row2 + 1},${col2 + 1})未设置为V或X`);
//         isValid = false;
//     });

//     marks.forEach((mark) => {
//         const input1 = container.querySelector(`input[data-row="${mark.row1}"][data-col="${mark.col1}"]`);
//         const input2 = container.querySelector(`input[data-row="${mark.row2}"][data-col="${mark.col2}"]`);
//         const val1 = parseInt(input1?.value ?? '', 10);
//         const val2 = parseInt(input2?.value ?? '', 10);

//         if (Number.isNaN(val1) || Number.isNaN(val2)) {
//             return;
//         }

//         const sum = val1 + val2;
//         const requiredSum = mark.type === 'V' ? 5 : 10;

//         if (sum !== requiredSum) {
//             if (input1) input1.style.backgroundColor = '#ffcdd2';
//             if (input2) input2.style.backgroundColor = '#ffcdd2';
//             messages.push(
//                 `标记${mark.type}位于(${mark.row1 + 1},${mark.col1 + 1})与(${mark.row2 + 1},${mark.col2 + 1})，当前和值为${sum}`
//             );
//             isValid = false;
//         }
//     });

//     const size = state.current_grid_size;
//     for (let row = 0; row < size; row++) {
//         for (let col = 0; col < size; col++) {
//             if (col < size - 1) {
//                 check_unmarked_pair(container, row, col, row, col + 1, messages);
//             }
//             if (row < size - 1) {
//                 check_unmarked_pair(container, row, col, row + 1, col, messages);
//             }
//         }
//     }

//     if (isValid && messages.length === 0) {
//         show_result('VX规则检查通过', 'success');
//     } else if (messages.length > 0) {
//         show_result(messages.join('；'), 'error');
//     }
// }

function enable_vx_mark_mode(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid || grid._vxMarkHandlerAttached) return;
    grid._vxMarkHandlerAttached = true;

    const container = grid.parentElement;
    if (container && getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }

    grid._vxClickTimer = null;
    const CLICK_DELAY = 250; // ms

    grid.addEventListener('click', (event) => {
        if (!container) return;
        if (event.target.closest('.vx-mark')) return;

        const rect = grid.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const col = Math.floor(x / cell_width);
        const row = Math.floor(y / cell_height);

        const dist_to_vertical = Math.abs(x - (col + 1) * cell_width);
        const dist_to_horizontal = Math.abs(y - (row + 1) * cell_height);
        const threshold = Math.max(
            EDGE_CLICK_THRESHOLD_MIN,
            Math.min(cell_width, cell_height) * 0.25
        );

        let orientation = null;
        let r1, c1, r2, c2;
        if (dist_to_vertical < dist_to_horizontal && dist_to_vertical < threshold && col < size - 1) {
            orientation = 'v';
            r1 = row; c1 = col; r2 = row; c2 = col + 1;
        } else if (dist_to_horizontal <= dist_to_vertical && dist_to_horizontal < threshold && row < size - 1) {
            orientation = 'h';
            r1 = row; c1 = col; r2 = row + 1; c2 = col;
        }

        if (!orientation) return;

        if (grid._vxClickTimer) {
            clearTimeout(grid._vxClickTimer);
            grid._vxClickTimer = null;
        }
        grid._vxClickTimer = setTimeout(() => {
            create_or_update_vx_mark(container, size, r1, c1, r2, c2, 'V', true);
            grid._vxClickTimer = null;
        }, CLICK_DELAY);
    });

    grid.addEventListener('dblclick', (event) => {
        if (!container) return;
        if (event.target.closest('.vx-mark')) return;

        if (grid._vxClickTimer) {
            clearTimeout(grid._vxClickTimer);
            grid._vxClickTimer = null;
        }

        const rect = grid.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const col = Math.floor(x / cell_width);
        const row = Math.floor(y / cell_height);

        const dist_to_vertical = Math.abs(x - (col + 1) * cell_width);
        const dist_to_horizontal = Math.abs(y - (row + 1) * cell_height);
        const threshold = Math.max(
            EDGE_CLICK_THRESHOLD_MIN,
            Math.min(cell_width, cell_height) * 0.25
        );

        if (dist_to_vertical < dist_to_horizontal && dist_to_vertical < threshold && col < size - 1) {
            create_or_update_vx_mark(container, size, row, col, row, col + 1, 'X', true);
        } else if (dist_to_horizontal <= dist_to_vertical && dist_to_horizontal < threshold && row < size - 1) {
            create_or_update_vx_mark(container, size, row, col, row + 1, col, 'X', true);
        }
    });
}

function mark_pair_if_needed(container, size, row1, col1, row2, col2) {
    const input1 = container.querySelector(`input[data-row="${row1}"][data-col="${col1}"]`);
    const input2 = container.querySelector(`input[data-row="${row2}"][data-col="${col2}"]`);

    const val1 = parseInt(input1?.value ?? '', 10);
    const val2 = parseInt(input2?.value ?? '', 10);

    if (Number.isNaN(val1) || Number.isNaN(val2)) return 0;

    const sum = val1 + val2;
    if (sum === 5) {
        const { created } = create_or_update_vx_mark(container, size, row1, col1, row2, col2, 'V', false);
        return created ? 1 : 0;
    }
    if (sum === 10) {
        const { created } = create_or_update_vx_mark(container, size, row1, col1, row2, col2, 'X', false);
        return created ? 1 : 0;
    }
    return 0;
}

function populate_all_vx_marks(container, board, size) {
    let count = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (col < size - 1) {
                const sum = (board[row]?.[col] ?? 0) + (board[row]?.[col + 1] ?? 0);
                if (sum === 5) {
                    const { created } = create_or_update_vx_mark(
                        container,
                        size,
                        row,
                        col,
                        row,
                        col + 1,
                        'V',
                        false
                    );
                    if (created) count++;
                } else if (sum === 10) {
                    const { created } = create_or_update_vx_mark(
                        container,
                        size,
                        row,
                        col,
                        row,
                        col + 1,
                        'X',
                        false
                    );
                    if (created) count++;
                }
            }
            if (row < size - 1) {
                const sum = (board[row]?.[col] ?? 0) + (board[row + 1]?.[col] ?? 0);
                if (sum === 5) {
                    const { created } = create_or_update_vx_mark(
                        container,
                        size,
                        row,
                        col,
                        row + 1,
                        col,
                        'V',
                        false
                    );
                    if (created) count++;
                } else if (sum === 10) {
                    const { created } = create_or_update_vx_mark(
                        container,
                        size,
                        row,
                        col,
                        row + 1,
                        col,
                        'X',
                        false
                    );
                    if (created) count++;
                }
            }
        }
    }
    return count;
}

function create_or_update_vx_mark(container, size, row1, col1, row2, col2, type = 'V', focus_input = false) {
    const orientation = get_orientation(row1, col1, row2, col2);
    if (!orientation) return { mark: null, created: false };

    const normalized_type = type === 'X' ? 'X' : 'V';
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return { mark: null, created: false };

    const cell_width = grid.offsetWidth / size;
    const cell_height = grid.offsetHeight / size;

    let mark_x;
    let mark_y;
    let key;

    if (orientation.orientation === 'v') {
        mark_x = (orientation.col + 1) * cell_width;
        mark_y = orientation.row * cell_height + cell_height / 2;
        key = `v-${orientation.row}-${orientation.col + 1}`;
    } else {
        mark_x = orientation.col * cell_width + cell_width / 2;
        mark_y = (orientation.row + 1) * cell_height;
        key = `h-${orientation.row + 1}-${orientation.col}`;
    }

    let mark = container.querySelector(`.vx-mark[data-key="${key}"]`);
    const created = !mark;

    if (!mark) {
        mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        // 使用与 product 模块相同的尺寸和布局
        mark.style.width = '30px';
        mark.style.height = '30px';
        mark.style.display = 'block';
        mark.style.zIndex = '5';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.autocomplete = 'off';
        input.value = normalized_type;
        // 与 product 标记相同的居中绝对定位样式（透明背景）
        input.style.width = '38px';
        input.style.height = '38px';
        input.style.fontSize = '22px';
        input.style.textAlign = 'center';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.outline = 'none';
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '50%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.color = '#333';
        input.style.textTransform = 'uppercase';

        // 仅允许 V 或 X 输入
        input.addEventListener('input', () => {
            const val = input.value.toUpperCase().replace(/[^VX]/g, '');
            if (!val) {
                input.value = mark.dataset.vxType || 'V';
            } else {
                input.value = val[0];
                mark.dataset.vxType = input.value;
            }
        });

        input.addEventListener('keydown', (evt) => {
            if (evt.key === 'v' || evt.key === 'V') {
                input.value = 'V';
                mark.dataset.vxType = 'V';
                evt.preventDefault();
            } else if (evt.key === 'x' || evt.key === 'X') {
                input.value = 'X';
                mark.dataset.vxType = 'X';
                evt.preventDefault();
            }
        });

        mark.appendChild(input);
        mark.dataset.vxType = normalized_type;

        // 双击移除（阻止事件冒泡以免被网格处理）
        mark.addEventListener('dblclick', (evt) => {
            evt.stopPropagation();
            mark.remove();
        });
        input.addEventListener('dblclick', (evt) => {
            evt.stopPropagation();
            mark.remove();
        });

        container.appendChild(mark);
        if (focus_input) {
            requestAnimationFrame(() => input.focus());
        }
    } else {
        const input = mark.querySelector('input');
        if (input) {
            input.value = normalized_type;
            if (focus_input) {
                requestAnimationFrame(() => input.focus());
            }
        }
        mark.dataset.vxType = normalized_type;
    }

    // 与 product 模块一致的定位偏移（15x10）
    mark.style.left = `${grid.offsetLeft + mark_x - 15}px`;
    mark.style.top = `${grid.offsetTop + mark_y - 15}px`;

    return { mark, created };
}

// function collect_vx_marks(container) {
//     const result = { valid: [], invalid: [] };
//     if (!container) return result;

//     container.querySelectorAll('.vx-mark input').forEach((input) => {
//         input.style.backgroundColor = '';
//     });

//     container.querySelectorAll('.vx-mark[data-key]').forEach((mark) => {
//         const key = mark.dataset.key;
//         const pair = parse_mark_key(key);
//         if (!pair) return;

//         const type = read_mark_type(mark);
//         if (!type) {
//             result.invalid.push({ mark, ...pair });
//         } else {
//             result.valid.push({ ...pair, type });
//         }
//     });

//     return result;
// }

function parse_mark_key(key) {
    if (!key) return null;
    if (key.startsWith('v-')) {
        const [, rowStr, colStr] = key.split('-');
        const row = Number.parseInt(rowStr, 10);
        const col = Number.parseInt(colStr, 10) - 1;
        if (Number.isNaN(row) || Number.isNaN(col)) return null;
        return { row1: row, col1: col, row2: row, col2: col + 1 };
    }
    if (key.startsWith('h-')) {
        const [, rowStr, colStr] = key.split('-');
        const row = Number.parseInt(rowStr, 10) - 1;
        const col = Number.parseInt(colStr, 10);
        if (Number.isNaN(row) || Number.isNaN(col)) return null;
        return { row1: row, col1: col, row2: row + 1, col2: col };
    }
    return null;
}

function read_mark_type(mark) {
    if (!mark) return null;
    const raw = (mark.dataset.vxType || mark.querySelector('input')?.value || '').toUpperCase();
    if (raw === 'V' || raw === 'X') {
        return raw;
    }
    return null;
}

// function check_unmarked_pair(container, row1, col1, row2, col2, messages) {
//     if (has_vx_mark(container, row1, col1, row2, col2)) return;

//     const input1 = container.querySelector(`input[data-row="${row1}"][data-col="${col1}"]`);
//     const input2 = container.querySelector(`input[data-row="${row2}"][data-col="${col2}"]`);

//     const val1 = parseInt(input1?.value ?? '', 10);
//     const val2 = parseInt(input2?.value ?? '', 10);

//     if (Number.isNaN(val1) || Number.isNaN(val2)) return;

//     const sum = val1 + val2;

//     if (sum === 5 || sum === 10) {
//         if (input1) input1.style.backgroundColor = '#ffcdd2';
//         if (input2) input2.style.backgroundColor = '#ffcdd2';
//         messages.push(`未标记的相邻格子(${row1 + 1},${col1 + 1})与(${row2 + 1},${col2 + 1})的和为${sum}`);
//     }
// }

// function has_vx_mark(container, row1, col1, row2, col2) {
//     const orientation = getOrientation(row1, col1, row2, col2);
//     if (!orientation) return false;

//     const key =
//         orientation.orientation === 'v'
//             ? `v-${orientation.row}-${orientation.col + 1}`
//             : `h-${orientation.row + 1}-${orientation.col}`;

//     const mark = container.querySelector(`.vx-mark[data-key="${key}"]`);
//     return !!read_mark_type(mark);
// }

function reset_vx_highlights(container) {
    if (!container) return;
    container.querySelectorAll('.sudoku-cell input[data-row]').forEach((input) => {
        input.style.backgroundColor = '';
    });
}

function get_vx_container() {
    const container = document.querySelector('.sudoku-container');
    if (container && getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }
    return container;
}

function get_orientation(row1, col1, row2, col2) {
    if (row1 === row2 && Math.abs(col1 - col2) === 1) {
        return { orientation: 'v', row: row1, col: Math.min(col1, col2) };
    }
    if (col1 === col2 && Math.abs(row1 - row2) === 1) {
        return { orientation: 'h', row: Math.min(row1, row2), col: col1 };
    }
    return null;
}

function normalize_pair_key(row1, col1, row2, col2) {
    if (row1 > row2 || (row1 === row2 && col1 > col2)) {
        return `${row2}-${col2}-${row1}-${col1}`;
    }
    return `${row1}-${col1}-${row2}-${col2}`;
}

// /**
//  * 检查数字放置是否有效
//  */
// function isValidPlacement(row, col, num, board, size, vxConstraints, allAdjacentPairs) {
//     // 检查行、列、宫是否有效
//     for (let i = 0; i < size; i++) {
//         if (board[row][i] === num) return false;
//         if (board[i][col] === num) return false;
//     }
    
//     // 检查宫
//     const boxSize = Math.sqrt(size);
//     const startRow = Math.floor(row / boxSize) * boxSize;
//     const startCol = Math.floor(col / boxSize) * boxSize;
    
//     for (let r = startRow; r < startRow + boxSize; r++) {
//         for (let c = startCol; c < startCol + boxSize; c++) {
//             if (board[r][c] === num) return false;
//         }
//     }
    
//     // 检查VX约束
//     for (const constraint of vxConstraints) {
//         // 检查是否涉及当前单元格
//         const isCell1 = (constraint.cell1.row === row && constraint.cell1.col === col);
//         const isCell2 = (constraint.cell2.row === row && constraint.cell2.col === col);
        
//         if (isCell1 || isCell2) {
//             const otherCell = isCell1 ? constraint.cell2 : constraint.cell1;
//             const otherValue = board[otherCell.row][otherCell.col];
            
//             if (otherValue !== 0) { // 另一个单元格有数字时才检查
//                 const sum = isCell1 ? (num + otherValue) : (otherValue + num);
//                 if (sum !== constraint.requiredSum) {
//                     return false;
//                 }
//             }
//         }
//     }
    
//     // 检查未标记的相邻单元格不能和为5或10
//     for (const pair of allAdjacentPairs) {
//         if ((pair.row1 === row && pair.col1 === col) || 
//             (pair.row2 === row && pair.col2 === col)) {
            
//             const otherRow = pair.row1 === row ? pair.row2 : pair.row1;
//             const otherCol = pair.col1 === col ? pair.col2 : pair.col1;
//             const otherValue = board[otherRow][otherCol];
            
//             if (otherValue !== 0) {
//                 const sum = num + otherValue;
//                 // 检查这对相邻单元格是否有VX标记
//                 const hasMark = vxConstraints.some(c => 
//                     (c.cell1.row === pair.row1 && c.cell1.col === pair.col1 &&
//                     c.cell2.row === pair.row2 && c.cell2.col === pair.col2) ||
//                     (c.cell1.row === pair.row2 && c.cell1.col === pair.col2 &&
//                     c.cell2.row === pair.row1 && c.cell2.col === pair.col1));
                
//                 if (!hasMark && (sum === 5 || sum === 10)) {
//                     return false;
//                 }
//             }
//         }
//     }
    
//     return true;
// }

function get_all_adjacent_pairs(size) {
    const pairs = [];
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size - 1; col++) {
            pairs.push({
                row1: row,
                col1: col,
                row2: row,
                col2: col + 1,
            });
        }
    }
    for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size; col++) {
            pairs.push({
                row1: row,
                col1: col,
                row2: row + 1,
                col2: col,
            });
        }
    }
    return pairs;
}

// VX 数独的有效性检测（用于求解器）：除了常规数独规则外，
// 1) 有标记的相邻格必须满足标记类型对应的和（V => 5, X => 10）
// 2) 未标记的相邻格若均已确定数字，则其和不得等于 5 或 10
export function is_valid_VX(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'vx';
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

    // 2. 收集当前界面上的 VX 标记为约束（若页面不可用则视为无额外标记）
    const container = document.querySelector('.sudoku-container');
    const vxConstraints = [];
    const vxConstraintKeySet = new Set();
    if (container) {
        const marks = Array.from(container.querySelectorAll('.vx-mark[data-key]'));
        for (const mark of marks) {
            const key = mark.dataset.key;
            const pair = parse_mark_key(key);
            const type = read_mark_type(mark); // 'V' 或 'X' 或 null
            if (!pair || !type) continue;
            const requiredSum = type === 'V' ? 5 : 10;
            const normalizedKey = normalize_pair_key(pair.row1, pair.col1, pair.row2, pair.col2);
            vxConstraints.push({
                cell1: { row: pair.row1, col: pair.col1 },
                cell2: { row: pair.row2, col: pair.col2 },
                requiredSum,
                key: normalizedKey,
            });
            vxConstraintKeySet.add(normalizedKey);
        }
    }

    // 3. 对涉及标记的约束进行检查（若另一格已确定数字，则当前数必须满足和）
    for (const constraint of vxConstraints) {
        const involvesCell1 = constraint.cell1.row === row && constraint.cell1.col === col;
        const involvesCell2 = constraint.cell2.row === row && constraint.cell2.col === col;
        if (involvesCell1 || involvesCell2) {
            const otherCell = involvesCell1 ? constraint.cell2 : constraint.cell1;
            const otherValue = board[otherCell.row][otherCell.col];
            if (otherValue !== 0 && typeof otherValue === 'number' && !Array.isArray(otherValue)) {
                if (num + otherValue !== constraint.requiredSum) {
                    return false;
                }
            }
        }
    }

    // 4. 对所有相邻未标记对进行限制：若另一格已确定，且该相邻对没有标记，则和不得为 5 或 10
    const allAdjacentPairs = get_all_adjacent_pairs(size);
    for (const pair of allAdjacentPairs) {
        const isCurrentInPair =
            (pair.row1 === row && pair.col1 === col) || (pair.row2 === row && pair.col2 === col);
        if (!isCurrentInPair) continue;

        const otherRow = pair.row1 === row ? pair.row2 : pair.row1;
        const otherCol = pair.col1 === col ? pair.col2 : pair.col1;
        const otherValue = board[otherRow][otherCol];
        if (otherValue === 0) continue;
        if (Array.isArray(otherValue) || typeof otherValue !== 'number') continue;

        const key = normalize_pair_key(pair.row1, pair.col1, pair.row2, pair.col2);
        const hasMark = vxConstraintKeySet.has(key);
        if (!hasMark) {
            const sum = num + otherValue;
            if (sum === 5 || sum === 10) {
                return false;
            }
        }
    }

    return true;
}