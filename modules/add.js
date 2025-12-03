import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs, clear_marks } from '../solver/core.js';
import { create_technique_panel } from './classic.js';
import { get_all_regions, solve } from '../solver/solver_tool.js';
import { generate_puzzle, generate_solution, generate_solution_old, generate_solved_board_brute_force } from '../solver/generate.js';

// 新数独主入口
export function create_add_sudoku(size) {
    set_current_mode('add');
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

    // 添加标记功能
    add_add_mark(size);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    // add_Extra_Button('清除标记', clear_add_marks, '#FF5722');
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', () => generate_add_puzzle(size));
    // 可添加唯一性验证等按钮
}

// // 自动生成加法数独题目（生成圆圈并调用generate_puzzle）
// export function generate_add_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
//     clear_all_inputs();
//     // 清除已有圆圈
//     const container = document.querySelector('.sudoku-container');
//     if (!container) return;
//     Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

//     // 生成圆圈数量
//     let min_marks = 2, max_marks = 4;
//     if (size === 6) { min_marks = 10; max_marks = 12; }
//     if (size === 9) { min_marks = 26; max_marks = 28; }
//     const num_marks = Math.floor(Math.random() * (max_marks - min_marks + 1)) + min_marks;
//     // log_process(`计划生成圆圈数量：${num_marks}`);

//     // 选取对称类型
//     const SYMMETRY_TYPES = [
//         'central','central','central','central','central',
//         'diagonal','diagonal',
//         'anti-diagonal','anti-diagonal',
//         'horizontal',
//         'vertical',
//         // 'none'
//     ];
//     const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

//     // 获取对称点
//     function get_symmetric(row, col, size, symmetry, type) {
//         // type: 'v' 竖线，'h' 横线，'x' 交点（四格）
//         switch (symmetry) {
//             case 'central':
//                 if (type === 'v') {
//                     return [size - 1 - row, size - 2 - col, 'v'];
//                 } else if (type === 'h') {
//                     return [size - 2 - row, size - 1 - col, 'h'];
//                 } else { // x
//                     return [size - 2 - row, size - 2 - col, 'x'];
//                 }
//             case 'diagonal':
//                 if (type === 'v') {
//                     return [col, row, 'h'];
//                 } else if (type === 'h') {
//                     return [col, row, 'v'];
//                 } else { // x
//                     return [col, row, 'x'];
//                 }
//             case 'anti-diagonal':
//                 if (type === 'v') {
//                     return [size - 2 - col, size - 1 - row, 'h'];
//                 } else if (type === 'h') {
//                     return [size - 1 - col, size - 2 - row, 'v'];
//                 } else { // x
//                     return [size - 2 - col, size - 2 - row, 'x'];
//                 }
//             case 'horizontal':
//                 if (type === 'v') {
//                     return [size - 1 - row, col, 'v'];
//                 } else if (type === 'h') {
//                     return [size - 2 - row, col, 'h'];
//                 } else { // x
//                     return [size - 2 - row, col, 'x'];
//                 }
//             case 'vertical':
//                 if (type === 'v') {
//                     return [row, size - 2 - col, 'v'];
//                 } else if (type === 'h') {
//                     return [row, size - 1 - col, 'h'];
//                 } else { // x
//                     return [row, size - 2 - col, 'x'];
//                 }
//             default:
//                 return [row, col, type];
//         }
//     }
//     // log_process(`即将生成加法数独，圆圈数量：${num_marks}，对称类型：${symmetry}`);

//     // 随机生成圆圈位置和数字（不贴边线，带对称）
//     const positions_set = new Set();
//     let marks_added = 0;
//     let try_count = 0;
//     const MAX_TRY = 1000;
//     while (marks_added < num_marks && try_count < MAX_TRY) {
//         try_count++;
//         // 随机决定横线、竖线或交点
//         const rand = Math.random();
//         let type;
//         if (rand < 0.2) type = 'v';
//         else if (rand < 0.4) type = 'h';
//         else type = 'x';
        
//         let row, col;
//         if (type === 'v') {
//             row = Math.floor(Math.random() * size);
//             col = Math.floor(Math.random() * (size - 1));
//         } else if (type === 'h') {
//             row = Math.floor(Math.random() * (size - 1));
//             col = Math.floor(Math.random() * size);
//         } else { // 'x' 交点，行列必须在 1..size-1
//             row = Math.floor(Math.random() * (size - 1));
//             col = Math.floor(Math.random() * (size - 1));
//          }
//         const key = `${type}-${row}-${col}`;
//         if (positions_set.has(key)) continue;

//         // 计算对称点
//         const [sym_row, sym_col, sym_type] = get_symmetric(row, col, size, symmetry, type);
//         const sym_key = `${sym_type}-${sym_row}-${sym_col}`;

