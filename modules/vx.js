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
    clear_marks,
    show_generating_timer,
    hide_generating_timer,
} from '../solver/core.js';
import { state, set_current_mode } from '../solver/state.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_solved_board_brute_force, generate_puzzle } from '../solver/generate.js';
import { get_all_regions, invalidate_regions_cache } from '../solver/solver_tool.js';

function render_vx_marks_from_state(size, container = get_vx_container()) {
    if (!container) return;

    const marks = Array.isArray(state.marks_board)
        ? state.marks_board.filter((mark) =>
            (mark.kind === 'v' || mark.kind === 'h') &&
            Number.isInteger(mark.r) &&
            Number.isInteger(mark.c) &&
            (mark.type === 'V' || mark.type === 'X')
        )
        : [];

    Array.from(container.querySelectorAll('.vx-mark')).forEach((mark) => mark.remove());

    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    const grid_offset_left = grid.offsetLeft;
    const grid_offset_top = grid.offsetTop;
    const cell_width = grid.offsetWidth / size;
    const cell_height = grid.offsetHeight / size;
    const fragment = document.createDocumentFragment();

    for (const markData of marks) {
        const key = markData.kind === 'v'
            ? `v-${markData.r}-${markData.c + 1}`
            : `h-${markData.r + 1}-${markData.c}`;
        const normalizedType = markData.type === 'X' ? 'X' : 'V';
        const mark_x = markData.kind === 'v'
            ? (markData.c + 1) * cell_width
            : markData.c * cell_width + cell_width / 2;
        const mark_y = markData.kind === 'v'
            ? markData.r * cell_height + cell_height / 2
            : (markData.r + 1) * cell_height;

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.dataset.vxType = normalizedType;
        mark.style.position = 'absolute';
        mark.style.width = '22px';
        mark.style.height = '22px';
        mark.style.display = 'block';
        mark.style.zIndex = '5';
        mark.style.left = `${grid_offset_left + mark_x - 11}px`;
        mark.style.top = `${grid_offset_top + mark_y - 11}px`;

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.autocomplete = 'off';
        input.value = normalizedType;
        input.style.width = '22px';
        input.style.height = '22px';
        input.style.fontSize = '18px';
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

        const applyType = (nextType) => {
            const resolvedType = nextType === 'X' ? 'X' : 'V';
            const target = Array.isArray(state.marks_board)
                ? state.marks_board.find((item) => item.kind === markData.kind && item.r === markData.r && item.c === markData.c)
                : null;
            if (target) {
                target.type = resolvedType;
            }
            mark.dataset.vxType = resolvedType;
            input.value = resolvedType;
            invalidate_regions_cache();
        };

        input.addEventListener('input', () => {
            const value = input.value.toUpperCase().replace(/[^VX]/g, '');
            if (!value) {
                input.value = mark.dataset.vxType || normalizedType;
                return;
            }
            applyType(value[0]);
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'v' || event.key === 'V') {
                applyType('V');
                event.preventDefault();
            } else if (event.key === 'x' || event.key === 'X') {
                applyType('X');
                event.preventDefault();
            }
        });

        const removeMark = (event) => {
            event.stopPropagation();
            if (!Array.isArray(state.marks_board)) return;
            state.marks_board = state.marks_board.filter(
                (item) => !(item.kind === markData.kind && item.r === markData.r && item.c === markData.c)
            );
            invalidate_regions_cache();
            mark.remove();
        };

        mark.addEventListener('dblclick', removeMark);
        input.addEventListener('dblclick', removeMark);
        mark.appendChild(input);
        fragment.appendChild(mark);
    }

    container.appendChild(fragment);
}

