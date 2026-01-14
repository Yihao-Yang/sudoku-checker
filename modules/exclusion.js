import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, clear_all_inputs, clear_marks, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { solve, isValid, get_all_regions, invalidate_regions_cache } from '../solver/solver_tool.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_puzzle, generate_solved_board_brute_force } from '../solver/generate.js';

// 排除数独主入口
export function create_exclusion_sudoku(size) {
    set_current_mode('exclusion');
    show_result(`当前模式为排除数独`);
    log_process('', true);
    log_process('规则：');
    log_process('标记：周围四格内不包含的数字');
    log_process('');
    log_process('技巧：');
    // log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    // log_process('"额外区域"：附加的不可重复区域');
    // log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('若手动给的标记不合理可能会被代码忽视');
    log_process('');
    log_process('自动出题：');
    log_process('蓝色：自动添加标记出题');
    log_process('绿色：根据给定标记出题');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();

    // 技巧设置（可根据具体规则调整）
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
        Lookup_Table: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

    // 创建基础数独盘面
    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        // cell.classList.add('exclusion-mode');

        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        // 输入事件处理
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

        // 可根据排除数独规则高亮或标记
        // TODO: exclusion-specific cell marking
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加标记功能
    add_exclusion_mark(size);

    // 排除数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('排除', () => {create_exclusion_sudoku(size)}, '#2196F3');
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', () => generate_exclusion_puzzle(size), '#2196F3');
    // add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
}

// // 自动生成排除数独题目（生成圆圈并调用generate_puzzle）
// export function generate_exclusion_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
//     const start_time = performance.now();
//     clear_all_inputs();
//     clear_marks();
//     log_process('', true);

//     // 清除已有圆圈
//     const container = document.querySelector('.sudoku-container');
//     if (!container) return;
//     Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());
//     invalidate_regions_cache();

//     // 生成圆圈数量
//     let min_marks = 2, max_marks = 4;
//     if (size === 6) { min_marks = 10; max_marks = 12; }
//     if (size === 9) { min_marks = 26; max_marks = 28; }
//     const num_marks = Math.floor(Math.random() * (max_marks - min_marks + 1)) + min_marks;

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
//     function get_symmetric(row, col, size, symmetry) {
//         switch (symmetry) {
//             case 'central':
//                 return [size - 2 - row, size - 2 - col];
//             case 'diagonal':
//                 return [col, row];
//             case 'anti-diagonal':
//                 return [size - 2 - col, size - 2 - row];
//             case 'horizontal':
//                 return [size - 2 - row, col];
//             case 'vertical':
//                 return [row, size - 2 - col];
//             default:
//                 return null;
//         }
//     }
//     // log_process(`即将生成排除数独，圆圈数量：${num_marks}，对称类型：${symmetry}`);

//     // 随机生成圆圈位置和数字（不贴边线，带对称）
//     const positions_set = new Set();
//     let marks_added = 0;
//     while (marks_added < num_marks) {
//         let row, col;
//         // 保证不重复且不贴边线
//         do {
//             row = Math.floor(Math.random() * (size - 1)); // 1 ~ size-2
//             col = Math.floor(Math.random() * (size - 1)); // 1 ~ size-2
//         } while (positions_set.has(`${row},${col}`));

//         const key = `${row}-${col}`;
//         // 计算对称点
//         const [sym_row, sym_col] = get_symmetric(row, col, size, symmetry);
//         const sym_key = `${sym_row}-${sym_col}`;