//         // 两个点都不能重复且都不能贴右/下边线
// // -        if (
// // -            sym_row >= 0 && sym_row < size && sym_col >= 0 && sym_col < size &&
// // -            ((type === 'v' && col < size - 1) || (type === 'h' && row < size - 1)) &&
// // -            ((sym_type === 'v' && sym_col < size - 1) || (sym_type === 'h' && sym_row < size - 1)) &&
// // -            !positions_set.has(key) && !positions_set.has(sym_key)
// // -        ) {
//         const valid_primary = (
//             type === 'v' ? (row >= 0 && row < size && col >= 0 && col < size - 1) :
//             type === 'h' ? (row >= 0 && row < size - 1 && col >= 0 && col < size) :
//             (row >= 0 && row < size - 1 && col >= 0 && col < size - 1)
//         );
//         const valid_sym = (
//             sym_type === 'v' ? (sym_row >= 0 && sym_row < size && sym_col >= 0 && sym_col < size - 1) :
//             sym_type === 'h' ? (sym_row >= 0 && sym_row < size - 1 && sym_col >= 0 && sym_col < size) :
//             (sym_row >= 0 && sym_row < size - 1 && sym_col >= 0 && sym_col < size - 1)
//         );

//         if (valid_primary && valid_sym && !positions_set.has(key) && !positions_set.has(sym_key)) {
//             positions_set.add(key);
//             positions_set.add(sym_key);
//             add_circle(row, col, size, container, type);
//             add_circle(sym_row, sym_col, size, container, sym_type);
//             // 检查是否有解
//             // 构造当前盘面
//             const grid = container.querySelector('.sudoku-grid');
//             let board = [];
//             for (let r = 0; r < size; r++) {
//                 board[r] = [];
//                 for (let c = 0; c < size; c++) {
//                     board[r][c] = 0;
//                 }
//             }
//             // 调用solve
//             backup_original_board();
//             const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_add, true);
//             log_process(`尝试添加圆圈位置：${type}(${row},${col}) 和 ${type}(${sym_row},${sym_col})，解的数量：${result.solution_count}`);
//             if (result.solution_count === 0 || result.solution_count === -2) {
//                 log_process('当前圆圈位置无解，重新生成');
//                 restore_original_board();
//                 // // 无解，撤销圆圈
//                 // positions_set.delete(`${row},${col}`);
//                 // positions_set.delete(`${sym_row},${sym_col}`);
//                 // 无解，从positions_set中移除对应的键值
//                 positions_set.delete(key);
//                 positions_set.delete(sym_key);
//                 // 移除最后两个圆圈
//                 const marks = container.querySelectorAll('.vx-mark');
//                 if (marks.length >= 2) {
//                     marks[marks.length - 1].remove();
//                     marks[marks.length - 2].remove();
//                 }
//                 // marks_added -= 2; // 同步减少计数
//                 continue;
//             }
//             if (result.solution_count === 1) {
//                 marks_added += 2;
//                 return;
//                 break;
//             }
//             marks_added += 2;
//         }
//         // 如果对称点和主点重合，只添加一次
// // -        else if (
// // -            sym_row === row && sym_col === col &&
// // -            !positions_set.has(key)
// // -        ) {
//         else if (valid_primary && sym_row === row && sym_col === col && !positions_set.has(key)) {
//             positions_set.add(key);
//             add_circle(row, col, size, container, type);
//             // 检查是否有解
//             // 构造当前盘面
//             const grid = container.querySelector('.sudoku-grid');
//             let board = [];
//             for (let r = 0; r < size; r++) {
//                 board[r] = [];
//                 for (let c = 0; c < size; c++) {
//                     board[r][c] = 0;
//                 }
//             }
//             // 调用solve
//             backup_original_board();
//             const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_add, true);
//             log_process(`尝试添加圆圈 at (${row},${col})，解数：${result.solution_count}`);
//             if (result.solution_count === 0 || result.solution_count === -2) {
//                 log_process('当前圆圈位置无解，重新生成');
//                 restore_original_board();
//                 // // 无解，撤销圆圈
//                 // positions_set.delete(`${row},${col}`);
//                 // positions_set.delete(`${sym_row},${sym_col}`);
//                 // 无解，从positions_set中移除对应的键值
//                 positions_set.delete(key);
//                 // positions_set.delete(sym_key);
//                 // 移除最后两个圆圈
//                 const marks = container.querySelectorAll('.vx-mark');
//                 if (marks.length >= 1) {
//                     marks[marks.length - 1].remove();
//                 }
//                 // marks_added -= 1; // 同步减少计数
//                 continue;
//             }
//             if (result.solution_count === 1) {
//                 marks_added += 1;
//                 return;
//                 break;
//             }
//             marks_added += 1;
//         }
//     }
//     if (try_count >= MAX_TRY) {
//         log_process('自动出题失败，请重试或减少圆圈数量！');
//     }

//     // 生成题目
//     generate_puzzle(size, score_lower_limit, holes_count);

//     // 辅助函数:添加加法标记（与add_add_mark一致）
//     function add_circle(row, col, size, container, type) {
//         const grid = container.querySelector('.sudoku-grid');
//         if (!grid) return;

//         const cell_width = grid.offsetWidth / size;
//         const cell_height = grid.offsetHeight / size;

