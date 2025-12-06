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
    fill_solution,
    clear_marks
} from '../solver/core.js';
import { state, set_current_mode } from '../solver/state.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_solved_board_brute_force, generate_puzzle } from '../solver/generate.js';
import { get_all_regions } from '../solver/solver_tool.js';

const MARK_WIDTH = 32;
const MARK_HEIGHT = 26;
const EDGE_CLICK_THRESHOLD_MIN = 12;
const KROPKI_MARK_DIAMETER = 16;
let current_kropki_type = 'B'; // 默认使用黑点/白点标记 B/W

export function create_kropki_sudoku(size) {
    // 保留外部 mode 名称为 kropki（避免改动其它模块），但 UI/逻辑实现为黑白点
    set_current_mode('kropki');
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
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        Multi_Special_Combination_Region_Elimination_1: true,
        Multi_Special_Combination_Region_Elimination_2: true,
        Multi_Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        Special_Combination_Region_Block_3: true,
        Multi_Special_Combination_Region_Block_1: true,
        Multi_Special_Combination_Region_Block_2: true,
        Multi_Special_Combination_Region_Block_3: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();
    clear_result();
    current_kropki_type = 'B';

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

    enable_kropki_mark_mode(size);

    const extraButtons = document.getElementById('extraButtons');
    if (extraButtons) {
        extraButtons.innerHTML = '';
        add_Extra_Button('清除标记', clear_marks);
        add_Extra_Button('一键标记', auto_mark_kropki);
        add_Extra_Button('自动出题', () => generate_kropki_puzzle(size), '#2196F3');
    }

    reset_kropki_highlights(container);
}

function auto_mark_kropki() {
    const container = get_kropki_container();
    if (!container) return;

    reset_kropki_highlights(container);
    // 保持与 clear_marks 接口兼容（clear_marks 为函数引用）
    // clear_marks();

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
        show_result(`已自动标记${added}个黑/白点关系`, 'success');
    } else {
        show_result('未找到需要标记的黑白点关系', 'info');
    }
}

export function generate_kropki_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const effectiveSize = size || state.current_grid_size || 9;
    const container = get_kropki_container();
    if (!container) return;

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
    reset_kropki_highlights(container);
    clear_marks();

    log_process('第一步：生成黑白点数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(effectiveSize);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        show_result('生成黑白点数独终盘失败', 'error');
        return;
    }

    log_process('第二步：标记全部符合条件的黑/白点关系...');
    const marksAdded = populate_all_kropki_marks(container, solvedBoard, effectiveSize);

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    log_process(`总计标记 ${marksAdded} 个符合条件的相邻格`);
    show_result(
        `黑白点标记生成完成，标记${marksAdded}个（耗时${elapsed}秒）`,
        marksAdded > 0 ? 'success' : 'info'
    );

    // generate_puzzle(effectiveSize, score_lower_limit, holes_count, solvedBoard);
}

function enable_kropki_mark_mode(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid || grid._kropkiMarkHandlerAttached) return;
    grid._kropkiMarkHandlerAttached = true;

    const container = grid.parentElement;
    if (container && getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }

    grid._kropkiClickTimer = null;
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

        if (grid._kropkiClickTimer) {
            clearTimeout(grid._kropkiClickTimer);
            grid._kropkiClickTimer = null;
        }
        grid._kropkiClickTimer = setTimeout(() => {
            create_or_update_kropki_mark(container, size, r1, c1, r2, c2, 'B', true);
            grid._kropkiClickTimer = null;
        }, CLICK_DELAY);
    });

    grid.addEventListener('dblclick', (event) => {
        if (!container) return;
        if (event.target.closest('.vx-mark')) return;

        if (grid._kropkiClickTimer) {
            clearTimeout(grid._kropkiClickTimer);
            grid._kropkiClickTimer = null;
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
            create_or_update_kropki_mark(container, size, row, col, row, col + 1, 'W', true);
        } else if (dist_to_horizontal <= dist_to_vertical && dist_to_horizontal < threshold && row < size - 1) {
            create_or_update_kropki_mark(container, size, row, col, row + 1, col, 'W', true);
        }
    });
}