//         // 两个点都不能重复且都不能贴右/下边线
//         if (
//             sym_row >= 0 && sym_row < size - 1 &&
//             sym_col >= 0 && sym_col < size - 1 &&
//             !positions_set.has(key) &&
//             !positions_set.has(sym_key) &&
//             !(sym_row === row && sym_col === col)
//         ) {
//             positions_set.add(key);
//             positions_set.add(sym_key);
//             add_circle(row, col, size, container);
//             add_circle(sym_row, sym_col, size, container);
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
//             const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_exclusion, true);
//             log_process(`尝试添加圆圈位置：(${row},${col}) 和 (${sym_row},${sym_col})，解的数量：${result.solution_count}`);
//             if (result.solution_count === 0 || result.solution_count === -2) {
//                 log_process('当前圆圈位置无解，重新生成');
//                 restore_original_board();
//                 // 无解，撤销圆圈
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
//                 break;
//             }
//             marks_added += 2;
//         }
//         // 如果对称点和主点重合，只添加一次
//         else if (
//             sym_row === row && sym_col === col &&
//             !positions_set.has(key)
//         ) {
//             positions_set.add(key);
//             add_circle(row, col, size, container);
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
//             const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_exclusion, true);
//             log_process(`尝试添加圆圈 at (${row},${col})，解数：${result.solution_count}`);
//             if (result.solution_count === 0 || result.solution_count === -2) {
//                 log_process('当前圆圈位置无解，重新生成');
//                 restore_original_board();
//                 // 无解，撤销圆圈
//                 positions_set.delete(key);
//                 positions_set.delete(sym_key);
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
//                 break;
//             }
//             marks_added += 1;
//         }
//     }

//     // 生成题目
//     generate_puzzle(size, score_lower_limit, holes_count);

//     // 辅助函数：添加圆圈
//     function add_circle(row, col, size, container) {
//         const grid = container.querySelector('.sudoku-grid');
//         if (!grid) return;
//         const cellWidth = grid.offsetWidth / size;
//         const cellHeight = grid.offsetHeight / size;
//         const gridOffsetLeft = grid.offsetLeft;
//         const gridOffsetTop = grid.offsetTop;
//         const crossX = (col + 1) * cellWidth;
//         const crossY = (row + 1) * cellHeight;

//         const mark = document.createElement('div');
//         mark.className = 'vx-mark';
//         mark.style.position = 'absolute';
//         mark.style.left = `${gridOffsetLeft + crossX - 15}px`;
//         mark.style.top = `${gridOffsetTop + crossY - 15}px`;

//         const input = document.createElement('input');
//         input.type = 'text';
//         input.maxLength = 1;
//         input.value = Math.floor(Math.random() * size) + 1;
//         input.style.width = '28px';
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

//         mark.appendChild(input);
//         container.appendChild(mark);
//     }
// }