//         let mark_x, mark_y, key;
//         if (type === 'v') {
//             // 竖线：连接[row, col]和[row, col+1]
//             mark_x = (col + 1) * cell_width;
//             mark_y = row * cell_height + cell_height / 2;
//             key = `v-${row}-${col + 1}`;
//         } else if (type === 'h') {
//             // 横线：连接[row, col]和[row+1, col]
//             mark_x = col * cell_width + cell_width / 2;
//             mark_y = (row + 1) * cell_height;
//             key = `h-${row + 1}-${col}`;
//         } else if (type === 'x') {
//             // 交点（四格）：位于行/列交叉处 (row, col) 表示位于第 row 行与第 col 列的交点
//             mark_x = (col + 1) * cell_width;
//             mark_y = (row + 1) * cell_height;
//             // key = null; // 交点不设置 v-/h- key，solver 会按位置解析为四格提示
//             key = `x-${row + 1}-${col + 1}`;
//         } else {
//             return;
//         }

//         const grid_offset_left = grid.offsetLeft;
//         const grid_offset_top = grid.offsetTop;

//         // 防止重复添加 v/h 的重复；对于交点使用位置判重
//         const existingMarks = Array.from(container.querySelectorAll('.vx-mark'));
//         if (key) {
//             if (existingMarks.some(m => m.dataset.key === key)) return;
//         } else {
//             // 对于交点，避免同一位置重复（使用左右/上下偏移 2px 判断）
//             if (existingMarks.some(m => {
//                 const l = parseInt(m.style.left || '0', 10);
//                 const t = parseInt(m.style.top || '0', 10);
//                 return Math.abs(l - (grid_offset_left + mark_x - 15)) <= 2 && Math.abs(t - (grid_offset_top + mark_y - 15)) <= 2;
//             })) return;
//         }

//         const mark = document.createElement('div');
//         mark.className = 'vx-mark';
//         if (key) mark.dataset.key = key;
//         mark.style.position = 'absolute';
//         mark.style.left = `${grid_offset_left + mark_x - 15}px`;
//         mark.style.top = `${grid_offset_top + mark_y - 15}px`;
//         mark.style.width = '30px';
//         mark.style.height = '30px';
//         // 黑色边框
//         mark.style.border = '1px solid #000';
//         mark.style.boxSizing = 'border-box';

//         // 创建只显示数字的输入框
//         const input = document.createElement('input');
//         input.type = 'text';
//         input.maxLength = 2;
//         input.style.width = '38px';
//         input.style.height = '28px';
//         input.style.fontSize = '22px';
//         input.style.textAlign = 'center';
//         input.style.border = 'none';
//         input.style.background = 'transparent';
//         input.style.outline = 'none';
//         input.style.position = 'absolute';
//         input.style.left = '50%';
//         input.style.top = '50%';
//         input.style.transform = 'translate(-50%, -50%)';
//         input.style.color = '#333';

//         // 根据 size 设置半排除数组
//         let semi_excluded_values = [];
//         if (size === 6) {
//             semi_excluded_values = [3, 4, 10, 11];
//         } else if (size === 9) {
//             semi_excluded_values = [3, 4, 16, 17];
//         }
        
//         if (type === 'x') {
//             // 四格提示：根据 size 在指定范围内随机取值
//             let sum;
//             if (size === 4) {
//                 // 四宫：6-14
//                 sum = Math.floor(Math.random() * (14 - 6 + 1)) + 6;
//             } else if (size === 6) {
//                 // 六宫：6-22
//                 sum = Math.floor(Math.random() * (22 - 6 + 1)) + 6;
//             } else if (size === 9) {
//                 // 九宫：可根据需要调整范围，这里暂定 10-30
//                 sum = Math.floor(Math.random() * (34 - 6 + 1)) + 6;
//             } else {
//                 // 其他尺寸：使用 4*size 的上下浮动
//                 sum = Math.floor(Math.random() * (size * 2)) + size * 2;
//             }
//             input.value = `${sum}`;
//         } else {
//             // 两格提示：生成两个不同数字的和
//             let left, right, add;
//             do {
//                 left = Math.floor(Math.random() * size) + 1;
//                 right = Math.floor(Math.random() * size) + 1;
//                 if (left === right) continue;
//                 add = left + right;
//                 // 半排除
//                 if (semi_excluded_values.includes(add) && Math.random() < 0.5) continue;
//                 break;
//             } while (true);
//             input.value = `${add}`;
//         }

//         mark.ondblclick = function(e) {
//             e.stopPropagation();
//             mark.remove();
//         };
//         input.ondblclick = function(e) {
//             e.stopPropagation();
//             mark.remove();
//         };

//         mark.appendChild(input);
//         container.appendChild(mark);
//         input.focus();
//     }

// }

