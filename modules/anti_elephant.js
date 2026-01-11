import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, invalidate_regions_cache } from '../solver/solver_tool.js';

// Anti-Elephant Sudoku entry point
export function create_anti_elephant_sudoku(size) {
    set_current_mode('anti_elephant');
    show_result(`当前模式为无象数独`);
    log_process('', true);
    log_process('规则：');
    log_process('中国象棋象步位置（进二拐二）数字不重复');
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    // log_process('"额外区域"：附加的不可重复区域');
    // log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();

    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,
        Variant_Box_Block: true,
        Box_Pair_Block: true,
        Row_Col_Block: true,
        Variant_Row_Col_Block: true,
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
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        main_input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            this.value = this.value.replace(regex, '');
            if (this.value.length > 1) {
                this.value = this.value[this.value.length - 1];
            }
        });

        main_input.addEventListener('keydown', function(e) {
            handle_key_navigation(e, row, col, size, inputs);
        });

        bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('无象', () => {create_anti_elephant_sudoku(size)}, '#2196F3');
}

/**
 * Anti-Elephant validity check
 * In addition to classic Sudoku rules, numbers must differ on elephant moves.
 */
export function is_valid_anti_elephant(board, size, row, col, num) {
    const mode = 'classic';
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

    const elephant_moves = [
        [-2, -2],
        [-2, 2],
        [2, -2],
        [2, 2],
    ];
    for (const [dr, dc] of elephant_moves) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (board[nr][nc] === num) return false;
        }
    }
    return true;
}