export function create_vx_sudoku(size = 9) {
    set_current_mode('VX');
    show_result(`当前模式为VX数独`);
    log_process('', true);
    log_process('规则：');
    log_process('V(X)：两侧格内数字和为5(10)');
    log_process('满足条件的V(X)全部标记');
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('20秒，超1分钟请刷新页面或调整限制条件');
    log_process('');
    log_process('自动出题：');
    log_process('蓝色：自动添加标记出题');
    log_process('绿色：根据给定标记出题');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();
    state.marks_board = [];

    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,
        Box_Pair_Block: true,
        Variant_Box_Block: true,
        Variant_Row_Col_Block: true,
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
        Special_Combination_Region_Most_Not_Contain_1: true,
        Special_Combination_Region_Most_Not_Contain_2: true,
        Special_Combination_Region_Most_Not_Contain_3: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Block_1: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

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

    const extraButtons = document.getElementById('extraButtons');
    if (extraButtons) {
        extraButtons.innerHTML = '';
        add_Extra_Button('VX', () => {create_vx_sudoku(size)}, '#2196F3');
        add_Extra_Button('清除标记', clear_marks);
        add_Extra_Button('一键标记', auto_mark_vx);
        add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_vx_puzzle(size, score_lower_limit, holes_count)) || (() => generate_vx_puzzle(size)), '#2196F3');
    }

    reset_vx_highlights(container);
}

function auto_mark_vx() {
    const container = get_vx_container();
    if (!container) return;

    reset_vx_highlights(container);
    clear_marks();

    const size = state.current_grid_size;
    const board = Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => {
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            const value = Number.parseInt(input?.value ?? '', 10);
            return Number.isFinite(value) ? value : 0;
        })
    );
    const added = populate_all_vx_marks(container, board, size);

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
    invalidate_regions_cache();

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

    clear_all_inputs();
    log_process('', true);
    reset_vx_highlights(container);
    clear_marks();

    log_process('第一步：生成VX数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(effectiveSize);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        show_result('生成VX数独终盘失败', 'error');
        return;
    }

    log_process('第二步：标记全部符合条件的VX关系...');
    populate_all_vx_marks(container, solvedBoard, effectiveSize);

    log_process('正在生成题目，请稍候...');
    log_process('九宫：1-5分钟，超时请重启页面或调整限制条件');
    show_result('正在生成题目，请稍候...');
    show_generating_timer();

    setTimeout(() => {
        generate_puzzle(effectiveSize, score_lower_limit, holes_count, solvedBoard);
        hide_generating_timer();
    }, 0);
}

function populate_all_vx_marks(container, board, size) {
    const marks = [];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (col < size - 1) {
                const rowSum = (board[row]?.[col] ?? 0) + (board[row]?.[col + 1] ?? 0);
                if (rowSum === 5 || rowSum === 10) {
                    marks.push({ kind: 'v', r: row, c: col, type: rowSum === 5 ? 'V' : 'X' });
                }
            }

            if (row < size - 1) {
                const colSum = (board[row]?.[col] ?? 0) + (board[row + 1]?.[col] ?? 0);
                if (colSum === 5 || colSum === 10) {
                    marks.push({ kind: 'h', r: row, c: col, type: colSum === 5 ? 'V' : 'X' });
                }
            }
        }
    }

    state.marks_board = marks;
    render_vx_marks_from_state(size, container);
    invalidate_regions_cache();
    return marks.length;
}

function create_or_update_vx_mark(container, size, row1, col1, row2, col2, type = 'V', focus_input = false) {
    const orientation = row1 === row2 && Math.abs(col1 - col2) === 1
        ? { orientation: 'v', row: row1, col: Math.min(col1, col2) }
        : col1 === col2 && Math.abs(row1 - row2) === 1
            ? { orientation: 'h', row: Math.min(row1, row2), col: col1 }
            : null;
    if (!orientation || !container) return { mark: null, created: false };

    if (!Array.isArray(state.marks_board)) {
        state.marks_board = [];
    }

    const markData = {
        kind: orientation.orientation,
        r: orientation.row,
        c: orientation.col,
        type: type === 'X' ? 'X' : 'V',
    };
    const key = markData.kind === 'v'
        ? `v-${markData.r}-${markData.c + 1}`
        : `h-${markData.r + 1}-${markData.c}`;
    const index = state.marks_board.findIndex(
        (mark) => mark.kind === markData.kind && mark.r === markData.r && mark.c === markData.c
    );
    const created = index === -1;

    if (created) {
        state.marks_board.push(markData);
    } else {
        state.marks_board[index] = { ...state.marks_board[index], ...markData };
    }
    invalidate_regions_cache();

    render_vx_marks_from_state(size, container);

    const mark = container.querySelector(`.vx-mark[data-key="${key}"]`);
    if (focus_input && mark) {
        const input = mark.querySelector('input');
        if (input) {
            requestAnimationFrame(() => input.focus());
        }
    }

    return { mark, created };
}

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