function mark_pair_if_needed(container, size, row1, col1, row2, col2) {
    const input1 = container.querySelector(`input[data-row="${row1}"][data-col="${col1}"]`);
    const input2 = container.querySelector(`input[data-row="${row2}"][data-col="${col2}"]`);

    const val1 = parseInt(input1?.value ?? '', 10);
    const val2 = parseInt(input2?.value ?? '', 10);

    if (Number.isNaN(val1) || Number.isNaN(val2)) return 0;

    // 特殊处理1和2的关系：30%概率标黑点，70%概率标白点
    if ((val1 === 1 && val2 === 2) || (val1 === 2 && val2 === 1)) {
        const useBlackDot = Math.random() < 0.3; // 需要增加1和2的白点概率就减少这个值
        const { created } = create_or_update_kropki_mark(container, size, row1, col1, row2, col2, useBlackDot ? 'B' : 'W', false);
        return created ? 1 : 0;
    }

    // 其他情况保持原有逻辑
    // 黑点：一方是另一方的两倍（排除1和2的情况，因为上面已经处理了）
    if ((val1 === 2 * val2 || val2 === 2 * val1) && !((val1 === 1 && val2 === 2) || (val1 === 2 && val2 === 1))) {
        const { created } = create_or_update_kropki_mark(container, size, row1, col1, row2, col2, 'B', false);
        return created ? 1 : 0;
    }
    // 白点：两数差为1（排除1和2的情况，因为上面已经处理了）
    if (Math.abs(val1 - val2) === 1 && !((val1 === 1 && val2 === 2) || (val1 === 2 && val2 === 1))) {
        const { created } = create_or_update_kropki_mark(container, size, row1, col1, row2, col2, 'W', false);
        return created ? 1 : 0;
    }
    return 0;
}

function populate_all_kropki_marks(container, board, size) {
    let count = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (col < size - 1) {
                const a = board[row]?.[col] ?? 0;
                const b = board[row]?.[col + 1] ?? 0;
                if (a && b) {
                    // 特殊处理1和2的关系
                    if ((a === 1 && b === 2) || (a === 2 && b === 1)) {
                        const useBlackDot = Math.random() < 0.3;  // 需要增加1和2的白点概率就减少这个值
                        const { created } = create_or_update_kropki_mark(container, size, row, col, row, col + 1, useBlackDot ? 'B' : 'W', false);
                        if (created) count++;
                    } else if (a === 2 * b || b === 2 * a) {
                        const { created } = create_or_update_kropki_mark(container, size, row, col, row, col + 1, 'B', false);
                        if (created) count++;
                    } else if (Math.abs(a - b) === 1) {
                        const { created } = create_or_update_kropki_mark(container, size, row, col, row, col + 1, 'W', false);
                        if (created) count++;
                    }
                }
            }
            if (row < size - 1) {
                const a = board[row]?.[col] ?? 0;
                const b = board[row + 1]?.[col] ?? 0;
                if (a && b) {
                    // 特殊处理1和2的关系
                    if ((a === 1 && b === 2) || (a === 2 && b === 1)) {
                        const useBlackDot = Math.random() < 0.5;
                        const { created } = create_or_update_kropki_mark(container, size, row, col, row + 1, col, useBlackDot ? 'B' : 'W', false);
                        if (created) count++;
                    } else if (a === 2 * b || b === 2 * a) {
                        const { created } = create_or_update_kropki_mark(container, size, row, col, row + 1, col, 'B', false);
                        if (created) count++;
                    } else if (Math.abs(a - b) === 1) {
                        const { created } = create_or_update_kropki_mark(container, size, row, col, row + 1, col, 'W', false);
                        if (created) count++;
                    }
                }
            }
        }
    }
    return count;
}

function create_or_update_kropki_mark(container, size, row1, col1, row2, col2, type = 'B', focus_input = false) {
    const orientation = get_orientation(row1, col1, row2, col2);
    if (!orientation) return { mark: null, created: false };

    const normalized_type = (type === 'W' ? 'W' : 'B');
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
        mark.style.width = `${KROPKI_MARK_DIAMETER}px`;
        mark.style.height = `${KROPKI_MARK_DIAMETER}px`;
        mark.style.display = 'flex';
        mark.style.alignItems = 'center';
        mark.style.justifyContent = 'center';
        mark.style.background = 'transparent';
        mark.style.padding = '0';
        mark.style.zIndex = '5';

        const dot = document.createElement('div');
        dot.className = 'kropki-dot';
        dot.style.width = '100%';
        dot.style.height = '100%';
        dot.style.borderRadius = '50%';
        dot.style.boxSizing = 'border-box';
        dot.style.pointerEvents = 'none';

        apply_kropki_dot_style(dot, normalized_type);
        mark.appendChild(dot);

        mark.addEventListener('dblclick', (evt) => {
            evt.stopPropagation();
            mark.remove();
        });

        container.appendChild(mark);
    } else {
        mark.style.width = `${KROPKI_MARK_DIAMETER}px`;
        mark.style.height = `${KROPKI_MARK_DIAMETER}px`;
        const dot = mark.querySelector('.kropki-dot');
        if (dot) {
            dot.style.width = '100%';
            dot.style.height = '100%';
            apply_kropki_dot_style(dot, normalized_type);
        }
    }

    mark.dataset.kropkiType = normalized_type;
    const half_mark = KROPKI_MARK_DIAMETER / 2;
    mark.style.left = `${grid.offsetLeft + mark_x - half_mark}px`;
    mark.style.top = `${grid.offsetTop + mark_y - half_mark}px`;

    if (focus_input) {
        mark.classList.add('kropki-mark-highlight');
        setTimeout(() => mark.classList.remove('kropki-mark-highlight'), 200);
    }

    return { mark, created };
}