// 自动生成排除数独题目（先生成终盘，再按终盘生成提示数）
export function generate_exclusion_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    clear_all_inputs();
    clear_marks();
    log_process('', true);

    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());
    invalidate_regions_cache();

    // 先生成终盘
    log_process('第一步：生成排除数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        return;
    }

    // 生成圆圈数量（沿用原标准）
    let min_marks = 4, max_marks = 8;
    if (size === 6) { min_marks = 20; max_marks = 24; }
    if (size === 9) { min_marks = 52; max_marks = 56; }
    const num_marks = Math.floor(Math.random() * (max_marks - min_marks + 1)) + min_marks;

    // 对称类型（沿用原标准）
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical',
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    function get_symmetric(row, col, size, symmetry) {
        switch (symmetry) {
            case 'central': return [size - 2 - row, size - 2 - col];
            case 'diagonal': return [col, row];
            case 'anti-diagonal': return [size - 2 - col, size - 2 - row];
            case 'horizontal': return [size - 2 - row, col];
            case 'vertical': return [row, size - 2 - col];
            default: return [row, col];
        }
    }

    // 计算某交点四格的“未出现数字”集合（排除提示）
    function calculate_excluded_digits(row, col, solved) {
        const cells = [
            [row, col],
            [row, col + 1],
            [row + 1, col],
            [row + 1, col + 1],
        ];
        const present = new Set();
        for (const [r, c] of cells) {
            const val = solved[r]?.[c];
            if (!val) return null;
            present.add(val);
        }
        const res = [];
        for (let n = 1; n <= size; n++) {
            if (!present.has(n)) res.push(n);
        }
        return res;
    }

    // 在交点添加一个排除提示（单数字，沿用现UI与校验）
    function add_exclusion_mark_with_value(row, col, size, container, digit) {
        const grid = container.querySelector('.sudoku-grid');
        if (!grid) return null;
        const cellWidth = grid.offsetWidth / size;
        const cellHeight = grid.offsetHeight / size;
        const gridOffsetLeft = grid.offsetLeft;
        const gridOffsetTop = grid.offsetTop;
        const crossX = (col + 1) * cellWidth;
        const crossY = (row + 1) * cellHeight;

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = get_mark_key(row, col); // 新增：设置位置键 e-row+1-col+1
        mark.style.position = 'absolute';
        mark.style.left = `${gridOffsetLeft + crossX - 15}px`;
        mark.style.top = `${gridOffsetTop + crossY - 15}px`;

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.value = String(digit);
        input.style.width = '28px';
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

        mark.appendChild(input);
        // 双击删除标记，沿用原交互
        mark.ondblclick = function(e) { e.stopPropagation(); mark.remove(); };
        input.ondblclick = function(e) { e.stopPropagation(); mark.remove(); };

        container.appendChild(mark);
        return mark;
    }

    function is_valid_position(row, col) {
        return row >= 0 && row < size - 1 && col >= 0 && col < size - 1;
    }

    // 随机生成交点位置（不贴边线，带对称），根据终盘给出“未出现数字”提示
    const positions_set = new Set();
    let marks_added = 0;

    log_process(`正在生成题目，请稍候...`);
    log_process('九宫：1分钟，超时请重启页面或调整限制条件');
    show_result(`正在生成题目，请稍候...`);
        while (marks_added < num_marks) {
            let row = Math.floor(Math.random() * (size - 1));
            let col = Math.floor(Math.random() * (size - 1));
            const [sym_row, sym_col] = get_symmetric(row, col, size, symmetry);

            const key = `${row}-${col}`;
            const sym_key = `${sym_row}-${sym_col}`;

            // 位置有效、未重复、且不在右/下边线
            if (!is_valid_position(row, col) || positions_set.has(key)) continue;
            if (!is_valid_position(sym_row, sym_col) || positions_set.has(sym_key)) continue;

            const addedMarks = [];
            const mainExcluded = calculate_excluded_digits(row, col, solvedBoard);
            if (!mainExcluded || mainExcluded.length === 0) continue;
            const mainDigit = mainExcluded[Math.floor(Math.random() * mainExcluded.length)];
            const mainMark = add_exclusion_mark_with_value(row, col, size, container, mainDigit);
            if (!mainMark) continue;
            addedMarks.push(mainMark);

            const symmetric_is_same = row === sym_row && col === sym_col;
            if (!symmetric_is_same) {
                const symExcluded = calculate_excluded_digits(sym_row, sym_col, solvedBoard);
                if (!symExcluded || symExcluded.length === 0) {
                    // 回滚
                    for (const m of addedMarks) if (m && m.parentNode) m.remove();
                    continue;
                }
                const symDigit = symExcluded[Math.floor(Math.random() * symExcluded.length)];
                const symMark = add_exclusion_mark_with_value(sym_row, sym_col, size, container, symDigit);
                if (!symMark) {
                    for (const m of addedMarks) if (m && m.parentNode) m.remove();
                    continue;
                }
                addedMarks.push(symMark);
            }

            // 检查是否有解/唯一解
            backup_original_board();
            const solverBoard = Array.from({ length: size }, () =>
                Array.from({ length: size }, () => [...Array(size)].map((_, n) => n + 1))
            );
            const result = solve(solverBoard, size, is_valid_exclusion, true);
            // log_process(`尝试添加圆圈位置：(${row},${col})${!symmetric_is_same ? ` 和 (${sym_row},${sym_col})` : ''}，解的数量：${result.solution_count}`);

            if (result.solution_count === 0 || result.solution_count === -2) {
                // 无解，撤销刚添加的标记
                restore_original_board();
                for (const m of addedMarks) if (m && m.parentNode) m.remove();
                continue;
            }

            restore_original_board();
            marks_added += addedMarks.length;
            positions_set.add(key);
            if (!symmetric_is_same) positions_set.add(sym_key);

            // 找到唯一解时提前停止（沿用原逻辑）
            if (result.solution_count === 1) {
                break;
            }
        }
    show_generating_timer();

    setTimeout(() => {

        log_process('', true)
        log_process(`排除数独生成完成`);
        log_process(`点击检查唯一性查看技巧和分值`);
        // const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
        const { puzzle: puzzle } = generate_puzzle(size, score_lower_limit, holes_count, solvedBoard);
        // 新增：按对称性优化标记
        optimize_marks(container, size, symmetry);
        generate_puzzle(size, score_lower_limit, holes_count, puzzle);
        hide_generating_timer();
        const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
        show_result(`排除数独生成完成，耗时${elapsed}秒）`);
    }, 0);

    // // 生成题目（洞数与评分沿用原参数）
    // generate_puzzle(size, score_lower_limit, holes_count);
    function get_mark_key(row, col) {
        return `e-${row + 1}-${col + 1}`;
    }
    
    function create_current_solver_board(size) {
        const grid = document.querySelector('.sudoku-container .sudoku-grid');
        const board = [];
        let idx = 0;
        for (let r = 0; r < size; r++) {
            board[r] = [];
            for (let c = 0; c < size; c++) {
                const cellEl = grid.children[idx++];
                // 取单元格中的主输入（第一个input）
                const input = cellEl ? cellEl.querySelector('input') : null;
                const val = input && input.value ? parseInt(input.value, 10) : 0;
                if (val >= 1 && val <= size) {
                    board[r][c] = val;
                } else {
                    board[r][c] = [...Array(size)].map((_, n) => n + 1);
                }
            }
        }
        return board;
    }
    
    function optimize_marks(container, size, symmetry) {
        log_process('开始优化标记，删除无用条件...');
        const groups = group_marks_by_symmetry(container, size, symmetry);
        let removed = 0;
    
        for (const group of groups) {
            const removedMarks = temporarily_remove_marks(container, group.keys);
            backup_original_board();
            // 使用当前出好的题（包含给定数）的盘面进行唯一性检查
            const board = create_current_solver_board(size);
            const result = solve(board, size, is_valid_exclusion, true);
            restore_original_board();
    
            if (result.solution_count === 1) {
                permanently_remove_marks(removedMarks);
                removed += removedMarks.length;
            } else {
                restore_marks(container, removedMarks);
            }
        }
    
        log_process(`优化完成，共删除 ${removed} 个标记`);
    }
    
    function group_marks_by_symmetry(container, size, symmetry) {
        const marks = Array.from(container.querySelectorAll('.vx-mark[data-key^="e-"]'));
        const groups = [];
        const visited = new Set();
    
        for (const mark of marks) {
            const key = mark.dataset.key;
            if (visited.has(key)) continue;
    
            const [, rowStr, colStr] = key.split('-');
            const baseRow = parseInt(rowStr, 10) - 1;
            const baseCol = parseInt(colStr, 10) - 1;
    
            const [symRow, symCol] = get_symmetric(baseRow, baseCol, size, symmetry);
            if (symRow < 0 || symRow >= size - 1 || symCol < 0 || symCol >= size - 1) {
                groups.push({ keys: [key] });
                visited.add(key);
                continue;
            }
    
            const symKey = get_mark_key(symRow, symCol);
            if (symKey && symKey !== key && marks.some(m => m.dataset.key === symKey) && !visited.has(symKey)) {
                groups.push({ keys: [key, symKey] });
                visited.add(symKey);
            } else {
                groups.push({ keys: [key] });
            }
            visited.add(key);
        }
        return groups;
    }
    
    function temporarily_remove_marks(container, keys = []) {
        const removed = [];
        for (const key of keys.filter(Boolean)) {
            const mark = container.querySelector(`.vx-mark[data-key="${key}"]`);
            if (!mark) continue;
            const placeholder = document.createElement('div');
            placeholder.style.display = 'none';
            placeholder.className = 'vx-mark-placeholder';
            mark.parentNode.insertBefore(placeholder, mark);
            removed.push({ element: mark, placeholder });
            mark.remove();
        }
        return removed;
    }
    
    function restore_marks(container, removedMarks) {
        for (const info of removedMarks) {
            if (info.placeholder && info.placeholder.parentNode) {
                info.placeholder.parentNode.replaceChild(info.element, info.placeholder);
            }
        }
    }
    
    function permanently_remove_marks(removedMarks) {
        for (const info of removedMarks) {
            if (info.placeholder && info.placeholder.parentNode) {
                info.placeholder.remove();
            }
        }
    }
}

