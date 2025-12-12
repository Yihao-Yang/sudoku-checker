// quadruple.js
import { state, set_current_mode } from '../solver/state.js';
import { show_result, create_base_grid, create_base_cell, add_Extra_Button, log_process, backup_original_board, restore_original_board, handle_key_navigation, clear_all_inputs, clear_marks } from '../solver/core.js';
import { generate_solved_board_brute_force } from '../solver/generate.js';
import { get_all_regions, solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { create_technique_panel } from '../solver/classic.js';

// 四数独主入口
export function create_quadruple_sudoku(size) {
    set_current_mode('quadruple');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();

    // 修改技巧开关
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        // 区块技巧全部打开
        Box_Block: true,
        Variant_Box_Block: true,
        Box_Pair_Block: true,
        Extra_Region_Pair_Block: true,
        Row_Col_Block: true,
        Variant_Row_Col_Block: true,
        Extra_Region_Block: true,
        Variant_Extra_Region_Block: true,
        // 数对技巧
        Box_Naked_Pair: true,
        Row_Col_Naked_Pair: true,
        Box_Hidden_Pair: true,
        Row_Col_Hidden_Pair: true,
        // 数组技巧
        Box_Naked_Triple: true,
        Row_Col_Naked_Triple: true,
        Box_Hidden_Triple: true,
        Row_Col_Hidden_Triple: true,
        All_Quad: false,
        Cell_Elimination: true,
        Brute_Force: false,
        // 额外区域技巧
        Extra_Region_Elimination: true,
        Extra_Region_Naked_Pair: true,
        Extra_Region_Hidden_Pair: true,
        Extra_Region_Naked_Triple: true,
        Extra_Region_Hidden_Triple: true,
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
    // 唯余法全部默认开启
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    // 刷新技巧面板
    create_technique_panel();

    // 创建基础数独盘面
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
        
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加四数独圆圈功能
    add_quadruple_mark(size);

    // 四数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', () => generate_quadruple_puzzle(size), '#2196F3');
}

// 自动生成四数独题目
export function generate_quadruple_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    clear_all_inputs();
    log_process('', true);
    invalidate_regions_cache();

    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    log_process('第一步：生成四数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        return;
    }

    log_process('第二步：开始添加对称提示标记...');
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
    log_process(`使用对称类型: ${symmetry}`);

    const MAX_MARKS = (size - 1) * (size - 1);
    const MAX_TRY = 200;

    let marks_added = 0;
    let try_count = 0;
    let unique_found = false;

    while (try_count < MAX_TRY && marks_added < MAX_MARKS && !unique_found) {
        try_count++;

        const row = Math.floor(Math.random() * (size - 1));
        const col = Math.floor(Math.random() * (size - 1));

        const [sym_row, sym_col] = get_symmetric(row, col, size, symmetry);

        if (
            !is_valid_position(row, col, size) ||
            !is_valid_position(sym_row, sym_col, size) ||
            is_mark_exists(row, col, container) ||
            is_mark_exists(sym_row, sym_col, container)
        ) {
            continue;
        }

        const addedMarks = [];
        const mainDigits = calculate_quadruple_from_solved(row, col, solvedBoard);
        if (!mainDigits) continue;

        const mainMark = add_quadruple_mark_with_value(row, col, size, container, mainDigits);
        if (!mainMark) continue;
        addedMarks.push(mainMark);

        const symmetric_is_same = row === sym_row && col === sym_col;
        if (!symmetric_is_same) {
            const symDigits = calculate_quadruple_from_solved(sym_row, sym_col, solvedBoard);
            if (!symDigits) {
                remove_marks(addedMarks);
                continue;
            }
            const symMark = add_quadruple_mark_with_value(sym_row, sym_col, size, container, symDigits);
            if (!symMark) {
                remove_marks(addedMarks);
                continue;
            }
            addedMarks.push(symMark);
        }

        marks_added += addedMarks.length;

        backup_original_board();
        const result = solve(create_solver_board(size), size, is_valid_quadruple, true);
        restore_original_board();

        if (result.solution_count === 1) {
            unique_found = true;
            log_process(`✓ 找到唯一解！共添加 ${marks_added} 个标记`);
            optimize_marks(container, size, symmetry);
            break;
        }

        if (result.solution_count === 0 || result.solution_count === -2) {
            log_process('✗ 无解，移除最后添加的标记');
            remove_marks(addedMarks);
            marks_added -= addedMarks.length;
        } else {
            log_process(`当前解数：${result.solution_count}，继续添加标记...`);
        }
    }

    const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
    show_result(`四数独提示生成完成（${unique_found ? '唯一解' : '未验证唯一'}，耗时${elapsed}秒）`);

    if (!unique_found) {
        if (try_count >= MAX_TRY) {
            log_process('自动出题失败：达到最大尝试次数');
        } else {
            log_process('自动出题完成（可能非唯一解）');
        }
    }

    function create_solver_board(size) {
        return Array.from({ length: size }, () =>
            Array.from({ length: size }, () => [...Array(size)].map((_, n) => n + 1))
        );
    }

    function remove_marks(list) {
        for (const mark of list) {
            if (mark && mark.parentNode) {
                mark.remove();
            }
        }
    }

    function get_mark_key(row, col) {
        return `x-${row + 1}-${col + 1}`;
    }

    function is_mark_exists(row, col, container) {
        const key = get_mark_key(row, col);
        return !!container.querySelector(`.vx-mark[data-key="${key}"]`);
    }

    function is_valid_position(row, col, size) {
        return row >= 0 && row < size - 1 && col >= 0 && col < size - 1;
    }

    function get_symmetric(row, col, size, symmetry) {
        switch (symmetry) {
            case 'central':
                return [size - 2 - row, size - 2 - col];
            case 'diagonal':
                return [col, row];
            case 'anti-diagonal':
                return [size - 2 - col, size - 2 - row];
            case 'horizontal':
                return [size - 2 - row, col];
            case 'vertical':
                return [row, size - 2 - col];
            default:
                return [row, col];
        }
    }

    function calculate_quadruple_from_solved(row, col, solvedBoard) {
        const cells = [
            [row, col],
            [row, col + 1],
            [row + 1, col],
            [row + 1, col + 1]
        ];
        const values = [];
        for (const [r, c] of cells) {
            const val = solvedBoard[r]?.[c];
            if (!val) return null;
            values.push(val);
        }
        return values.sort((a, b) => a - b);
    }

    function add_quadruple_mark_with_value(row, col, size, container, digits) {
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
        mark.dataset.key = get_mark_key(row, col);
        mark.style.position = 'absolute';
        mark.style.left = `${gridOffsetLeft + crossX - 30}px`;
        mark.style.top = `${gridOffsetTop + crossY - 15}px`;
        mark.style.width = '60px';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 4;
        input.value = digits.join('');
        input.style.width = '60px';
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
        mark.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        input.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        container.appendChild(mark);
        return mark;
    }

    function optimize_marks(container, size, symmetry) {
        log_process('开始优化标记，删除无用条件...');
        const groups = group_marks_by_symmetry(container, size, symmetry);
        let removed = 0;
        for (const group of groups) {
            const removedMarks = temporarily_remove_marks(container, group.keys);
            backup_original_board();
            const result = solve(create_solver_board(size), size, is_valid_quadruple, true);
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
        const marks = Array.from(container.querySelectorAll('.vx-mark[data-key^="x-"]'));
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

// 添加四数独圆圈标记
function add_quadruple_mark(size) {
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
        const key = `x-${row}-${col}`;

        if (container.querySelector(`.vx-mark[data-key="${key}"]`)) {
            return;
        }

        // 防止重复添加同一交点标记
        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        if (marks.some(m => Math.abs(parseInt(m.style.left) - (gridOffsetLeft + crossX - 15)) < 2 &&
                            Math.abs(parseInt(m.style.top) - (gridOffsetTop + crossY - 15)) < 2)) {
            return;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${gridOffsetLeft + crossX - 30}px`;
        mark.style.top = `${gridOffsetTop + crossY - 15}px`;
        mark.style.width = '60px';

        // 创建数字输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 4;
        input.style.width = '60px';
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

// 应用所有四数独圆圈约束
export function apply_quadruple_marks(board, size) {
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
    for (const mark of marks) {
        const input = mark.querySelector('input');
        const value = input && input.value.trim();
        if (!value || !/^\d+$/.test(value)) continue;
        // 支持多个数字
        const included_nums = value.split('').map(Number);

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
                    board[r][c] = board[r][c].filter(n => included_nums.includes(n));
                }
            }
        }
    }
}

// 排除数独有效性检测函数
export function is_valid_quadruple(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'quadruple';
    const regions = get_all_regions(size, mode);
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col) && region.type !== '有重复四格提示') {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }

    // 2. 排除标记判断
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
    for (const mark of marks) {
        const input = mark.querySelector('input');
        const value = input && input.value.trim();
        if (!value || !/^\d+$/.test(value)) continue;
        // 支持多个数字
        const included_nums = value.split('').map(Number);

        // 计算交点对应的行列
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

        // 判断当前格子是否在交点四格内
        let in_quad = false;
        for (const [r, c] of positions) {
            if (r === row && c === col) {
                in_quad = true;
                break;
            }
        }
        if (!in_quad) continue;

        // 统计交点四格已填入的数字
        let filled_nums = [];
        for (const [r, c] of positions) {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                let cell_value = (r === row && c === col) ? num : board[r][c];
                if (typeof cell_value === 'number' && cell_value !== 0) {
                    filled_nums.push(cell_value);
                }
            }
        }

        // 检查所有已填数字都在提示数中
        if (filled_nums.some(n => !included_nums.includes(n))) {
            return false;
        }

        // 检查每个数字填入的数量不能超过提示数中该数字的数量
        for (let n of included_nums) {
            const count_in_hint = included_nums.filter(x => x === n).length;
            const count_in_filled = filled_nums.filter(x => x === n).length;
            if (count_in_filled > count_in_hint) {
                return false;
            }
        }
    }

    return true;
}