export function generate_add_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    // 记录开始时间
    const start_time = performance.now();
    clear_all_inputs();
    log_process('', true);
    // 清除已有圆圈
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    // 第一步：生成终盘
    log_process("第一步：生成加法数独终盘...");
    const solvedBoard = generate_solution_old(size);
    // const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process("生成终盘失败！");
        return;
    }

    // 在界面上显示终盘（用于验证）
    const inputs = document.querySelectorAll('.sudoku-grid input[type="text"]');
    for (let i = 0; i < size * size; i++) {
        inputs[i].value = '';
    }

    // 第二步开始：逐步添加对称的提示标记
    log_process("第二步：开始添加对称提示标记...");
    
    // const SYMMETRY_TYPES = [
    //     'central'
    // ];
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
    log_process(`使用对称类型: ${symmetry}`);

    let marks_added = 0;
    const MAX_MARKS = (size-0) * (size-1); // 最大尝试标记数量
    // let MAX_MARKS;
    // if (size === 4) MAX_MARKS = 4;
    // else if (size === 6) MAX_MARKS = 12;
    // else if (size === 9) MAX_MARKS = 28;
    // else MAX_MARKS = (size-2) * (size-1); // 其它尺寸保持原有策略
    let try_count = 0;
    const MAX_TRY = 100;

    try {
        while (try_count < MAX_TRY && marks_added < MAX_MARKS) {
            try_count++;
            
            // 随机选择标记类型
            const rand = Math.random();
            let type;
            if (rand < 0.4) type = 'v';      // 30% 竖线
            else if (rand < 0.8) type = 'h'; // 30% 横线  
            else type = 'x';                 // 40% 交点

            // 随机选择主位置
            let row, col;
            if (type === 'v') {
                row = Math.floor(Math.random() * size);
                col = Math.floor(Math.random() * (size - 1));
            } else if (type === 'h') {
                row = Math.floor(Math.random() * (size - 1));
                col = Math.floor(Math.random() * size);
            } else { // 'x'
                row = Math.floor(Math.random() * (size - 1));
                col = Math.floor(Math.random() * (size - 1));
            }

            // 计算对称位置
            const [sym_row, sym_col, sym_type] = get_symmetric(row, col, size, symmetry, type);
            
            // 检查位置有效性
            if (!is_valid_position(row, col, size, type) || 
                !is_valid_position(sym_row, sym_col, size, sym_type)) {
                continue;
            }

            // 检查是否已存在标记
            if (is_mark_exists(row, col, type, container) || 
                is_mark_exists(sym_row, sym_col, sym_type, container)) {
                continue;
            }

            // 计算主标记的和（基于终盘）
            const main_sum = calculate_sum_from_solved(row, col, type, solvedBoard, size);
            if (main_sum === null) continue;

            // 计算对称标记的和
            const sym_sum = calculate_sum_from_solved(sym_row, sym_col, sym_type, solvedBoard, size);
            if (sym_sum === null) continue;

            // 添加主标记
            add_circle_with_sum(row, col, size, container, type, main_sum);
            
            // 添加对称标记（如果不是同一个位置）
            if (!(row === sym_row && col === sym_col && type === sym_type)) {
                add_circle_with_sum(sym_row, sym_col, size, container, sym_type, sym_sum);
                marks_added += 2;
            } else {
                marks_added += 1;
            }

            log_process(`添加标记: ${type}(${row},${col})=${main_sum}, ${sym_type}(${sym_row},${sym_col})=${sym_sum}`);

            // 第四步：验证唯一性
            log_process("验证唯一性...");
            // const currentBoard = get_current_board_state(size);
            // backup_original_board();
            
            // const result = solve(
            //     currentBoard.map(row => row.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), 
            //     size, 
            //     is_valid_add, 
            //     true
            // );

            // 使用完全空白的盘面进行验证
            const emptyBoard = Array(size).fill().map(() => Array(size).fill(0));
            backup_original_board();
            
            const result = solve(
                emptyBoard.map(row => row.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), 
                size, 
                is_valid_add, 
                true
            );

            if (result.solution_count === 1) {
                log_process(`✓ 找到唯一解！共添加 ${marks_added} 个标记`);
                // 第五步：优化标记，删除无用条件
                optimize_marks(container, size, symmetry);
                // 生成最终题目（挖空）
                // generate_puzzle(size, score_lower_limit, holes_count);
                return;
            } else if (result.solution_count === 0) {
                log_process("✗ 无解，移除最后添加的标记");
                // 移除最后添加的标记
                remove_last_marks(container, (row === sym_row && col === sym_col && type === sym_type) ? 1 : 2);
                marks_added -= (row === sym_row && col === sym_col && type === sym_type) ? 1 : 2;
            } else {
                log_process(`多个解（${result.solution_count}），继续添加标记...`);
            }

            restore_original_board();
        }
    } finally {
        
        // 记录结束时间
        const end_time = performance.now();
        const elapsed = ((end_time - start_time) / 1000).toFixed(3); // 秒，保留三位小数
        show_result(`已生成${size}宫格数独题目（用时${elapsed}秒）`);
    }

    if (try_count >= MAX_TRY) {
        log_process("自动出题失败：达到最大尝试次数");
    } else {
        log_process("自动出题完成（可能非唯一解）");
        // generate_puzzle(size, score_lower_limit, holes_count);
    }

    // 新增：优化标记函数
    function optimize_marks(container, size, symmetry) {
        log_process("开始优化标记，删除无用条件...");
        
        // 获取所有标记并按对称组分组
        const markGroups = group_marks_by_symmetry(container, size, symmetry);
        log_process(`共找到 ${markGroups.length} 组对称标记`);
        
        let removed_count = 0;
        
        // 按组尝试删除标记
        for (let i = 0; i < markGroups.length; i++) {
            const group = markGroups[i];
            log_process(`尝试删除第 ${i + 1} 组标记: ${group.mainKey} 和 ${group.symKey}`);
            
            // 临时移除这组标记
            const removedMarks = temporarily_remove_marks(container, [group.mainKey, group.symKey]);

            const emptyBoard = Array(size).fill().map(() => Array(size).fill(0));
            backup_original_board();
            
            const result = solve(
                emptyBoard.map(row => row.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), 
                size, 
                is_valid_add, 
                true
            );
            
            if (result.solution_count === 1) {
                // 删除后仍然唯一解，保留删除
                log_process(`✓ 删除第 ${i + 1} 组标记后仍唯一解，永久删除`);
                permanently_remove_marks(removedMarks);
                removed_count += 2;
            } else {
                // 删除后不唯一解，恢复标记
                log_process(`✗ 删除第 ${i + 1} 组标记后解不唯一，恢复标记`);
                restore_marks(container, removedMarks);
            }
            
            restore_original_board();
        }
        
        log_process(`优化完成，共删除了 ${removed_count} 个无用标记`);
    }

    // 新增：按对称性分组标记
    function group_marks_by_symmetry(container, size, symmetry) {
        const allMarks = Array.from(container.querySelectorAll('.vx-mark'));
        const groups = [];
        const processedKeys = new Set();
        
        for (const mark of allMarks) {
            const key = mark.dataset.key;
            if (!key || processedKeys.has(key)) continue;
            
            // 解析标记信息
            const [type, row_str, col_str] = key.split('-');
            const row = parseInt(row_str, 10);
            const col = parseInt(col_str, 10);
            
            // 根据标记类型和对称性计算原始位置
            let original_row, original_col, original_type;
            
            if (type === 'v') {
                // 竖线标记：key格式 v-row-col，对应位置 (row, col-1)
                original_row = row;
                original_col = col - 1;
                original_type = 'v';
            } else if (type === 'h') {
                // 横线标记：key格式 h-row-col，对应位置 (row-1, col)
                original_row = row - 1;
                original_col = col;
                original_type = 'h';
            } else if (type === 'x') {
                // 交点标记：key格式 x-row-col，对应位置 (row-1, col-1)
                original_row = row - 1;
                original_col = col - 1;
                original_type = 'x';
            } else {
                continue;
            }
            
            // 计算对称位置
            const [sym_row, sym_col, sym_type] = get_symmetric(original_row, original_col, size, symmetry, original_type);
            const symKey = get_mark_key(sym_row, sym_col, sym_type);
            
            // 查找对称标记
            const symMark = allMarks.find(m => m.dataset.key === symKey);
            
            if (symMark && !processedKeys.has(symKey)) {
                groups.push({
                    mainKey: key,
                    symKey: symKey,
                    mainMark: mark,
                    symMark: symMark
                });
                processedKeys.add(key);
                processedKeys.add(symKey);
            } else if (!symMark) {
                // 如果没有找到对称标记，单独成组（可能是中心对称点）
                groups.push({
                    mainKey: key,
                    symKey: null,
                    mainMark: mark,
                    symMark: null
                });
                processedKeys.add(key);
            }
        }
        
        return groups;
    }


    // 修改临时移除函数
    function temporarily_remove_marks(container, keys) {
        const removedMarks = [];
        
        for (const key of keys) {
            if (!key) continue;
            const mark = container.querySelector(`.vx-mark[data-key="${key}"]`);
            if (mark) {
                // 创建占位符元素来精确记录位置
                const placeholder = document.createElement('div');
                placeholder.className = 'mark-placeholder';
                placeholder.style.display = 'none';
                placeholder.dataset.originalKey = key;
                
                // 用占位符替换标记
                mark.parentNode.insertBefore(placeholder, mark);
                
                removedMarks.push({
                    key: key,
                    element: mark,
                    parent: mark.parentNode,
                    placeholder: placeholder,
                    originalNextSibling: mark.nextSibling
                });
                
                // 从DOM中移除标记
                mark.remove();
            }
        }
        
        return removedMarks;
    }

    // 修改恢复函数
    function restore_marks(container, removedMarks) {
        for (const markInfo of removedMarks) {
            if (markInfo.element && markInfo.placeholder && markInfo.placeholder.parentNode) {
                // 用原始标记替换占位符
                markInfo.placeholder.parentNode.replaceChild(markInfo.element, markInfo.placeholder);
            }
        }
    }

    // 修改永久删除函数
    function permanently_remove_marks(removedMarks) {
        for (const markInfo of removedMarks) {
            // 移除占位符（如果存在）
            if (markInfo.placeholder && markInfo.placeholder.parentNode) {
                markInfo.placeholder.remove();
            }
            // 标记已经被移除，不需要额外操作
        }
    }

    // 辅助函数
    function get_symmetric(row, col, size, symmetry, type) {
        // [保持你原有的对称计算逻辑]
        switch (symmetry) {
            case 'central':
                if (type === 'v') return [size - 1 - row, size - 2 - col, 'v'];
                else if (type === 'h') return [size - 2 - row, size - 1 - col, 'h'];
                else return [size - 2 - row, size - 2 - col, 'x'];
            case 'diagonal':
                if (type === 'v') return [col, row, 'h'];
                else if (type === 'h') return [col, row, 'v'];
                else return [col, row, 'x'];
            case 'anti-diagonal':
                if (type === 'v') return [size - 2 - col, size - 1 - row, 'h'];
                else if (type === 'h') return [size - 1 - col, size - 2 - row, 'v'];
                else return [size - 2 - col, size - 2 - row, 'x'];
            case 'horizontal':
                if (type === 'v') return [size - 1 - row, col, 'v'];
                else if (type === 'h') return [size - 2 - row, col, 'h'];
                else return [size - 2 - row, col, 'x'];
            case 'vertical':
                if (type === 'v') return [row, size - 2 - col, 'v'];
                else if (type === 'h') return [row, size - 1 - col, 'h'];
                else return [row, size - 2 - col, 'x'];
            default:
                return [row, col, type];
        }
    }

    function is_valid_position(row, col, size, type) {
        if (type === 'v') return row >= 0 && row < size && col >= 0 && col < size - 1;
        if (type === 'h') return row >= 0 && row < size - 1 && col >= 0 && col < size;
        if (type === 'x') return row >= 0 && row < size - 1 && col >= 0 && col < size - 1;
        return false;
    }

    function is_mark_exists(row, col, type, container) {
        const key = get_mark_key(row, col, type);
        const existingMarks = Array.from(container.querySelectorAll('.vx-mark'));
        return existingMarks.some(m => m.dataset.key === key);
    }

    function get_mark_key(row, col, type) {
        if (type === 'v') return `v-${row}-${col + 1}`;
        if (type === 'h') return `h-${row + 1}-${col}`;
        if (type === 'x') return `x-${row + 1}-${col + 1}`;
        return null;
    }

    function calculate_sum_from_solved(row, col, type, solvedBoard, size) {
        try {
            if (type === 'v') {
                // 竖线：连接 [row, col] 和 [row, col+1]
                const val1 = solvedBoard[row][col];
                const val2 = solvedBoard[row][col + 1];
                return val1 && val2 ? val1 + val2 : null;
            } else if (type === 'h') {
                // 横线：连接 [row, col] 和 [row+1, col]
                const val1 = solvedBoard[row][col];
                const val2 = solvedBoard[row + 1][col];
                return val1 && val2 ? val1 + val2 : null;
            } else if (type === 'x') {
                // 交点四格
                const cells = [
                    [row, col], [row, col + 1],
                    [row + 1, col], [row + 1, col + 1]
                ];
                let sum = 0;
                for (const [r, c] of cells) {
                    if (r >= size || c >= size || !solvedBoard[r][c]) return null;
                    sum += solvedBoard[r][c];
                }
                return sum;
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    function add_circle_with_sum(row, col, size, container, type, sum) {
        // [使用你原有的 add_circle 逻辑，但直接设置数字为计算出的 sum]
        const grid = container.querySelector('.sudoku-grid');
        if (!grid) return;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        let mark_x, mark_y, key;
        if (type === 'v') {
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = `v-${row}-${col + 1}`;
        } else if (type === 'h') {
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
            key = `h-${row + 1}-${col}`;
        } else { // 'x'
            mark_x = (col + 1) * cell_width;
            mark_y = (row + 1) * cell_height;
            key = `x-${row + 1}-${col + 1}`;
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        if (key) mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 15}px`;
        mark.style.top = `${grid_offset_top + mark_y - 15}px`;
        mark.style.width = '30px';
        mark.style.height = '30px';
        mark.style.border = '1px solid #000';
        mark.style.boxSizing = 'border-box';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 3;
        input.value = `${sum}`;
        input.style.width = '38px';
        input.style.height = '28px';
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

        mark.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        input.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };

        mark.appendChild(input);
        container.appendChild(mark);
    }

    function remove_last_marks(container, count) {
        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        for (let i = 0; i < count && marks.length > 0; i++) {
            marks[marks.length - 1 - i].remove();
        }
    }

    function get_current_board_state(size) {
        const inputs = document.querySelectorAll('.sudoku-grid input[type="text"]');
        const board = [];
        for (let i = 0; i < size; i++) {
            board[i] = [];
            for (let j = 0; j < size; j++) {
                const index = i * size + j;
                const value = inputs[index].value;
                board[i][j] = value ? parseInt(value, 10) : 0;
            }
        }
        return board;
    }

}

function add_add_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    if (grid._add_mark_mode) return;
    grid._add_mark_mode = true;

    const container = grid.parentElement;
    container.style.position = 'relative';

    grid.addEventListener('click', function handler(e) {
        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const col = Math.floor(x / cell_width);
        const row = Math.floor(y / cell_height);

        // 到最近垂直线、水平线、交点的距离
        const v_line_x = (col + 1) * cell_width;
        const h_line_y = (row + 1) * cell_height;
        const dist_to_v_line = Math.abs(x - v_line_x);
        const dist_to_h_line = Math.abs(y - h_line_y);

        // 最近交点（四格中心）索引及距离
        const v_idx = Math.round(x / cell_width);
        const h_idx = Math.round(y / cell_height);
        const corner_x = v_idx * cell_width;
        const corner_y = h_idx * cell_height;
        const dist_corner = Math.hypot(x - corner_x, y - corner_y);

        // 阈值（可调整）：线段检测阈值小一些，交点阈值稍大一些
        const LINE_THRESHOLD = 4;
        const CORNER_THRESHOLD = 10;

        // 计算权重（距离越近权重越大），并对交点做归一化以与线段权重可比
        let weight_v = Math.max(0, LINE_THRESHOLD - dist_to_v_line);
        let weight_h = Math.max(0, LINE_THRESHOLD - dist_to_h_line);
        let weight_x = Math.max(0, CORNER_THRESHOLD - dist_corner) * (LINE_THRESHOLD / CORNER_THRESHOLD);

        // 如果当前点不在有效范围，则对应权重置0
        if (!(col >= 0 && col < size - 1)) weight_v = 0;
        if (!(row >= 0 && row < size - 1)) weight_h = 0;
        if (!(v_idx >= 1 && v_idx <= size - 1 && h_idx >= 1 && h_idx <= size - 1)) weight_x = 0;

        const total = weight_v + weight_h + weight_x;
        if (total <= 0) return; // 三者都不在可点击范围

        // 按权重随机选择类型（v/h/x），这样在等距离时线与交点被触发概率接近统一
        const r = Math.random() * total;
        let cumulative = 0;
        let chosenType = null;
        if (weight_v > 0) {
            cumulative += weight_v;
            if (r < cumulative) chosenType = 'v';
        }
        if (chosenType === null && weight_h > 0) {
            cumulative += weight_h;
            if (r < cumulative) chosenType = 'h';
        }
        if (chosenType === null && weight_x > 0) {
            chosenType = 'x';
        }
        if (!chosenType) return;

        // 根据选择计算位置与 key
        let mark_x, mark_y, key, type = chosenType;
        if (type === 'v') {
            // 使用最近的垂直线对应的格（col 可能需要修正）
            const target_col = Math.min(Math.max(col, 0), size - 2);
            mark_x = (target_col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = `v-${row}-${target_col + 1}`;
        } else if (type === 'h') {
            const target_row = Math.min(Math.max(row, 0), size - 2);
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (target_row + 1) * cell_height;
            key = `h-${target_row + 1}-${col}`;
        } else { // x
            mark_x = corner_x;
            mark_y = corner_y;
            // key = null; // 交点不设置 key
            key = `x-${row + 1}-${col + 1}`;
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        if (key) {
            if (marks.some(m => m.dataset.key === key)) {
                return;
            }
        } else {
            if (marks.some(m => {
                const l = parseInt(m.style.left || '0', 10);
                const t = parseInt(m.style.top || '0', 10);
                return Math.abs(l - (grid_offset_left + mark_x - 15)) <= 2 && Math.abs(t - (grid_offset_top + mark_y - 10)) <= 2;
            })) return;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        if (key) mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 15}px`;
        mark.style.top = `${grid_offset_top + mark_y - 15}px`;
        mark.style.width = '30px';
        mark.style.height = '30px';
        // 黑色边框
        mark.style.border = '1px solid #000';
        mark.style.boxSizing = 'border-box';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 3;
        input.style.width = '38px';
        input.style.height = '28px';
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

        mark.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        input.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };

        mark.appendChild(input);
        container.appendChild(mark);
        input.focus();
    });
}