// 添加排除标记功能
function add_exclusion_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    // 防止重复添加监听
    if (grid._exclusionMarkMode) return;
    grid._exclusionMarkMode = true;

    // 获取父容器用于定位
    const container = grid.parentElement;
    container.style.position = 'relative';

    grid.addEventListener('click', function handler(e) {
        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellWidth = grid.offsetWidth / size;
        const cellHeight = grid.offsetHeight / size;

        const col = Math.round(x / cellWidth);
        const row = Math.round(y / cellHeight);

        if (col === 0 || row === 0 || col === size || row === size) return;

        const crossX = col * cellWidth;
        const crossY = row * cellHeight;
        const dist = Math.sqrt((x - crossX) ** 2 + (y - crossY) ** 2);
        if (dist > 12) return;

        const gridOffsetLeft = grid.offsetLeft;
        const gridOffsetTop = grid.offsetTop;

        // 防止重复添加同一交点标记
        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        if (marks.some(m => Math.abs(parseInt(m.style.left) - (gridOffsetLeft + crossX - 15)) < 2 &&
                            Math.abs(parseInt(m.style.top) - (gridOffsetTop + crossY - 15)) < 2)) {
            return;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.style.position = 'absolute';
        mark.style.left = `${gridOffsetLeft + crossX - 15}px`;
        mark.style.top = `${gridOffsetTop + crossY - 15}px`;

        // 创建数字输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.style.width = '28px';
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

        input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            this.value = this.value.replace(regex, '');
        });

        // 双击圆圈或输入框删除标记
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
        // 新增：自动聚焦输入框
        input.focus();
    });

}