// VX 数独的有效性检测（用于求解器）：除了常规数独规则外，
// 1) 有标记的相邻格必须满足标记类型对应的和（V => 5, X => 10）
// 2) 未标记的相邻格若均已确定数字，则其和不得等于 5 或 10
export function is_valid_VX(board, size, row, col, num) {
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

    const vxConstraints = [];
    const vxConstraintKeySet = new Set();
    const vxMarks = Array.isArray(state.marks_board)
        ? state.marks_board.filter((mark) =>
            (mark.kind === 'v' || mark.kind === 'h') &&
            Number.isInteger(mark.r) &&
            Number.isInteger(mark.c) &&
            (mark.type === 'V' || mark.type === 'X')
        )
        : (() => {
            const marks = [];
            const container = get_vx_container();
            if (!container) return marks;

            for (const mark of container.querySelectorAll('.vx-mark[data-key]')) {
                const key = mark.dataset.key;
                const type = (mark.dataset.vxType || mark.querySelector('input')?.value || '').toUpperCase();
                if ((type !== 'V' && type !== 'X') || !key) continue;

                if (key.startsWith('v-')) {
                    const [, rowStr, colStr] = key.split('-');
                    const parsedRow = Number.parseInt(rowStr, 10);
                    const parsedCol = Number.parseInt(colStr, 10) - 1;
                    if (Number.isInteger(parsedRow) && Number.isInteger(parsedCol)) {
                        marks.push({ kind: 'v', r: parsedRow, c: parsedCol, type });
                    }
                    continue;
                }

                if (key.startsWith('h-')) {
                    const [, rowStr, colStr] = key.split('-');
                    const parsedRow = Number.parseInt(rowStr, 10) - 1;
                    const parsedCol = Number.parseInt(colStr, 10);
                    if (Number.isInteger(parsedRow) && Number.isInteger(parsedCol)) {
                        marks.push({ kind: 'h', r: parsedRow, c: parsedCol, type });
                    }
                }
            }

            state.marks_board = marks;
            invalidate_regions_cache();
            return marks;
        })();

    for (const mark of vxMarks) {
        const row1 = mark.r;
        const col1 = mark.c;
        const row2 = mark.kind === 'v' ? mark.r : mark.r + 1;
        const col2 = mark.kind === 'v' ? mark.c + 1 : mark.c;
        const requiredSum = mark.type === 'V' ? 5 : 10;
        const normalizedKey = row1 > row2 || (row1 === row2 && col1 > col2)
            ? `${row2}-${col2}-${row1}-${col1}`
            : `${row1}-${col1}-${row2}-${col2}`;
        vxConstraints.push({
            cell1: { row: row1, col: col1 },
            cell2: { row: row2, col: col2 },
            requiredSum,
            key: normalizedKey,
        });
        vxConstraintKeySet.add(normalizedKey);
    }

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

    const neighbors = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
    ];
    for (const [dr, dc] of neighbors) {
        const otherRow = row + dr;
        const otherCol = col + dc;
        if (otherRow < 0 || otherRow >= size || otherCol < 0 || otherCol >= size) continue;

        const otherValue = board[otherRow][otherCol];
        if (otherValue === 0 || Array.isArray(otherValue) || typeof otherValue !== 'number') continue;

        const key = row > otherRow || (row === otherRow && col > otherCol)
            ? `${otherRow}-${otherCol}-${row}-${col}`
            : `${row}-${col}-${otherRow}-${otherCol}`;
        if (!vxConstraintKeySet.has(key)) {
            const sum = num + otherValue;
            if (sum === 5 || sum === 10) {
                return false;
            }
        }
    }

    return true;
}