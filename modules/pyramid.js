import { state, set_current_mode } from './state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation } from './core.js';
import { create_technique_panel } from './classic.js';

// 金字塔数独主入口
export function create_pyramid_sudoku(size) {
    set_current_mode('pyramid');
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

        const cell = document.createElement('div');
        cell.className = 'sudoku-cell pyramid-mode';
        cell.dataset.row = row;
        cell.dataset.col = col;

        const main_input = document.createElement('input');
        main_input.type = 'text';
        main_input.className = 'main-input';
        main_input.maxLength = size;
        main_input.dataset.row = row;
        main_input.dataset.col = col;

        // 金字塔高亮（以9x9为例，三角形区域高亮）
        if (is_pyramid_cell(row, col, size)) {
            cell.classList.add('extra-region-cell');
        }

        cell.appendChild(main_input);
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

    // 添加金字塔数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    // 可添加唯一性验证等按钮
}

// 判断是否为金字塔区域的单元格（以9x9为例，正三角形区域高亮）
function is_pyramid_cell(row, col, size) {
    if (size !== 9) return false;
    // 第0列的第1~5行
    if (col === 0 && row >= 1 && row <= 5) return true;
    // 第1列的第2~4行
    if (col === 1 && row >= 2 && row <= 4) return true;
    // 第2列的第3行
    if (col === 2 && row === 3) return true;

    // 第0行的第3~7列
    if (row === 0 && col >= 3 && col <= 7) return true;
    // 第1行的第4~6列
    if (row === 1 && col >= 4 && col <= 6) return true;
    // 第2行的第5列
    if (row === 2 && col === 5) return true;

    // 第8列的第3~7行
    if (col === 8 && row >= 3 && row <= 7) return true;
    // 第7列的第4~6行
    if (col === 7 && row >= 4 && row <= 6) return true;
    // 第6列的第5行
    if (col === 6 && row === 5) return true;

    // 第8行的第1~5列
    if (row === 8 && col >= 1 && col <= 5) return true;
    // 第7行的第2~4列
    if (row === 7 && col >= 2 && col <= 4) return true;
    // 第6行的第3列
    if (row === 6 && col === 3) return true;
    return false;
}