// 新增：应用所有排除标记，移除交点四格的候选数
export function apply_exclusion_marks(board, size) {
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
    for (const mark of marks) {
        const input = mark.querySelector('input');
        const value = input && input.value.trim();
        if (!value || !/^\d+$/.test(value)) continue;
        // 支持多个数字
        const excluded_nums = value.split('').map(Number);

        const left = parseInt(mark.style.left);
        const top = parseInt(mark.style.top);

        const grid = container.querySelector('.sudoku-grid');
        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;
        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
        const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

        // 四个相邻格子的坐标
        const positions = [
            [row_mark - 1, col_mark - 1],
            [row_mark - 1, col_mark],
            [row_mark, col_mark - 1],
            [row_mark, col_mark]
        ];

        for (const [r, c] of positions) {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                // 只处理候选数数组
                if (Array.isArray(board[r][c])) {
                    board[r][c] = board[r][c].filter(n => !excluded_nums.includes(n));
                }
            }
        }
    }
}

// 排除数独有效性检测函数
export function is_valid_exclusion(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'exclusion';
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

    // // 2. 排除标记判断
    // const container = document.querySelector('.sudoku-container');
    // const marks = container ? container.querySelectorAll('.vx-mark') : [];
    // for (const mark of marks) {
    //     const input = mark.querySelector('input');
    //     const value = input && input.value.trim();
    //     if (!value || !/^\d+$/.test(value)) continue;
    //     const excluded_num = parseInt(value);

    //     // 计算交点对应的行列
    //     const left = parseInt(mark.style.left);
    //     const top = parseInt(mark.style.top);

    //     const grid = container.querySelector('.sudoku-grid');
    //     const grid_offset_left = grid.offsetLeft;
    //     const grid_offset_top = grid.offsetTop;
    //     const cell_width = grid.offsetWidth / size;
    //     const cell_height = grid.offsetHeight / size;

    //     const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
    //     const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

    //     // 四个相邻格子的坐标
    //     const positions = [
    //         [row_mark - 1, col_mark - 1],
    //         [row_mark - 1, col_mark],
    //         [row_mark, col_mark - 1],
    //         [row_mark, col_mark]
    //     ];

    //     // 如果当前格子在交点四格内，且填入被排除数字，则不合法
    //     for (const [r, c] of positions) {
    //         if (r === row && c === col && num === excluded_num) {
    //             return false;
    //         }
    //     }
    // }

    return true;
}