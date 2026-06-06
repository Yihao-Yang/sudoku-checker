import { state, set_current_mode } from '../solver/state.js';
import {
    show_result,
    log_process,
    create_base_grid,
    handle_key_navigation,
    create_base_cell,
    add_Extra_Button,
    clear_inner_numbers,
    clear_outer_clues
} from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, invalidate_regions_cache } from '../solver/solver_tool.js';
import { generate_exterior_puzzle } from '../solver/generate.js';

// Rossini 外提示数独骨架，后续可在此补充规则、标记和出题逻辑。
export function create_rossini_sudoku(size) {
    set_current_mode('rossini');
    show_result('当前模式为方向数独');
    log_process('', true);
    log_process('规则：');
    log_process('Rossini 方向数独规则待完善');
    log_process('');
    log_process('当前文件已预留：');
    log_process('1. 盘面创建');
    log_process('2. 外提示输入');
    log_process('3. 标记函数占位');
    log_process('4. 校验函数占位');

    state.current_grid_size = size;
    state.clues_board = null;
    invalidate_regions_cache();

    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');

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
        Special_Combination_Region_Most_Not_Contain_1: true,
        Special_Combination_Region_Most_Not_Contain_2: true,
        Special_Combination_Region_Most_Not_Contain_3: true,
        // Special_Combination_Region_Most_Not_Contain_4: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        Special_Combination_Region_Most_Contain_3: true,
        // Special_Combination_Region_Most_Contain_4: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        // Special_Combination_Region_Cell_Elimination_4: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        // Special_Combination_Region_Elimination_4: true,
        // Special_Combination_Region_Block_1: true,
        // Special_Combination_Region_Block_2: true,
        // Special_Combination_Region_Block_3: true,
        // Special_Combination_Region_Block_4: true,
        Lookup_Table: true
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

            if (row >= 1 && row <= size && col >= 1 && col <= size) {
                cell.appendChild(candidates_grid);
            } else {
                main_input.style.fontSize = '44px';
                // main_input.style.lineHeight = '52px';
                main_input.style.paddingBottom = '8px';
            }

            main_input.addEventListener('input', function() {
                if (row >= 1 && row <= size && col >= 1 && col <= size) {
                    const regex = new RegExp(`[^1-${size}]`, 'g');
                    this.value = this.value.replace(regex, '');
                    if (this.value.length > 1) {
                        this.value = this.value[this.value.length - 1];
                    }
                    return;
                }

                // 外提示只允许单个箭头，支持直接输入箭头或用 WASD/2468 快捷输入。
                const raw = (this.value || '').trim();
                const last_char = raw.slice(-1).toLowerCase();
                const arrow_map = {
                    'w': '↑', '8': '↑',
                    'a': '←', '4': '←',
                    's': '↓', '2': '↓',
                    'd': '→', '6': '→',
                    '↑': '↑', '←': '←', '↓': '↓', '→': '→'
                };
                this.value = arrow_map[last_char] || '';
            });

            main_input.addEventListener('keydown', function(e) {
                handle_key_navigation(e, row, col, size + 2, inputs);
            });

            main_input.addEventListener('click', function() {
                this.select();
            });
        }
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';
    add_Extra_Button('方向', () => { create_rossini_sudoku(size); }, '#2196F3');
    add_Extra_Button('清除内部', clear_inner_numbers, '#2196F3');
    add_Extra_Button('清除提示', clear_outer_clues, '#2196F3');
    add_Extra_Button('标记提示', () => mark_outer_clues_rossini(size), '#2196F3');
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_exterior_puzzle(size, score_lower_limit, holes_count)) || (() => generate_exterior_puzzle(size)), '#2196F3');
}