function apply_kropki_dot_style(dot, type) {
    if (!dot) return;
    dot.style.width = '100%';
    dot.style.height = '100%';
    dot.style.borderRadius = '50%';
    dot.style.boxSizing = 'border-box';
    if (type === 'W') {
        dot.style.backgroundColor = '#fff';
        dot.style.border = '3px solid #000';
    } else {
        dot.style.backgroundColor = '#000';
        dot.style.border = '3px solid #000';
    }
}

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
    const raw = (mark.dataset.kropkiType || '').toUpperCase();
    if (raw === 'B' || raw === 'W') {
        return raw;
    }
    return null;
}

function reset_kropki_highlights(container) {
    if (!container) return;
    container.querySelectorAll('.sudoku-cell input[data-row]').forEach((input) => {
        input.style.backgroundColor = '';
    });
}

function get_kropki_container() {
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

// 黑白点数独有效性检测（用于求解器）
// 黑点 (B)：两格满足二倍关系（a === 2*b 或 b === 2*a）
// 白点 (W)：两格差为1（|a-b| === 1）
// 未标记相邻且两格均已定值时，不得满足上述任一关系
export function is_valid_kropki(board, size, row, col, num) {
    // 1) 常规数独区域冲突检测
    const mode = state.current_mode || 'kropki';
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

    // 2) 收集界面上的标记约束（B/W）
    const container = document.querySelector('.sudoku-container');
    const kropkiConstraints = [];
    const kropkiConstraintKeySet = new Set();
    if (container) {
        const marks = Array.from(container.querySelectorAll('.vx-mark[data-key]'));
        for (const mark of marks) {
            const key = mark.dataset.key;
            const pair = parse_mark_key(key);
            const type = read_mark_type(mark); // 'B' 或 'W' 或 null
            if (!pair || !type) continue;
            const normalizedKey = normalize_pair_key(pair.row1, pair.col1, pair.row2, pair.col2);
            kropkiConstraints.push({
                cell1: { row: pair.row1, col: pair.col1 },
                cell2: { row: pair.row2, col: pair.col2 },
                type,
                key: normalizedKey,
            });
            kropkiConstraintKeySet.add(normalizedKey);
        }
    }

    // 3) 对涉及标记对的检查：若另一格已确定数字，则当前填入数字必须满足对应关系
    for (const constraint of kropkiConstraints) {
        const involvesCell1 = constraint.cell1.row === row && constraint.cell1.col === col;
        const involvesCell2 = constraint.cell2.row === row && constraint.cell2.col === col;
        if (involvesCell1 || involvesCell2) {
            const otherCell = involvesCell1 ? constraint.cell2 : constraint.cell1;
            const otherValue = board[otherCell.row][otherCell.col];
            if (otherValue !== 0 && typeof otherValue === 'number' && !Array.isArray(otherValue)) {
                if (constraint.type === 'B') {
                    if (!(num === 2 * otherValue || otherValue === 2 * num)) {
                        return false;
                    }
                } else if (constraint.type === 'W') {
                    if (Math.abs(num - otherValue) !== 1) {
                        return false;
                    }
                }
            }
        }
    }

    // 4) 对所有未标记的相邻对：若另一格已确定数字且没有标记，则两数不得满足黑点或白点任一关系
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
        const hasMark = kropkiConstraintKeySet.has(key);
        if (!hasMark) {
            // 若未标记但满足任一关系则不允许
            const isBlackRelation = (num === 2 * otherValue || otherValue === 2 * num);
            const isWhiteRelation = (Math.abs(num - otherValue) === 1);
            if (isBlackRelation || isWhiteRelation) {
                return false;
            }
        }
    }

    return true;
}