// 加法数独有效性检测函数
export function is_valid_add(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'add';
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

    // 2. 加法标记判断
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
    for (const mark of marks) {
        const input = mark.querySelector('input');
        const value = input && input.value.trim();
        const add = parseInt(value, 10);
        if (isNaN(add)) continue;

        // 解析标记的唯一key
        const key = mark.dataset.key;

        if (key) {
            let cell_a, cell_b;
            if (key.startsWith('v-')) {
                const [_, row_str, col_str] = key.split('-');
                const r = parseInt(row_str, 10);
                const c = parseInt(col_str, 10);
                cell_a = [r, c - 1];
                cell_b = [r, c];
            } else if (key.startsWith('h-')) {
                const [_, row_str, col_str] = key.split('-');
                const r = parseInt(row_str, 10);
                const c = parseInt(col_str, 10);
                cell_a = [r - 1, c];
                cell_b = [r, c];
            } else if (key.startsWith('x-')) {
                const [_, row_str, col_str] = key.split('-');
                const row_mark = parseInt(row_str, 10);
                const col_mark = parseInt(col_str, 10);
                if (!Number.isInteger(row_mark) || !Number.isInteger(col_mark)) continue;

                const cells = [
                    [row_mark - 1, col_mark - 1],
                    [row_mark - 1, col_mark],
                    [row_mark, col_mark - 1],
                    [row_mark, col_mark]
                ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
                if (cells.length !== 4) continue;

                const values = [];
                let allNumbers = true;
                for (const [r, c] of cells) {
                    const v = (r === row && c === col) ? num : board[r][c];
                    if (typeof v !== 'number' || v <= 0 || Array.isArray(v)) {
                        allNumbers = false;
                        break;
                    }
                    values.push(v);
                }
                if (!allNumbers) continue;

                const sumVal = values.reduce((s, x) => s + x, 0);
                if (sumVal !== add) return false;
                continue;
            } else {
                continue;
            }

            // 判断当前格是否在标记两格之一
            let other_cell;
            if (row === cell_a[0] && col === cell_a[1]) {
                other_cell = cell_b;
            } else if (row === cell_b[0] && col === cell_b[1]) {
                other_cell = cell_a;
            } else {
                continue; // 当前格与此标记无关
            }

            // 获取当前格和另一格的值
            const this_value = num;
            const other_value = board[other_cell[0]] && board[other_cell[0]][other_cell[1]];

            // 只有两个格子都填了确定数字才检查合法性，否则跳过
            if (typeof other_value !== 'number' || other_value <= 0 || Array.isArray(other_value)) continue;

            // 判断加法关系
            if (this_value + other_value !== add) {
                return false;
            }

            continue;
        }

        // ----- 四格交点提示（新增逻辑：mark 无 key 时） -----
        // mark.style.left/top 是基于 container 的绝对像素位置（add_add_mark 中设置）
        const grid = container ? container.querySelector('.sudoku-grid') : null;
        if (!grid) continue;

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;
        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const left = parseInt(mark.style.left, 10);
        const top = parseInt(mark.style.top, 10);
        if (isNaN(left) || isNaN(top)) continue;

        // 还原 add_add_mark 中设置时使用的偏移 (+15, +10 或 +15)
        // 这里采用与 add_add_mark/ add_circle 中相同的逆向计算方式
        const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
        const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

        const cells = [
            [row_mark - 1, col_mark - 1],
            [row_mark - 1, col_mark],
            [row_mark, col_mark - 1],
            [row_mark, col_mark]
        ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);

        // 只有完整四格才作为四格提示处理
        if (cells.length !== 4) continue;

        // 收集四格的值（将当前正在尝试放入的 num 视为该格的值）
        const values = [];
        let allNumbers = true;
        for (const [r, c] of cells) {
            const v = (r === row && c === col) ? num : board[r][c];
            if (typeof v !== 'number' || v <= 0 || Array.isArray(v)) {
                allNumbers = false;
                break;
            }
            values.push(v);
        }

        // 只有在四格都为确定数字时才进行和校验；部分填入时跳过
        if (!allNumbers) continue;

        const sum = values.reduce((s, x) => s + x, 0);
        if (sum !== add) {
            return false;
        }
    }

    return true;
}

// // 需要新增的生成终盘函数
// function generate_solved_add_board(size) {
//     // 创建一个空的候选网格
//     const emptyBoard = Array(size).fill().map(() => 
//         Array(size).fill().map(() => [...Array(size)].map((_, i) => i + 1))
//     );
    
//     // 使用 solver 生成一个解
//     const result = solve(emptyBoard, size, is_valid_add, false);
    
//     if (result.solutions && result.solutions.length > 0) {
//         return result.solutions[0];
//     }
    
//     // 如果 solver 失败，尝试备用方法
//     log_process("Solver生成终盘失败，尝试备用方法...");
//     return generate_solved_board_brute_force(size);
// }

// // 备用方法：暴力生成终盘
// function generate_solved_board_brute_force(size) {
//     // 这是一个简化的暴力生成方法，实际可能需要更复杂的实现
//     const board = Array(size).fill().map(() => Array(size).fill(0));
    
//     function backtrack(row, col) {
//         if (row === size) return true;
        
//         const nextCol = (col + 1) % size;
//         const nextRow = nextCol === 0 ? row + 1 : row;
        
//         const numbers = [...Array(size)].map((_, i) => i + 1);
//         // 随机打乱数字顺序
//         for (let i = numbers.length - 1; i > 0; i--) {
//             const j = Math.floor(Math.random() * (i + 1));
//             [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
//         }
        
//         for (const num of numbers) {
//             if (is_valid_add(board, size, row, col, num)) {
//                 board[row][col] = num;
//                 if (backtrack(nextRow, nextCol)) {
//                     return true;
//                 }
//                 board[row][col] = 0;
//             }
//         }
//         return false;
//     }
    
//     return backtrack(0, 0) ? board : null;
// }

function clear_add_marks() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    container.querySelectorAll('.vx-mark').forEach(mark => mark.remove());
}