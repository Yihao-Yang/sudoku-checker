// filepath: c:\Users\86156\Desktop\sudoku\sudoku34\modules\window.js
import { state, set_current_mode } from './state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell } from './core.js';
import { solve } from '../solver/solver_tool.js';
import { create_technique_panel } from './classic.js';

// 窗口数独主入口
export function create_window_sudoku(size) {
    set_current_mode('window');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

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
        Variant_Elimination: true,
        Variant_Block: true,
        Variant_Pair_Block: true,
        Variant_Naked_Pair: true,
        Variant_Hidden_Pair: true,
        Variant_Naked_Triple: true,
        Variant_Hidden_Triple: true
    };
    for (let i = 1; i <= 9; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        // 窗口高亮（以4x4为例，左上/右下4x4区域高亮）
        if (is_window_cell(row, col, size)) {
            cell.classList.add('extra-region-cell');
        }

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

        // bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加窗口数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    // 可添加唯一性验证等按钮
}

// 判断是否为窗口区域的单元格（不挨着边的四角3x3高亮）
function is_window_cell(row, col, size) {
    if (size !== 9) return false;
    // 左上
    if (row >= 1 && row <= 3 && col >= 1 && col <= 3) return true;
    // 右上
    if (row >= 1 && row <= 3 && col >= 5 && col <= 7) return true;
    // 左下
    if (row >= 5 && row <= 7 && col >= 1 && col <= 3) return true;
    // 右下
    if (row >= 5 && row <= 7 && col >= 5 && col <= 7) return true;
    return false;
}