export function mark_outer_clues_rossini(size) {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    const get_cell_value = (r, c) => {
        const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
        const value = parseInt(input?.value ?? '', 10);
        return Number.isFinite(value) ? value : 0;
    };

    const resolve_arrow = (a, b, c, forward_arrow, backward_arrow) => {
        if (!(a > 0 && b > 0 && c > 0)) {
            return '';
        }
        if (a < b && b < c) {
            return forward_arrow;
        }
        if (a > b && b > c) {
            return backward_arrow;
        }
        return '';
    };

    const set_arrow_mark = (r, c, arrow) => {
        const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
        if (!input) return;
        input.value = arrow;
    };

    // 行方向：箭头指向增大的方向（→ 或 ←）。
    for (let r = 1; r <= size; r++) {
        const left_a = get_cell_value(r, 1);
        const left_b = get_cell_value(r, 2);
        const left_c = get_cell_value(r, 3);
        set_arrow_mark(r, 0, resolve_arrow(left_a, left_b, left_c, '→', '←'));

        const right_a = get_cell_value(r, size - 2);
        const right_b = get_cell_value(r, size - 1);
        const right_c = get_cell_value(r, size);
        set_arrow_mark(r, size + 1, resolve_arrow(right_a, right_b, right_c, '→', '←'));
    }

    // 列方向：箭头指向增大的方向（↓ 或 ↑）。
    for (let c = 1; c <= size; c++) {
        const top_a = get_cell_value(1, c);
        const top_b = get_cell_value(2, c);
        const top_c = get_cell_value(3, c);
        set_arrow_mark(0, c, resolve_arrow(top_a, top_b, top_c, '↓', '↑'));

        const bottom_a = get_cell_value(size - 2, c);
        const bottom_b = get_cell_value(size - 1, c);
        const bottom_c = get_cell_value(size, c);
        set_arrow_mark(size + 1, c, resolve_arrow(bottom_a, bottom_b, bottom_c, '↓', '↑'));
    }

    // 同步到 clues_board，便于唯一性/下一步检查直接读取。
    state.clues_board = Array.from({ length: size + 2 }, (_, r) =>
        Array.from({ length: size + 2 }, (_, c) => {
            const is_border = r === 0 || r === size + 1 || c === 0 || c === size + 1;
            if (!is_border) {
                return Array.from({ length: size }, (_, n) => n + 1);
            }
            if ((r === 0 || r === size + 1) && (c === 0 || c === size + 1)) {
                return '';
            }
            const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            return (input?.value ?? '').trim();
        })
    );

    show_result('已自动标记方向外提示箭头');
    log_process('已根据边缘三格的递增/递减关系自动标记方向外提示箭头');
}

export function is_valid_rossini(board, size, row, col, num) {
    const mode = state.current_mode || 'rossini';
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

    // 仅在 clues_board 就绪时应用方向约束，避免初始化阶段误判。
    const clues = state.clues_board;
    const hasCluesBoard = Array.isArray(clues) && clues.length === size + 2;
    if (!hasCluesBoard) {
        return true;
    }

    const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));
    const is_fixed_digit = (v) => typeof v === 'number' && v > 0;
    const read_clue = (r, c, side) => {
        const v = clues[r]?.[c];

        if (v === '→' || v === '←' || v === '↑' || v === '↓') {
            return v;
        }

        // 兼容旧数据：此前用数字 1 标记“有箭头”。
        if (typeof v === 'number' && v > 0) {
            if (side === 'left') return '→';
            if (side === 'right') return '←';
            if (side === 'top') return '↓';
            if (side === 'bottom') return '↑';
        }

        if (typeof v === 'string') {
            const text = v.trim();
            if (text === '→' || text === '←' || text === '↑' || text === '↓') {
                return text;
            }
        }

        return '';
    };

    const is_strict_inc = ([a, b, c]) => a < b && b < c;
    const is_peak_or_valley = ([a, b, c]) => (b > a && b > c) || (b < a && b < c);

    const validate_triple = (values, arrow) => {
        if (values.length !== 3 || values.some(v => !is_fixed_digit(v))) {
            return true;
        }

        if (arrow === '→') {
            return values[0] < values[1] && values[1] < values[2];
        }
        if (arrow === '←') {
            return values[0] > values[1] && values[1] > values[2];
        }
        if (arrow === '↓') {
            return values[0] < values[1] && values[1] < values[2];
        }
        if (arrow === '↑') {
            return values[0] > values[1] && values[1] > values[2];
        }

        return is_peak_or_valley(values);
    };

    // 行：左/右提示都作用于各自边缘三格，按箭头方向递增。
    const row_values = temp_board[row];
    const left_arrow = read_clue(row + 1, 0, 'left');
    const right_arrow = read_clue(row + 1, size + 1, 'right');

    if (!validate_triple([row_values[0], row_values[1], row_values[2]], left_arrow)) {
        return false;
    }
    if (!validate_triple([row_values[size - 3], row_values[size - 2], row_values[size - 1]], right_arrow)) {
        return false;
    }

    // 列：上/下提示都作用于各自边缘三格，按箭头方向递增。
    const col_values = temp_board.map(r => r[col]);
    const top_arrow = read_clue(0, col + 1, 'top');
    const bottom_arrow = read_clue(size + 1, col + 1, 'bottom');

    if (!validate_triple([col_values[0], col_values[1], col_values[2]], top_arrow)) {
        return false;
    }
    if (!validate_triple([col_values[size - 3], col_values[size - 2], col_values[size - 1]], bottom_arrow)) {
        return false;
    }

    return true;
}